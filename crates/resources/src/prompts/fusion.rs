//! Fusion and fragment processing prompts

use crate::{PromptTemplate, AgentType};

/// Fragment hygiene analysis prompt
pub fn hygiene_prompt() -> PromptTemplate {
    PromptTemplate {
        id: "fusion.hygiene".to_string(),
        name: "Fragment Hygiene Analysis".to_string(),
        description: "Analyze code fragment quality and integration readiness".to_string(),
        template: r#"Analyze the following code fragment for hygiene and integration readiness.

Fragment Details:
- Path: {{fragment_path}}
- Lines: {{fragment_lines}}
- Language: {{language}}

Code Fragment:
```{{language}}
{{fragment_body}}
```

Assess the fragment on these criteria:
1. **Code Quality** (0-1): Is the code well-structured and maintainable?
2. **Documentation** (0-1): Are functions/classes properly documented?
3. **Integration Readiness** (0-1): Can this be easily integrated with other components?
4. **Complexity** (0-1): Is the complexity appropriate for its purpose?
5. **Security** (0-1): Are there any obvious security concerns?

Calculate overall hygiene score (0-1) and provide:
- Specific issues found
- Recommendations for improvement
- Integration points identified
- Whether fragment should be absorbed or requeued

Current threshold: {{hygiene_threshold}}"#.to_string(),
        variables: vec![
            "fragment_path".to_string(),
            "fragment_lines".to_string(),
            "language".to_string(),
            "fragment_body".to_string(),
            "hygiene_threshold".to_string(),
        ],
        agent_type: AgentType::Worker,
    }
}