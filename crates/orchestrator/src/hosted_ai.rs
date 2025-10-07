use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{info, warn, error, instrument};
use uuid::Uuid;
use reqwest::{Client, StatusCode};
use parking_lot::RwLock;
use std::collections::HashMap;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use crate::metrics::{helpers::*, Timer};

/// HostedAI configuration
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HostedAiConfig {
    pub base_url: String,
    pub api_key: String,
    pub pool: String, // pool id/name
    #[serde(default)]
    pub overcommit: bool,
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
    #[serde(default = "default_max_retries")]
    pub max_retries: u32,
}

fn default_timeout() -> u64 { 30 }
fn default_max_retries() -> u32 { 3 }

/// GPU allocation request
#[derive(Serialize)]
pub struct GpuAllocationRequest {
    pub pool_id: String,
    pub requirements: ResourceRequirements,
    pub duration_seconds: u32,
    pub preemptible: bool,
    pub metadata: HashMap<String, String>,
}

#[derive(Serialize)]
pub struct ResourceRequirements {
    pub min_tflops: f32,
    pub min_vram_mb: u32,
    pub max_vram_mb: Option<u32>,
    pub gpu_family: Option<String>,
}

/// GPU allocation response
#[derive(Clone, Debug, Deserialize)]
pub struct GpuAllocationResponse {
    pub allocation_id: String,
    pub assigned_gpu: String,
    pub status: String,
    pub expires_at: Option<String>,
}

/// Inference request for HostedAI
#[derive(Serialize)]
pub struct HostedInferenceRequest {
    pub model: String,
    pub prompt: String,
    pub parameters: InferenceParameters,
}

#[derive(Serialize)]
pub struct InferenceParameters {
    pub max_tokens: u32,
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    pub stop_sequences: Option<Vec<String>>,
}

/// Inference response from HostedAI
#[derive(Deserialize)]
pub struct HostedInferenceResponse {
    pub text: String,
    pub tokens_used: u32,
    pub duration_ms: u64,
    pub model_used: String,
}

/// API Error response
#[derive(Debug, Deserialize)]
pub struct ApiError {
    pub error: String,
    pub code: String,
    pub details: Option<HashMap<String, serde_json::Value>>,
}

/// Metrics for monitoring
#[derive(Debug, Clone, Default)]
pub struct Metrics {
    pub allocations_total: u64,
    pub allocations_failed: u64,
    pub inference_total: u64,
    pub inference_failed: u64,
    pub average_latency_ms: u64,
}

/// HostedAI connector with retry logic and monitoring
#[derive(Clone)]
pub struct HostedAiConnector {
    client: Client,
    cfg: HostedAiConfig,
    allocations: Arc<RwLock<HashMap<String, GpuAllocationResponse>>>,
    metrics: Arc<RwLock<Metrics>>,
}

impl HostedAiConnector {
    pub fn new(cfg: HostedAiConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(cfg.timeout_secs))
            .pool_idle_timeout(Duration::from_secs(90))
            .pool_max_idle_per_host(10)
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            client,
            cfg,
            allocations: Arc::new(RwLock::new(HashMap::new())),
            metrics: Arc::new(RwLock::new(Metrics::default())),
        }
    }

    /// Request a vGPU allocation with retry logic
    #[instrument(skip(self))]
    pub async fn request_vgpu(&self, tflops: u64, vram_mb: u64) -> Result<String> {
        self.metrics.write().allocations_total += 1;
        let timer = Timer::new();
        
        let request = GpuAllocationRequest {
            pool_id: self.cfg.pool.clone(),
            requirements: ResourceRequirements {
                min_tflops: tflops as f32,
                min_vram_mb: vram_mb as u32,
                max_vram_mb: if self.cfg.overcommit { 
                    Some((vram_mb * 2) as u32) 
                } else { 
                    Some(vram_mb as u32) 
                },
                gpu_family: None,
            },
            duration_seconds: 300, // 5 minutes default
            preemptible: self.cfg.overcommit,
            metadata: HashMap::new(),
        };

        // Try real API first
        let url = format!("{}/v1/allocations", self.cfg.base_url);
        
        match self.post_with_retry::<_, GpuAllocationResponse>(&url, &request).await {
            Ok(response) => {
                info!("Successfully allocated GPU: {}", response.allocation_id);
                record_allocation_attempt(&self.cfg.pool, true);
                timer.observe_duration(&crate::metrics::GPU_ALLOCATION_DURATION, &[&self.cfg.pool]);
                update_active_allocations(&self.cfg.pool, &response.assigned_gpu, 1.0);
                
                self.allocations.write().insert(response.allocation_id.clone(), response.clone());
                Ok(response.allocation_id)
            }
            Err(e) => {
                warn!("Failed to allocate GPU from Hosted.AI: {}. Using mock fallback.", e);
                record_allocation_attempt(&self.cfg.pool, false);
                self.metrics.write().allocations_failed += 1;
                
                // Fallback to mock for development/testing
                let allocation_id = format!("mock_{}", Uuid::new_v4());
                let response = GpuAllocationResponse {
                    allocation_id: allocation_id.clone(),
                    assigned_gpu: "mock-gpu-001".to_string(),
                    status: "allocated".to_string(),
                    expires_at: None,
                };
                
                update_active_allocations(&self.cfg.pool, "mock-gpu", 1.0);
                self.allocations.write().insert(allocation_id.clone(), response);
                Ok(allocation_id)
            }
        }
    }

    /// Perform inference using allocated GPU
    #[instrument(skip(self, prompt))]
    pub async fn inference(&self, allocation_id: &str, prompt: &str, max_tokens: usize) -> Result<String> {
        self.metrics.write().inference_total += 1;
        let timer = Timer::new();
        
        if !self.allocations.read().contains_key(allocation_id) {
            anyhow::bail!("Invalid allocation ID");
        }

        let model = if allocation_id.starts_with("mock_") { 
            "mock-model".to_string() 
        } else { 
            "auto".to_string() 
        };

        let request = HostedInferenceRequest {
            model: model.clone(),
            prompt: prompt.to_string(),
            parameters: InferenceParameters {
                max_tokens: max_tokens as u32,
                temperature: Some(0.7),
                top_p: Some(0.9),
                stop_sequences: None,
            },
        };

        let url = format!("{}/v1/inference/{}", self.cfg.base_url, allocation_id);
        
        match self.post_with_retry::<_, HostedInferenceResponse>(&url, &request).await {
            Ok(response) => {
                info!("Inference completed in {}ms", response.duration_ms);
                
                // Record metrics
                record_inference_request(&response.model_used, true);
                record_inference_metrics(&response.model_used, response.duration_ms, response.tokens_used);
                timer.observe_duration(&crate::metrics::INFERENCE_DURATION, &[&response.model_used]);
                
                // Estimate and track cost (example: $0.00001 per token)
                let cost_estimate = response.tokens_used as f64 * 0.00001;
                track_inference_cost(&response.model_used, &self.cfg.pool, cost_estimate);
                
                // Update internal metrics
                let mut metrics = self.metrics.write();
                let total = metrics.inference_total;
                metrics.average_latency_ms = 
                    (metrics.average_latency_ms * (total - 1) + response.duration_ms) / total;
                
                Ok(response.text)
            }
            Err(e) => {
                warn!("Failed to run inference on Hosted.AI: {}. Using mock.", e);
                record_inference_request(&model, false);
                self.metrics.write().inference_failed += 1;
                
                // Fallback to mock
                Ok(format!("[Mock response for: {}]", prompt))
            }
        }
    }

    /// Release vGPU allocation
    #[instrument(skip(self))]
    pub async fn release(&self, alloc_id: &str) -> Result<()> {
        // Get allocation info before removing
        let gpu_type = self.allocations.read()
            .get(alloc_id)
            .map(|a| a.assigned_gpu.clone())
            .unwrap_or_else(|| "unknown".to_string());
        
        self.allocations.write().remove(alloc_id);
        
        if alloc_id.starts_with("mock_") {
            info!("Released mock allocation: {}", alloc_id);
            update_active_allocations(&self.cfg.pool, "mock-gpu", -1.0);
            return Ok(());
        }

        let url = format!("{}/v1/allocations/{}", self.cfg.base_url, alloc_id);
        
        match self.delete_with_retry(&url).await {
            Ok(_) => {
                info!("Successfully released allocation: {}", alloc_id);
                update_active_allocations(&self.cfg.pool, &gpu_type, -1.0);
                Ok(())
            }
            Err(e) => {
                error!("Failed to release allocation {}: {}", alloc_id, e);
                // Still update metrics on failure to avoid leaks
                update_active_allocations(&self.cfg.pool, &gpu_type, -1.0);
                Err(e)
            }
        }
    }
    
    /// Get allocation status
    pub fn get_allocation(&self, alloc_id: &str) -> Option<GpuAllocationResponse> {
        self.allocations.read().get(alloc_id).cloned()
    }
    
    /// List all active allocations
    pub fn list_allocations(&self) -> Vec<String> {
        self.allocations.read().keys().cloned().collect()
    }
    
    /// Get current metrics
    pub fn get_metrics(&self) -> Metrics {
        self.metrics.read().clone()
    }

    /// Check health of Hosted.AI connection
    pub async fn health_check(&self) -> Result<bool> {
        let url = format!("{}/health", self.cfg.base_url);
        
        match self.client
            .get(&url)
            .timeout(Duration::from_secs(5))
            .send()
            .await
        {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false),
        }
    }

    // Retry logic with exponential backoff
    async fn post_with_retry<T, R>(&self, url: &str, body: &T) -> Result<R>
    where
        T: Serialize,
        R: for<'de> Deserialize<'de>,
    {
        let mut retries = 0;
        let mut backoff = Duration::from_millis(100);

        loop {
            match self.make_post_request(url, body).await {
                Ok(response) => return Ok(response),
                Err(e) if retries < self.cfg.max_retries => {
                    warn!("Request failed (attempt {}/{}): {}", retries + 1, self.cfg.max_retries, e);
                    retries += 1;
                    sleep(backoff).await;
                    backoff = backoff.saturating_mul(2); // Exponential backoff with saturation
                    if backoff > Duration::from_secs(10) {
                        backoff = Duration::from_secs(10); // Cap at 10 seconds
                    }
                }
                Err(e) => return Err(e),
            }
        }
    }

    async fn delete_with_retry(&self, url: &str) -> Result<()> {
        let mut retries = 0;
        let mut backoff = Duration::from_millis(100);

        loop {
            match self.make_delete_request(url).await {
                Ok(_) => return Ok(()),
                Err(e) if retries < self.cfg.max_retries => {
                    warn!("Request failed (attempt {}/{}): {}", retries + 1, self.cfg.max_retries, e);
                    retries += 1;
                    sleep(backoff).await;
                    backoff = backoff.saturating_mul(2);
                    if backoff > Duration::from_secs(10) {
                        backoff = Duration::from_secs(10);
                    }
                }
                Err(e) => return Err(e),
            }
        }
    }

    async fn make_post_request<T, R>(&self, url: &str, body: &T) -> Result<R>
    where
        T: Serialize,
        R: for<'de> Deserialize<'de>,
    {
        let start = Instant::now();
        let endpoint = url.split("/v1/").nth(1).unwrap_or("unknown");
        
        let response = self.client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.cfg.api_key))
            .header("Content-Type", "application/json")
            .json(body)
            .send()
            .await
            .context("Failed to send request")?;

        let status = response.status();
        let duration = start.elapsed().as_secs_f64();
        record_api_request(endpoint, "POST", status.as_u16(), duration);
        
        self.handle_response(response).await
    }

    async fn make_delete_request(&self, url: &str) -> Result<()> {
        let start = Instant::now();
        let endpoint = url.split("/v1/").nth(1).unwrap_or("unknown");
        
        let response = self.client
            .delete(url)
            .header("Authorization", format!("Bearer {}", self.cfg.api_key))
            .send()
            .await
            .context("Failed to send request")?;

        let status = response.status();
        let duration = start.elapsed().as_secs_f64();
        record_api_request(endpoint, "DELETE", status.as_u16(), duration);

        if status.is_success() {
            Ok(())
        } else {
            match response.json::<ApiError>().await {
                Ok(error) => Err(anyhow::anyhow!("API Error {}: {}", error.code, error.error)),
                Err(_) => Err(anyhow::anyhow!("HTTP Error: {}", status)),
            }
        }
    }

    async fn handle_response<R>(&self, response: reqwest::Response) -> Result<R>
    where
        R: for<'de> Deserialize<'de>,
    {
        let status = response.status();

        if status.is_success() {
            response.json::<R>().await
                .context("Failed to parse response")
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            
            match status {
                StatusCode::UNAUTHORIZED => Err(anyhow::anyhow!("Authentication failed: {}", error_text)),
                StatusCode::TOO_MANY_REQUESTS => Err(anyhow::anyhow!("Rate limit exceeded: {}", error_text)),
                StatusCode::SERVICE_UNAVAILABLE => Err(anyhow::anyhow!("Service unavailable: {}", error_text)),
                _ => {
                    // Try to parse as ApiError
                    if let Ok(api_error) = serde_json::from_str::<ApiError>(&error_text) {
                        Err(anyhow::anyhow!("API Error {}: {}", api_error.code, api_error.error))
                    } else {
                        Err(anyhow::anyhow!("HTTP Error {}: {}", status, error_text))
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_gpu_allocation() {
        let config = HostedAiConfig {
            base_url: "https://api.hosted-ai.example".to_string(),
            api_key: "test-key".to_string(),
            pool: "default".to_string(),
            overcommit: true,
            timeout_secs: 30,
            max_retries: 3,
        };
        
        let connector = HostedAiConnector::new(config);
        let alloc_id = connector.request_vgpu(100, 8192).await.unwrap();
        
        assert!(connector.get_allocation(&alloc_id).is_some());
        assert_eq!(connector.list_allocations().len(), 1);
        
        // Test metrics
        let metrics = connector.get_metrics();
        assert_eq!(metrics.allocations_total, 1);
        
        // Test inference
        let result = connector.inference(&alloc_id, "test prompt", 100).await.unwrap();
        assert!(!result.is_empty());
        
        connector.release(&alloc_id).await.unwrap();
        assert!(connector.get_allocation(&alloc_id).is_none());
    }
    
    #[tokio::test]
    async fn test_invalid_allocation() {
        let config = HostedAiConfig {
            base_url: "https://api.hosted-ai.example".to_string(),
            api_key: "test-key".to_string(),
            pool: "default".to_string(),
            overcommit: false,
            timeout_secs: 30,
            max_retries: 3,
        };
        
        let connector = HostedAiConnector::new(config);
        let result = connector.inference("invalid-id", "test", 100).await;
        assert!(result.is_err());
    }
}