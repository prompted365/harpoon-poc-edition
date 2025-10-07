//! # Orchestrator
//!
//! Core orchestration engine for routing AI inference requests to appropriate models.
//!
//! This crate provides a flexible, efficient orchestration layer that can route
//! requests to different AI models based on task complexity and type. It supports
//! multiple backends including local MLX models and remote HostedAI infrastructure.
//!
//! ## Features
//!
//! - **Smart Routing**: Automatically routes requests to appropriate models based on complexity
//! - **Multi-Backend**: Supports both local (MLX) and remote (HostedAI) inference
//! - **Async-First**: Built on Tokio for high-performance async operations
//! - **Extensible**: Easy to add new models and inference engines
//!
//! ## Example
//!
//! ```rust,no_run
//! use orchestrator::{Config, Homeskillet};
//! 
//! # async fn example() -> anyhow::Result<()> {
//! let config = Config::default();
//! let orchestrator = Homeskillet::new(config)?;
//! 
//! // Classify a task
//! let classification = orchestrator.classify("Write a hello world program").await?;
//! 
//! // Run inference
//! let result = orchestrator.run("Explain quantum computing").await?;
//! # Ok(())
//! # }
//! ```
//!
//! ## License
//!
//! This crate is dual-licensed under MIT and Apache 2.0 licenses.

mod types;
pub mod config;
pub mod metrics;
pub mod server;

pub use types::{
    ClassifyRequest, ClassifyResponse, Orchestrator, RunRequest, RunResponse,
};

pub use config::{OrchestratorConfig, ConfigBuilder};

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::time::Instant;

pub mod hosted_ai;
pub use hosted_ai::{HostedAiConfig, HostedAiConnector};

#[cfg(feature = "pymlx")]
use engine_pymlx::{PythonMlxEngine as DefaultEngine};

#[cfg(not(feature = "pymlx"))]
pub struct DefaultEngine;

// Always define GenOptions in orchestrator to avoid type conflicts
#[derive(Clone, Copy, Debug)]
pub struct GenOptions {
    pub max_tokens: usize,
    pub temperature: f32,
    pub top_p: f32,
}

#[cfg(feature = "pymlx")]
fn convert_gen_options(opts: GenOptions) -> engine_pymlx::GenOptions {
    engine_pymlx::GenOptions {
        max_tokens: opts.max_tokens,
        temperature: opts.temperature,
        top_p: opts.top_p,
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelConfig {
    pub repo: String,
    pub context_limit: usize,
    pub temperature: f32,
    pub top_p: f32,
    pub max_new_tokens: usize,
    #[serde(default)]
    pub enable_thinking: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ObsidianConfig {
    pub enabled: bool,
    pub vault_path: String,
    pub categories: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SafetyConfig {
    pub redact_emails: bool,
    pub redact_phones: bool,
    pub strip_api_keys: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Config {
    pub models: Models,
    pub obsidian: Option<ObsidianConfig>,
    pub safety: Option<SafetyConfig>,
    pub hosted_ai: Option<HostedAiConfig>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Models {
    pub gemma: ModelConfig,
    pub qwen: ModelConfig,
}


/// Trait for an inference engine that can generate text from prompts.
/// 
/// This trait must be implemented by any backend that wants to provide
/// inference capabilities to the orchestrator.
/// 
/// # Example
/// 
/// ```rust,ignore
/// struct MyEngine;
/// 
/// impl InferenceEngine for MyEngine {
///     fn generate(&self, prompt: &str, opts: GenOptions) -> Result<String> {
///         // Your inference logic here
///         Ok("Generated response".to_string())
///     }
/// }
/// ```
pub trait InferenceEngine: Send + Sync + 'static {
    /// Generate text based on the given prompt and options.
    /// 
    /// # Arguments
    /// 
    /// * `prompt` - The input prompt to generate from
    /// * `opts` - Generation options including temperature, max tokens, etc.
    /// 
    /// # Returns
    /// 
    /// The generated text or an error if generation fails.
    fn generate(&self, prompt: &str, opts: GenOptions) -> Result<String>;
}

#[cfg(feature = "pymlx")]
impl InferenceEngine for DefaultEngine {
    fn generate(&self, prompt: &str, opts: GenOptions) -> Result<String> {
        DefaultEngine::generate(self, prompt, convert_gen_options(opts))
    }
}

#[cfg(not(feature = "pymlx"))]
impl InferenceEngine for DefaultEngine {
    fn generate(&self, _prompt: &str, _opts: GenOptions) -> Result<String> {
        anyhow::bail!("No inference engine linked (feature `pymlx` disabled).")
    }
}

#[cfg(not(feature = "pymlx"))]
impl DefaultEngine {
    pub fn new(_repo: &str) -> Result<Self> {
        Ok(DefaultEngine)
    }
}

/// Router categories/complexity
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Classification {
    pub category: String,   // code, reasoning, creative, extraction, summary, classification
    pub complexity: String, // simple, moderate, complex
    pub latency_ms: u128,
}

/// Core orchestrator
pub struct Homeskillet {
    cfg: Config,
    // Engines
    gemma: DefaultEngine,
    qwen: DefaultEngine,
}

impl Homeskillet {
    pub fn new(cfg: Config) -> Result<Self> {
        let gemma = DefaultEngine::new(&cfg.models.gemma.repo)?;
        let qwen = DefaultEngine::new(&cfg.models.qwen.repo)?;
        Ok(Self { cfg, gemma, qwen })
    }

    pub fn classify(&self, task: &str) -> Result<Classification> {
        // Simple prompt—intentionally short to reduce KV growth
        let prompt = format!(
            "Return compact JSON with keys {{category,complexity}}.\n\
             Categories=[code,reasoning,creative,extraction,summary,classification]\n\
             Complexity=[simple,moderate,complex]\n\
             Task: {}\n\
             JSON:",
            &task.chars().take(800).collect::<String>()
        );

        let start = Instant::now();
        let out = InferenceEngine::generate(&self.gemma, &prompt, GenOptions {
            max_tokens: self.cfg.models.gemma.max_new_tokens.min(128),
            temperature: self.cfg.models.gemma.temperature.max(0.1),
            top_p: self.cfg.models.gemma.top_p,
        })?;
        let latency = start.elapsed().as_millis();

        // Best-effort JSON parse
        let mut category = "classification".to_string();
        let mut complexity = "simple".to_string();
        if let Some((i, j)) = out.find('{').zip(out.rfind('}')) {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&out[i..=j]) {
                category = v.get("category").and_then(|x| x.as_str()).unwrap_or("classification").to_string();
                complexity = v.get("complexity").and_then(|x| x.as_str()).unwrap_or("simple").to_string();
            }
        }
        Ok(Classification { category, complexity, latency_ms: latency })
    }

    pub fn run(&self, task: &str) -> Result<String> {
        let cls = self.classify(task)?;
        match (cls.complexity.as_str(), cls.category.as_str()) {
            ("simple", _) | (_, "extraction") | (_, "summary") | (_, "classification") => {
                self.run_gemma(task)
            }
            _ => self.run_qwen(task, cls.complexity == "complex"),
        }
    }

    pub async fn classify_async(&self, task: &str, _context: Option<&str>) -> Result<Classification> {
        // For async compatibility, wrap the sync classify
        tokio::task::block_in_place(|| self.classify(task))
    }

    pub async fn generate_direct(
        &self,
        model: &str,
        prompt: &str,
        temperature: Option<f32>,
        max_tokens: Option<usize>,
    ) -> Result<String> {
        // Route to specific model based on repo name
        tokio::task::block_in_place(|| {
            if model.contains("gemma") || model.contains("Gemma") {
                InferenceEngine::generate(&self.gemma, prompt, GenOptions {
                    max_tokens: max_tokens.unwrap_or(self.cfg.models.gemma.max_new_tokens),
                    temperature: temperature.unwrap_or(self.cfg.models.gemma.temperature),
                    top_p: self.cfg.models.gemma.top_p,
                })
            } else {
                InferenceEngine::generate(&self.qwen, prompt, GenOptions {
                    max_tokens: max_tokens.unwrap_or(self.cfg.models.qwen.max_new_tokens),
                    temperature: temperature.unwrap_or(self.cfg.models.qwen.temperature),
                    top_p: self.cfg.models.qwen.top_p,
                })
            }
        })
    }

    fn run_gemma(&self, task: &str) -> Result<String> {
        let prompt = format!("Task: {}\nProvide a clear, concise response:", task);
        InferenceEngine::generate(&self.gemma, &prompt, GenOptions {
            max_tokens: self.cfg.models.gemma.max_new_tokens.min(256),
            temperature: self.cfg.models.gemma.temperature.max(0.1),
            top_p: self.cfg.models.gemma.top_p,
        })
    }

    fn run_qwen(&self, task: &str, enable_thinking: bool) -> Result<String> {
        let mut prompt = format!("Task: {}\nProvide a detailed, step-by-step response.", task);
        if enable_thinking || self.cfg.models.qwen.enable_thinking {
            prompt = format!("<think>\n{}\n</think>", prompt);
        }
        InferenceEngine::generate(&self.qwen, &prompt, GenOptions {
            max_tokens: self.cfg.models.qwen.max_new_tokens,
            temperature: self.cfg.models.qwen.temperature,
            top_p: self.cfg.models.qwen.top_p,
        })
    }
}

