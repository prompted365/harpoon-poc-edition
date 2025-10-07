use anyhow::Result;
use harpoon_core::{HarpoonEngine, FragmentInput};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use parking_lot::RwLock;
use tracing::{info, debug};

/// Fusion orchestrator that processes fragments through the Harpoon engine
pub struct FusionOrchestrator {
    engine: HarpoonEngine,
    state: Arc<RwLock<FusionState>>,
}

#[derive(Default)]
struct FusionState {
    total_fragments_processed: usize,
    total_anchors_created: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FusionResult {
    pub absorbed_count: usize,
    pub pending_count: usize,
    pub anchors: Vec<String>,
    pub hygiene_score: Option<f32>,
    pub iterations: usize,
}

impl FusionOrchestrator {
    pub fn new() -> Result<Self> {
        let engine = HarpoonEngine::new_native(None, None)
            .map_err(|e| anyhow::anyhow!("Failed to create Harpoon engine: {}", e))?;
        
        Ok(Self {
            engine,
            state: Arc::new(RwLock::new(FusionState::default())),
        })
    }

    /// Process a single fragment
    pub async fn process_fragment(&self, fragment: FragmentInput) -> Result<FusionResult> {
        self.process_fragments(vec![fragment], 0.7, None).await
    }

    /// Process multiple fragments through the hygiene cycle
    pub async fn process_fragments(
        &self,
        fragments: Vec<FragmentInput>,
        hygiene_threshold: f32,
        max_iterations: Option<usize>,
    ) -> Result<FusionResult> {
        debug!("Processing {} fragments with threshold {}", fragments.len(), hygiene_threshold);
        
        // Run the hygiene cycle (using direct Rust implementation)
        let cycle = self.engine.run_native_cycle(
            fragments,
            hygiene_threshold,
            max_iterations,
        ).map_err(|e| anyhow::anyhow!("Harpoon cycle failed: {}", e))?;
        
        // Update state
        {
            let mut state = self.state.write();
            state.total_fragments_processed += cycle.get_absorbed().len() + cycle.get_pending().len();
            state.total_anchors_created += cycle.get_anchors().len();
        }
        
        // Extract average hygiene score
        let hygiene_score = if !cycle.get_absorbed().is_empty() {
            let sum: f32 = cycle.get_absorbed().iter()
                .filter_map(|f| f.hygiene_score)
                .sum();
            Some(sum / cycle.get_absorbed().len() as f32)
        } else {
            None
        };
        
        info!(
            "Fusion cycle complete: {} absorbed, {} pending, {} iterations",
            cycle.get_absorbed().len(),
            cycle.get_pending().len(),
            cycle.get_iterations()
        );
        
        Ok(FusionResult {
            absorbed_count: cycle.get_absorbed().len(),
            pending_count: cycle.get_pending().len(),
            anchors: cycle.get_anchors().to_vec(),
            hygiene_score,
            iterations: cycle.get_iterations(),
        })
    }

    /// Get processing statistics
    pub fn stats(&self) -> FusionStats {
        let state = self.state.read();
        FusionStats {
            total_fragments_processed: state.total_fragments_processed,
            total_anchors_created: state.total_anchors_created,
            thread_count: self.engine.thread_count(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FusionStats {
    pub total_fragments_processed: usize,
    pub total_anchors_created: usize,
    pub thread_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_fusion_orchestrator() {
        let fusion = FusionOrchestrator::new().unwrap();
        
        let fragment = FragmentInput {
            path: "test.rs".to_string(),
            idx: 1,
            lines: "1-10".to_string(),
            body: "fn main() { println!(\"Hello\"); }".to_string(),
        };
        
        let result = fusion.process_fragment(fragment).await.unwrap();
        assert!(result.iterations > 0);
    }
}