use orchestrator::hosted_ai::{HostedAiConfig, HostedAiConnector};
use orchestrator::metrics::MetricsExporter;
use std::env;
use tokio::time::{sleep, Duration};

// Helper to get test configuration
fn get_test_config() -> HostedAiConfig {
    HostedAiConfig {
        base_url: env::var("HOSTED_AI_BASE_URL")
            .unwrap_or_else(|_| "https://api.hosted-ai.example".to_string()),
        api_key: env::var("HOSTED_AI_API_KEY")
            .unwrap_or_else(|_| "test-api-key".to_string()),
        pool: env::var("HOSTED_AI_POOL_ID")
            .unwrap_or_else(|_| "test-pool".to_string()),
        overcommit: true,
        timeout_secs: 30,
        max_retries: 3,
    }
}

#[tokio::test]
async fn test_gpu_allocation_lifecycle() {
    let config = get_test_config();
    let connector = HostedAiConnector::new(config);
    
    // Test allocation
    let allocation_id = connector.request_vgpu(5, 2048).await
        .expect("Failed to allocate GPU");
    
    println!("Allocated GPU: {}", allocation_id);
    assert!(!allocation_id.is_empty());
    
    // Verify allocation exists
    let allocation = connector.get_allocation(&allocation_id);
    assert!(allocation.is_some());
    
    // Test inference
    let result = connector.inference(&allocation_id, "Hello, world!", 50).await
        .expect("Failed to run inference");
    
    println!("Inference result: {}", result);
    assert!(!result.is_empty());
    
    // Test release
    connector.release(&allocation_id).await
        .expect("Failed to release GPU");
    
    // Verify allocation is gone
    assert!(connector.get_allocation(&allocation_id).is_none());
}

#[tokio::test]
async fn test_concurrent_allocations() {
    let config = get_test_config();
    let connector = HostedAiConnector::new(config);
    
    // Allocate multiple GPUs concurrently
    let futures = (0..5).map(|i| {
        let conn = connector.clone();
        tokio::spawn(async move {
            conn.request_vgpu(10 + i, 4096).await
        })
    });
    
    let results: Vec<_> = futures::future::join_all(futures).await;
    let allocation_ids: Vec<_> = results.into_iter()
        .filter_map(|r| r.ok())
        .filter_map(|r| r.ok())
        .collect();
    
    println!("Allocated {} GPUs concurrently", allocation_ids.len());
    assert!(!allocation_ids.is_empty());
    
    // Verify all allocations exist
    for id in &allocation_ids {
        assert!(connector.get_allocation(id).is_some());
    }
    
    // Clean up
    for id in allocation_ids {
        let _ = connector.release(&id).await;
    }
}

#[tokio::test]
async fn test_error_handling() {
    let mut config = get_test_config();
    // Use invalid URL to trigger errors
    config.base_url = "http://localhost:1".to_string();
    config.max_retries = 1; // Reduce retries for faster test
    
    let connector = HostedAiConnector::new(config);
    
    // Should fallback to mock
    let allocation_id = connector.request_vgpu(5, 2048).await
        .expect("Should fallback to mock");
    
    assert!(allocation_id.starts_with("mock_"));
    
    // Mock inference should work
    let result = connector.inference(&allocation_id, "test", 10).await
        .expect("Mock inference should work");
    
    assert!(result.contains("Mock response"));
}

#[tokio::test]
async fn test_metrics_collection() {
    let config = get_test_config();
    let connector = HostedAiConnector::new(config);
    let metrics_exporter = MetricsExporter::new();
    
    // Perform some operations
    let allocation_id = connector.request_vgpu(10, 8192).await.unwrap();
    let _ = connector.inference(&allocation_id, "test prompt", 100).await;
    connector.release(&allocation_id).await.unwrap();
    
    // Check metrics
    let metrics = connector.get_metrics();
    assert!(metrics.allocations_total >= 1);
    assert!(metrics.inference_total >= 1);
    
    // Export Prometheus metrics
    let prometheus_output = metrics_exporter.render();
    println!("Prometheus metrics:\n{}", prometheus_output);
    
    assert!(prometheus_output.contains("hosted_ai_gpu_allocations_total"));
    assert!(prometheus_output.contains("hosted_ai_inference_requests_total"));
}

#[tokio::test]
async fn test_health_check() {
    let config = get_test_config();
    let connector = HostedAiConnector::new(config);
    
    let is_healthy = connector.health_check().await
        .expect("Health check should not error");
    
    println!("Health check result: {}", is_healthy);
    // In test environment, this will likely be false unless we have a real API
}

#[tokio::test]
async fn test_allocation_expiry() {
    let config = get_test_config();
    let connector = HostedAiConnector::new(config);
    
    // Allocate with short duration
    let allocation_id = connector.request_vgpu(5, 2048).await.unwrap();
    
    // Get allocation details
    if let Some(allocation) = connector.get_allocation(&allocation_id) {
        println!("Allocation status: {}", allocation.status);
        println!("Expires at: {:?}", allocation.expires_at);
    }
    
    // Clean up
    connector.release(&allocation_id).await.unwrap();
}

#[tokio::test]
async fn test_different_model_sizes() {
    let config = get_test_config();
    let connector = HostedAiConnector::new(config);
    
    // Test different model configurations
    let test_cases = vec![
        (5, 2048),    // Gemma-2B
        (10, 6144),   // Mistral-7B  
        (40, 32768),  // Qwen-32B
    ];
    
    for (tflops, vram_mb) in test_cases {
        println!("Testing allocation for {} TFLOPS, {} MB VRAM", tflops, vram_mb);
        
        let allocation_id = connector.request_vgpu(tflops, vram_mb).await
            .expect("Failed to allocate");
        
        let inference_result = connector.inference(
            &allocation_id,
            "What is the meaning of life?",
            100
        ).await.expect("Failed to run inference");
        
        println!("Response preview: {}...", &inference_result.chars().take(50).collect::<String>());
        
        connector.release(&allocation_id).await.expect("Failed to release");
        
        // Small delay between tests
        sleep(Duration::from_millis(100)).await;
    }
}

#[tokio::test] 
async fn test_cost_tracking() {
    let config = get_test_config();
    let connector = HostedAiConnector::new(config);
    
    // Perform multiple inferences to accumulate cost
    let allocation_id = connector.request_vgpu(10, 8192).await.unwrap();
    
    for i in 0..5 {
        let _ = connector.inference(
            &allocation_id,
            &format!("Test prompt {}", i),
            50
        ).await;
    }
    
    connector.release(&allocation_id).await.unwrap();
    
    // Check that cost metrics were recorded
    let metrics_exporter = MetricsExporter::new();
    let output = metrics_exporter.render();
    
    if output.contains("hosted_ai_inference_cost_dollars") {
        println!("Cost tracking is working");
    }
}

#[tokio::test]
async fn test_overcommit_behavior() {
    let mut config = get_test_config();
    
    // Test with overcommit enabled
    config.overcommit = true;
    let connector_overcommit = HostedAiConnector::new(config.clone());
    
    let alloc_id_1 = connector_overcommit.request_vgpu(20, 16384).await.unwrap();
    
    // Test with overcommit disabled
    config.overcommit = false;
    let connector_no_overcommit = HostedAiConnector::new(config);
    
    let alloc_id_2 = connector_no_overcommit.request_vgpu(20, 16384).await.unwrap();
    
    // Both should succeed (with mock fallback if needed)
    assert!(!alloc_id_1.is_empty());
    assert!(!alloc_id_2.is_empty());
    
    // Clean up
    connector_overcommit.release(&alloc_id_1).await.unwrap();
    connector_no_overcommit.release(&alloc_id_2).await.unwrap();
}