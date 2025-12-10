# Ubiquity Harpoon Rust Crates - Quick Reference

**Repository**: https://github.com/prompted365/ubiq-harpoon  
**Cloned to**: `/home/user/harpoon-rust/`  

---

## 📦 Crate Overview

```
harpoon-rust/
├── crates/
│   ├── harpoon-core/          ⭐⭐⭐ Fragment processing (PRIMARY)
│   ├── harpoon_bridge/        ⭐⭐⭐ Covenant orchestration (PRIMARY)
│   ├── orchestrator/          ⭐⭐  MLX routing + HostedAI
│   ├── mcp_server/            ⭐   Model Context Protocol
│   ├── resources/             ⭐   Resource management
│   ├── service/               ⭐   HTTP service layer
│   ├── engine_pymlx/          -    Python MLX inference
│   ├── pyffi/                 -    Python FFI bindings
│   └── wasm_classifier/       -    WASM classification
```

---

## ⭐⭐⭐ harpoon-core (MUST READ)

### Location
```bash
/home/user/harpoon-rust/crates/harpoon-core/src/lib.rs
```

### Key Exports
```rust
// Public API
pub struct FragmentInput { path, idx, lines, body }
pub struct FragmentReport { path, idx, hash, hygiene_score, language, fingerprint }
pub struct HarpoonCycle { absorbed, pending, events, iterations, anchors }
pub struct HarpoonEngine { /* ... */ }

// Core functions
pub fn compute_anchor_hash(body: &str) -> String       // SHA3-256
pub fn compute_fingerprint(body: &str) -> String       // 12-byte base64
pub fn detect_language(path: &str, body: &str) -> String
pub fn hygiene_score(body: &str, language: &str) -> f32
```

### Usage Example (Rust)
```rust
use harpoon_core::{HarpoonEngine, FragmentInput};

let engine = HarpoonEngine::new_native(Some(64), Some(4))?;

let fragments = vec![
    FragmentInput {
        path: "src/index.ts".to_string(),
        idx: 0,
        lines: "1-50".to_string(),
        body: "export function hello() { return 'world'; }".to_string(),
    }
];

let cycle = engine.run_native_cycle(fragments, 0.7, None)?;

println!("Absorbed: {}", cycle.get_absorbed().len());
println!("Anchors: {:?}", cycle.get_anchors());
```

### Build Commands
```bash
# Native library (for Node-API)
cd /home/user/harpoon-rust/crates/harpoon-core
cargo build --release --features python

# WASM target
cargo build --target wasm32-unknown-unknown --release --features wasm
wasm-bindgen ../../target/wasm32-unknown-unknown/release/harpoon_core.wasm \
  --out-dir ./pkg --typescript
```

### Key Files to Read
- `src/lib.rs` (main implementation) - **READ THIS FIRST**
- `Cargo.toml` (dependencies & features)
- `README.md` (if exists)

---

## ⭐⭐⭐ harpoon_bridge (MUST READ)

### Location
```bash
/home/user/harpoon-rust/crates/harpoon_bridge/src/
├── lib.rs           # UnifiedOrchestrator
├── covenant.rs      # Covenant model
├── fusion.rs        # FusionOrchestrator
└── strike.rs        # Strike operations
```

### Key Exports
```rust
// Covenant model
pub struct Covenant { id, title, description, reality_state, target_state, metadata, created_at }
pub struct RealityState { repositories, function_references, complexity_assessment }
pub struct TargetState { objectives, success_criteria, constraints }
pub struct CovenantBuilder { /* ... */ }

// Orchestration
pub struct UnifiedOrchestrator { mlx_orchestrator, fusion_orchestrator, covenants }
pub struct FusionOrchestrator { engine, state }
pub struct FusionResult { absorbed_count, pending_count, anchors, hygiene_score, iterations }
```

### Usage Example (Rust)
```rust
use harpoon_bridge::{CovenantBuilder, RealityState, TargetState, UnifiedOrchestrator};

// Build covenant
let covenant = CovenantBuilder::new(
    "Next.js Integration",
    "Integrate Next.js edge runtime with Harpoon v2"
)
.reality_state(RealityState {
    repositories: vec![/* GitHub data */],
    function_references: vec![],
    complexity_assessment: ComplexityAssessment { overall_complexity: 0.5, /* ... */ }
})
.target_state(TargetState {
    objectives: vec!["Edge middleware compatibility".to_string()],
    success_criteria: vec!["Works on Cloudflare Workers".to_string()],
    constraints: vec!["No Node.js APIs".to_string()]
})
.build()?;

// Process with orchestrator
let orchestrator = UnifiedOrchestrator::new(engine, hosted_config)?;
let covenant_id = orchestrator.create_covenant(covenant).await?;
let result = orchestrator.process(request).await?;
```

### Key Files to Read
1. **`covenant.rs`** - Covenant model (reality → target)
2. **`fusion.rs`** - FusionOrchestrator (wraps harpoon-core)
3. **`lib.rs`** - UnifiedOrchestrator (combines everything)

---

## ⭐⭐ orchestrator (OPTIONAL)

### Location
```bash
/home/user/harpoon-rust/crates/orchestrator/src/
├── lib.rs           # Main orchestrator
├── hosted_ai.rs     # HostedAI connector
├── types.rs         # Request/Response types
├── config.rs        # Configuration
├── metrics.rs       # Prometheus metrics
└── server.rs        # HTTP server
```

### Key Exports
```rust
// Model routing
pub struct Homeskillet { cfg, gemma, qwen }
pub struct Classification { category, complexity, latency_ms }

// HostedAI
pub struct HostedAiConnector { client, cfg, allocations, metrics }
pub struct HostedAiConfig { base_url, api_key, pool, overcommit, timeout_secs, max_retries }
```

### Usage Example (Rust)
```rust
use orchestrator::{Homeskillet, Config, HostedAiConnector, HostedAiConfig};

// Model routing
let orchestrator = Homeskillet::new(config)?;
let classification = orchestrator.classify("Write a sorting algorithm")?;
let result = orchestrator.run("Explain quantum computing", None)?;

// HostedAI
let hosted = HostedAiConnector::new(HostedAiConfig {
    base_url: "https://api.hosted-ai.example".to_string(),
    api_key: "your-key".to_string(),
    pool: "default".to_string(),
    overcommit: true,
    timeout_secs: 30,
    max_retries: 3,
});

let alloc_id = hosted.request_vgpu(100, 8192).await?;
let output = hosted.inference(&alloc_id, "prompt", 512).await?;
hosted.release(&alloc_id).await?;
```

### Key Files to Read
1. **`hosted_ai.rs`** - HostedAI GPU allocation (if you need vGPU)
2. **`lib.rs`** - Model routing logic (classification)
3. **`metrics.rs`** - Prometheus metrics (observability)

---

## 🔧 Build & Test Commands

### Build Workspace
```bash
cd /home/user/harpoon-rust

# Build all crates
cargo build --release

# Build specific crate
cargo build -p harpoon-core --release
cargo build -p harpoon_bridge --release
cargo build -p orchestrator --release
```

### Run Tests
```bash
# All tests
cargo test

# Specific crate tests
cargo test -p harpoon-core
cargo test -p harpoon_bridge
```

### Check Documentation
```bash
# Generate docs
cargo doc --open

# Specific crate docs
cargo doc -p harpoon-core --open
```

### Run Orchestrator Service
```bash
cd /home/user/harpoon-rust

# Build binary
cargo build --release --bin homeskillet-orchestrator

# Run server
./target/release/homeskillet-orchestrator
```

---

## 📖 Reading Order (Recommended)

### Day 1: Core Fragment Processing
1. ✅ Read `/home/user/harpoon-rust/crates/harpoon-core/src/lib.rs`
   - Focus on: `HarpoonEngine`, `FragmentState`, `hygiene_score()`
2. ✅ Read `/home/user/harpoon-rust/crates/harpoon-core/Cargo.toml`
   - Understand features: `python`, `wasm`, `node` (if added)

### Day 2: Covenant Model
1. ✅ Read `/home/user/harpoon-rust/crates/harpoon_bridge/src/covenant.rs`
   - Focus on: `Covenant`, `RealityState`, `TargetState`, `CovenantBuilder`
2. ✅ Read `/home/user/harpoon-rust/crates/harpoon_bridge/src/fusion.rs`
   - Focus on: `FusionOrchestrator`, `process_fragments()`

### Day 3: Unified Orchestration
1. ✅ Read `/home/user/harpoon-rust/crates/harpoon_bridge/src/lib.rs`
   - Focus on: `UnifiedOrchestrator`, `process()`, `execute_strike()`
2. ⭐ Optional: `/home/user/harpoon-rust/crates/orchestrator/src/hosted_ai.rs`
   - Only if you need HostedAI vGPU integration

---

## 🔍 Key Concepts to Understand

### 1. Fragment Lifecycle
```
Code File → FragmentInput → FragmentState → (Hygiene Check) → FragmentReport
                                                  ↓
                                            Absorbed / Pending
                                                  ↓
                                            SHA3-256 Anchor
```

### 2. Hygiene Score Formula
```rust
score = 0.25 × token_density       // Targets 8 tokens/line
      + 0.25 × char_density        // Targets 120 chars/line
      + 0.25 × indent_balance      // Consistency
      + 0.15 × comment_penalty     // Penalizes >80% comments
      + structure_bonus            // Language-specific (+0.05 to +0.10)
```

### 3. Covenant Execution Flow
```
User Request → Covenant (Reality → Target)
             → UnifiedOrchestrator.process()
             → MLX Classification (Homeskillet)
             → Fusion Processing (FusionOrchestrator → HarpoonEngine)
             → Strike Execution (optional, multi-repo)
             → Results (FusionResult + InferenceResult)
```

---

## 🎯 Integration Priorities

### High Priority (Week 1-2)
1. ✅ **harpoon-core/lib.rs** - Fragment processing core
   - Implement Node-API bindings
   - Test `envelopeCycle()` from TypeScript
2. ✅ **harpoon_bridge/covenant.rs** - Covenant model
   - Map to TypeScript `Covenant` interface
   - Understand `RealityState` vs `TargetState`

### Medium Priority (Week 3)
3. ✅ **harpoon_bridge/fusion.rs** - Fusion orchestrator
   - Use `FusionOrchestrator.process_fragments()` in sub-agent
4. ⭐ **harpoon_bridge/lib.rs** - Unified orchestration
   - Study `UnifiedOrchestrator.process()` for patterns

### Low Priority (Week 4+)
5. ⭐ **orchestrator/hosted_ai.rs** - HostedAI connector
   - Only if delegating to vGPUs
6. ⭐ **orchestrator/lib.rs** - MLX routing
   - Only if porting classification to Rust

---

## 🛠️ Useful Cargo Commands

### Development
```bash
# Watch mode (auto-rebuild on changes)
cargo install cargo-watch
cargo watch -x "build -p harpoon-core"

# Format code
cargo fmt

# Lint
cargo clippy -- -W clippy::all

# Check without building
cargo check -p harpoon-core
```

### Release
```bash
# Optimized build
cargo build --release -p harpoon-core

# Strip symbols (smaller binary)
cargo build --release -p harpoon-core
strip target/release/libharpoon_core.so
```

### WASM-specific
```bash
# Install WASM target
rustup target add wasm32-unknown-unknown

# Install wasm-bindgen
cargo install wasm-bindgen-cli

# Build WASM
cargo build --target wasm32-unknown-unknown --release --features wasm -p harpoon-core

# Generate bindings
wasm-bindgen target/wasm32-unknown-unknown/release/harpoon_core.wasm \
  --out-dir pkg --typescript

# Optimize WASM
cargo install wasm-opt
wasm-opt -Oz -o pkg/harpoon_core_bg_opt.wasm pkg/harpoon_core_bg.wasm
```

---

## 📊 Crate Statistics

```bash
cd /home/user/harpoon-rust

# Lines of code
tokei crates/harpoon-core
tokei crates/harpoon_bridge
tokei crates/orchestrator

# Dependencies
cargo tree -p harpoon-core
cargo tree -p harpoon_bridge

# Build time
cargo clean
time cargo build --release -p harpoon-core
```

---

## 🔗 Key Dependencies

### harpoon-core
- **sha3**: SHA3-256 hashing
- **rayon**: Parallel processing
- **regex**: Language detection
- **serde**: Serialization
- **base64**: Fingerprint encoding

### harpoon_bridge
- **orchestrator**: Model routing
- **harpoon_core**: Fragment processing
- **tokio**: Async runtime
- **anyhow**: Error handling

### orchestrator
- **reqwest**: HTTP client (HostedAI)
- **axum**: HTTP server
- **prometheus**: Metrics
- **tracing**: Logging

---

## 🎓 Learning Resources

### Official Docs
- **The Rust Book**: https://doc.rust-lang.org/book/
- **Async Rust**: https://rust-lang.github.io/async-book/
- **PyO3 Guide**: https://pyo3.rs/
- **wasm-bindgen Guide**: https://rustwasm.github.io/wasm-bindgen/

### Harpoon-Specific
- **Covenant Whitepapers**: `/home/user/webapp/v2/*-*.md` (8 parts)
- **Integration Plan**: `/home/user/webapp/v2/HARPOON_RUST_INTEGRATION_PLAN.md`
- **Crates Analysis**: `/home/user/webapp/v2/RUST_CRATES_ANALYSIS.md`

---

## 🚀 Quick Start

### Scenario: Test harpoon-core locally
```bash
# 1. Navigate to crate
cd /home/user/harpoon-rust/crates/harpoon-core

# 2. Run tests
cargo test

# 3. Try example (if exists)
cargo run --example basic

# 4. Build for Node-API (if napi feature added)
cargo build --release --features node

# 5. Check output
ls -lh ../../target/release/libharpoon_core.*
```

### Scenario: Explore covenant model
```bash
# 1. Open Rust REPL
cd /home/user/harpoon-rust
cargo install evcxr_repl  # If not installed
evcxr

# 2. In REPL
:dep harpoon_bridge = { path = "crates/harpoon_bridge" }
use harpoon_bridge::{CovenantBuilder, RealityState, TargetState};

// Experiment with CovenantBuilder...
```

---

## 📞 Need Help?

### Where to Look
1. **Rust docs**: `cargo doc -p harpoon-core --open`
2. **Source code**: `/home/user/harpoon-rust/crates/*/src/`
3. **Tests**: `/home/user/harpoon-rust/crates/*/src/*.rs` (search `#[test]`)
4. **Integration plan**: `/home/user/webapp/v2/HARPOON_RUST_INTEGRATION_PLAN.md`

### Common Issues
- **Compilation errors**: Check Rust version (`rustc --version`), update if < 1.70
- **WASM build fails**: Ensure `wasm32-unknown-unknown` target installed
- **Node-API not working**: Feature might not be implemented yet (see integration plan)

---

## ✅ Next Actions

1. **[NOW]** Read `harpoon-core/src/lib.rs` (30 min)
2. **[TODAY]** Build harpoon-core locally (`cargo build --release -p harpoon-core`)
3. **[TOMORROW]** Start FFI bridge implementation (Node-API or WASM)
4. **[THIS WEEK]** Test fragment processing with sample TypeScript file

---

**Happy exploring!** 🦀🚀

**Last Updated**: December 10, 2025  
**Repository**: https://github.com/prompted365/ubiq-harpoon  
**Integration Docs**: `/home/user/webapp/v2/HARPOON_RUST_INTEGRATION_PLAN.md`
