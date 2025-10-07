use anyhow::Result;
use orchestrator::{InferenceEngine, Orchestrator, ClassifyRequest, RunRequest, HostedAiConfig};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use tracing::{info, debug};

pub mod fusion;
pub mod covenant;
pub mod strike;

use fusion::FusionOrchestrator;
use covenant::{Covenant, CovenantBuilder};

/// Unified orchestration system combining MLX routing with Harpoon integration
pub struct UnifiedOrchestrator {
    /// MLX orchestrator for model routing
    pub(crate) mlx_orchestrator: Arc<Orchestrator>,
    /// Fusion orchestrator for fragment processing
    fusion_orchestrator: Arc<FusionOrchestrator>,
    /// Active covenants
    covenants: Arc<RwLock<HashMap<String, Covenant>>>,
    /// HostedAI integration config
    hosted_config: Option<HostedAiConfig>,
}

// Removed duplicate - using from orchestrator module

#[derive(Debug, Serialize, Deserialize)]
pub struct UnifiedRequest {
    /// Text to process
    pub text: String,
    /// Optional covenant ID to use
    pub covenant_id: Option<String>,
    /// Optional fragment context for fusion processing
    pub fragment_context: Option<FragmentContext>,
    /// Deployment target
    pub deployment: DeploymentTarget,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FragmentContext {
    pub path: String,
    pub idx: u32,
    pub lines: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum DeploymentTarget {
    Native,
    HostedAI,
}

impl UnifiedOrchestrator {
    pub fn new(
        _mlx_engine: Arc<dyn InferenceEngine>,
        hosted_config: Option<HostedAiConfig>,
    ) -> Result<Self> {
        // Create a default Config for Orchestrator
        let config = orchestrator::Config {
            models: orchestrator::Models {
                gemma: orchestrator::ModelConfig {
                    repo: "google/gemma-270M".to_string(),
                    context_limit: 4096,
                    temperature: 0.7,
                    top_p: 0.9,
                    max_new_tokens: 256,
                    enable_thinking: false,
                },
                qwen: orchestrator::ModelConfig {
                    repo: "qwen/qwen-30B".to_string(),
                    context_limit: 8192,
                    temperature: 0.8,
                    top_p: 0.95,
                    max_new_tokens: 1024,
                    enable_thinking: true,
                },
            },
            obsidian: None,
            safety: None,
            hosted_ai: hosted_config.clone(),
        };
        
        let mlx_orchestrator = Arc::new(Orchestrator::new(config)?);
        let fusion_orchestrator = Arc::new(FusionOrchestrator::new()?);

        Ok(Self {
            mlx_orchestrator,
            fusion_orchestrator,
            covenants: Arc::new(RwLock::new(HashMap::new())),
            hosted_config,
        })
    }

    /// Create a new covenant
    pub async fn create_covenant(&self, builder: CovenantBuilder) -> Result<String> {
        let covenant = builder.build()?;
        let covenant_id = covenant.id.clone();
        
        self.covenants.write().insert(covenant_id.clone(), covenant);
        
        info!("Created covenant: {}", covenant_id);
        Ok(covenant_id)
    }

    /// Process a unified request through both MLX and Harpoon systems
    pub async fn process(&self, request: UnifiedRequest) -> Result<UnifiedResponse> {
        // First, classify through MLX
        let classify_req = ClassifyRequest {
            text: request.text.clone(),
            context: None,
        };
        
        let classification = match request.deployment {
            DeploymentTarget::Native => {
                self.mlx_orchestrator.classify(classify_req).await?
            }
            DeploymentTarget::HostedAI => {
                // Use HostedAI allocation for classification
                self.process_with_hosted_ai(classify_req).await?
            }
        };

        // If fragment context provided, process through fusion
        let fusion_result = if let Some(fragment_ctx) = request.fragment_context {
            let fragment = harpoon_core::FragmentInput {
                path: fragment_ctx.path,
                idx: fragment_ctx.idx,
                lines: fragment_ctx.lines,
                body: request.text.clone(),
            };
            
            Some(self.fusion_orchestrator.process_fragment(fragment).await?)
        } else {
            None
        };

        // Run inference if needed
        let inference_result = if classification.is_complex {
            let run_req = RunRequest {
                prompt: request.text,
                model_override: None,
                stream: false,
                temperature: Some(0.7),
                max_tokens: Some(512),
            };
            
            Some(match request.deployment {
                DeploymentTarget::Native => {
                    self.mlx_orchestrator.run(run_req).await?
                }
                DeploymentTarget::HostedAI => {
                    self.run_with_hosted_ai(run_req).await?
                }
            })
        } else {
            None
        };

        Ok(UnifiedResponse {
            classification,
            fusion_result,
            inference_result,
            deployment_used: request.deployment,
        })
    }

    /// Process classification using HostedAI infrastructure
    async fn process_with_hosted_ai(
        &self,
        request: ClassifyRequest,
    ) -> Result<orchestrator::ClassifyResponse> {
        let _config = self.hosted_config.as_ref()
            .ok_or_else(|| anyhow::anyhow!("HostedAI not configured"))?;
        
        // NOTE: Waiting for HostedAI API specification - see HOSTED_AI_README.md section 7
        // Currently using fallback to native implementation
        debug!("HostedAI allocation for classification (simulated)");
        self.mlx_orchestrator.classify(request).await
    }

    /// Run inference using HostedAI infrastructure
    async fn run_with_hosted_ai(
        &self,
        request: RunRequest,
    ) -> Result<orchestrator::RunResponse> {
        let _config = self.hosted_config.as_ref()
            .ok_or_else(|| anyhow::anyhow!("HostedAI not configured"))?;
        
        // NOTE: Waiting for HostedAI API specification - see HOSTED_AI_README.md section 7
        // Currently using fallback to native implementation
        debug!("HostedAI allocation for inference (simulated)");
        self.mlx_orchestrator.run(request).await
    }

    /// Execute a strike operation across repositories
    pub async fn execute_strike(
        &self,
        covenant_id: &str,
        target_repos: Vec<String>,
    ) -> Result<strike::StrikeResult> {
        let covenant = self.covenants.read()
            .get(covenant_id)
            .cloned()
            .ok_or_else(|| anyhow::anyhow!("Covenant not found"))?;
        
        strike::execute_strike(covenant, target_repos, self.mlx_orchestrator.clone()).await
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UnifiedResponse {
    pub classification: orchestrator::ClassifyResponse,
    pub fusion_result: Option<fusion::FusionResult>,
    pub inference_result: Option<orchestrator::RunResponse>,
    pub deployment_used: DeploymentTarget,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_unified_orchestrator_creation() {
        // Mock engine would go here
    }
}