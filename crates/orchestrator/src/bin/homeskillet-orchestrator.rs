use anyhow::Result;
use orchestrator::{
    config::OrchestratorConfig,
    server::start_server,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "orchestrator=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting Homeskillet Orchestrator...");
    
    // Load configuration
    let config = match OrchestratorConfig::load() {
        Ok(config) => {
            tracing::info!("Loaded configuration from file");
            config
        }
        Err(e) => {
            tracing::warn!("Failed to load config file: {}. Using defaults.", e);
            OrchestratorConfig::default()
        }
    };

    // Log configuration details
    tracing::info!("Server: {}:{}", config.server.host, config.server.port);
    tracing::info!("Metrics: {}:{}", config.server.host, config.server.metrics_port);
    
    if config.hosted_ai.is_some() {
        tracing::info!("Hosted AI integration enabled");
    }
    
    if config.cache.enabled {
        tracing::info!("Redis cache enabled");
    }

    // Start the server
    if let Err(e) = start_server(config).await {
        tracing::error!("Server error: {}", e);
        std::process::exit(1);
    }

    Ok(())
}