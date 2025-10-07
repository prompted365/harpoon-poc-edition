//! Mock inference engine for testing

use anyhow::Result;
use orchestrator::{InferenceEngine, GenOptions};

/// Mock inference engine that returns canned responses
pub struct MockEngine;

impl MockEngine {
    pub fn new() -> Result<Self> {
        Ok(MockEngine)
    }
}

impl InferenceEngine for MockEngine {
    fn generate(&self, prompt: &str, _opts: GenOptions) -> Result<String> {
        // Return a simple mock response based on the prompt
        if prompt.contains("JSON") {
            Ok(r#"{"category": "code", "complexity": "simple"}"#.to_string())
        } else {
            Ok(format!("[Mock response for: {}]", 
                prompt.chars().take(50).collect::<String>()))
        }
    }
}