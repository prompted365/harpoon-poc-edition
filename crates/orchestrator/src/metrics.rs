use prometheus::{
    register_counter_vec, register_gauge_vec, register_histogram_vec,
    CounterVec, GaugeVec, HistogramVec, Registry,
};
use lazy_static::lazy_static;
use std::time::Instant;

lazy_static! {
    /// GPU allocation counter
    pub static ref GPU_ALLOCATIONS: CounterVec = register_counter_vec!(
        "hosted_ai_gpu_allocations_total",
        "Total number of GPU allocation attempts",
        &["pool_id", "status"]
    ).unwrap();
    
    /// GPU allocation duration histogram
    pub static ref GPU_ALLOCATION_DURATION: HistogramVec = register_histogram_vec!(
        "hosted_ai_gpu_allocation_duration_seconds",
        "GPU allocation duration in seconds",
        &["pool_id"],
        vec![0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
    ).unwrap();
    
    /// Active GPU allocations gauge
    pub static ref ACTIVE_GPU_ALLOCATIONS: GaugeVec = register_gauge_vec!(
        "hosted_ai_active_gpu_allocations",
        "Number of active GPU allocations",
        &["pool_id", "gpu_type"]
    ).unwrap();
    
    /// Inference request counter
    pub static ref INFERENCE_REQUESTS: CounterVec = register_counter_vec!(
        "hosted_ai_inference_requests_total",
        "Total number of inference requests",
        &["model", "status"]
    ).unwrap();
    
    /// Inference duration histogram
    pub static ref INFERENCE_DURATION: HistogramVec = register_histogram_vec!(
        "hosted_ai_inference_duration_seconds",
        "Inference request duration in seconds",
        &["model"],
        vec![0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0]
    ).unwrap();
    
    /// Inference tokens histogram
    pub static ref INFERENCE_TOKENS: HistogramVec = register_histogram_vec!(
        "hosted_ai_inference_tokens",
        "Number of tokens used in inference",
        &["model"],
        vec![10.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2000.0]
    ).unwrap();
    
    /// API request duration
    pub static ref API_REQUEST_DURATION: HistogramVec = register_histogram_vec!(
        "hosted_ai_api_request_duration_seconds",
        "Duration of API requests to Hosted.AI",
        &["endpoint", "method", "status"],
        vec![0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
    ).unwrap();
    
    /// Circuit breaker state
    pub static ref CIRCUIT_BREAKER_STATE: GaugeVec = register_gauge_vec!(
        "hosted_ai_circuit_breaker_state",
        "Circuit breaker state (0=closed, 1=open, 2=half-open)",
        &["service"]
    ).unwrap();
    
    /// Resource utilization
    pub static ref GPU_UTILIZATION: GaugeVec = register_gauge_vec!(
        "hosted_ai_gpu_utilization_percent",
        "GPU utilization percentage",
        &["allocation_id", "metric_type"]
    ).unwrap();
    
    /// Cost tracking
    pub static ref INFERENCE_COST: CounterVec = register_counter_vec!(
        "hosted_ai_inference_cost_dollars",
        "Cumulative inference cost in dollars",
        &["model", "pool_id"]
    ).unwrap();
}

/// Timer for tracking operation duration
pub struct Timer {
    start: Instant,
}

impl Timer {
    pub fn new() -> Self {
        Timer {
            start: Instant::now(),
        }
    }
    
    pub fn observe_duration(self, histogram: &HistogramVec, labels: &[&str]) {
        let duration = self.start.elapsed().as_secs_f64();
        histogram.with_label_values(labels).observe(duration);
    }
}

/// Initialize all metrics with the global registry
pub fn init_metrics(registry: &Registry) -> Result<(), Box<dyn std::error::Error>> {
    registry.register(Box::new(GPU_ALLOCATIONS.clone()))?;
    registry.register(Box::new(GPU_ALLOCATION_DURATION.clone()))?;
    registry.register(Box::new(ACTIVE_GPU_ALLOCATIONS.clone()))?;
    registry.register(Box::new(INFERENCE_REQUESTS.clone()))?;
    registry.register(Box::new(INFERENCE_DURATION.clone()))?;
    registry.register(Box::new(INFERENCE_TOKENS.clone()))?;
    registry.register(Box::new(API_REQUEST_DURATION.clone()))?;
    registry.register(Box::new(CIRCUIT_BREAKER_STATE.clone()))?;
    registry.register(Box::new(GPU_UTILIZATION.clone()))?;
    registry.register(Box::new(INFERENCE_COST.clone()))?;
    Ok(())
}

/// Helper functions for metric updates
pub mod helpers {
    use super::*;
    
    pub fn record_allocation_attempt(pool_id: &str, success: bool) {
        let status = if success { "success" } else { "failed" };
        GPU_ALLOCATIONS.with_label_values(&[pool_id, status]).inc();
    }
    
    pub fn update_active_allocations(pool_id: &str, gpu_type: &str, delta: f64) {
        ACTIVE_GPU_ALLOCATIONS
            .with_label_values(&[pool_id, gpu_type])
            .add(delta);
    }
    
    pub fn record_inference_request(model: &str, success: bool) {
        let status = if success { "success" } else { "failed" };
        INFERENCE_REQUESTS.with_label_values(&[model, status]).inc();
    }
    
    pub fn record_inference_metrics(model: &str, duration_ms: u64, tokens: u32) {
        INFERENCE_DURATION
            .with_label_values(&[model])
            .observe(duration_ms as f64 / 1000.0);
        
        INFERENCE_TOKENS
            .with_label_values(&[model])
            .observe(tokens as f64);
    }
    
    pub fn update_circuit_breaker(service: &str, state: CircuitBreakerState) {
        let value = match state {
            CircuitBreakerState::Closed => 0.0,
            CircuitBreakerState::Open => 1.0,
            CircuitBreakerState::HalfOpen => 2.0,
        };
        CIRCUIT_BREAKER_STATE.with_label_values(&[service]).set(value);
    }
    
    pub fn record_api_request(endpoint: &str, method: &str, status_code: u16, duration: f64) {
        let status = format!("{}", status_code);
        API_REQUEST_DURATION
            .with_label_values(&[endpoint, method, &status])
            .observe(duration);
    }
    
    pub fn update_gpu_utilization(allocation_id: &str, gpu_percent: f64, memory_percent: f64) {
        GPU_UTILIZATION
            .with_label_values(&[allocation_id, "gpu"])
            .set(gpu_percent);
        GPU_UTILIZATION
            .with_label_values(&[allocation_id, "memory"])
            .set(memory_percent);
    }
    
    pub fn track_inference_cost(model: &str, pool_id: &str, cost_dollars: f64) {
        INFERENCE_COST
            .with_label_values(&[model, pool_id])
            .inc_by(cost_dollars);
    }
}

#[derive(Debug, Clone, Copy)]
pub enum CircuitBreakerState {
    Closed,
    Open,
    HalfOpen,
}

/// Metrics exporter for external systems
pub struct MetricsExporter {
    registry: Registry,
}

impl MetricsExporter {
    pub fn new() -> Self {
        let registry = Registry::new();
        init_metrics(&registry).expect("Failed to initialize metrics");
        
        MetricsExporter { registry }
    }
    
    pub fn gather(&self) -> Vec<prometheus::proto::MetricFamily> {
        self.registry.gather()
    }
    
    pub fn render(&self) -> String {
        use prometheus::Encoder;
        let encoder = prometheus::TextEncoder::new();
        let metric_families = self.registry.gather();
        let mut buffer = Vec::new();
        encoder.encode(&metric_families, &mut buffer).unwrap();
        String::from_utf8(buffer).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::helpers::*;
    
    #[test]
    fn test_metrics_recording() {
        // Test allocation metrics
        record_allocation_attempt("default", true);
        record_allocation_attempt("default", false);
        
        // Test active allocations
        update_active_allocations("default", "A100", 1.0);
        update_active_allocations("default", "A100", -1.0);
        
        // Test inference metrics
        record_inference_request("gemma-270m", true);
        record_inference_metrics("gemma-270m", 150, 75);
        
        // Test circuit breaker
        update_circuit_breaker("hosted-ai", CircuitBreakerState::Open);
        
        // Test cost tracking
        track_inference_cost("gemma-270m", "default", 0.001);
    }
    
    #[test]
    fn test_metrics_export() {
        let exporter = MetricsExporter::new();
        
        // Record some metrics
        record_allocation_attempt("test-pool", true);
        record_inference_request("test-model", true);
        
        // Export and check format
        let output = exporter.render();
        assert!(output.contains("hosted_ai_gpu_allocations_total"));
        assert!(output.contains("hosted_ai_inference_requests_total"));
    }
}