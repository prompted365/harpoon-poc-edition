use anyhow::Result;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::collections::HashMap;

/// A covenant represents an agreement about work to be done
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Covenant {
    pub id: String,
    pub title: String,
    pub description: String,
    pub reality_state: RealityState,
    pub target_state: TargetState,
    pub metadata: HashMap<String, serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Current state of the system/codebase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealityState {
    pub repositories: Vec<RepoMetadata>,
    pub function_references: Vec<FunctionRef>,
    pub complexity_assessment: ComplexityAssessment,
}

/// Desired future state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetState {
    pub objectives: Vec<String>,
    pub success_criteria: Vec<String>,
    pub constraints: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoMetadata {
    pub full_name: String,
    pub description: Option<String>,
    pub language: Option<String>,
    pub topics: Vec<String>,
    pub analysis: Option<RepoAnalysis>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoAnalysis {
    pub intent_signal: f32,  // 0.0-1.0
    pub complexity_score: f32,
    pub integration_points: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionRef {
    pub repo: String,
    pub file_path: String,
    pub line_number: u32,
    pub function_name: String,
    pub signature: String,
    pub purpose: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplexityAssessment {
    pub overall_complexity: f32,
    pub integration_complexity: f32,
    pub domain_complexity: f32,
    pub recommended_tiers: Vec<AgentTier>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTier {
    pub tier_name: String,
    pub model_class: String,  // "foreman" or "worker"
    pub task_types: Vec<String>,
    pub expected_count: usize,
}

/// Builder for creating covenants
pub struct CovenantBuilder {
    title: String,
    description: String,
    reality_state: Option<RealityState>,
    target_state: Option<TargetState>,
    metadata: HashMap<String, serde_json::Value>,
}

impl CovenantBuilder {
    pub fn new(title: impl Into<String>, description: impl Into<String>) -> Self {
        Self {
            title: title.into(),
            description: description.into(),
            reality_state: None,
            target_state: None,
            metadata: HashMap::new(),
        }
    }

    pub fn reality_state(mut self, state: RealityState) -> Self {
        self.reality_state = Some(state);
        self
    }

    pub fn target_state(mut self, state: TargetState) -> Self {
        self.target_state = Some(state);
        self
    }

    pub fn add_metadata(mut self, key: impl Into<String>, value: serde_json::Value) -> Self {
        self.metadata.insert(key.into(), value);
        self
    }

    pub fn build(self) -> Result<Covenant> {
        let reality_state = self.reality_state
            .ok_or_else(|| anyhow::anyhow!("Reality state is required"))?;
        let target_state = self.target_state
            .ok_or_else(|| anyhow::anyhow!("Target state is required"))?;

        Ok(Covenant {
            id: {
                let uuid_str = Uuid::new_v4().to_string();
                format!("cov-{}", &uuid_str[..8])
            },
            title: self.title,
            description: self.description,
            reality_state,
            target_state,
            metadata: self.metadata,
            created_at: chrono::Utc::now(),
        })
    }
}

/// Harmony review result - selecting repos for strike
#[derive(Debug, Serialize, Deserialize)]
pub struct HarmonyReview {
    pub covenant_id: String,
    pub selected_targets: Vec<StrikeTarget>,
    pub delegation_plan: DelegationPlan,
    pub estimated_complexity: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StrikeTarget {
    pub repo: String,
    pub role: TargetRole,
    pub rationale: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum TargetRole {
    Anchor,  // Primary repository
    Agno,    // Supporting repository
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DelegationPlan {
    pub foreman_assignments: Vec<ForemanAssignment>,
    pub worker_pools: Vec<WorkerPool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ForemanAssignment {
    pub agent_id: String,
    pub model: String,  // e.g., "qwen-30b"
    pub responsibilities: Vec<String>,
    pub worker_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkerPool {
    pub pool_id: String,
    pub model: String,  // e.g., "gemma-270m"
    pub task_types: Vec<String>,
    pub size: usize,
}