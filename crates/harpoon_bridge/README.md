# Harpoon Bridge Crate

The harpoon_bridge crate provides the unified interface that seamlessly integrates MLX model routing with Harpoon's multi-agent coordination system. It serves as the bridge between AI inference capabilities and complex workflow orchestration.

## Overview

Harpoon Bridge unifies two powerful systems:
- **MLX Orchestration**: Intelligent model routing and inference
- **Harpoon Engine**: Multi-agent coordination and code transformation

This creates a platform capable of both understanding requests through AI and executing complex, coordinated changes across multiple repositories.

## Architecture

```
┌────────────────────────────────────────────────────┐
│              Unified Orchestrator                  │
│  ┌──────────────────┐  ┌─────────────────────────┐ │
│  │ MLX Orchestrator  │  │  Fusion Orchestrator   │ │
│  │ • Model routing   │  │  • Fragment analysis  │ │
│  │ • Classification  │  │  • Hygiene scoring    │ │
│  │ • Inference       │  │  • Anchor management  │ │
│  └──────────────────┘  └─────────────────────────┘ │
├────────────────────────────────────────────────────┤
│              Covenant System                       │
│  • Reality → Target state transformations          │
│  • Repository harmony analysis                     │
│  • Strike operation planning                       │
├────────────────────────────────────────────────────┤
│              Strike Executor                       │
│  • Multi-repo PR creation                          │
│  • Cable state management                          │
│  • Progress monitoring                             │
└────────────────────────────────────────────────────┘
```

## Core Components

### UnifiedOrchestrator

The main entry point that combines all subsystems:

```rust
pub struct UnifiedOrchestrator {
    mlx_orchestrator: Arc<Orchestrator>,
    fusion_orchestrator: Arc<FusionOrchestrator>,
    covenants: Arc<RwLock<HashMap<String, Covenant>>>,
    hosted_config: Option<HostedAiConfig>,
}
```

Key capabilities:
- Unified request processing with deployment choice
- Covenant lifecycle management
- Strike operation coordination
- Fragment fusion processing

### Covenant System

Covenants define high-level transformations:

```rust
pub struct Covenant {
    pub id: String,
    pub title: String,
    pub description: String,
    pub reality_state: RealityState,
    pub target_state: TargetState,
    pub metadata: HashMap<String, serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
```

#### Reality State
Captures the current state of the system:
- Description of existing implementation
- Key aspects and pain points
- Technical debt and limitations

#### Target State
Defines the desired end state:
- Clear description of goals
- Success criteria
- Expected improvements

### Strike Operations

Strikes execute coordinated changes across repositories:

```rust
pub struct StrikeResult {
    pub run_id: String,
    pub covenant_id: String,
    pub pr_links: Vec<String>,
    pub cable_states: HashMap<String, CableState>,
    pub execution_time_ms: u128,
}
```

Strike execution flow:
1. **Harmony Review**: Analyze repos to select targets
2. **Role Assignment**: Determine anchor and satellite repos
3. **Change Generation**: Create modifications for each repo
4. **PR Creation**: Submit pull requests in parallel
5. **Cable Monitoring**: Track relationships and progress

### Fusion Engine

The fusion engine processes code fragments for quality:

```rust
pub struct FusionOrchestrator {
    engine: HarpoonEngine,
    state: Arc<RwLock<FusionState>>,
}
```

Fusion processing:
- Fragment hygiene scoring (0.0-1.0)
- Anchor deduplication
- Parallel processing with thread pool
- Incremental state updates

## API Reference

### Process Unified Request

```rust
let request = UnifiedRequest {
    text: "Implement authentication system",
    covenant_id: None,
    fragment_context: Some(FragmentContext {
        path: "src/auth.rs",
        idx: 0,
        lines: "1-50",
    }),
    deployment: DeploymentTarget::Native,
};

let response = orchestrator.process(request).await?;
```

### Create Covenant

```rust
let covenant = CovenantBuilder::new()
    .title("Modernize Authentication")
    .description("Replace session-based with JWT")
    .reality_state(RealityState {
        description: "Cookie-based sessions",
        key_aspects: vec!["stateful", "server-side"],
    })
    .target_state(TargetState {
        description: "JWT-based auth",
        success_criteria: vec!["stateless", "scalable"],
    })
    .build()?;

let covenant_id = orchestrator.create_covenant(covenant).await?;
```

### Execute Strike

```rust
let result = execute_strike(
    covenant,
    vec!["org/auth-service", "org/frontend"],
    orchestrator.clone()
).await?;

println!("Created {} PRs", result.pr_links.len());
for (repo, state) in &result.cable_states {
    println!("{}: {:?}", repo, state);
}
```

### Process Fragments

```rust
let fragments = vec![
    FragmentInput {
        path: "src/main.rs",
        idx: 0,
        lines: "1-100",
        body: "fn main() { ... }",
    }
];

let result = fusion.process_fragments(
    fragments,
    0.8,  // hygiene_threshold
    Some(10)  // max_iterations
).await?;

println!("Average hygiene: {:?}", result.hygiene_score);
```

## Deployment Modes

### Native Mode
Uses local MLX models for inference:
- Direct hardware acceleration
- Low latency for development
- Full feature parity

### HostedAI Mode
Leverages cloud GPU infrastructure:
- Automatic resource allocation
- Scalable for production
- Cost-optimized with overcommit

## Configuration

Bridge-specific configuration:

```yaml
bridge:
  covenant_cache_size: 100
  strike_timeout_s: 300
  max_concurrent_strikes: 5
  
fusion:
  hygiene_threshold: 0.7
  max_iterations: 10
  thread_count: null  # auto-detect
  
github:
  token: "${GITHUB_TOKEN}"
  org: "your-org"
  pr_template: |
    ## Covenant: {{ covenant.title }}
    
    This PR was created by Homeskillet as part of strike {{ strike.id }}.
    
    ### Changes
    {{ changes }}
    
    ### Testing
    - [ ] Unit tests pass
    - [ ] Integration tests pass
    - [ ] Manual testing completed
```

## Integration Points

### With MLX Orchestrator
- Receives classification results
- Routes inference requests
- Manages deployment targets

### With Harpoon Core
- Processes fragments through fusion engine
- Manages hygiene scoring cycles
- Tracks anchor relationships

### With External Services
- GitHub API for PR creation
- HostedAI for GPU allocation
- Monitoring systems for metrics

## Error Handling

Comprehensive error handling for:
- Covenant validation failures
- Strike execution errors
- Fragment processing issues
- Network and API failures

Example error handling:

```rust
match orchestrator.process(request).await {
    Ok(response) => handle_response(response),
    Err(e) if e.is::<CovenantNotFound>() => {
        // Handle missing covenant
    }
    Err(e) if e.is::<StrikeTimeout>() => {
        // Handle timeout, maybe retry
    }
    Err(e) => {
        // Generic error handling
        error!("Process failed: {}", e);
    }
}
```

## Performance Optimization

### Caching Strategies
- Covenant caching with LRU eviction
- Fragment deduplication
- Classification result caching

### Concurrency
- Parallel PR creation
- Concurrent fragment processing
- Async I/O for external calls

### Resource Management
- Lazy model loading
- Automatic cleanup
- Memory-mapped fragments

## Testing

Comprehensive test coverage:

```bash
# Unit tests
cargo test -p harpoon_bridge

# Integration tests
cargo test -p harpoon_bridge --test "*"

# Specific module
cargo test -p harpoon_bridge covenant::

# With logs
RUST_LOG=debug cargo test -p harpoon_bridge -- --nocapture
```

## Monitoring

Key metrics exposed:
- Request latency by type
- Covenant creation rate
- Strike success rate
- Fragment processing throughput
- Hygiene score distribution

## Security

Security measures:
- Covenant validation
- GitHub token encryption
- Request sanitization
- Audit logging

## Future Enhancements

Planned improvements:
1. **Multi-covenant orchestration**: Coordinate related covenants
2. **Strike rollback**: Automated reversion on failure
3. **Progressive deployment**: Gradual rollout with validation
4. **Custom cable types**: Extensible relationship system
5. **WebAssembly strikes**: Client-side execution

## Contributing

Guidelines for contributions:
1. Maintain separation between MLX and Harpoon concerns
2. Add tests for all new features
3. Update API documentation
4. Consider backward compatibility
5. Profile performance impact