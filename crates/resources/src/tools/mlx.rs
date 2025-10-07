//! MLX model interaction tools

use crate::ToolDefinition;
use serde_json::json;

/// Tool for text classification
pub fn classify_tool() -> ToolDefinition {
    ToolDefinition {
        name: "mlx.classify".to_string(),
        description: "Classify text using MLX models".to_string(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Text to classify"
                },
                "deployment": {
                    "type": "string",
                    "enum": ["native", "hosted_ai"],
                    "description": "Deployment target"
                },
                "max_length": {
                    "type": "integer",
                    "description": "Maximum text length to process"
                }
            },
            "required": ["text"]
        }),
        output_schema: json!({
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "Classification category"
                },
                "complexity": {
                    "type": "number",
                    "description": "Complexity score (0-1)"
                },
                "confidence": {
                    "type": "number",
                    "description": "Classification confidence (0-1)"
                }
            }
        }),
        capabilities: vec![
            "text_classification".to_string(),
            "complexity_assessment".to_string(),
        ],
    }
}

/// Tool for running inference
pub fn inference_tool() -> ToolDefinition {
    ToolDefinition {
        name: "mlx.inference".to_string(),
        description: "Run inference using MLX models".to_string(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Input prompt"
                },
                "deployment": {
                    "type": "string",
                    "enum": ["native", "hosted_ai"],
                    "description": "Deployment target"
                },
                "max_tokens": {
                    "type": "integer",
                    "description": "Maximum tokens to generate"
                },
                "temperature": {
                    "type": "number",
                    "description": "Sampling temperature"
                },
                "stream": {
                    "type": "boolean",
                    "description": "Enable streaming response"
                }
            },
            "required": ["prompt"]
        }),
        output_schema: json!({
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Generated text"
                },
                "model_used": {
                    "type": "string",
                    "description": "Model that generated the response"
                },
                "tokens_used": {
                    "type": "integer",
                    "description": "Number of tokens generated"
                }
            }
        }),
        capabilities: vec![
            "text_generation".to_string(),
            "streaming".to_string(),
            "model_routing".to_string(),
        ],
    }
}