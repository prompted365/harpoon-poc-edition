# Harpoon PoC Edition: HostedAI Integration

**Prompted LLC** - AI Orchestration Platform Integration with HostedAI GPUaaS

This directory contains the proof-of-concept implementation demonstrating Harpoon's integration with HostedAI's GPU-as-a-Service infrastructure for scalable AI model orchestration.

## PoC Overview

Harpoon operates at the platform layer providing intelligent request routing and resource management, while leveraging HostedAI's infrastructure at the compute layer for GPU allocation and model inference. This streamlined integration showcases enterprise-ready AI orchestration without traditional CAPEX constraints.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Platform Layer (Harpoon)              │
│  • Request Classification & Intelligent Routing     │
│  • Resource Management & Pool Allocation           │
│  • Circuit Breaker & Retry Logic                   │
├─────────────────────────────────────────────────────┤
│              Compute Layer (HostedAI)              │
│  • GPU Pool Management                             │
│  • Model Inference (Gemma-270M, Qwen-30B)         │
│  • vGPU Allocation & Release                       │
└─────────────────────────────────────────────────────┘
```

## Key Features

- **Intelligent Routing**: Automatic model selection based on request complexity
- **Resource Efficiency**: Dynamic GPU allocation with overcommit support
- **Production Ready**: Circuit breakers, retry logic, and comprehensive monitoring
- **Cost Optimized**: Minimal resource usage with intelligent cleanup
- **Enterprise Security**: Multi-tenant isolation and secure credential management

## Quick Start

### Prerequisites
- HostedAI API credentials and endpoint access
- Docker (optional, for containerized deployment)

### Configuration
```bash
# Set HostedAI credentials
export HOSTED_AI_BASE_URL="https://api.hosted.ai"
export HOSTED_AI_API_KEY="your-api-key"
export HOSTED_AI_POOL_ID="gpu-pool-1"
```

### Running the PoC
```bash
# Build and run the service
cargo run -p service

# Test health endpoint
curl http://localhost:8080/health

# Test HostedAI integration
curl -X POST http://localhost:8080/v2/process \
  -H "Content-Type: application/json" \
  -d '{"text": "Complex reasoning task", "deployment": "HostedAI"}'
```

## Implementation Details

### Request Flow
1. **Classification**: Local analysis determines model complexity
2. **Allocation**: Request vGPU resources from HostedAI pool
3. **Inference**: Execute inference with allocated resources
4. **Cleanup**: Automatic resource release and monitoring

### Supported Models
- **Gemma-270M**: Simple tasks (2GB VRAM, 5 TFLOPS)
- **Qwen-30B**: Complex reasoning (20GB VRAM, 30 TFLOPS)
- **Custom Models**: Configurable via requirements specification

### Integration Points

The PoC implements these HostedAI API endpoints:
- `POST /v1/allocate` - Request GPU allocation
- `POST /v1/inference` - Execute model inference  
- `DELETE /v1/allocate/{id}` - Release allocated resources

## Production Features

- **Circuit Breaker**: Automatic fallback during API failures
- **Retry Logic**: Exponential backoff with intelligent retry conditions
- **Monitoring**: Prometheus metrics for allocation latency and resource usage
- **Security**: Multi-tenant isolation and credential management

## Potential Next Steps

1. **API Integration**: Align with actual HostedAI endpoint specifications
2. **Live Testing**: Validate performance against real GPU infrastructure
3. **Production Deployment**: Scale monitoring and optimize for production workloads

## Technical Documentation

For detailed implementation:
- **Core Integration**: `crates/orchestrator/src/hosted_ai.rs`
- **API Service**: `crates/service/src/main.rs`
- **Configuration**: `configs/` directory

## Contact

**Prompted LLC** - [support@promptedllc.com](mailto:support@promptedllc.com)  
Project Repository: [github.com/prompted365/harpoon-poc-edition](https://github.com/prompted365/harpoon-poc-edition)
