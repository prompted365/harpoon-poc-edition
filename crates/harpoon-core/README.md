# Harpoon Core

The harpoon-core crate implements the high-performance fusion engine for code fragment analysis and transformation. Built in Rust with optional Python bindings, it provides the foundation for multi-agent code coordination.

## Overview

Harpoon Core is designed to:
- Analyze code fragments for quality and coherence
- Compute hygiene scores using sophisticated heuristics
- Manage anchor points for cross-repository relationships
- Process fragments in parallel for maximum throughput
- Provide both Rust and Python APIs for flexibility

## Architecture

```
┌─────────────────────────────────────────────────┐
│             Fragment Input Layer                │
│  • Path, line numbers, body content             │
│  • Language detection                           │
│  • Fingerprint generation                       │
├─────────────────────────────────────────────────┤
│            Fusion Processing Core               │
│  • Hygiene scoring algorithm                    │
│  • Anchor hash computation                      │
│  • Fragment state management                    │
│  • Parallel execution engine                    │
├─────────────────────────────────────────────────┤
│              Output Layer                       │
│  • Fragment reports with scores                 │
│  • Cycle events for debugging                   │
│  • Anchor relationships                         │
└─────────────────────────────────────────────────┘
```

## Core Concepts

### Fragments

Fragments represent pieces of code to be analyzed:

```rust
pub struct FragmentInput {
    pub path: String,      // File path
    pub idx: u32,          // Fragment index
    pub lines: String,     // Line range (e.g., "10-20")
    pub body: String,      // Actual code content
}
```

### Hygiene Scoring

The hygiene score (0.0-1.0) represents code quality based on:
- Syntax correctness
- Naming conventions
- Code structure
- Comment quality
- Complexity metrics

### Anchor System

Anchors create relationships between code fragments:
- SHA3-256 based hashing
- Content-addressable storage
- Collision-resistant design
- Cross-repository linking

### Fusion Cycles

The fusion engine processes fragments iteratively:

```rust
pub struct HarpoonCycle {
    absorbed: Vec<FragmentReport>,  // Processed fragments
    pending: Vec<FragmentReport>,   // Awaiting processing
    events: Vec<CycleEvent>,        // Processing history
    iterations: usize,              // Cycles completed
    anchors: Vec<String>,           // Generated anchors
}
```

## Rust API

### Basic Usage

```rust
use harpoon_core::{HarpoonEngine, FragmentInput};

// Create engine with optional configuration
let engine = HarpoonEngine::new(None, None)?;

// Prepare fragments
let fragments = vec![
    FragmentInput {
        path: "src/main.rs".to_string(),
        idx: 0,
        lines: "1-50".to_string(),
        body: r#"
            fn main() {
                println!("Hello, world!");
            }
        "#.to_string(),
    }
];

// Run fusion cycle
let cycle = engine.envelope_cycle(
    fragments,
    0.8,      // hygiene_threshold
    Some(10)  // max_iterations
)?;

// Process results
for fragment in cycle.absorbed() {
    println!(
        "{}: {:.2}",
        fragment.path,
        fragment.hygiene_score.unwrap_or(0.0)
    );
}
```

### Advanced Features

#### Custom Thread Count

```rust
// Use 8 threads for processing
let engine = HarpoonEngine::new(Some(64), Some(8))?;
```

#### Fragment Fingerprinting

```rust
let fingerprint = engine.fingerprint("code content");
// Returns base64-encoded hash
```

#### Batch Processing

```rust
// Process large batches efficiently
let large_batch: Vec<FragmentInput> = load_codebase()?;
let cycle = engine.envelope_cycle(large_batch, 0.7, None)?;

println!("Processed {} fragments", cycle.absorbed().len());
println!("Average hygiene: {:.2}", 
    cycle.absorbed()
        .iter()
        .filter_map(|f| f.hygiene_score)
        .sum::<f32>() / cycle.absorbed().len() as f32
);
```

## Python API

### Installation

```bash
cd crates/harpoon-core
maturin build --release
pip install target/wheels/harpoon_core-*.whl
```

### Basic Usage

```python
import harpoon_core

# Create engine
engine = harpoon_core.HarpoonEngine()

# Prepare fragments
fragments = [
    {
        "path": "app.py",
        "idx": 0,
        "lines": "1-20",
        "body": """
def hello_world():
    print("Hello, world!")
"""
    }
]

# Run cycle
cycle = engine.envelope_cycle(
    fragments,
    hygiene_threshold=0.8,
    max_iterations=10
)

# Access results
print(f"Absorbed: {len(cycle.absorbed)}")
print(f"Iterations: {cycle.iterations}")
```

### Advanced Python Features

```python
# Custom configuration
engine = harpoon_core.HarpoonEngine(
    max_batch=128,
    num_threads=16
)

# Access fragment details
for fragment in cycle.absorbed:
    print(f"{fragment.path}: {fragment.hygiene_score:.2f}")
    print(f"  Language: {fragment.language}")
    print(f"  Hash: {fragment.hash}")

# Convert to dictionary
cycle_dict = cycle.as_dict()
import json
print(json.dumps(cycle_dict, indent=2))
```

## Hygiene Scoring Algorithm

The hygiene scoring uses multiple factors:

### Language-Specific Analysis
- Python: PEP-8 compliance, docstrings
- Rust: Clippy hints, documentation
- JavaScript: ESLint rules, JSDoc
- Go: gofmt compliance, comments

### Universal Metrics
1. **Line length**: Penalize >100 chars
2. **Function length**: Prefer <50 lines
3. **Nesting depth**: Max 4 levels
4. **Comment ratio**: 15-30% optimal
5. **Name quality**: Descriptive, consistent

### Scoring Formula

```
hygiene_score = weighted_average(
    syntax_score * 0.3,
    structure_score * 0.3,
    naming_score * 0.2,
    documentation_score * 0.2
)
```

## Performance Optimization

### Thread Pool Management

The engine uses Rayon for parallel processing:
- Auto-detects CPU cores
- Work-stealing scheduler
- Minimal contention

### Memory Efficiency

- Fragments processed in chunks
- Streaming hash computation
- Zero-copy where possible
- Arena allocation for reports

### Benchmarks

On Apple M2 Pro:
- 10,000 fragments/second
- 50MB/s throughput
- <1ms per fragment overhead

## WASM Support

Build for WebAssembly:

```bash
wasm-pack build --target web --features wasm
```

JavaScript usage:

```javascript
import init, { HarpoonEngine } from './harpoon_core';

await init();
const engine = HarpoonEngine.new();

const result = engine.process_fragment({
    path: "test.js",
    idx: 0,
    lines: "1-10",
    body: "console.log('test');"
});
```

## Testing

Comprehensive test suite:

```bash
# All tests
cargo test

# Specific test
cargo test test_hygiene_scoring

# With output
cargo test -- --nocapture

# Benchmarks
cargo bench
```

Test categories:
- Unit tests for scoring logic
- Integration tests with real code
- Property tests for invariants
- Performance benchmarks

## Configuration

Engine configuration options:

| Parameter | Default | Description |
|-----------|---------|-------------|
| max_batch | 64 | Maximum fragments per cycle |
| num_threads | CPU count | Worker thread count |
| hash_algorithm | SHA3-256 | Anchor computation |
| language_detection | Auto | Override detection |

## Error Handling

The engine handles various error conditions:
- Invalid fragment format
- Encoding issues
- Thread pool errors
- Memory allocation failures

All errors wrapped in proper Result types.

## Contributing

When contributing:
1. Add tests for new scoring factors
2. Benchmark performance impact
3. Update Python bindings
4. Consider WASM compatibility
5. Document algorithm changes

## Future Roadmap

Planned enhancements:
- AST-based analysis
- Machine learning scoring
- Incremental processing
- GPU acceleration
- Custom scoring plugins