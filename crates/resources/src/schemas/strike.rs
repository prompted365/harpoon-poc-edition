//! Strike-related schemas

use crate::DataSchema;
use serde_json::json;

/// Schema for strike order
pub fn strike_order_schema() -> DataSchema {
    DataSchema {
        id: "strike_order.v1".to_string(),
        name: "Strike Order Schema".to_string(),
        version: "1.0.0".to_string(),
        schema: json!({
            "type": "object",
            "properties": {
                "covenant_id": {
                    "type": "string",
                    "pattern": "^cov-[a-f0-9]{8}$"
                },
                "targets": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "repo": {"type": "string"},
                            "role": {"type": "string", "enum": ["ANCHOR", "AGNO"]},
                            "rationale": {"type": "string"}
                        },
                        "required": ["repo", "role", "rationale"]
                    },
                    "minItems": 5,
                    "maxItems": 5
                },
                "delegation_plan": {
                    "$ref": "#/definitions/delegation_plan"
                },
                "estimated_complexity": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1
                }
            },
            "required": ["covenant_id", "targets", "delegation_plan"],
            "definitions": {
                "delegation_plan": {
                    "type": "object",
                    "properties": {
                        "foreman_assignments": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "agent_id": {"type": "string"},
                                    "model": {"type": "string"},
                                    "responsibilities": {"type": "array", "items": {"type": "string"}},
                                    "worker_count": {"type": "integer"}
                                }
                            }
                        },
                        "worker_pools": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "pool_id": {"type": "string"},
                                    "model": {"type": "string"},
                                    "task_types": {"type": "array", "items": {"type": "string"}},
                                    "size": {"type": "integer"}
                                }
                            }
                        }
                    }
                }
            }
        }),
    }
}