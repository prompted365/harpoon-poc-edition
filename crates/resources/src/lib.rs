//! Resources library for AI agent communication
//! 
//! This module provides:
//! - Prompt templates for different agent types
//! - Tool definitions for MCP protocol
//! - Data schemas for inter-agent communication
//! - Sampling strategies for model outputs

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use parking_lot::RwLock;
use once_cell::sync::Lazy;

pub mod prompts;
pub mod tools;
pub mod schemas;
pub mod sampling;

/// Central resource registry
pub struct ResourceRegistry {
    prompts: RwLock<HashMap<String, PromptTemplate>>,
    tools: RwLock<HashMap<String, ToolDefinition>>,
    schemas: RwLock<HashMap<String, DataSchema>>,
}

/// Prompt template with variable substitution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub template: String,
    pub variables: Vec<String>,
    pub agent_type: AgentType,
}

/// Tool definition for MCP protocol
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
    pub output_schema: serde_json::Value,
    pub capabilities: Vec<String>,
}

/// Data schema for structured communication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSchema {
    pub id: String,
    pub name: String,
    pub schema: serde_json::Value,
    pub version: String,
}

/// Agent types in the system
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AgentType {
    Architect,  // Claude/SuperMe
    Foreman,    // Qwen-30B
    Worker,     // Gemma-270M
    Coordinator, // Harpoon orchestrator
}

/// Global resource registry instance
pub static REGISTRY: Lazy<ResourceRegistry> = Lazy::new(|| {
    let mut registry = ResourceRegistry {
        prompts: RwLock::new(HashMap::new()),
        tools: RwLock::new(HashMap::new()),
        schemas: RwLock::new(HashMap::new()),
    };
    
    // Initialize with built-in resources
    registry.load_builtin_resources().expect("Failed to load builtin resources");
    registry
});

impl ResourceRegistry {
    /// Load all built-in resources
    fn load_builtin_resources(&mut self) -> Result<()> {
        // Load prompts
        self.register_prompt(prompts::covenant::creation_prompt())?;
        self.register_prompt(prompts::covenant::review_prompt())?;
        self.register_prompt(prompts::strike::delegation_prompt())?;
        self.register_prompt(prompts::fusion::hygiene_prompt())?;
        
        // Load tools
        self.register_tool(tools::github::create_pr_tool())?;
        self.register_tool(tools::github::analyze_repo_tool())?;
        self.register_tool(tools::mlx::classify_tool())?;
        self.register_tool(tools::mlx::inference_tool())?;
        
        // Load schemas
        self.register_schema(schemas::covenant::covenant_schema())?;
        self.register_schema(schemas::strike::strike_order_schema())?;
        self.register_schema(schemas::agent::delegation_plan_schema())?;
        
        Ok(())
    }
    
    /// Register a prompt template
    pub fn register_prompt(&self, prompt: PromptTemplate) -> Result<()> {
        let mut prompts = self.prompts.write();
        prompts.insert(prompt.id.clone(), prompt);
        Ok(())
    }
    
    /// Register a tool definition
    pub fn register_tool(&self, tool: ToolDefinition) -> Result<()> {
        let mut tools = self.tools.write();
        tools.insert(tool.name.clone(), tool);
        Ok(())
    }
    
    /// Register a data schema
    pub fn register_schema(&self, schema: DataSchema) -> Result<()> {
        let mut schemas = self.schemas.write();
        schemas.insert(schema.id.clone(), schema);
        Ok(())
    }
    
    /// Get a prompt template by ID
    pub fn get_prompt(&self, id: &str) -> Option<PromptTemplate> {
        self.prompts.read().get(id).cloned()
    }
    
    /// Get a tool definition by name
    pub fn get_tool(&self, name: &str) -> Option<ToolDefinition> {
        self.tools.read().get(name).cloned()
    }
    
    /// Get a data schema by ID
    pub fn get_schema(&self, id: &str) -> Option<DataSchema> {
        self.schemas.read().get(id).cloned()
    }
    
    /// List all prompts for an agent type
    pub fn prompts_for_agent(&self, agent_type: AgentType) -> Vec<PromptTemplate> {
        self.prompts.read()
            .values()
            .filter(|p| p.agent_type == agent_type)
            .cloned()
            .collect()
    }
    
    /// Export all resources as JSON
    pub fn export_json(&self) -> Result<serde_json::Value> {
        Ok(serde_json::json!({
            "prompts": self.prompts.read().clone(),
            "tools": self.tools.read().clone(),
            "schemas": self.schemas.read().clone(),
        }))
    }
}

/// Render a prompt template with variables
pub fn render_prompt(template: &PromptTemplate, vars: HashMap<String, String>) -> Result<String> {
    let mut rendered = template.template.clone();
    
    for (key, value) in vars {
        let placeholder = format!("{{{{{}}}}}", key);
        rendered = rendered.replace(&placeholder, &value);
    }
    
    Ok(rendered)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_prompt_rendering() {
        let prompt = PromptTemplate {
            id: "test".to_string(),
            name: "Test Prompt".to_string(),
            description: "A test prompt".to_string(),
            template: "Hello {{name}}, you have {{count}} messages".to_string(),
            variables: vec!["name".to_string(), "count".to_string()],
            agent_type: AgentType::Worker,
        };
        
        let mut vars = HashMap::new();
        vars.insert("name".to_string(), "Alice".to_string());
        vars.insert("count".to_string(), "5".to_string());
        
        let rendered = render_prompt(&prompt, vars).unwrap();
        assert_eq!(rendered, "Hello Alice, you have 5 messages");
    }
}