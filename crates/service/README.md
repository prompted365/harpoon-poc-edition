# Service Crate

✅ **Build Status: All Issues Resolved!**

The service crate provides the HTTP API server for the Homeskillet platform. Built with Axum, it exposes RESTful endpoints for model inference, covenant management, and strike operations. 

**✅ All build and dependency issues have been resolved:**
- Builds successfully without Python dependencies
- All tests pass
- Docker deployment works
- Full workspace compatibility achieved

## Overview

The service acts as the primary interface to the Homeskillet platform, handling:
- HTTP request routing and validation
- Authentication and authorization
- Request/response serialization
- Error handling and logging
- Health monitoring and metrics

## Architecture

```
┌────────────────────────────────────────┐
│          HTTP Layer (Axum)             │
│  • Route definitions                   │
│  • Middleware (CORS, tracing, auth)    │
│  • Request validation                  │
├────────────────────────────────────────┤
│         Handler Functions              │
│  • Business logic coordination         │
│  • Error transformation                │
│  • Response formatting                 │
├────────────────────────────────────────┤
│          State Management              │
│  • UnifiedOrchestrator instance        │
│  • Configuration                       │
│  • Connection pools                    │
└────────────────────────────────────────┘
```

## API Endpoints

### Health & Status

#### GET /health
Returns service health and capabilities:

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "models": {
    "gemma": "loaded",
    "qwen": "available"
  },
  "deployment": "native",
  "uptime_seconds": 3600
}
```

### Legacy MLX Endpoints

#### POST /classify
Classify text complexity and category:

```bash
curl -X POST http://localhost:8080/classify \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Explain the theory of relativity"
  }'

Response:
{
  "category": "reasoning",
  "complexity": "complex",
  "latency_ms": 45
}
```

#### POST /run
Run inference with automatic model routing:

```bash
curl -X POST http://localhost:8080/run \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Write a binary search function in Rust"
  }'

Response:
{
  "output": "fn binary_search<T: Ord>(arr: &[T], target: &T) -> Option<usize> {...}",
  "model_used": "qwen-30b",
  "tokens": 156
}
```

### Unified v2 Endpoints

#### POST /v2/unified
Process request through full pipeline:

```bash
curl -X POST http://localhost:8080/v2/unified \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Refactor this authentication code",
    "covenant_id": "cov-abc123",
    "fragment_context": {
      "path": "src/auth.rs",
      "idx": 0,
      "lines": "10-50"
    },
    "deployment": "Native"
  }'

Response:
{
  "classification": {
    "is_complex": true,
    "reasoning": "Code refactoring requires analysis",
    "confidence": 0.85
  },
  "inference_result": {
    "text": "Here's the refactored code...",
    "model_used": "qwen-30b",
    "tokens_generated": 512
  },
  "fusion_result": {
    "absorbed_count": 1,
    "hygiene_score": 0.82,
    "anchors": ["abc123...", "def456..."]
  }
}
```

#### POST /v2/covenant
Create a new work covenant:

```bash
curl -X POST http://localhost:8080/v2/covenant \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Migrate to Microservices",
    "description": "Break down monolith into services",
    "reality_state": {
      "description": "Single monolithic application",
      "key_aspects": ["tightly coupled", "single database"]
    },
    "target_state": {
      "description": "Microservices architecture",
      "success_criteria": ["loose coupling", "independent deployment"]
    }
  }'

Response:
{
  "covenant_id": "cov-xyz789",
  "status": "created"
}
```

#### POST /v2/strike
Execute a strike operation:

```bash
curl -X POST http://localhost:8080/v2/strike \
  -H "Content-Type: application/json" \
  -d '{
    "covenant_id": "cov-xyz789",
    "target_repos": ["org/api", "org/frontend", "org/auth"],
    "options": {
      "dry_run": false,
      "auto_merge": false
    }
  }'

Response:
{
  "run_id": "strike-abc123",
  "covenant_id": "cov-xyz789",
  "pr_links": [
    "https://github.com/org/api/pull/123",
    "https://github.com/org/frontend/pull/456",
    "https://github.com/org/auth/pull/789"
  ],
  "cable_states": {
    "org/api": "pending",
    "org/frontend": "pending",
    "org/auth": "pending"
  },
  "execution_time_ms": 2345
}
```

## ✅ Deployment Modes (All Working)

### 🚀 Lightweight Mode (Default & Recommended)

**Status: ✅ Fully Working**

Runs without Python dependencies using mock inference engines that provide informative error messages:

```bash
# Build and run - works immediately!
cargo build --release -p service
./target/release/service

# Quick test - works out of the box
cargo run -p service

# Test endpoints
curl http://localhost:8080/health
# Returns: {"status":"healthy","deployment_modes":["native","hosted_ai"],"version":"0.1.0"}

curl -X POST http://localhost:8080/classify -H "Content-Type: application/json" -d '{"text": "test"}'
# Returns informative message about mock engine usage
```

### HostedAI Integration Mode

Use with cloud GPU infrastructure by setting environment variables:

```bash
# Set HostedAI credentials
export HOSTED_AI_BASE_URL=https://api.hosted.ai
export HOSTED_AI_API_KEY=your-api-key
export HOSTED_AI_POOL_ID=your-pool
export HOSTED_AI_OVERCOMMIT=true

# Run service
cargo run -p service
```

### Full PyMLX Mode (Apple Silicon)

Build with PyMLX support for local inference:

```bash
# Build orchestrator with PyMLX features
cargo build --release -p orchestrator --features pymlx
cargo build --release -p service

# Run with PyMLX enabled (requires MLX models)
RUST_FEATURES="pymlx" ./target/release/service
```

## Configuration

### Environment Variables

```bash
# Service configuration
SERVICE_PORT=8080
SERVICE_HOST=0.0.0.0
RUST_LOG=info

# Model paths (native mode)
GEMMA_MODEL_PATH=/path/to/gemma
QWEN_MODEL_PATH=/path/to/qwen

# HostedAI (production mode)
HOSTED_AI_URL=https://api.hosted.ai
HOSTED_AI_API_KEY=your-key
HOSTED_AI_POOL=gpu-pool-1

# GitHub integration
GITHUB_TOKEN=<your-github-personal-access-token>
GITHUB_ORG=your-org

# Monitoring
METRICS_PORT=9090
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

### Configuration File

Located at `~/.orchestrator/config.yaml`:

```yaml
service:
  port: 8080
  host: "0.0.0.0"
  max_body_size: 10485760  # 10MB
  request_timeout_s: 300
  
cors:
  allowed_origins: ["*"]
  allowed_methods: ["GET", "POST", "PUT", "DELETE"]
  allowed_headers: ["*"]
  max_age: 3600

rate_limiting:
  enabled: true
  requests_per_minute: 60
  burst: 10

auth:
  enabled: false
  type: "bearer"
  tokens: ["${SERVICE_AUTH_TOKEN}"]
```

## Running the Service

### Development Mode

```bash
# With hot reloading
cargo watch -x 'run -p service'

# With debug logging
RUST_LOG=debug cargo run -p service

# With specific config
CONFIG_PATH=./dev.yaml cargo run -p service
```

### Production Mode

```bash
# Build optimized binary
cargo build --release -p service

# Run with production settings
./target/release/service \
  --host 0.0.0.0 \
  --port 8080 \
  --config /etc/homeskillet/config.yaml
```

### Docker Deployment

```bash
# Build image
docker build -t homeskillet-service .

# Run container
docker run -d \
  -p 8080:8080 \
  -e HOSTED_AI_API_KEY=your-key \
  -v ~/.orchestrator:/root/.orchestrator \
  homeskillet-service
```

## Middleware

### CORS
Configurable Cross-Origin Resource Sharing:
- Allowed origins (default: all)
- Allowed methods
- Preflight caching

### Tracing
Structured logging with tracing:
- Request IDs
- Timing information
- Error tracking

### Rate Limiting
Token bucket algorithm:
- Per-IP limiting
- Configurable rates
- Burst allowance

### Authentication
Optional authentication:
- Bearer token
- API key header
- JWT (future)

## Error Handling

Consistent error responses:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required field: text",
    "details": {
      "field": "text",
      "reason": "required"
    }
  },
  "request_id": "req-123456"
}
```

Error codes:
- `INVALID_REQUEST`: Malformed input
- `NOT_FOUND`: Resource missing
- `INTERNAL_ERROR`: Server error
- `RATE_LIMITED`: Too many requests
- `UNAUTHORIZED`: Auth failure

## State Management

### AppState
Shared application state:

```rust
struct AppState {
    unified_orchestrator: Arc<UnifiedOrchestrator>,
    config: Arc<Config>,
    metrics: Arc<Metrics>,
}
```

### Resource Pooling
- Database connections
- HTTP clients
- Model instances

## Monitoring

### Metrics Exposed
- Request rate and latency
- Error rate by endpoint
- Model inference times
- Memory usage
- Active connections

### Health Checks
- Liveness: Basic ping
- Readiness: Model loading status
- Deep: Full system check

### Logging
Structured JSON logs:
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "INFO",
  "message": "Request processed",
  "request_id": "req-123",
  "method": "POST",
  "path": "/v2/unified",
  "latency_ms": 234,
  "status": 200
}
```

## Performance Tuning

### Connection Settings
- Keep-alive timeout: 60s
- Max connections: 10000
- Buffer sizes: 64KB

### Thread Pool
- Worker threads: CPU cores * 2
- Blocking threads: 512
- Stack size: 2MB

### Caching
- Classification results: 5 minutes
- Static responses: 1 hour
- Model outputs: Disabled

## Security

### Input Validation
- Size limits enforced
- Schema validation
- SQL injection prevention
- XSS protection

### Rate Limiting
- Per-IP tracking
- Distributed rate limiting
- DDoS protection

### TLS Support
```bash
# With TLS
./service \
  --tls-cert /path/to/cert.pem \
  --tls-key /path/to/key.pem
```

## Testing

### Unit Tests
```bash
cargo test -p service
```

### Integration Tests
```bash
# Start service
cargo run -p service &

# Run tests
./scripts/test.sh
```

### Load Testing
```bash
# Using vegeta
echo "POST http://localhost:8080/classify" | \
  vegeta attack -body payload.json -rate 100 -duration 30s | \
  vegeta report
```

## Deployment Checklist

Before deploying:
- [ ] Set production config
- [ ] Enable authentication
- [ ] Configure rate limits
- [ ] Set up monitoring
- [ ] Test health endpoints
- [ ] Verify TLS setup
- [ ] Check resource limits
- [ ] Enable structured logging
- [ ] Set up log aggregation
- [ ] Configure backups

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   SERVICE_PORT=8081 cargo run -p service
   ```

2. **Model loading failures**
   - Check model paths
   - Verify permissions
   - Ensure sufficient memory

3. **High latency**
   - Profile with flamegraph
   - Check model loading
   - Verify connection pooling

4. **Memory leaks**
   - Enable heap profiling
   - Check Python objects
   - Monitor over time

## Contributing

When adding endpoints:
1. Define request/response types
2. Add validation
3. Implement handler
4. Add tests
5. Update OpenAPI spec
6. Document in README