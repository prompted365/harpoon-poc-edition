# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

# Harpoon PoC Edition - WARP Developer Guide

This is the "lite" version of the Harpoon AI orchestration platform, specifically designed for HostedAI proof-of-concept demonstrations. It maintains the core architecture while being streamlined for cloud GPU integration testing.

## Quick Start (60 seconds)

```bash
# Build the lightweight mode (no Python dependencies)
cargo build --release -p service

# Run the HTTP service
cargo run -p service

# Test the workspace (excluding Python-dependent crates)
cargo test --workspace --exclude orchestrator
```

## Common Development Commands

### Build Modes

#### 1. Lightweight Mode (Production Ready - Default)
```bash
# Build service only (no Python dependencies required)
cargo build --release -p service

# Run service
cargo run -p service

# Test lightweight components
cargo test --workspace --exclude orchestrator
```

#### 2. Full PyMLX Mode (Apple Silicon Development)
```bash
# Initialize Python environment and install MLX dependencies
make init

# Build with PyMLX features enabled
cargo build --workspace --all-features

# Run with MLX support enabled
cargo run -p service --features pymlx
```

#### 3. HostedAI Mode (Cloud GPU Integration)
```bash
# Configure HostedAI credentials
export HOSTED_AI_BASE_URL="https://api.hosted.ai"
export HOSTED_AI_API_KEY="your-api-key"
export HOSTED_AI_POOL_ID="gpu-pool-1"

# Run in lightweight mode with HostedAI integration
cargo run -p service
```

#### 4. WASM Classifier Build
```bash
# Install WASM target
rustup target add wasm32-unknown-unknown

# Build WASM classifier (when crate exists)
cargo build --target wasm32-unknown-unknown -p wasm_classifier
```

### Testing Strategy

```bash
# Fast tests (excluding Python dependencies)
cargo test -p service -p harpoon_bridge -p resources

# Full workspace tests (requires Python environment)
cargo test --workspace --all-features

# Integration tests
cargo test --test "*" -- --nocapture

# Specific crate tests
cargo test -p service
cargo test -p harpoon_bridge
cargo test -p resources
# Note: orchestrator and harpoon-core have Python deps by default

# Code quality
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
```

## Architecture Overview

### Workspace Structure (PoC Edition)
This PoC version contains exactly 5 crates organized in three tiers:

**Current Crates (5 total):**
- `service`: HTTP API service for the Harpoon orchestration platform
- `orchestrator`: Core orchestration engine for routing AI inference requests  
- `harpoon_bridge`: Bridge between Harpoon fusion system and orchestration layer
- `harpoon-core`: Core fusion envelope primitives for distributed AI orchestration
- `resources`: MCP resource management and tool definitions

**Note:** This PoC edition is streamlined - additional crates like `engine_pymlx`, `wasm_classifier`, and `pyffi` are not included to keep the demo focused on HostedAI integration.

### Three-Tier Architecture
```
┌─────────────────────────────────────────────────┐
│             Unified API Layer                   │
│  service (HTTP API), orchestrator (CLI)        │
├─────────────────────────────────────────────────┤
│          Orchestration Core                     │
│  orchestrator, harpoon_bridge, resources       │
├─────────────────────────────────────────────────┤
│           Deployment Abstraction                │
│  harpoon-core, engine_pymlx, wasm_classifier   │
└─────────────────────────────────────────────────┘
```

### Covenant-Strike-Cable Paradigm
- **Covenant**: Work definitions and capability contracts (`crates/harpoon_bridge/src/covenant.rs`)
- **Strike**: Coordinated execution across repositories (`crates/harpoon_bridge/src/strike.rs`) 
- **Cable**: Cross-repository linkage and state management (`crates/harpoon_bridge/src/strike.rs`)

## Development Workflow

### Available Binaries
```bash
# HTTP service
cargo run -p service

# Orchestrator CLI (if available)
cargo run -p orchestrator --bin homeskillet-orchestrator -- --help
```

### Feature Flags
- `default`: Standard features without Python dependencies
- `pymlx`: Enable MLX integration with Python bindings (Apple Silicon only)
- `wasm-host`: Enable WASM runtime hosting capabilities

### Environment Variables
```bash
# Core service configuration
SERVICE_HOST=0.0.0.0
SERVICE_PORT=8080
RUST_LOG=info

# HostedAI cloud GPU integration
HOSTED_AI_BASE_URL=https://api.hosted.ai
HOSTED_AI_API_KEY=your-api-key
HOSTED_AI_POOL_ID=gpu-pool-1
HOSTED_AI_OVERCOMMIT=true

# Python/MLX configuration (Apple Silicon)
PYO3_PYTHON=/path/to/python3
```

### Docker Deployment
```bash
# Build lightweight container
docker build -t harpoon-poc .

# Run container with HostedAI integration
docker run -p 8080:8080 \
  -e HOSTED_AI_API_KEY=your-key \
  -e HOSTED_AI_BASE_URL=https://api.hosted.ai \
  harpoon-poc
```

### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli
# or: cargo install railwayapp --locked

# Deploy to Railway (uses railway.toml)
railway login
railway project create harpoon-poc-edition
railway up

# Set HostedAI environment variables in Railway dashboard
# HOSTED_AI_BASE_URL=https://api.hosted.ai
# HOSTED_AI_API_KEY=your-api-key
# HOSTED_AI_POOL_ID=gpu-pool-1
```

## API Endpoints

### Health Check
```bash
GET /health
# Response: {"status": "healthy", "deployment_modes": ["native", "hosted_ai"], "version": "0.1.0"}
```

### Legacy MLX Endpoints
```bash
# Text classification
POST /classify
{"text": "Write a hello world program in Python"}

# Model inference  
POST /run
{"text": "Explain quantum computing"}
```

### Unified v2 Endpoints
```bash
# Process text with full pipeline
POST /v2/process
{
  "text": "Implement a binary search algorithm",
  "deployment": "HostedAI",
  "fragment_context": {
    "path": "src/search.rs",
    "idx": 0,
    "lines": "1-20"
  }
}

# Create work covenant
POST /v2/covenant
{
  "title": "Refactor Authentication System",
  "description": "Modernize auth to use JWT tokens",
  "reality_state": {"description": "Current session-based auth"},
  "target_state": {"description": "JWT-based stateless auth"}
}

# Execute strike operation
POST /v2/strike
{
  "covenant_id": "cov-abc123",
  "target_repos": ["org/auth-service", "org/frontend-app"]
}
```

## Troubleshooting

### Common Issues
- **Service won't start**: Check that port 8080 isn't in use: `lsof -i :8080`
- **HostedAI connection fails**: Verify `HOSTED_AI_API_KEY` and `HOSTED_AI_BASE_URL` are set correctly
- **PyMLX build fails**: Ensure you're on Apple Silicon and have Python 3.8+ installed
- **WASM build missing**: Install target with `rustup target add wasm32-unknown-unknown`
- **Workspace build fails**: Some crates may be missing in PoC edition - use `cargo build -p service` instead

### Build Status Check
```bash
# Verify what builds successfully
cargo check --workspace 2>&1 | grep -E "(Finished|error|Compiling)"

# Check available binaries
cargo metadata --no-deps | jq -r '.packages[].targets[] | select(.kind[] == "bin") | .name'
```

### Configuration Validation
```bash
# Test configuration loading (when implemented)
cargo run -p service -- --validate-config

# Check environment variables
env | grep -E "(HARPOON|HOSTED_AI|SERVICE)" | sort
```

## Key File Locations

- Configuration: `configs/homeskillet.yaml`, `~/.orchestrator/config.yaml`
- Docker: `Dockerfile` (lightweight service), `Dockerfile.monorepo` (full build)
- Documentation: `docs/`, `README.md`, `WHAT_THIS_DOES.md`
- Examples: `configs/config.example.yaml`

---

**Note**: This is a proof-of-concept edition focused on HostedAI integration. Some features documented in the full README may not be implemented or may use mock implementations. Always verify functionality with the actual codebase state.