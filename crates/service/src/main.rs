mod config;
mod mock_engine;

use axum::{
    routing::{get, post},
    extract::State,
    Json,
    Router,
};
use serde::{Deserialize, Serialize};
use std::{net::SocketAddr, sync::Arc};
use tower_http::cors::CorsLayer;
use tracing_subscriber::EnvFilter;
use crate::config::AppConfig;

use harpoon_bridge::{
    UnifiedOrchestrator, UnifiedRequest, DeploymentTarget,
    covenant::{CovenantBuilder, RealityState, TargetState},
};
use orchestrator::{ClassifyRequest, RunRequest};
use crate::mock_engine::MockEngine;

#[derive(Clone)]
struct AppState {
    unified_orchestrator: Arc<UnifiedOrchestrator>,
}

// Legacy endpoints for compatibility
#[derive(Deserialize)]
struct TextIn { text: String }

#[derive(Serialize)]
struct ClassOut { category: String, complexity: String, latency_ms: u128 }

#[derive(Serialize)]
struct RunOut { output: String }

// Unified endpoints
#[derive(Deserialize)]
struct CreateCovenantRequest {
    title: String,
    description: String,
    reality_state: RealityState,
    target_state: TargetState,
}

#[derive(Serialize)]
struct CreateCovenantResponse {
    covenant_id: String,
}

#[derive(Deserialize)]
struct ExecuteStrikeRequest {
    covenant_id: String,
    target_repos: Vec<String>,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    deployment_modes: Vec<String>,
    version: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    // Load configuration from environment
    let config = AppConfig::from_env()?;
    
    // Convert to orchestrator HostedAiConfig if available
    let hosted_config = config.hosted_ai.as_ref().map(|hai| {
        orchestrator::HostedAiConfig {
            base_url: hai.base_url.clone(),
            api_key: hai.api_key.clone(),
            pool: hai.pool_id.clone(),
            overcommit: hai.overcommit,
            timeout_secs: 30,
            max_retries: 3,
        }
    });

    // Create mock engine
    let mlx_engine = Arc::new(MockEngine::new()?);
    
    // Create unified orchestrator
    let unified_orchestrator = Arc::new(
        UnifiedOrchestrator::new(mlx_engine, hosted_config)?
    );
    
    let app_state = AppState {
        unified_orchestrator,
    };

    let app = Router::new()
        // Health endpoint
        .route("/health", get(health))
        
        // Legacy MLX endpoints
        .route("/classify", post(classify_legacy))
        .route("/run", post(run_legacy))
        
        // Unified endpoints
        .route("/v2/process", post(process_unified))
        .route("/v2/covenant", post(create_covenant))
        .route("/v2/strike", post(execute_strike))
        
        // Add CORS support
        .layer(CorsLayer::permissive())
        .with_state(app_state);

    let addr: SocketAddr = format!("{}:{}", config.service.host, config.service.port).parse()?;
    tracing::info!("Unified Orchestrator listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app.into_make_service()).await?;
    
    Ok(())
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        deployment_modes: vec!["native".to_string(), "hosted_ai".to_string()],
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

async fn classify_legacy(
    State(state): State<AppState>,
    Json(input): Json<TextIn>,
) -> Result<Json<ClassOut>, (axum::http::StatusCode, String)> {
    let start = std::time::Instant::now();
    
    let req = ClassifyRequest {
        text: input.text,
        context: None,
    };
    
    let unified_req = UnifiedRequest {
        text: req.text.clone(),
        covenant_id: None,
        fragment_context: None,
        deployment: DeploymentTarget::Native,
    };
    
    let unified_result = state.unified_orchestrator
        .process(unified_req)
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    let result = unified_result.classification;
    
    Ok(Json(ClassOut {
        category: if result.is_complex { "complex" } else { "simple" }.to_string(),
        complexity: format!("{:.2}", result.confidence),
        latency_ms: start.elapsed().as_millis(),
    }))
}

async fn run_legacy(
    State(state): State<AppState>,
    Json(input): Json<TextIn>,
) -> Result<Json<RunOut>, (axum::http::StatusCode, String)> {
    let req = RunRequest {
        prompt: input.text,
        model_override: None,
        stream: false,
        temperature: Some(0.7),
        max_tokens: Some(512),
    };
    
    let unified_req = UnifiedRequest {
        text: req.prompt.clone(),
        covenant_id: None,
        fragment_context: None,
        deployment: DeploymentTarget::Native,
    };
    
    let unified_result = state.unified_orchestrator
        .process(unified_req)
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    let result = unified_result.inference_result
        .ok_or_else(|| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "No inference result".to_string()))?;
    
    Ok(Json(RunOut {
        output: result.text,
    }))
}

async fn process_unified(
    State(state): State<AppState>,
    Json(request): Json<UnifiedRequest>,
) -> Result<Json<harpoon_bridge::UnifiedResponse>, (axum::http::StatusCode, String)> {
    let result = state.unified_orchestrator
        .process(request)
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    Ok(Json(result))
}

async fn create_covenant(
    State(state): State<AppState>,
    Json(request): Json<CreateCovenantRequest>,
) -> Result<Json<CreateCovenantResponse>, (axum::http::StatusCode, String)> {
    let builder = CovenantBuilder::new(request.title, request.description)
        .reality_state(request.reality_state)
        .target_state(request.target_state);
    
    let covenant_id = state.unified_orchestrator
        .create_covenant(builder)
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    Ok(Json(CreateCovenantResponse { covenant_id }))
}

async fn execute_strike(
    State(state): State<AppState>,
    Json(request): Json<ExecuteStrikeRequest>,
) -> Result<Json<harpoon_bridge::strike::StrikeResult>, (axum::http::StatusCode, String)> {
    let result = state.unified_orchestrator
        .execute_strike(&request.covenant_id, request.target_repos)
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    Ok(Json(result))
}

// Auto-documentation system integration test
// Test change to trigger LLM hook
// Warp Agent test
