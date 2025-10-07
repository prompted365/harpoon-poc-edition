# What Harpoon Does: AI Orchestration Platform for Ubiquity OS

**Harpoon is an open-source AI orchestration platform that provides intelligent model routing, multi-agent code coordination, and unified workflow management across repositories.** Built in Rust for performance and reliability, it serves as a critical infrastructure component within the broader Ubiquity OS ecosystem, enabling AI-first development workflows with automatic model selection, code quality analysis, and coordinated multi-repository operations.

## Core Purpose

Harpoon addresses three fundamental challenges in AI-powered software development:

1. **Intelligent Model Routing**: Automatically routes requests to optimal AI models (lightweight for simple tasks, powerful for complex reasoning) based on content analysis and complexity classification
2. **Code Fragment Analysis**: Analyzes code quality through "hygiene scoring" - measuring syntax correctness, structure, naming conventions, and complexity metrics
3. **Multi-Agent Coordination**: Orchestrates complex workflows across multiple repositories through the "Covenant-Strike-Cable" paradigm

*Source: [`crates/orchestrator/src/lib.rs:1-37`](crates/orchestrator/src/lib.rs) - Core orchestration documentation*

## Architecture Overview

Harpoon is built as a Rust workspace with 9 specialized crates:

```
┌─────────────────────────────────────────────┐
│             Unified API Layer               │
│  UnifiedOrchestrator (harpoon_bridge)      │
├─────────────────────────────────────────────┤
│          Core Processing Engines            │
│  ┌─────────────┐  ┌────────────────────────┐│
│  │ Orchestrator │  │ HarpoonEngine          ││
│  │ (model       │  │ (fragment analysis &   ││
│  │  routing)    │  │  hygiene scoring)      ││
│  └─────────────┘  └────────────────────────┘│
├─────────────────────────────────────────────┤
│         Coordination Systems                │
│  Covenant → Strike → Cable                  │
│  (define)   (execute) (connect)             │
├─────────────────────────────────────────────┤
│         Service & Integration Layer         │
│  HTTP API, MCP Server, WASM Classifier     │
└─────────────────────────────────────────────┘
```

### Crate Breakdown

| Crate | Role | Key Dependencies |
|-------|------|------------------|
| `harpoon-core` | Fragment analysis and hygiene scoring | `rayon`, `sha3`, `regex` |
| `orchestrator` | AI model routing and classification | `tokio`, `serde`, `anyhow` |
| `harpoon_bridge` | Unified coordination layer | `orchestrator`, `harpoon-core` |
| `service` | HTTP API server | `axum`, `tower-http`, `tokio` |
| `mcp_server` | Model Context Protocol implementation | `tokio`, `serde_json` |
| `resources` | Resource sampling and management | `serde`, `anyhow` |
| `engine_pymlx` | MLX (Apple Silicon) inference engine | `pyo3` (Python bindings) |
| `wasm_classifier` | WebAssembly text classifier | `wasm-bindgen` |
| `pyffi` | Python foreign function interface | `pyo3` |

*Source: [`Cargo.toml:2-12`](Cargo.toml) - Workspace member definitions*

## Key Components

### HarpoonEngine: Code Fragment Analysis

**Purpose**: Analyzes code fragments for quality and coherence using sophisticated heuristics.

**Core Types**:
- `FragmentInput`: Represents code to analyze with path, line range, and body content
- `HarpoonCycle`: Processing result containing absorbed fragments, events, and anchors
- `FragmentReport`: Analysis results with hygiene scores and language detection

**Key Algorithm**: Fragment Processing Cycle
```rust
// From crates/harpoon-core/src/lib.rs:262-349
fn run_cycle(
    &self,
    fragments: Vec<FragmentInput>,
    hygiene_threshold: f32,
    max_iterations: Option<usize>,
) -> HarpoonCycleData
```

**Hygiene Scoring Formula** (line 423):
```
score = 0.25 * token_density 
      + 0.25 * char_density 
      + 0.25 * indent_quality 
      + 0.15 * comment_penalty 
      + structure_bonus
```

**Parallel Processing**: Uses Rayon thread pool for concurrent fragment analysis with configurable batch sizes.

*Source: [`crates/harpoon-core/src/lib.rs:183-349`](crates/harpoon-core/src/lib.rs)*

### Orchestrator: Intelligent Model Routing

**Purpose**: Routes AI inference requests to appropriate models based on complexity analysis.

**Core Logic**:
```rust
// From crates/orchestrator/src/lib.rs:225-233
pub fn run(&self, task: &str) -> Result<String> {
    let cls = self.classify(task)?;
    match (cls.complexity.as_str(), cls.category.as_str()) {
        ("simple", _) | (_, "extraction") | (_, "summary") | (_, "classification") => {
            self.run_gemma(task)  // Lightweight model
        }
        _ => self.run_qwen(task, cls.complexity == "complex"),  // Complex reasoning
    }
}
```

**Model Configuration**:
- **Gemma-270M**: Simple tasks, low latency, max 256 tokens
- **Qwen-30B**: Complex reasoning, "thinking" mode, max 1024 tokens

**Backends Supported**:
1. Native MLX (Apple Silicon) - via `engine_pymlx` with PyO3 bindings
2. HostedAI (Cloud GPU) - HTTP-based inference
3. Mock engines - for development/testing

*Source: [`crates/orchestrator/src/lib.rs:179-285`](crates/orchestrator/src/lib.rs)*

### UnifiedOrchestrator: Multi-System Coordination

**Purpose**: Coordinates between MLX model routing and Harpoon fragment analysis systems.

**Architecture**:
```rust
// From crates/harpoon_bridge/src/lib.rs:17-26
pub struct UnifiedOrchestrator {
    mlx_orchestrator: Arc<Orchestrator>,           // Model routing
    fusion_orchestrator: Arc<FusionOrchestrator>,  // Fragment processing  
    covenants: Arc<RwLock<HashMap<String, Covenant>>>, // Active work definitions
    hosted_config: Option<HostedAiConfig>,         // Cloud GPU config
}
```

**Unified Processing Flow** (lines 109-168):
1. Classify request through MLX system
2. Process fragments through fusion engine (if provided)
3. Execute inference if complexity threshold met
4. Return combined results

*Source: [`crates/harpoon_bridge/src/lib.rs:17-211`](crates/harpoon_bridge/src/lib.rs)*

## Covenant-Strike-Cable Paradigm

This is Harpoon's novel approach to multi-repository coordination:

### Covenant: Work Definition
**Schema** (`crates/harpoon_bridge/src/covenant.rs:8-16`):
```rust
pub struct Covenant {
    pub id: String,
    pub title: String,
    pub description: String,
    pub reality_state: RealityState,    // Current system state
    pub target_state: TargetState,      // Desired end state
    pub metadata: HashMap<String, serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
```

**Reality State**: Captures current codebase state with repository metadata, function references, and complexity assessments.

**Target State**: Defines objectives, success criteria, and constraints for the desired outcome.

### Strike: Coordinated Execution
**Purpose**: Execute coordinated changes across multiple repositories.

**Workflow** (`crates/harpoon_bridge/src/strike.rs:62-108`):
1. **Harmony Review**: Analyze repositories to select targets
2. **Role Assignment**: Designate Anchor (primary) and Agno (supporting) repositories
3. **Change Generation**: Create modifications for each repository
4. **PR Creation**: Submit pull requests in parallel
5. **Cable Monitoring**: Track relationships and progress

**Target Roles**:
- `Anchor`: Primary repository driving the change
- `Agno`: Supporting repositories that need coordinated updates

### Cable: Cross-Repository Linkage
**Types** (`crates/harpoon_bridge/src/strike.rs:46-50`):
```rust
pub enum CableType {
    Primary,    // Anchor cable
    Secondary,  // Agno cable  
    Cross,      // Inter-agno cable
}
```

**Cable State**: Maintains connection strength (0.0-1.0) and metadata about repository relationships, updating based on PR success rates.

*Source: [`crates/harpoon_bridge/src/covenant.rs`](crates/harpoon_bridge/src/covenant.rs), [`crates/harpoon_bridge/src/strike.rs`](crates/harpoon_bridge/src/strike.rs)*

## Deployment Modes and Integration

### Build Configurations

**1. Lightweight Mode** (Production Ready - Default):
```bash
cargo build -p service  # No Python dependencies
```
- Uses mock inference engines
- Full HTTP API functionality
- Cross-platform compatibility
- Fast build times

**2. Full PyMLX Mode** (Apple Silicon):
```bash
cargo build --features pymlx  # Requires Python + MLX
```
- Local MLX model inference
- Hardware acceleration
- Requires Apple Silicon + Python 3.8+

**3. HostedAI Mode** (Cloud GPU):
```bash
# Set environment variables for cloud GPU
export HOSTED_AI_BASE_URL="https://api.hosted.ai"
export HOSTED_AI_API_KEY="your-key"  
export HOSTED_AI_POOL_ID="gpu-pool-1"
```

*Source: [`README.md:99-139`](README.md) - Build mode documentation*

### HTTP API Endpoints

**Health Check**:
```
GET /health
```

**Legacy MLX Endpoints**:
```
POST /classify  # Text classification
POST /run       # Model inference
```

**Unified v2 Endpoints**:
```
POST /v2/process   # Full pipeline processing
POST /v2/covenant  # Create work covenants
POST /v2/strike    # Execute coordinated operations
```

*Source: [`crates/service/src/main.rs:98-109`](crates/service/src/main.rs)*

### Model Context Protocol (MCP) Support

Harpoon includes full MCP server implementation for IDE integration:
- **Stdio transport**: For command-line tools
- **HTTP transport**: For web-based integrations  
- **WebSocket transport**: For real-time applications

*Source: [`crates/mcp_server/`](crates/mcp_server/) directory structure*

## Fit Within Ubiquity OS

Harpoon serves as a foundational AI orchestration layer within Ubiquity OS:

### Integration Points
1. **Model Context Protocol**: Standardized interface for AI tool integration
2. **WebAssembly Support**: Client-side classification and edge deployment
3. **Multi-Agent Framework**: Structured approach to AI agent coordination
4. **Resource Management**: GPU allocation and model lifecycle management

### OS-Level Contributions
- **Unified AI Interface**: Single entry point for diverse AI model access
- **Quality Assurance**: Automated code hygiene scoring and improvement suggestions
- **Workflow Orchestration**: Complex multi-repository development workflows
- **Resource Optimization**: Intelligent model selection minimizing latency and cost

The system elevates development workflows from tool-specific AI interactions to OS-level intelligent routing and coordination.

*Source: Cross-crate dependencies analysis and [`docs/gtm/`](docs/gtm/) directory*

## Observability, Configuration, and Security

### Configuration Systems
- **Environment Variables**: Service ports, API keys, model paths
- **YAML Configuration**: Model parameters, deployment settings, safety configs  
- **Feature Flags**: MLX integration, WASM support, Python bindings

### Logging and Metrics
- **Tracing Integration**: Structured logging with span tracking
- **Request Metrics**: Latency, error rates, model usage statistics
- **Health Monitoring**: Model availability, resource utilization

### Security Measures
- **Input Validation**: Request size limits, schema validation
- **Rate Limiting**: Per-IP tracking and DDoS protection
- **API Authentication**: Bearer token and API key support
- **Data Redaction**: Automatic PII removal from logs

*Source: [`crates/service/src/main.rs:1-14`](crates/service/src/main.rs), [`crates/orchestrator/src/config.rs`](crates/orchestrator/src/config.rs)*

## Verified Implementation References

### Core Types and Functions
- `HarpoonEngine::run_native_cycle()` - [`crates/harpoon-core/src/lib.rs:645-653`](crates/harpoon-core/src/lib.rs)
- `Orchestrator::classify()` - [`crates/orchestrator/src/lib.rs:194-223`](crates/orchestrator/src/lib.rs)
- `UnifiedOrchestrator::process()` - [`crates/harpoon_bridge/src/lib.rs:109-168`](crates/harpoon_bridge/src/lib.rs)
- `execute_strike()` - [`crates/harpoon_bridge/src/strike.rs:62-108`](crates/harpoon_bridge/src/strike.rs)

### Configuration Structures  
- `Config` struct - [`crates/orchestrator/src/lib.rs:105-110`](crates/orchestrator/src/lib.rs)
- `ModelConfig` - [`crates/orchestrator/src/lib.rs:80-88`](crates/orchestrator/src/lib.rs)
- `HostedAiConfig` - [`crates/orchestrator/src/hosted_ai.rs`](crates/orchestrator/src/hosted_ai.rs)

### API Endpoints
- Service routes - [`crates/service/src/main.rs:98-113`](crates/service/src/main.rs)
- Health endpoint - [`crates/service/src/main.rs:124-130`](crates/service/src/main.rs)
- Covenant creation - [`crates/service/src/main.rs:208-222`](crates/service/src/main.rs)

### Feature Flags
- `pymlx` feature - [`crates/orchestrator/src/lib.rs:56`](crates/orchestrator/src/lib.rs)
- `python` feature - [`crates/harpoon-core/src/lib.rs:15`](crates/harpoon-core/src/lib.rs)  
- `wasm` feature - [`crates/harpoon-core/src/lib.rs:22`](crates/harpoon-core/src/lib.rs)

### Test Coverage
- Workspace build verification - [`README.md:145-152`](README.md)
- Integration test structure - [`crates/orchestrator/tests/`](crates/orchestrator/tests/)

## Current Limitations and Future Work

### Implementation Status
- **HostedAI Integration**: Currently uses fallback to native implementation (noted in [`crates/harpoon_bridge/src/lib.rs:178-181`](crates/harpoon_bridge/src/lib.rs))
- **GitHub PR Creation**: Mock implementation pending real GitHub API integration ([`crates/harpoon_bridge/src/strike.rs:157`](crates/harpoon_bridge/src/strike.rs))

### Planned Enhancements
- Dynamic model loading based on usage patterns
- Advanced routing using ML-based decisions  
- Streaming token generation support
- Plugin system for extensible model backends
- Multi-covenant orchestration coordination

*Source: Code comments and [`README.md:347-356`](README.md)*

---

**Maintenance Note**: This documentation is derived from source code analysis as of the current codebase state. Update when crate structure, public APIs, or core features change significantly.