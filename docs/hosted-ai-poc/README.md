# Hosted AI POC Documentation

## Overview

This directory contains documentation and materials for the Hosted AI integration proof of concept with the Harpoon orchestration platform.

## Document Structure

### 1. [POC Email](./poc-email.md)
Communication template for POC proposal. Key points:
- Describes orchestration approach
- Explains workload processing methodology
- Outlines deliverables
- Lists requirements from Hosted AI

### 2. [POC Architecture](./poc-architecture.md)
Technical architecture document covering:
- Orchestration design
- Processing methodology
- Integration architecture with diagrams
- Resource allocation strategies
- API integration specifications
- Security and monitoring architecture

### 3. [POC Timeline](./poc-timeline.md)
Detailed 30-day implementation plan:
- Week 1: Foundation & Integration
- Week 2: Robustness & Monitoring
- Week 3: Validation & Optimization
- Week 4: Production Readiness
- Daily task breakdowns
- Risk mitigation strategies

### 4. [POC Requirements](./poc-requirements.md)
Complete requirements specification:
- API endpoint requirements
- Infrastructure prerequisites
- Testing requirements
- Compliance and legal needs
- Success criteria and KPIs

## Quick Start Guide

### For Hosted.AI Technical Team

1. **Review Architecture**: Start with [poc-architecture.md](./poc-architecture.md) to understand our integration approach
2. **Check Requirements**: Review [poc-requirements.md](./poc-requirements.md) for needed API details
3. **Timeline**: See [poc-timeline.md](./poc-timeline.md) for implementation schedule

### For Development Team

1. **Current State**: Check `/crates/orchestrator/src/hosted_ai.rs` for existing implementation
2. **Configuration**: See `.env.example` for required environment variables
3. **Docker Setup**: Use `Dockerfile.monorepo` for containerized deployment
4. **Testing**: Run integration tests with `cargo test --package orchestrator`

## Key Integration Points

### 1. GPU Allocation Flow
```
Request → Analyze → Allocate vGPU → Execute → Release
```

### 2. Supported Models
- Gemma-2B (2GB VRAM, 5 TFLOPS)
- Mistral-7B (6GB VRAM, 10 TFLOPS)
- Qwen-32B (32GB VRAM, 40 TFLOPS)
- Custom models via configuration

### 3. Monitoring Stack
- Prometheus metrics
- Grafana dashboards
- OpenTelemetry tracing
- Structured JSON logging

## Current Implementation Status

### ✅ Completed
- Architecture design
- Mock implementation
- Test infrastructure
- Documentation
- Monitoring setup

### 🚧 In Progress
- Real API integration
- Authentication implementation
- Performance optimization

### ❌ Pending
- Hosted.AI API credentials
- Staging environment access
- Production deployment

## Communication Channels

- **Technical Issues**: Create GitHub issue
- **API Questions**: Contact Hosted.AI support
- **POC Updates**: Weekly sync meetings
- **Escalations**: Direct email to project leads

## Deployment

### Local Development
```bash
# Install dependencies
cargo build --workspace

# Run tests
cargo test --workspace

# Start orchestrator
cargo run --bin homeskillet-orchestrator
```

### Docker Deployment
```bash
# Build monorepo image
docker build -f Dockerfile.monorepo -t homeskillet-poc .

# Run with configuration
docker run -v ./config:/app/config \
  -e HOSTED_AI_API_KEY=your_key \
  homeskillet-poc
```

### Kubernetes Deployment
See `/k8s` directory for Kubernetes manifests (coming soon).

## Metrics & Monitoring

### Key Metrics to Track
1. **Allocation Latency**: Time to acquire GPU
2. **Inference Latency**: End-to-end request time  
3. **GPU Utilization**: Actual vs allocated
4. **Cost Efficiency**: $/inference by model
5. **Error Rates**: By type and endpoint

### Dashboard Access
- Grafana: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- Application logs: `/app/logs`

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check API key in environment
   - Verify token expiration
   - Check IP whitelist

2. **Allocation Timeouts**
   - Check pool availability
   - Verify resource requirements
   - Review retry configuration

3. **Performance Issues**
   - Check connection pooling
   - Review batch sizes
   - Monitor network latency

## Next Steps

1. **Immediate**: Obtain API credentials from Hosted.AI
2. **Week 1**: Complete API integration
3. **Week 2**: Add production robustness
4. **Week 3**: Performance validation
5. **Week 4**: Production deployment

## Contact

For questions about this POC:
- Technical Lead: [Your Name]
- Hosted.AI Contact: hello@hosted.ai
- Project Repository: https://github.com/prompted365/homeskillet-csl