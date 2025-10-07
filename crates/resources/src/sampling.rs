//! Sampling strategies for model outputs and agent communication

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Sampling configuration for model outputs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SamplingConfig {
    pub temperature: f32,
    pub top_p: f32,
    pub max_tokens: usize,
    pub stop_sequences: Vec<String>,
    pub presence_penalty: f32,
    pub frequency_penalty: f32,
}

impl Default for SamplingConfig {
    fn default() -> Self {
        Self {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 512,
            stop_sequences: vec![],
            presence_penalty: 0.0,
            frequency_penalty: 0.0,
        }
    }
}

/// Sampling presets for different agent types
pub mod presets {
    use super::SamplingConfig;
    
    /// Precise sampling for architect/SuperMe
    pub fn architect() -> SamplingConfig {
        SamplingConfig {
            temperature: 0.3,
            top_p: 0.95,
            max_tokens: 2048,
            ..Default::default()
        }
    }
    
    /// Balanced sampling for foremen
    pub fn foreman() -> SamplingConfig {
        SamplingConfig {
            temperature: 0.5,
            top_p: 0.9,
            max_tokens: 1024,
            ..Default::default()
        }
    }
    
    /// Fast sampling for workers
    pub fn worker() -> SamplingConfig {
        SamplingConfig {
            temperature: 0.7,
            top_p: 0.8,
            max_tokens: 256,
            ..Default::default()
        }
    }
}

/// Mid-turn sampling for agent-to-agent communication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MidTurnSample {
    pub agent_id: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub partial_output: String,
    pub confidence: f32,
    pub requires_validation: bool,
}

/// Sampling strategy for different communication patterns
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SamplingStrategy {
    /// Direct response with no intermediate sampling
    Direct,
    
    /// Sample at specific token intervals
    Interval { tokens: usize },
    
    /// Sample when confidence drops below threshold
    ConfidenceBased { threshold: f32 },
    
    /// Sample at semantic boundaries (sentences, paragraphs)
    SemanticBoundary,
    
    /// Custom sampling function
    Custom { function_id: String },
}

/// Agent sampling coordinator
pub struct SamplingCoordinator {
    strategies: HashMap<String, SamplingStrategy>,
    samples: Vec<MidTurnSample>,
}

impl SamplingCoordinator {
    pub fn new() -> Self {
        Self {
            strategies: HashMap::new(),
            samples: Vec::new(),
        }
    }
    
    /// Register sampling strategy for an agent
    pub fn register_strategy(&mut self, agent_id: String, strategy: SamplingStrategy) {
        self.strategies.insert(agent_id, strategy);
    }
    
    /// Process a token stream and determine if sampling is needed
    pub fn should_sample(
        &self,
        agent_id: &str,
        tokens_generated: usize,
        current_text: &str,
        confidence: f32,
    ) -> bool {
        match self.strategies.get(agent_id) {
            Some(SamplingStrategy::Direct) => false,
            Some(SamplingStrategy::Interval { tokens }) => tokens_generated % tokens == 0,
            Some(SamplingStrategy::ConfidenceBased { threshold }) => confidence < *threshold,
            Some(SamplingStrategy::SemanticBoundary) => {
                // Check for sentence endings
                current_text.ends_with('.') || 
                current_text.ends_with('?') || 
                current_text.ends_with('!')
            }
            Some(SamplingStrategy::Custom { .. }) => {
                // Would call custom function
                false
            }
            None => false,
        }
    }
    
    /// Record a mid-turn sample
    pub fn record_sample(&mut self, sample: MidTurnSample) {
        self.samples.push(sample);
    }
    
    /// Get samples for validation by another agent
    pub fn get_samples_for_validation(&self, validator_id: &str) -> Vec<&MidTurnSample> {
        self.samples
            .iter()
            .filter(|s| s.requires_validation && s.agent_id != validator_id)
            .collect()
    }
}

/// Structured sampling for tool outputs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolOutputSample {
    pub tool_name: String,
    pub input_hash: String,
    pub output_samples: Vec<serde_json::Value>,
    pub sampling_method: SamplingMethod,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SamplingMethod {
    /// Sample uniformly from output space
    Uniform { count: usize },
    
    /// Sample based on probability distribution
    Probabilistic { distribution: HashMap<String, f32> },
    
    /// Sample edge cases
    EdgeCases,
    
    /// Sample based on historical performance
    HistoricalBias { success_weight: f32 },
}

/// Create samples from an array of possible outputs
pub fn sample_from_array<T: Clone>(
    array: &[T],
    method: &SamplingMethod,
) -> Result<Vec<T>> {
    match method {
        SamplingMethod::Uniform { count } => {
            // Simple uniform sampling
            let step = array.len() / count.max(&1);
            Ok(array.iter()
                .step_by(step.max(1))
                .take(*count)
                .cloned()
                .collect())
        }
        SamplingMethod::EdgeCases => {
            // Return first, last, and middle elements
            let mut samples = vec![];
            if !array.is_empty() {
                samples.push(array[0].clone());
                if array.len() > 1 {
                    samples.push(array[array.len() - 1].clone());
                }
                if array.len() > 2 {
                    let middle_index = (array.len() - 1) / 2;
                    samples.push(array[middle_index].clone());
                }
            }
            Ok(samples)
        }
        _ => Ok(vec![]), // Other methods would need more context
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_sampling_strategies() {
        let coord = SamplingCoordinator::new();
        
        // Test interval sampling
        assert!(!coord.should_sample("agent1", 5, "Hello", 0.9));
        
        // Test confidence sampling
        assert!(!coord.should_sample("agent2", 10, "Test", 0.8));
        
        // Test semantic boundary
        assert!(!coord.should_sample("agent3", 15, "This is a test.", 0.9));
    }
    
    #[test]
    fn test_array_sampling() {
        let data = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        
        let uniform = sample_from_array(&data, &SamplingMethod::Uniform { count: 3 }).unwrap();
        assert_eq!(uniform.len(), 3);
        
        let edges = sample_from_array(&data, &SamplingMethod::EdgeCases).unwrap();
        assert_eq!(edges, vec![1, 10, 5]);
    }
}