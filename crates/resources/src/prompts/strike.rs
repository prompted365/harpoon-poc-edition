//! Strike-related prompts

use crate::{PromptTemplate, AgentType};

/// Delegation planning prompt for strike execution
pub fn delegation_prompt() -> PromptTemplate {
    PromptTemplate {
        id: "strike.delegation".to_string(),
        name: "Strike Delegation Planning".to_string(),
        description: "Create delegation plan for multi-agent strike execution".to_string(),
        template: r#"Create a delegation plan for executing strike {{strike_id}} across the selected repositories.

Strike Targets:
{{strike_targets}}

Available Resources:
- Foremen (Qwen-30B): {{foreman_count}} available
- Workers (Gemma-270M): {{worker_count}} available

For each repository, determine:
1. **Foreman Assignment**: Which foreman agent handles this repo?
2. **Worker Pool Size**: How many workers needed?
3. **Task Breakdown**:
   - Analysis tasks (understanding existing code)
   - Transformation tasks (implementing changes)
   - Integration tasks (connecting with other repos)
   - Documentation tasks (explaining changes)

Consider:
- Anchor repository needs most experienced foreman
- Complex refactoring needs more workers
- Integration points require cross-team coordination
- Balance load across available agents

Output a detailed delegation plan with:
- Agent assignments
- Task distributions
- Communication channels
- Synchronization points"#.to_string(),
        variables: vec![
            "strike_id".to_string(),
            "strike_targets".to_string(),
            "foreman_count".to_string(),
            "worker_count".to_string(),
        ],
        agent_type: AgentType::Architect,
    }
}

/// PR creation prompt for repository transformation
pub fn pr_creation_prompt() -> PromptTemplate {
    PromptTemplate {
        id: "strike.pr_creation".to_string(),
        name: "Pull Request Creation".to_string(),
        description: "Create PR content for strike target".to_string(),
        template: r#"Create a pull request for repository {{repo_name}} as part of strike {{strike_id}}.

Repository Role: {{repo_role}}
Covenant Objectives: {{objectives}}

PR Should Include:
1. **Title**: Clear, action-oriented (feat/chore based on role)
2. **Description**: 
   - Purpose of changes
   - How it fits into larger covenant
   - Integration points with other repos
3. **Files to Create/Update**:
   - ubq.toml (configuration)
   - Plockfile.yaml (dependency lock)
   - CI workflow for receipts
   - Natural language README updates

For {{repo_role}} repositories:
- ANCHOR: Include rollback commands, full ubiquity spec compliance
- AGNO: Include cable definitions, integration documentation

Make the PR self-documenting with clear explanations of:
- What reality state this addresses
- What target state this achieves
- How to wield this repository in the new configuration"#.to_string(),
        variables: vec![
            "repo_name".to_string(),
            "strike_id".to_string(),
            "repo_role".to_string(),
            "objectives".to_string(),
        ],
        agent_type: AgentType::Foreman,
    }
}