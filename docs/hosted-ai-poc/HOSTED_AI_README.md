# HostedAI Integration Guide

---
## Functionality Overview (from Code Inspection)

The Harpoon↔Hosted·ai integration platform implements a modular orchestration and observability system that coordinates AI workloads across compute layers.

### Core Components
- **Service Layer (`crates/service`)** — Axum-based REST API exposing `/health` and `/metrics`. Uses `tokio`, `prometheus`, and `tracing` for async runtime and observability.
- **Orchestrator Layer (`crates/orchestrator`)** — Handles async job routing, retry logic, and external API calls to Hosted·ai via a `reqwest` client (`hosted_ai.rs`).
- **Bridge Layer (`crates/harpoon_bridge`)** — Converts Harpoon orchestration events into Hosted·ai-compatible responses, tracking performance and outcomes.
- **Core Layer (`crates/harpoon-core`)** — Defines orchestration primitives, task graphs, and event-driven dispatch systems.
- **Resources Layer (`crates/resources`)** — Provides configuration and model mapping logic, linked to `configs/models.yaml`.
- **Integration Proofs** — Docker Compose and Kubernetes manifests validate deployment; Prometheus surfaces runtime metrics for validation.

Together, these modules provide verifiable proof of Hosted·ai compute integration through asynchronous orchestration, reliable job execution, and runtime observability.

```mermaid
flowchart TD
    A[Client / API Request] --> B[Service Layer (/health, /metrics)]
    B --> C[Orchestrator Layer (hosted_ai.rs)]
    C --> D[Bridge Layer]
    D --> E[Hosted·ai GPUaaS Endpoint]
    C --> F[Core Layer (Task Graphs, Events)]
    F --> G[Resources Layer (models.yaml)]
    E --> H[Results & Metrics Feedback]
    H --> B
    B --> I[Prometheus / Observability Stack]
```
---

**How we envision Harpoon connecting to Hosted·ai infrastructure for GPU-as-a-Service model inference**

This document outlines the integration architecture and implementation approach for connecting Harpoon's AI orchestration platform with HostedAI's GPUaaS infrastructure.

## Integration Architecture

Harpoon operates at the **platform layer** providing intelligent routing, fragmentation/fusion analysis, and multi-agent coordination, while consuming HostedAI GPUaaS endpoints at the **compute layer** for actual model inference.

### Two-Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│                Platform Layer (Harpoon)             │
│  ┌─────────────────┐    ┌─────────────────────────┐ │
│  │ Request         │    │ Fragment Analysis       │ │
│  │ Classification  │    │ & Hygiene Scoring       │ │
│  │ (Local)         │    │ (Local)                 │ │
│  └─────────────────┘    └─────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Intelligent Model Routing & Resource Mgmt       │ │
│  │ - Route to appropriate model based on complexity│ │
│  │ - Allocate GPU resources from HostedAI pools   │ │
│  │ - Handle overcommit and preemption             │ │
│  └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│                Compute Layer (HostedAI)             │
│  ┌─────────────────┐    ┌─────────────────────────┐ │
│  │ GPU Pool        │    │ Model Inference         │ │
│  │ Management      │    │ - Gemma-270M (simple)   │ │
│  │ - vGPU Alloc    │    │ - Qwen-30B (complex)    │ │
│  │ - Load Balance  │    │ - Custom models         │ │
│  └─────────────────┘    └─────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## HTTP Client Implementation

### Core HostedAI Connector

Located at `crates/orchestrator/src/hosted_ai.rs`, the connector provides:

```rust
pub struct HostedAiConnector {
    client: reqwest::Client,
    config: HostedAiConfig,
    circuit_breaker: Arc<CircuitBreaker>,
    metrics: Arc<HostedAiMetrics>,
}

impl HostedAiConnector {
    // Request vGPU allocation from pool
    pub async fn request_allocation(&self, requirements: ResourceRequirements) -> Result<AllocationId>;
    
    // Execute inference with allocated resources
    pub async fn inference(&self, allocation_id: AllocationId, request: InferenceRequest) -> Result<InferenceResponse>;
    
    // Release allocated resources
    pub async fn release_allocation(&self, allocation_id: AllocationId) -> Result<()>;
}
```

### Configuration

```yaml
hosted_ai:
  base_url: "https://api.hosted.ai"
  api_key: "${HOSTED_AI_API_KEY}"
  pool: "gpu-pool-1"
  overcommit: true
  timeout_secs: 30
  max_retries: 3
  circuit_breaker:
    failure_threshold: 5
    recovery_timeout: 60
```

## Request Flow

### 1. Request Classification (Local)
```rust
// Analyze request complexity using local Gemma-270M
let classification = orchestrator.classify(&request.text).await?;
```

### 2. Resource Requirements Calculation
```rust
let requirements = match classification.complexity {
    "simple" => ResourceRequirements {
        model: "gemma-270m",
        tflops: 5.0,
        vram_mb: 2048,
        max_tokens: 256,
    },
    "complex" => ResourceRequirements {
        model: "qwen-30b", 
        tflops: 30.0,
        vram_mb: 20480,
        max_tokens: 1024,
    },
};
```

### 3. HostedAI GPU Allocation
```rust
let allocation = hosted_ai.request_allocation(requirements).await?;
```

### 4. Model Inference Execution
```rust
let inference_request = InferenceRequest {
    prompt: enhanced_prompt,
    temperature: 0.7,
    max_tokens: requirements.max_tokens,
    model: requirements.model,
};

let response = hosted_ai.inference(allocation.id, inference_request).await?;
```

### 5. Resource Cleanup
```rust
hosted_ai.release_allocation(allocation.id).await?;
```

## Error Handling & Resilience

### Circuit Breaker Pattern
- **Failure Threshold**: 5 consecutive failures
- **Recovery Timeout**: 60 seconds
- **Fallback**: Mock responses with informative error messages

### Retry Logic
- **Exponential Backoff**: 100ms → 200ms → 400ms → 800ms
- **Max Retries**: 3 attempts
- **Retry Conditions**: Network timeouts, 5xx errors, rate limits

### Resource Management
- **Allocation Timeout**: 30 seconds
- **Inference Timeout**: 5 minutes for complex tasks
- **Automatic Cleanup**: Resources released on timeout or error

## API Endpoints

### HostedAI Integration Points

The current implementation expects these HostedAI API endpoints (section 7 in requirements):

```
POST /v1/allocate
{
  "pool_id": "gpu-pool-1",
  "requirements": {
    "tflops": 30,
    "vram_mb": 20480,
    "model": "qwen-30b"
  },
  "overcommit": true
}

POST /v1/inference
{
  "allocation_id": "alloc_123",
  "prompt": "User query...",
  "temperature": 0.7,
  "max_tokens": 1024
}

DELETE /v1/allocate/{allocation_id}
```

### Harpoon Endpoints with HostedAI

```
POST /v2/process
{
  "text": "Complex reasoning task",
  "deployment": "HostedAI"  // Routes to HostedAI infrastructure
}
```

## Monitoring & Observability

### Metrics Collected
- **Allocation Time**: Time to acquire GPU resources
- **Inference Latency**: End-to-end request processing time
- **Resource Utilization**: TFLOPS and VRAM usage
- **Error Rates**: By error type and recovery
- **Cost Tracking**: Resource usage for billing

### Prometheus Metrics
```
hosted_ai_allocations_total{pool="gpu-pool-1",model="qwen-30b"}
hosted_ai_allocation_duration_seconds{pool="gpu-pool-1"}
hosted_ai_inference_duration_seconds{model="qwen-30b"}
hosted_ai_errors_total{type="timeout",operation="inference"}
```

## Testing & Validation

### Integration Tests
Located at `crates/orchestrator/tests/hosted_ai_integration.rs`:

```rust
#[tokio::test]
async fn test_end_to_end_inference() {
    // Test complete flow: classify → allocate → inference → cleanup
}

#[tokio::test] 
async fn test_circuit_breaker_behavior() {
    // Verify fallback behavior under failures
}

#[tokio::test]
async fn test_resource_cleanup() {
    // Ensure resources are properly released
}
```

### Mock Server
For development and CI, a mock HostedAI server provides:
- Realistic response times and patterns
- Error scenario simulation
- Resource pool behavior modeling

## Production Deployment

### Docker Configuration
```dockerfile
FROM rust:1.70 as builder
# ... build steps ...

FROM debian:bookworm-slim
ENV HOSTED_AI_BASE_URL=https://api.hosted.ai
ENV HOSTED_AI_POOL_ID=production-pool
EXPOSE 8080 9090
CMD ["service"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: harpoon-hostedai
spec:
  template:
    spec:
      containers:
      - name: harpoon
        env:
        - name: HOSTED_AI_API_KEY
          valueFrom:
            secretKeyRef:
              name: hostedai-credentials
              key: api-key
```

## Cost Optimization

### Intelligent Scheduling
- **Pool Selection**: Route to least expensive available pools
- **Overcommit Strategy**: Enable overcommit for cost reduction
- **Request Batching**: Combine small requests when possible

### Usage Tracking
- **Per-Request Metrics**: Track TFLOPS-seconds and VRAM usage
- **Customer Attribution**: Multi-tenant cost allocation
- **Billing Integration**: Export usage data for invoicing

## Security Considerations

### API Security
- **TLS Everywhere**: All HostedAI communication over HTTPS
- **API Key Rotation**: Support for key rotation without downtime
- **Request Validation**: Input sanitization and size limits

### Multi-Tenant Isolation
- **Pool Segregation**: Separate GPU pools per customer tier
- **Resource Quotas**: Per-tenant usage limits
- **Data Isolation**: No cross-tenant data leakage

## Next Steps

1. **API Specification Alignment**: Await HostedAI API documentation for section 7 endpoints
2. **Live Integration Testing**: Test against actual HostedAI infrastructure
3. **Performance Optimization**: Tune based on real workload patterns
4. **Enterprise Features**: Enhanced security, compliance, and monitoring

The implementation is ready for integration testing and deployment once HostedAI API credentials and endpoint specifications are provided.