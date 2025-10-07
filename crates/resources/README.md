# Resources Crate

The resources crate provides a centralized registry for all prompts, tools, schemas, and sampling strategies used throughout the Homeskillet platform. It serves as the single source of truth for AI interaction templates and configurations.

## Overview

This crate manages:
- **Prompts**: Templates for AI model interactions
- **Tools**: Definitions for available operations
- **Schemas**: JSON schemas for validation
- **Sampling**: Strategies for response generation

## Architecture

```
┌────────────────────────────────────────┐
│         Resource Registry              │
│  • Centralized storage                 │
│  • Thread-safe access                  │
│  • Lazy initialization                 │
├────────────────────────────────────────┤
│         Resource Types                 │
│  ┌──────────┐  ┌──────────────────┐   │
│  │ Prompts  │  │     Tools        │   │
│  │ • Agent  │  │ • GitHub ops     │   │
│  │ • Covenant│  │ • MLX inference  │   │
│  │ • Strike │  │ • Fusion process │   │
│  └──────────┘  └──────────────────┘   │
│  ┌──────────┐  ┌──────────────────┐   │
│  │ Schemas  │  │    Sampling      │   │
│  │ • JSON   │  │ • Strategies     │   │
│  │ • OpenAPI│  │ • Coordinators   │   │
│  └──────────┘  └──────────────────┘   │
└────────────────────────────────────────┘
```

## Core Components

### ResourceRegistry

The central registry managing all resources:

```rust
pub struct ResourceRegistry {
    prompts: RwLock<HashMap<String, PromptTemplate>>,
    tools: RwLock<HashMap<String, ToolDefinition>>,
    schemas: RwLock<HashMap<String, serde_json::Value>>,
}
```

### PromptTemplate

Structured prompt definitions:

```rust
pub struct PromptTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub template: String,
    pub arguments: Vec<PromptArgument>,
    pub metadata: HashMap<String, serde_json::Value>,
}
```

### ToolDefinition

Tool specifications for MCP:

```rust
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
    pub output_schema: Option<serde_json::Value>,
    pub metadata: HashMap<String, serde_json::Value>,
}
```

## Prompts

### Agent Prompts

#### System Architect (SuperMe)
```rust
REGISTRY.register_prompt(
    "agent.architect",
    PromptTemplate {
        name: "System Architect",
        description: "High-level system design and planning",
        template: r#"
You are the System Architect (SuperMe) for a complex software project.

Context: {{context}}
Goal: {{goal}}

Analyze the requirements and create a comprehensive plan that:
1. Breaks down the work into manageable covenants
2. Identifies key architectural decisions
3. Assigns appropriate resources (Qwen foremen, Gemma workers)
4. Establishes success criteria

Provide your analysis in structured JSON format.
        "#,
        arguments: vec![
            PromptArgument::required("context", "Project context"),
            PromptArgument::required("goal", "Desired outcome"),
        ],
    }
);
```

#### Qwen Foreman
```rust
REGISTRY.register_prompt(
    "agent.foreman",
    PromptTemplate {
        name: "Qwen Foreman",
        description: "Technical leadership and coordination",
        template: r#"
You are a Qwen-30B foreman responsible for technical implementation.

Covenant: {{covenant}}
Assigned Workers: {{workers}}
Technical Context: {{context}}

Your responsibilities:
1. Break down the covenant into specific tasks
2. Assign tasks to Gemma workers based on complexity
3. Review and integrate worker outputs
4. Ensure quality and consistency

Output a detailed work plan with task assignments.
        "#,
        arguments: vec![
            PromptArgument::required("covenant", "Work covenant"),
            PromptArgument::required("workers", "Available workers"),
            PromptArgument::required("context", "Technical details"),
        ],
    }
);
```

#### Gemma Worker
```rust
REGISTRY.register_prompt(
    "agent.worker", 
    PromptTemplate {
        name: "Gemma Worker",
        description: "Task execution and implementation",
        template: r#"
You are a Gemma-270M worker focused on efficient task execution.

Task: {{task}}
Guidelines: {{guidelines}}
Context: {{context}}

Complete the assigned task following these principles:
1. Focus on the specific requirement
2. Write clean, maintainable code
3. Follow project conventions
4. Document your work

Provide your implementation with brief explanations.
        "#,
        arguments: vec![
            PromptArgument::required("task", "Specific task"),
            PromptArgument::required("guidelines", "Coding guidelines"),
            PromptArgument::optional("context", "Additional context"),
        ],
    }
);
```

### Covenant Prompts

#### Covenant Builder
```rust
REGISTRY.register_prompt(
    "covenant.builder",
    PromptTemplate {
        name: "Covenant Builder",
        description: "Interactive covenant creation",
        template: r#"
Let's create a work covenant together.

Current Information:
- Title: {{title}}
- Description: {{description}}
- Reality State: {{reality_state}}
- Target State: {{target_state}}

{{#if missing_fields}}
Missing required information:
{{#each missing_fields}}
- {{this}}
{{/each}}

Please provide the missing details.
{{else}}
Covenant ready for creation. Would you like to:
1. Review and edit
2. Add metadata
3. Create covenant
{{/if}}
        "#,
        arguments: vec![
            PromptArgument::optional("title", "Covenant title"),
            PromptArgument::optional("description", "Description"),
            PromptArgument::optional("reality_state", "Current state"),
            PromptArgument::optional("target_state", "Desired state"),
            PromptArgument::computed("missing_fields", "Missing fields"),
        ],
    }
);
```

### Strike Prompts

#### Strike Planner
```rust
REGISTRY.register_prompt(
    "strike.planner",
    PromptTemplate {
        name: "Strike Planner",
        description: "Plan multi-repository changes",
        template: r#"
Analyzing repositories for strike operation.

Covenant: {{covenant.title}}
Target Repositories: {{repositories}}

For each repository, determine:
1. Role (Anchor/Satellite/Observer)
2. Required changes
3. Dependencies on other repos
4. Risk assessment

Repository Analysis:
{{#each repositories}}
### {{this.name}}
- Current state: {{analyze_repo this}}
- Proposed changes: {{suggest_changes this covenant}}
- Dependencies: {{find_dependencies this}}
{{/each}}

Recommended execution order: {{compute_order repositories}}
        "#,
        arguments: vec![
            PromptArgument::required("covenant", "Covenant object"),
            PromptArgument::required("repositories", "Target repos"),
        ],
    }
);
```

### Fusion Prompts

#### Hygiene Analyzer
```rust
REGISTRY.register_prompt(
    "fusion.hygiene",
    PromptTemplate {
        name: "Code Hygiene Analyzer",
        description: "Analyze code quality",
        template: r#"
Analyze the following code fragment for hygiene score.

Fragment:
```{{language}}
{{code}}
```

Evaluation criteria:
1. Syntax correctness (0.3 weight)
2. Naming conventions (0.2 weight)
3. Code structure (0.3 weight)
4. Documentation (0.2 weight)

Provide:
- Overall score (0.0-1.0)
- Breakdown by criteria
- Improvement suggestions
        "#,
        arguments: vec![
            PromptArgument::required("language", "Programming language"),
            PromptArgument::required("code", "Code fragment"),
        ],
    }
);
```

## Tools

### GitHub Operations

```rust
REGISTRY.register_tool(
    "github.create_pr",
    ToolDefinition {
        name: "Create Pull Request",
        description: "Create a PR in a GitHub repository",
        input_schema: json!({
            "type": "object",
            "properties": {
                "repo": {
                    "type": "string",
                    "pattern": "^[\\w-]+/[\\w-]+$"
                },
                "title": {"type": "string"},
                "body": {"type": "string"},
                "branch": {"type": "string"},
                "base": {
                    "type": "string", 
                    "default": "main"
                },
                "files": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "path": {"type": "string"},
                            "content": {"type": "string"},
                            "mode": {
                                "type": "string",
                                "enum": ["create", "update", "delete"]
                            }
                        }
                    }
                }
            },
            "required": ["repo", "title", "branch", "files"]
        }),
    }
);
```

### MLX Operations

```rust
REGISTRY.register_tool(
    "mlx.generate",
    ToolDefinition {
        name: "Generate with MLX",
        description: "Generate text using MLX models",
        input_schema: json!({
            "type": "object",
            "properties": {
                "model": {
                    "type": "string",
                    "enum": ["gemma-270m", "qwen-30b", "auto"]
                },
                "prompt": {"type": "string"},
                "max_tokens": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 4096
                },
                "temperature": {
                    "type": "number",
                    "minimum": 0.0,
                    "maximum": 2.0
                },
                "stream": {
                    "type": "boolean",
                    "default": false
                }
            },
            "required": ["prompt"]
        }),
    }
);
```

## Schemas

### Covenant Schema

```rust
REGISTRY.register_schema(
    "covenant",
    json!({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "minLength": 3,
                "maxLength": 100
            },
            "description": {
                "type": "string",
                "minLength": 10
            },
            "reality_state": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "key_aspects": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["description"]
            },
            "target_state": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "success_criteria": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["description"]
            }
        },
        "required": ["title", "reality_state", "target_state"]
    })
);
```

## Sampling Strategies

### SamplingCoordinator

Manages different sampling strategies:

```rust
pub struct SamplingCoordinator {
    strategies: HashMap<String, Box<dyn SamplingStrategy>>,
    history: RwLock<Vec<SamplingEvent>>,
}
```

### Built-in Strategies

#### Interval Sampling
Sample every N tokens:
```rust
coordinator.register_strategy(
    "interval",
    IntervalSampling { interval: 100 }
);
```

#### Confidence-based Sampling
Sample when confidence drops:
```rust
coordinator.register_strategy(
    "confidence",
    ConfidenceSampling { threshold: 0.7 }
);
```

#### Semantic Boundary Sampling
Sample at natural boundaries:
```rust
coordinator.register_strategy(
    "semantic",
    SemanticBoundarySampling {
        markers: vec![".", "!", "?", "\n\n"],
    }
);
```

## Usage Examples

### Accessing Resources

```rust
use resources::{REGISTRY, get_prompt, get_tool, get_schema};

// Get a prompt template
let architect_prompt = get_prompt("agent.architect")?;
let filled = architect_prompt.fill(&json!({
    "context": "E-commerce platform",
    "goal": "Add recommendation engine"
}))?;

// Get a tool definition
let github_tool = get_tool("github.create_pr")?;
let valid = github_tool.validate_input(&input)?;

// Get a schema for validation
let covenant_schema = get_schema("covenant")?;
jsonschema::validate(&covenant_data, &covenant_schema)?;
```

### Custom Registration

```rust
// Register custom prompt
REGISTRY.register_prompt(
    "custom.reviewer",
    PromptTemplate {
        name: "Code Reviewer",
        description: "Automated code review",
        template: "Review this code:\n{{code}}",
        arguments: vec![
            PromptArgument::required("code", "Code to review"),
        ],
        metadata: HashMap::new(),
    }
)?;

// Register custom tool
REGISTRY.register_tool(
    "custom.analyzer",
    ToolDefinition {
        name: "Custom Analyzer",
        description: "Analyze custom data",
        input_schema: json!({"type": "object"}),
        output_schema: None,
        metadata: HashMap::new(),
    }
)?;
```

### Using Sampling

```rust
let coordinator = SamplingCoordinator::new();

// Configure sampling
coordinator.set_strategy("confidence");

// During generation
for token in token_stream {
    if coordinator.should_sample(&agent_id, token_count, &token, confidence) {
        // Perform sampling action
        let sample = create_sample(&context);
        coordinator.record_sample(sample);
    }
}
```

## Testing

### Unit Tests
```bash
cargo test -p resources
```

### Validation Tests
```rust
#[test]
fn test_prompt_validation() {
    let prompt = get_prompt("agent.architect").unwrap();
    
    // Missing required argument
    assert!(prompt.fill(&json!({})).is_err());
    
    // Valid arguments
    assert!(prompt.fill(&json!({
        "context": "test",
        "goal": "test"
    })).is_ok());
}
```

## Performance

### Lazy Loading
Resources are loaded on first access:
- No startup overhead
- Minimal memory usage
- Thread-safe initialization

### Caching
- Compiled templates cached
- Schema validators cached
- Sampling history limited

## Contributing

When adding resources:
1. Choose appropriate category
2. Follow naming conventions
3. Add comprehensive metadata
4. Include usage examples
5. Add validation tests

## Future Enhancements

Planned features:
1. **Hot reloading** of prompt templates
2. **Versioning** for backward compatibility
3. **A/B testing** for prompts
4. **Analytics** on resource usage
5. **External storage** support