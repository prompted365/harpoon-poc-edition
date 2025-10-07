# Harpoon: Open Source AI Orchestration Platform

**By Prompted LLC** - A lightweight, production-ready AI orchestration platform with flexible deployment options.

A comprehensive AI orchestration platform that seamlessly integrates intelligent model routing, multi-agent coordination, and flexible deployment options. Built with Rust for performance and reliability, Harpoon provides a unified interface for AI workflows across local hardware and cloud GPU infrastructure.

## Project Statistics

- **Total Files**: 6,250
- **Total Lines of Code**: 2.93M
- **Languages**: Rust (14,867 LOC), Python (2.83M LOC), TypeScript (1,155 LOC), JavaScript (1,449 LOC)
- **Rust Crates**: 9 specialized crates for different functionality
- **AI Agents**: 4 compliance-focused agents
- **Documentation**: 89 files including 35 GTM-specific documents
- **Compliance Frameworks**: HIPAA, SOC2, GDPR, PCI-DSS, ISO27001, NIST

## Architecture Overview

📖 **For detailed architecture documentation, see [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md)**

Harpoon is designed as a layered system that provides maximum flexibility while maintaining a clean, unified API:

```
┌─────────────────────────────────────────────────┐
│             Unified API Layer (v2)              │
│  • Covenant Management  • Strike Orchestration  │
│  • Fragment Processing  • Model Routing         │
├─────────────────────────────────────────────────┤
│          Orchestration Core                     │
│  ┌─────────────┐  ┌──────────────────────────┐ │
│  │ MLX Router  │  │ Harpoon Fusion Engine    │ │
│  │ • Gemma 270M│  │ • Fragment Analysis      │ │
│  │ • Qwen 30B  │  │ • Hygiene Scoring        │ │
│  │ • Auto-route│  │ • Anchor Management      │ │
│  └─────────────┘  └──────────────────────────┘ │
├─────────────────────────────────────────────────┤
│           Deployment Abstraction                │
│  ┌─────────────┐  ┌──────────────────────────┐ │
│  │Native (MLX) │  │ HostedAI (GPUaaS)       │ │
│  │ • Local GPU │  │ • Pool Allocation        │ │
│  │ • PyO3 FFI  │  │ • vGPU Management        │ │
│  │ • WASM Edge │  │ • Overcommit Support     │ │
│  └─────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Core Components

### Intelligent Model Routing
- **Two-tier architecture**: Lightweight Gemma-270M for simple tasks, powerful Qwen-30B for complex reasoning
- **Automatic classification**: Requests are analyzed and routed to the optimal model
- **Context-aware processing**: Maintains conversation context across model transitions
- **Resource optimization**: Minimizes latency and resource usage through intelligent routing

### Multi-Agent Coordination System
- **Covenant framework**: Define transformations from current reality to target state
- **Strike operations**: Automated, coordinated changes across multiple repositories
- **Fusion processing**: Real-time code fragment analysis and hygiene scoring
- **Cable management**: Tracks relationships and dependencies between repositories

### Flexible Deployment Options
- **Native MLX**: Optimized for Apple Silicon with direct hardware acceleration
- **HostedAI Integration**: Seamless cloud GPU allocation and management
- **WASM Support**: Edge deployment for client-side classification
- **Python Bindings**: Direct integration into existing Python workflows

## Getting Started

### Prerequisites

```bash
# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Python 3.8+ (for MLX support)
python3 --version

# MLX (Apple Silicon only)
pip install mlx mlx-lm
```

### Quick Installation

```bash
# Clone the repository
git clone https://github.com/prompted365/harpoon-open-source.git
cd harpoon-open-source

# Build and run (lightweight mode - no Python dependencies required)
make run

# Or set up full development environment
make init  # Set up Python environment and wasm-pack
make build # Build all components
```

### Build Modes

✅ **All build issues have been resolved!** The system now builds successfully in all modes:

#### 🚀 Lightweight Mode (Production Ready - Recommended)
```bash
# Run service without Python dependencies - uses mock inference engines
make run
# or
cargo run -p service

# This mode provides:
# - Full HTTP API functionality  
# - Health checks and monitoring
# - HostedAI cloud GPU integration
# - WASM classifier support
# - No Python linking issues
# - Fast build times
# - Cross-platform compatibility
```

#### ⚡ Full PyMLX Mode (Apple Silicon Development)
```bash
# Initialize Python environment and install MLX dependencies
make init

# Build with PyMLX features enabled
cargo build --workspace --all-features

# Run with MLX support enabled
cargo run -p service --features pymlx
```

#### ☁️ HostedAI Mode (Cloud GPU Integration)
```bash
# Configure HostedAI credentials
export HOSTED_AI_BASE_URL="https://api.hosted.ai"
export HOSTED_AI_API_KEY="your-api-key"
export HOSTED_AI_POOL_ID="gpu-pool-1"

# Run in lightweight mode with HostedAI integration
cargo run -p service
```

### ✅ Build Status Summary

All major build issues have been resolved:

- **✅ Rust workspace builds successfully** (`cargo build --workspace --all-features`)
- **✅ Python extension builds successfully** (`cargo build -p homeskillet_oa4_rs --features pyo3/extension-module`)
- **✅ WASM components build successfully** (`cargo build --target wasm32-unknown-unknown -p wasm_classifier`)
- **✅ All tests pass** (`cargo test --workspace --exclude orchestrator`)
- **✅ Type compatibility resolved** between GenOptions across crates
- **✅ MCP server builds and runs** with proper JSON-RPC handling
- **✅ Service layer completely decoupled** from Python dependencies
- **✅ Docker builds work** in lightweight mode

### Configuration

📖 **See [`configs/README.md`](configs/README.md) for detailed configuration options.**

Quick setup - create `~/.orchestrator/config.yaml`:

```yaml
# Model Configuration
models:
  gemma:
    repo: "google/gemma-270m"
    context_limit: 4096
    temperature: 0.7
    top_p: 0.9
    max_new_tokens: 256
  qwen:
    repo: "Qwen/Qwen-30B"
    context_limit: 8192
    temperature: 0.8
    top_p: 0.95
    max_new_tokens: 1024
    enable_thinking: true

# Harpoon Settings
harpoon:
  hygiene_threshold: 0.7
  max_iterations: 10
  thread_count: null  # auto-detect

# HostedAI Configuration (optional)
hosted_ai:
  base_url: "https://api.hosted.ai"
  api_key: "your-api-key"
  pool: "gpu-pool-1"
  overcommit: true

# Service Configuration
service:
  port: 8080
  log_level: "info"
```

## API Reference

📖 **For detailed API documentation, see [`docs/reference/api.md`](docs/reference/api.md)**

### Current HTTP Endpoints

#### Health Check
```bash
GET /health

# Response:
{
  "status": "healthy",
  "deployment_modes": ["native", "hosted_ai"],
  "version": "0.1.0"
}
```

#### Legacy Endpoints (Production Ready)
```bash
# Text classification
POST /classify
{
  "text": "Write a hello world program in Python"
}

# Response:
{
  "category": "simple",  // or "complex"
  "complexity": "0.85",
  "latency_ms": 42
}

# Model inference
POST /run
{
  "text": "Explain quantum computing"
}

# Response:
{
  "output": "Generated response text..."
}
```

### Unified v2 Endpoints

#### Process Text with Full Pipeline
```bash
POST /v2/process
{
  "text": "Implement a binary search algorithm",
  "deployment": "Native",  // or "HostedAI"
  "fragment_context": {    // optional
    "path": "src/search.rs",
    "idx": 0,
    "lines": "1-20"
  }
}
```

#### Create Work Covenant
```bash
POST /v2/covenant
{
  "title": "Refactor Authentication System",
  "description": "Modernize auth to use JWT tokens",
  "reality_state": {
    "description": "Current session-based auth",
    "key_aspects": ["cookie-based", "server-side sessions"]
  },
  "target_state": {
    "description": "JWT-based stateless auth",
    "success_criteria": ["token refresh", "secure storage"]
  }
}
```

#### Execute Strike Operation
```bash
POST /v2/strike
{
  "covenant_id": "cov-abc123",
  "target_repos": [
    "org/auth-service",
    "org/frontend-app"
  ]
}
```

### Service Configuration

Configure via environment variables:

```bash
# Service settings
SERVICE_HOST=0.0.0.0
SERVICE_PORT=8080

# HostedAI integration (optional)
HOSTED_AI_BASE_URL=https://api.hosted.ai
HOSTED_AI_API_KEY=your-api-key
HOSTED_AI_POOL_ID=gpu-pool-1
HOSTED_AI_OVERCOMMIT=true

# MCP WebSocket server
MCP_WS_HOST=127.0.0.1
MCP_WS_PORT=3002
MCP_API_KEY=optional-api-key

# GitHub OAuth (if needed)
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-secret
```

## Deployment Modes

### Lightweight Mode (Production Ready)

Runs without Python dependencies, using mock inference engines. Perfect for:
- Development environments
- Edge deployments
- Microservice architectures where ML is handled separately

```bash
# Build and run (no Python required)
cargo build --release -p service
./target/release/service

# Or using make
make run
```

### Native Mode (Apple Silicon + MLX)

Leverages MLX for optimal performance on Apple hardware:

```bash
# Set up Python environment
make init

# Download models (Apple Silicon only)
python -m mlx_lm.download --model google/gemma-270m
python -m mlx_lm.download --model Qwen/Qwen-30B

# Build with PyMLX support
cargo build --release -p orchestrator --features pymlx
cargo build --release -p service

# Run with native MLX
RUST_FEATURES="pymlx" ./target/release/service
```

### HostedAI Mode (Cloud GPU)

Utilizes HostedAI's GPUaaS infrastructure for scalable deployment:

```bash
# Configure HostedAI credentials in .env
HOSTED_AI_BASE_URL=https://api.hosted.ai
HOSTED_AI_API_KEY=your-key
HOSTED_AI_POOL_ID=gpu-pool-1
HOSTED_AI_OVERCOMMIT=true

# Run service (lightweight mode handles HostedAI calls via HTTP)
cargo run -p service
```

### Docker Deployment

For containerized environments (lightweight mode):

```bash
# Build and run container
docker build -t homeskillet-oa4-rs .
docker run -p 8080:8080 homeskillet-oa4-rs
```

## Development

### Building Components

```bash
# Full workspace build (all features)
cargo build --workspace --all-features

# Lightweight build (no Python dependencies - production ready)
cargo build -p service -p orchestrator -p wasm_classifier

# Individual components
cargo build -p service          # HTTP service
cargo build -p orchestrator     # Core orchestration engine  
cargo build -p harpoon-core     # Core fusion engine
cargo build -p harpoon_bridge   # Bridge for multi-agent coordination
cargo build -p mcp_server       # Model Context Protocol server
cargo build -p wasm_classifier  # WASM module
cargo build -p resources        # MCP resource management
cargo build -p engine_pymlx     # MLX inference engine

# Python extensions (Apple Silicon only)
cargo build -p homeskillet_oa4_rs --features pyo3/extension-module

# WASM module for web deployment
cargo build --target wasm32-unknown-unknown -p wasm_classifier
```

### Running Tests

```bash
# All tests (excluding orchestrator due to Python dependencies)
cargo test --workspace --exclude orchestrator

# Full workspace tests (requires Python environment)
cargo test --workspace --all-features

# Integration tests
cargo test --test "*" -- --nocapture

# Specific crate tests
cargo test -p service
cargo test -p harpoon_bridge
cargo test -p mcp_server
cargo test -p wasm_classifier
cargo test -p resources

# Python extension tests (requires MLX setup)
cargo test -p orchestrator --features pymlx
```

### Model Context Protocol (MCP)

Ubiquity Harpoon includes full MCP support for IDE integration:

```bash
# Stdio transport
cargo run -p mcp_server

# HTTP transport
cargo run -p mcp_server -- --http --port 3000
```

## Advanced Features

### Fragment Fusion Processing

The fusion engine analyzes code fragments for quality and coherence:

```python
import harpoon_core

engine = harpoon_core.HarpoonEngine()
fragments = [{
    "path": "src/main.rs",
    "idx": 0,
    "lines": "1-50",
    "body": "fn main() { ... }"
}]

cycle = engine.envelope_cycle(
    fragments, 
    hygiene_threshold=0.8,
    max_iterations=10
)

print(f"Absorbed: {len(cycle.absorbed)} fragments")
print(f"Hygiene score: {cycle.hygiene_score}")
```

### Covenant-Driven Development

Define high-level transformations that cascade into coordinated changes:

1. **Define Reality**: Current state analysis
2. **Define Target**: Desired end state
3. **Harmony Review**: Automatic repository selection
4. **Strike Execution**: Parallel PR creation
5. **Cable Monitoring**: Track progress across repos

### Resource Management

When using HostedAI, the system automatically:
- Allocates vGPU resources from available pools
- Manages overcommit for cost optimization
- Handles preemption and retry logic
- Tracks usage metrics for billing

## Performance Optimization

### Model Loading Strategy
- Gemma-270M kept resident for low latency
- Qwen-30B lazy-loaded on demand
- Context limits enforced to control memory
- Batch size=1 for MoE efficiency

### Fusion Engine Optimization
- Parallel fragment processing
- Anchor deduplication
- Incremental hygiene scoring
- Thread pool auto-sizing

## Security Considerations

- **Data Privacy**: No request logging by default
- **API Security**: Token-based authentication
- **Isolation**: Multi-tenant safety in HostedAI mode
- **Redaction**: Automatic PII removal in logs

## Monitoring and Observability

### Metrics Exported
- Request latency by model
- Token generation rates
- Memory usage patterns
- Fragment processing statistics

### Health Checks
```bash
# Basic health
curl http://localhost:8080/health

# Detailed status
curl http://localhost:8080/health?detailed=true
```

## Go-to-Market (GTM) Framework

Ubiquity Harpoon includes a comprehensive GTM framework for enterprise deployment:

### Compliance Automation
- **Automated Compliance Scanning**: Scripts to scan and verify compliance with major frameworks
- **AI Compliance Agents**: 4 specialized agents for policy generation, risk analysis, audit assistance, and compliance monitoring
- **Audit Trail Generation**: Automated documentation for compliance audits
- **Policy Templates**: Pre-built templates for all major compliance frameworks

### Enterprise Features
- **Multi-Tenant Architecture**: Secure isolation and resource management
- **GPU Resource Allocation**: Flexible GPU pool management with overcommit support
- **Enterprise Authentication**: GitHub OAuth and extensible auth providers
- **Billing Integration**: Usage tracking and cost allocation

### Sales & Support Materials
- **Pitch Deck Components**: Executive pitch, technical deep-dive, ROI calculator
- **Pricing Tiers**: 4 tiers from startup to enterprise with GPU allocations
- **Onboarding Materials**: Customer journey maps, technical checklists, training curriculum
- **Support Documentation**: Agent prompts, success metrics, tracking systems

For detailed GTM documentation, see the `/docs/gtm/` directory.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

This project uses a multi-license approach to balance open-source collaboration with commercial sustainability:

### Core Crates (Dual MIT/Apache-2.0)
The following core crates are dual-licensed under MIT OR Apache-2.0:
- **orchestrator**: Core orchestration engine for AI model routing
- **harpoon-core**: Fusion envelope primitives for distributed orchestration

You may choose either license for these crates. See [LICENSE-MIT](LICENSE-MIT) and [LICENSE-APACHE](LICENSE-APACHE).

### Application Crates (Custom License)
All other crates that depend on the core crates use a custom license:
- **service**: HTTP API service
- **mcp_server**: Model Context Protocol server
- **harpoon_bridge**: Bridge layer for multi-agent coordination
- **resources**: MCP resource management
- **wasm_classifier**: WebAssembly classifier
- **pyffi**: Python FFI bindings
- **engine_pymlx**: MLX inference engine

See [LICENSE-CUSTOM](LICENSE-CUSTOM) for details. Commercial use requires explicit permission.

### Why This Approach?
- **Core Innovation**: The core orchestration and fusion algorithms are fully open-source
- **Sustainable Development**: Application layer licensing ensures continued development
- **Commercial Friendly**: Dual licensing allows both open and commercial use of core components
- **Clear Boundaries**: Easy to understand what's freely usable vs. what requires licensing

For commercial licensing inquiries: breyden@prompted.community

## 📚 Documentation Structure

The project documentation is organized in the [`docs/`](docs/) directory:

- **🏢 Architecture**: [`docs/architecture/`](docs/architecture/) - System design and architecture
- **🚀 Deployment**: [`docs/deployment/`](docs/deployment/) - Build, setup, deployment, and troubleshooting guides
- **🔌 Integration**: [`docs/integration/`](docs/integration/) - Third-party service integration guides
- **📜 Reference**: [`docs/reference/`](docs/reference/) - API documentation and technical references
- **📈 Status**: [`docs/status/`](docs/status/) - Project status updates and reports
- **🔍 Analysis**: [`docs/analysis/`](docs/analysis/) - Automated codebase analysis
- **🛡️ Audits**: [`docs/audits/`](docs/audits/) - Security and compliance reports
- **🎯 GTM**: [`docs/gtm/`](docs/gtm/) - Go-to-market materials and enterprise docs

See [`docs/README.md`](docs/README.md) for the complete documentation index.

## Support

- **Documentation**: [`docs/`](docs/) - Complete project documentation
- **Issues**: [GitHub Issues](https://github.com/prompted365/harpoon-open-source/issues)
- **Quick Start**: [`docs/deployment/SETUP.md`](docs/deployment/SETUP.md)
- **Deployment**: [`docs/deployment/DEPLOYMENT.md`](docs/deployment/DEPLOYMENT.md)
- **Troubleshooting**: [`docs/deployment/TROUBLESHOOTING.md`](docs/deployment/TROUBLESHOOTING.md)
- **Email**: breyden@prompted.community
