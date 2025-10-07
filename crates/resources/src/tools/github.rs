//! GitHub-related tool definitions

use crate::ToolDefinition;
use serde_json::json;

/// Tool for creating pull requests
pub fn create_pr_tool() -> ToolDefinition {
    ToolDefinition {
        name: "github.create_pr".to_string(),
        description: "Create a pull request on a GitHub repository".to_string(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "repository": {
                    "type": "string",
                    "description": "Full repository name (owner/repo)"
                },
                "branch": {
                    "type": "string",
                    "description": "Branch name for the PR"
                },
                "title": {
                    "type": "string",
                    "description": "PR title"
                },
                "body": {
                    "type": "string",
                    "description": "PR description in markdown"
                },
                "files": {
                    "type": "object",
                    "description": "Files to create/update (path -> content)",
                    "additionalProperties": {
                        "type": "string"
                    }
                }
            },
            "required": ["repository", "branch", "title", "body", "files"]
        }),
        output_schema: json!({
            "type": "object",
            "properties": {
                "pr_url": {
                    "type": "string",
                    "description": "URL of the created PR"
                },
                "pr_number": {
                    "type": "integer",
                    "description": "PR number"
                }
            }
        }),
        capabilities: vec![
            "create_branch".to_string(),
            "commit_files".to_string(),
            "open_pr".to_string(),
        ],
    }
}

/// Tool for analyzing repository metadata
pub fn analyze_repo_tool() -> ToolDefinition {
    ToolDefinition {
        name: "github.analyze_repo".to_string(),
        description: "Analyze a GitHub repository's structure and metadata".to_string(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "repository": {
                    "type": "string",
                    "description": "Full repository name (owner/repo)"
                },
                "analysis_depth": {
                    "type": "string",
                    "enum": ["shallow", "deep"],
                    "description": "Level of analysis to perform"
                }
            },
            "required": ["repository"]
        }),
        output_schema: json!({
            "type": "object",
            "properties": {
                "languages": {
                    "type": "object",
                    "description": "Programming languages used (language -> percentage)"
                },
                "structure": {
                    "type": "object",
                    "properties": {
                        "directories": {"type": "array", "items": {"type": "string"}},
                        "key_files": {"type": "array", "items": {"type": "string"}},
                        "has_tests": {"type": "boolean"},
                        "has_ci": {"type": "boolean"}
                    }
                },
                "metadata": {
                    "type": "object",
                    "properties": {
                        "stars": {"type": "integer"},
                        "forks": {"type": "integer"},
                        "issues": {"type": "integer"},
                        "last_commit": {"type": "string"},
                        "topics": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "intent_signal": {
                    "type": "number",
                    "description": "Calculated intent signal (0-1)"
                }
            }
        }),
        capabilities: vec![
            "read_repo_metadata".to_string(),
            "analyze_structure".to_string(),
            "calculate_metrics".to_string(),
        ],
    }
}