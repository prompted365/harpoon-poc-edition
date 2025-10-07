use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ClassifyRequest {
    pub text: String,
    pub context: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ClassifyResponse {
    pub is_complex: bool,
    pub reasoning: String,
    pub confidence: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RunRequest {
    pub prompt: String,
    pub model_override: Option<String>,
    pub stream: bool,
    pub temperature: Option<f32>,
    pub max_tokens: Option<usize>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RunResponse {
    pub text: String,
    pub model_used: String,
    pub tokens_generated: usize,
    pub generation_time_ms: u128,
}

/// Main orchestrator for MLX models
pub struct Orchestrator {
    homeskillet: crate::Homeskillet,
}

impl Orchestrator {
    pub fn new(config: crate::Config) -> anyhow::Result<Self> {
        Ok(Self {
            homeskillet: crate::Homeskillet::new(config)?,
        })
    }

    pub async fn classify(&self, request: ClassifyRequest) -> anyhow::Result<ClassifyResponse> {
        let classification = self.homeskillet.classify_async(&request.text, request.context.as_deref()).await?;
        
        // Map complexity to is_complex
        let is_complex = classification.complexity == "complex";
        
        Ok(ClassifyResponse {
            is_complex,
            reasoning: format!("Category: {}, Complexity: {}", classification.category, classification.complexity),
            confidence: if is_complex { 0.8 } else { 0.9 }, // Simple heuristic
        })
    }

    pub async fn run(&self, request: RunRequest) -> anyhow::Result<RunResponse> {
        let start = std::time::Instant::now();
        
        let (text, model_used) = if request.model_override.is_some() {
            // Direct model invocation
            let model = request.model_override.as_ref().unwrap();
            let result = self.homeskillet.generate_direct(
                model,
                &request.prompt,
                request.temperature,
                request.max_tokens,
            ).await?;
            (result, model.clone())
        } else {
            // Auto-routing based on classification
            let classification = self.homeskillet.classify_async(&request.prompt, None).await?;
            let is_complex = classification.complexity == "complex";
            
            // Access config through homeskillet's cfg field
            let model = if is_complex {
                "qwen-30B" // Default heavy model
            } else {
                "gemma-270M" // Default light model
            };
            
            let result = self.homeskillet.generate_direct(
                model,
                &request.prompt,
                request.temperature,
                request.max_tokens,
            ).await?;
            (result, model.to_string())
        };
        
        let tokens_generated = text.split_whitespace().count();
        
        Ok(RunResponse {
            text,
            model_used,
            tokens_generated, // Rough approximation
            generation_time_ms: start.elapsed().as_millis(),
        })
    }
}