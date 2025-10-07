//! Covenant-related tool definitions

use crate::ToolDefinition;
use serde_json::json;

/// Tool for creating covenants
pub fn create_covenant_tool() -> ToolDefinition {
    ToolDefinition {
        name: "covenant.create".to_string(),
        description: "Create a new development covenant".to_string(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Covenant title"
                },
                "description": {
                    "type": "string",
                    "description": "Detailed description"
                },
                "reality_state": {
                    "type": "object",
                    "description": "Current state of the system"
                },
                "target_state": {
                    "type": "object",
                    "description": "Desired future state"
                }
            },
            "required": ["title", "description", "reality_state", "target_state"]
        }),
        output_schema: json!({
            "type": "object",
            "properties": {
                "covenant_id": {
                    "type": "string",
                    "description": "Generated covenant ID"
                },
                "created_at": {
                    "type": "string",
                    "format": "date-time"
                }
            }
        }),
        capabilities: vec![
            "create_covenant".to_string(),
            "validate_structure".to_string(),
        ],
    }
}