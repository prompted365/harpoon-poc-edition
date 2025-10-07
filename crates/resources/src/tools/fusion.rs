//! Fusion-related tool definitions

use crate::ToolDefinition;
use serde_json::json;

/// Tool for processing fragments
pub fn process_fragments_tool() -> ToolDefinition {
    ToolDefinition {
        name: "fusion.process_fragments".to_string(),
        description: "Process code fragments through hygiene scoring".to_string(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "fragments": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "path": {"type": "string"},
                            "idx": {"type": "integer"},
                            "lines": {"type": "string"},
                            "body": {"type": "string"}
                        },
                        "required": ["path", "idx", "lines", "body"]
                    }
                },
                "hygiene_threshold": {
                    "type": "number",
                    "minimum": 0.0,
                    "maximum": 1.0
                },
                "max_iterations": {
                    "type": ["integer", "null"]
                }
            },
            "required": ["fragments", "hygiene_threshold"]
        }),
        output_schema: json!({
            "type": "object",
            "properties": {
                "absorbed_count": {"type": "integer"},
                "pending_count": {"type": "integer"},
                "anchors": {"type": "array", "items": {"type": "string"}},
                "iterations": {"type": "integer"}
            }
        }),
        capabilities: vec![
            "hygiene_scoring".to_string(),
            "anchor_extraction".to_string(),
            "parallel_processing".to_string(),
        ],
    }
}