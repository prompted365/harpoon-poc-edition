use crate::config::OrchestratorConfig;
use crate::metrics::MetricsExporter;
use crate::Homeskillet;
use axum::{
    extract::{State, Json},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_http::{
    cors::CorsLayer,
    trace::TraceLayer,
    timeout::TimeoutLayer,
};
use std::time::Duration;

/// Shared application state
#[derive(Clone)]
pub struct AppState {
    pub orchestrator: Arc<Homeskillet>,
    pub config: Arc<OrchestratorConfig>,
    pub metrics_exporter: Arc<MetricsExporter>,
}

/// Health check response
#[derive(Serialize, Deserialize)]
struct HealthResponse {
    status: String,
    version: String,
    uptime_seconds: u64,
}

/// Ready check response
#[derive(Serialize)]
struct ReadyResponse {
    ready: bool,
    models_loaded: bool,
    hosted_ai_connected: bool,
}

/// Inference request
#[derive(Deserialize)]
struct InferenceRequest {
    prompt: String,
    model: Option<String>,
    temperature: Option<f32>,
    max_tokens: Option<usize>,
}

/// Inference response
#[derive(Serialize)]
struct InferenceResponse {
    text: String,
    model_used: String,
    tokens_used: Option<u32>,
    latency_ms: u128,
}

/// Classification request
#[derive(Deserialize)]
struct ClassificationRequest {
    task: String,
    context: Option<String>,
}

/// Error response
#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    code: String,
}

impl IntoResponse for ErrorResponse {
    fn into_response(self) -> Response {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(self)).into_response()
    }
}

/// Create the main application router
pub fn create_router(state: AppState) -> Router {
    Router::new()
        // Health and readiness endpoints
        .route("/health", get(health_handler))
        .route("/ready", get(ready_handler))
        
        // Metrics endpoint
        .route("/metrics", get(metrics_handler))
        
        // Inference endpoints
        .route("/v1/classify", post(classify_handler))
        .route("/v1/inference", post(inference_handler))
        .route("/v1/models", get(list_models_handler))
        
        // Apply middleware
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CorsLayer::permissive())
                .layer(TimeoutLayer::new(Duration::from_secs(300)))
        )
        .with_state(state)
}

/// Health check handler
async fn health_handler() -> impl IntoResponse {
    // TODO: Calculate actual uptime
    let response = HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_seconds: 0,
    };
    
    Json(response)
}

/// Readiness check handler
async fn ready_handler(State(state): State<AppState>) -> impl IntoResponse {
    let hosted_ai_connected = if let Some(ref _hosted_ai_config) = state.config.hosted_ai {
        // Check if we can connect to Hosted.AI
        true // TODO: Implement actual health check
    } else {
        false
    };
    
    let response = ReadyResponse {
        ready: true,
        models_loaded: true,
        hosted_ai_connected,
    };
    
    Json(response)
}

/// Prometheus metrics handler
async fn metrics_handler(State(state): State<AppState>) -> impl IntoResponse {
    let metrics = state.metrics_exporter.render();
    Response::builder()
        .header("Content-Type", "text/plain; version=0.0.4")
        .body(metrics)
        .unwrap()
}

/// Classification handler
async fn classify_handler(
    State(state): State<AppState>,
    Json(req): Json<ClassificationRequest>,
) -> Result<impl IntoResponse, ErrorResponse> {
    let start = std::time::Instant::now();
    
    match state.orchestrator.classify_async(&req.task, req.context.as_deref()).await {
        Ok(classification) => {
            let latency = start.elapsed().as_millis();
            Ok(Json(serde_json::json!({
                "category": classification.category,
                "complexity": classification.complexity,
                "latency_ms": latency,
            })))
        }
        Err(e) => Err(ErrorResponse {
            error: e.to_string(),
            code: "CLASSIFICATION_ERROR".to_string(),
        }),
    }
}

/// Inference handler
async fn inference_handler(
    State(state): State<AppState>,
    Json(req): Json<InferenceRequest>,
) -> Result<impl IntoResponse, ErrorResponse> {
    let start = std::time::Instant::now();
    
    // Determine which model to use
    let model = req.model.as_deref().unwrap_or("auto");
    
    let result = if model == "auto" {
        // Use orchestrator's smart routing
        tokio::task::block_in_place(|| {
            state.orchestrator.run(&req.prompt)
        })
    } else {
        // Direct model inference
        state.orchestrator.generate_direct(
            model,
            &req.prompt,
            req.temperature,
            req.max_tokens,
        ).await
    };
    
    match result {
        Ok(text) => {
            let latency = start.elapsed().as_millis();
            Ok(Json(InferenceResponse {
                text,
                model_used: model.to_string(),
                tokens_used: None, // TODO: Track actual token usage
                latency_ms: latency,
            }))
        }
        Err(e) => Err(ErrorResponse {
            error: e.to_string(),
            code: "INFERENCE_ERROR".to_string(),
        }),
    }
}

/// List available models
async fn list_models_handler(State(state): State<AppState>) -> impl IntoResponse {
    let models = serde_json::json!({
        "models": [
            {
                "id": "gemma-270m",
                "name": "Gemma 270M (Quantized)",
                "context_limit": state.config.models.gemma.context_limit,
                "capabilities": ["extraction", "summary", "classification"],
                "quantization": "q4_k_m",
                "size": "270M",
                "latency": "ultra-fast"
            },
            {
                "id": "qwen-30b-moe",
                "name": "Qwen 30B A3B MoE (Quantized)",
                "context_limit": state.config.models.qwen.context_limit,
                "capabilities": ["reasoning", "code", "creative", "complex"],
                "quantization": "q4_k_m",
                "architecture": "mixture-of-experts",
                "experts": "A3B",
                "size": "30B",
                "latency": "moderate"
            }
        ]
    });
    
    Json(models)
}

/// Start the HTTP server
pub async fn start_server(config: OrchestratorConfig) -> Result<(), Box<dyn std::error::Error>> {
    // Convert OrchestratorConfig to the legacy Config format for Homeskillet
    let homeskillet_config = crate::Config {
        models: crate::Models {
            gemma: crate::ModelConfig {
                repo: config.models.gemma.repo.clone(),
                context_limit: config.models.gemma.context_limit,
                temperature: config.models.gemma.temperature,
                top_p: config.models.gemma.top_p,
                max_new_tokens: config.models.gemma.max_new_tokens,
                enable_thinking: config.models.gemma.enable_thinking,
            },
            qwen: crate::ModelConfig {
                repo: config.models.qwen.repo.clone(),
                context_limit: config.models.qwen.context_limit,
                temperature: config.models.qwen.temperature,
                top_p: config.models.qwen.top_p,
                max_new_tokens: config.models.qwen.max_new_tokens,
                enable_thinking: config.models.qwen.enable_thinking,
            },
        },
        obsidian: None,
        safety: Some(crate::SafetyConfig {
            redact_emails: config.safety.redact_emails,
            redact_phones: config.safety.redact_phones,
            strip_api_keys: config.safety.strip_api_keys,
        }),
        hosted_ai: config.hosted_ai.clone(),
    };
    
    // Initialize orchestrator
    let orchestrator = Arc::new(Homeskillet::new(homeskillet_config)?);
    
    // Initialize metrics exporter
    let metrics_exporter = Arc::new(MetricsExporter::new());
    
    // Create app state
    let state = AppState {
        orchestrator,
        config: Arc::new(config.clone()),
        metrics_exporter,
    };
    
    // Create routers
    let app = create_router(state.clone());
    let metrics_app = create_metrics_router(state);
    
    // Start servers
    let addr = format!("{}:{}", config.server.host, config.server.port);
    let metrics_addr = format!("{}:{}", config.server.host, config.server.metrics_port);
    
    tracing::info!("Starting Homeskillet orchestrator on {}", addr);
    tracing::info!("Metrics available on {}", metrics_addr);
    
    // Spawn metrics server
    let metrics_server = tokio::spawn(async move {
        axum::Server::bind(&metrics_addr.parse().unwrap())
            .serve(metrics_app.into_make_service())
            .await
            .unwrap();
    });
    
    // Run main server
    axum::Server::bind(&addr.parse()?)
        .serve(app.into_make_service())
        .await?;
    
    // Wait for metrics server
    metrics_server.await?;
    
    Ok(())
}

/// Create metrics-only router
fn create_metrics_router(state: AppState) -> Router {
    Router::new()
        .route("/metrics", get(metrics_handler))
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;
    use tower::ServiceExt;
    
    #[tokio::test]
    async fn test_health_endpoint() {
        let config = OrchestratorConfig::default();
        let homeskillet_config = crate::Config {
            models: crate::Models {
                gemma: crate::ModelConfig {
                    repo: config.models.gemma.repo.clone(),
                    context_limit: config.models.gemma.context_limit,
                    temperature: config.models.gemma.temperature,
                    top_p: config.models.gemma.top_p,
                    max_new_tokens: config.models.gemma.max_new_tokens,
                    enable_thinking: config.models.gemma.enable_thinking,
                },
                qwen: crate::ModelConfig {
                    repo: config.models.qwen.repo.clone(),
                    context_limit: config.models.qwen.context_limit,
                    temperature: config.models.qwen.temperature,
                    top_p: config.models.qwen.top_p,
                    max_new_tokens: config.models.qwen.max_new_tokens,
                    enable_thinking: config.models.qwen.enable_thinking,
                },
            },
            obsidian: None,
            safety: Some(crate::SafetyConfig {
                redact_emails: config.safety.redact_emails,
                redact_phones: config.safety.redact_phones,
                strip_api_keys: config.safety.strip_api_keys,
            }),
            hosted_ai: config.hosted_ai.clone(),
        };
        
        let orchestrator = Arc::new(Homeskillet::new(homeskillet_config).unwrap());
        let metrics_exporter = Arc::new(MetricsExporter::new());
        
        let state = AppState {
            orchestrator,
            config: Arc::new(config),
            metrics_exporter,
        };
        
        let app = create_router(state);
        
        // Create a request
        let request = axum::http::Request::builder()
            .uri("/health")
            .body(axum::body::Body::empty())
            .unwrap();
            
        // Send the request
        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        
        // Parse response body
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let health_response: HealthResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(health_response.status, "healthy");
    }
}