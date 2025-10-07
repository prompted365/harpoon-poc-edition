//! Covenant-related prompts

use crate::{PromptTemplate, AgentType};

/// Covenant creation prompt for SuperMe/Claude interaction
pub fn creation_prompt() -> PromptTemplate {
    PromptTemplate {
        id: "covenant.creation".to_string(),
        name: "Covenant Creation".to_string(),
        description: "Interactive covenant creation with user".to_string(),
        template: r#"You are the SuperMe architect working with a user to create a development covenant.

Current Context:
- User Organization: {{org_name}}
- Repository Count: {{repo_count}}
- Primary Language: {{primary_language}}

Your role is to:
1. Understand the user's current reality (existing codebase, architecture, pain points)
2. Help define the target state (desired architecture, improvements, goals)
3. Identify high-intent signals in repositories
4. Create function-level reference points

Start by asking the user:
"I'm here to help create a development covenant for your organization. Let's start by understanding your current system. 

What are the main challenges you're facing with your codebase, and what would you like to achieve?"

Guidelines:
- Be conversational and collaborative
- Ask clarifying questions
- Suggest concrete improvements based on patterns you observe
- Create a clear path from reality to target state"#.to_string(),
        variables: vec![
            "org_name".to_string(),
            "repo_count".to_string(),
            "primary_language".to_string(),
        ],
        agent_type: AgentType::Architect,
    }
}

/// Harmony review prompt for analyzing repositories
pub fn review_prompt() -> PromptTemplate {
    PromptTemplate {
        id: "covenant.harmony_review".to_string(),
        name: "Harmony Review".to_string(),
        description: "Analyze repositories and select strike targets".to_string(),
        template: r#"Analyze the following repositories to select optimal strike targets for covenant {{covenant_id}}.

Covenant Objectives:
{{covenant_objectives}}

Repositories to Analyze:
{{repo_list}}

Selection Criteria:
1. **Intent Signal**: How well does this repo align with covenant objectives?
2. **Complexity Score**: What tier of agent should handle this?
3. **Integration Points**: How does it connect with other repos?
4. **Impact Potential**: What value does transforming this repo provide?

Select exactly 5 targets:
- 1 Anchor (primary repository that will coordinate others)
- 4 Agnos (supporting repositories)

For each selected target, provide:
- Repository name
- Role (ANCHOR or AGNO)
- Rationale for selection
- Recommended agent tier (Foreman/Worker distribution)
- Key integration points

Output as structured JSON matching the HarmonyReview schema."#.to_string(),
        variables: vec![
            "covenant_id".to_string(),
            "covenant_objectives".to_string(),
            "repo_list".to_string(),
        ],
        agent_type: AgentType::Architect,
    }
}