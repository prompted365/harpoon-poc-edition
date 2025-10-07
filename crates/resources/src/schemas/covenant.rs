//! Covenant-related schemas

use crate::DataSchema;
use serde_json::json;

/// Schema for covenant data structure
pub fn covenant_schema() -> DataSchema {
    DataSchema {
        id: "covenant.v1".to_string(),
        name: "Covenant Schema".to_string(),
        version: "1.0.0".to_string(),
        schema: json!({
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "pattern": "^cov-[a-f0-9]{8}$"
                },
                "title": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 200
                },
                "description": {
                    "type": "string"
                },
                "reality_state": {
                    "type": "object",
                    "properties": {
                        "repositories": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "full_name": {"type": "string"},
                                    "description": {"type": ["string", "null"]},
                                    "language": {"type": ["string", "null"]},
                                    "topics": {"type": "array", "items": {"type": "string"}},
                                    "analysis": {
                                        "type": ["object", "null"],
                                        "properties": {
                                            "intent_signal": {"type": "number"},
                                            "complexity_score": {"type": "number"},
                                            "integration_points": {"type": "array", "items": {"type": "string"}}
                                        }
                                    }
                                },
                                "required": ["full_name"]
                            }
                        },
                        "function_references": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "repo": {"type": "string"},
                                    "file_path": {"type": "string"},
                                    "line_number": {"type": "integer"},
                                    "function_name": {"type": "string"},
                                    "signature": {"type": "string"},
                                    "purpose": {"type": ["string", "null"]}
                                },
                                "required": ["repo", "file_path", "line_number", "function_name", "signature"]
                            }
                        },
                        "complexity_assessment": {
                            "type": "object",
                            "properties": {
                                "overall_complexity": {"type": "number"},
                                "integration_complexity": {"type": "number"},
                                "domain_complexity": {"type": "number"},
                                "recommended_tiers": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "tier_name": {"type": "string"},
                                            "model_class": {"type": "string", "enum": ["foreman", "worker"]},
                                            "task_types": {"type": "array", "items": {"type": "string"}},
                                            "expected_count": {"type": "integer"}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "required": ["repositories", "complexity_assessment"]
                },
                "target_state": {
                    "type": "object",
                    "properties": {
                        "objectives": {
                            "type": "array",
                            "items": {"type": "string"},
                            "minItems": 1
                        },
                        "success_criteria": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "constraints": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["objectives"]
                },
                "metadata": {
                    "type": "object",
                    "additionalProperties": true
                },
                "created_at": {
                    "type": "string",
                    "format": "date-time"
                }
            },
            "required": ["id", "title", "description", "reality_state", "target_state", "created_at"]
        }),
    }
}