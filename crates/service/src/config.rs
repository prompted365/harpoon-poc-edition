//! Centralized configuration management

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::env;

/// Application configuration loaded from environment variables
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub github: GitHubConfig,
    pub hosted_ai: Option<HostedAiConfig>,
    pub mcp: McpConfig,
    pub service: ServiceConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubConfig {
    pub client_id: String,
    pub client_secret: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostedAiConfig {
    pub base_url: String,
    pub api_key: String,
    pub pool_id: String,
    pub overcommit: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpConfig {
    pub ws_host: String,
    pub ws_port: u16,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    pub host: String,
    pub port: u16,
}

impl AppConfig {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self> {
        // Load .env file if it exists
        if let Err(e) = dotenvy::dotenv() {
            eprintln!("Note: .env file not loaded: {}", e);
        }
        
        Ok(Self {
            github: GitHubConfig {
                client_id: env::var("GITHUB_CLIENT_ID")
                    .unwrap_or_else(|_| "not_configured".to_string()),
                client_secret: env::var("GITHUB_CLIENT_SECRET").ok(),
            },
            hosted_ai: Self::load_hosted_ai_config(),
            mcp: McpConfig {
                ws_host: env::var("MCP_WS_HOST")
                    .unwrap_or_else(|_| "127.0.0.1".to_string()),
                ws_port: env::var("MCP_WS_PORT")
                    .unwrap_or_else(|_| "3002".to_string())
                    .parse()
                    .unwrap_or(3002),
                api_key: env::var("MCP_API_KEY").ok(),
            },
            service: ServiceConfig {
                host: env::var("SERVICE_HOST")
                    .unwrap_or_else(|_| "0.0.0.0".to_string()),
                port: env::var("SERVICE_PORT")
                    .unwrap_or_else(|_| "8080".to_string())
                    .parse()
                    .unwrap_or(8080),
            },
        })
    }
    
    fn load_hosted_ai_config() -> Option<HostedAiConfig> {
        match (
            env::var("HOSTED_AI_BASE_URL"),
            env::var("HOSTED_AI_API_KEY"),
        ) {
            (Ok(base_url), Ok(api_key)) => Some(HostedAiConfig {
                base_url,
                api_key,
                pool_id: env::var("HOSTED_AI_POOL_ID")
                    .unwrap_or_else(|_| "default".to_string()),
                overcommit: env::var("HOSTED_AI_OVERCOMMIT")
                    .unwrap_or_else(|_| "false".to_string())
                    .parse()
                    .unwrap_or(false),
            }),
            _ => None,
        }
    }
    
    /// Check if configuration is valid for production
    pub fn validate(&self) -> Result<()> {
        if self.github.client_id == "not_configured" {
            anyhow::bail!("GITHUB_CLIENT_ID not configured");
        }
        
        // Add more validation as needed
        Ok(())
    }
}