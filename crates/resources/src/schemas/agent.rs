//! Agent communication schemas

use crate::DataSchema;
use serde_json::json;

/// Schema for delegation plans
pub fn delegation_plan_schema() -> DataSchema {
    DataSchema {
        id: "delegation_plan.v1".to_string(),
        name: "Delegation Plan Schema".to_string(),
        version: "1.0.0".to_string(),
        schema: json!({
            "type": "object",
            "properties": {
                "plan_id": {"type": "string"},
                "covenant_id": {"type": "string"},
                "total_agents": {"type": "integer"},
                "foremen": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "agent_id": {"type": "string"},
                            "model": {"type": "string", "enum": ["qwen-30b"]},
                            "assigned_repo": {"type": "string"},
                            "worker_pool": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "worker_id": {"type": "string"},
                                        "task_type": {"type": "string"}
                                    }
                                }
                            },
                            "coordination_channels": {
                                "type": "array",
                                "items": {"type": "string"}
                            }
                        },
                        "required": ["agent_id", "model", "assigned_repo"]
                    }
                },
                "workers": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "worker_id": {"type": "string"},
                            "model": {"type": "string", "enum": ["gemma-270m"]},
                            "foreman_id": {"type": "string"},
                            "assigned_tasks": {
                                "type": "array",
                                "items": {"type": "string"}
                            }
                        },
                        "required": ["worker_id", "model", "foreman_id"]
                    }
                },
                "communication_matrix": {
                    "type": "object",
                    "description": "Defines which agents can communicate",
                    "additionalProperties": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "synchronization_points": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "point_id": {"type": "string"},
                            "description": {"type": "string"},
                            "required_agents": {"type": "array", "items": {"type": "string"}},
                            "trigger_condition": {"type": "string"}
                        }
                    }
                }
            },
            "required": ["plan_id", "covenant_id", "foremen", "workers"]
        }),
    }
}

/// Schema for agent messages
pub fn agent_message_schema() -> DataSchema {
    DataSchema {
        id: "agent_message.v1".to_string(),
        name: "Agent Message Schema".to_string(),
        version: "1.0.0".to_string(),
        schema: json!({
            "type": "object",
            "properties": {
                "message_id": {"type": "string"},
                "timestamp": {"type": "string", "format": "date-time"},
                "sender": {
                    "type": "object",
                    "properties": {
                        "agent_id": {"type": "string"},
                        "agent_type": {"type": "string", "enum": ["architect", "foreman", "worker", "coordinator"]},
                        "model": {"type": "string"}
                    },
                    "required": ["agent_id", "agent_type"]
                },
                "receiver": {
                    "type": "object",
                    "properties": {
                        "agent_id": {"type": "string"},
                        "agent_type": {"type": "string", "enum": ["architect", "foreman", "worker", "coordinator"]},
                        "model": {"type": "string"}
                    },
                    "required": ["agent_id", "agent_type"]
                },
                "message_type": {
                    "type": "string",
                    "enum": ["task_assignment", "status_update", "result", "query", "coordination", "error"]
                },
                "content": {
                    "type": "object",
                    "additionalProperties": true
                },
                "context": {
                    "type": "object",
                    "properties": {
                        "covenant_id": {"type": "string"},
                        "strike_id": {"type": "string"},
                        "task_id": {"type": "string"},
                        "parent_message_id": {"type": "string"}
                    }
                },
                "requires_response": {"type": "boolean"},
                "response_timeout_ms": {"type": "integer"}
            },
            "required": ["message_id", "timestamp", "sender", "receiver", "message_type", "content"]
        }),
    }
}