//! Fusion-related schemas

use crate::DataSchema;
use serde_json::json;

/// Schema for fusion trail data
pub fn fusion_trail_schema() -> DataSchema {
    DataSchema {
        id: "fusion_trail.v1".to_string(),
        name: "Fusion Trail Schema".to_string(),
        version: "1.0.0".to_string(),
        schema: json!({
            "type": "object",
            "properties": {
                "run_id": {
                    "type": "string",
                    "pattern": "^fusion-[a-f0-9]{8}$"
                },
                "covenant_id": {
                    "type": ["string", "null"]
                },
                "status": {
                    "type": "string",
                    "enum": ["pending", "queued", "processing", "completed", "failed"]
                },
                "hygiene_threshold": {
                    "type": "number",
                    "minimum": 0.0,
                    "maximum": 1.0
                },
                "fragments_total": {
                    "type": "integer",
                    "minimum": 0
                },
                "fragments_absorbed": {
                    "type": "integer",
                    "minimum": 0
                },
                "anchors": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "logstream": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "event": {"type": "string"},
                            "timestamp": {"type": "number"},
                            "fragment_path": {"type": "string"},
                            "hygiene_score": {"type": ["number", "null"]}
                        }
                    }
                }
            },
            "required": ["run_id", "status", "hygiene_threshold"]
        }),
    }
}