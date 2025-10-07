//! Agent communication and coordination prompts

use crate::{PromptTemplate, AgentType};

/// Inter-agent communication prompt
pub fn agent_communication_prompt() -> PromptTemplate {
    PromptTemplate {
        id: "agent.communication".to_string(),
        name: "Agent Communication".to_string(),
        description: "Template for agent-to-agent communication".to_string(),
        template: r#"Message from {{sender_type}} ({{sender_id}}) to {{receiver_type}} ({{receiver_id}}):

Context: {{shared_context}}

Message Type: {{message_type}}

Content:
{{message_content}}

Expected Response:
{{expected_response}}

Please acknowledge receipt and indicate your planned action."#.to_string(),
        variables: vec![
            "sender_type".to_string(),
            "sender_id".to_string(),
            "receiver_type".to_string(),
            "receiver_id".to_string(),
            "shared_context".to_string(),
            "message_type".to_string(),
            "message_content".to_string(),
            "expected_response".to_string(),
        ],
        agent_type: AgentType::Coordinator,
    }
}

/// Task delegation prompt for foremen
pub fn task_delegation_prompt() -> PromptTemplate {
    PromptTemplate {
        id: "agent.task_delegation".to_string(),
        name: "Task Delegation".to_string(),
        description: "Foreman delegating tasks to workers".to_string(),
        template: r#"As a Foreman agent, delegate the following task to your worker pool.

Main Task: {{main_task}}
Repository: {{repository}}
Available Workers: {{worker_count}}

Break down the task into subtasks that can be executed in parallel:

1. **Analysis Phase**:
   - What needs to be understood?
   - Which files/functions to examine?
   
2. **Implementation Phase**:
   - What changes are needed?
   - How to maintain compatibility?
   
3. **Verification Phase**:
   - What tests to run/create?
   - How to verify integration?

Assign specific workers to each subtask with clear instructions:
- Worker assignments should balance load
- Include synchronization points
- Define clear success criteria
- Specify output format for results

Remember: Workers handle simple tasks best. Complex reasoning stays with you."#.to_string(),
        variables: vec![
            "main_task".to_string(),
            "repository".to_string(),
            "worker_count".to_string(),
        ],
        agent_type: AgentType::Foreman,
    }
}