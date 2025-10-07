# HostedAI POC Implementation

This is the **poc-README.md** for the HostedAI integration proof of concept implementation.

## POC Overview

This POC demonstrates Harpoon's integration with HostedAI's GPUaaS infrastructure for scalable AI model orchestration. The implementation shows how Harpoon operates at the platform layer providing intelligent routing and coordination while consuming HostedAI endpoints at the compute layer.

## Current Implementation Status

✅ **HTTP Client Implementation**: Complete with retry logic and circuit breakers  
✅ **Model Routing**: Intelligent routing between Gemma-270M and Qwen-30B  
✅ **Resource Management**: GPU allocation and pool management interfaces  
✅ **API Integration**: Ready for HostedAI endpoint integration  
✅ **Monitoring**: Prometheus metrics and health check endpoints  

## Key Files

- `crates/orchestrator/src/hosted_ai.rs` - HostedAI HTTP client implementation
- `crates/service/src/main.rs` - HTTP API service with HostedAI routing
- `crates/harpoon_bridge/src/lib.rs` - Unified orchestration layer
- `configs/docker-compose.poc.yml` - POC deployment configuration

## Quick Start

```bash
# Build the POC (lightweight mode - no Python dependencies)
cargo build -p service -p orchestrator

# Run the service
cargo run -p service

# Test health endpoint
curl http://localhost:8080/health

# Test HostedAI routing (requires API credentials)
export HOSTED_AI_BASE_URL="https://api.hosted.ai"
export HOSTED_AI_API_KEY="your-key"
export HOSTED_AI_POOL_ID="gpu-pool-1"

curl -X POST http://localhost:8080/v2/process \
  -H "Content-Type: application/json" \
  -d '{"text": "Complex reasoning task", "deployment": "HostedAI"}'
```

## Integration Points

The POC is ready for HostedAI API integration. The implementation expects these endpoints:

- `POST /v1/allocate` - Request GPU allocation from pool
- `POST /v1/inference` - Execute inference with allocated resources  
- `DELETE /v1/allocate/{id}` - Release allocated resources

## Next Steps

1. **API Specification Alignment**: Integrate with actual HostedAI API endpoints
2. **Live Testing**: Validate against real HostedAI infrastructure
3. **Performance Optimization**: Tune based on actual workload patterns
4. **Production Deployment**: Scale and monitor in production environment

See the complete documentation in the `docs/hosted-ai-poc/` directory.