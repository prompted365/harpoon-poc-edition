use crate::hosted_ai::HostedAiConfig;
use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::env;
use std::fs;

/// Complete orchestrator configuration
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrchestratorConfig {
    pub server: ServerConfig,
    pub models: ModelsConfig,
    pub hosted_ai: Option<HostedAiConfig>,
    pub monitoring: MonitoringConfig,
    pub safety: SafetyConfig,
    pub cache: CacheConfig,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub metrics_port: u16,
    pub max_concurrent_requests: usize,
    pub request_timeout_secs: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelsConfig {
    pub gemma: ModelConfig,
    pub qwen: ModelConfig,
    pub mistral: Option<ModelConfig>,
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
pub struct MonitoringConfig {
    pub prometheus_enabled: bool,
    pub jaeger_enabled: bool,
    pub jaeger_endpoint: Option<String>,
    pub log_level: String,
    pub structured_logs: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SafetyConfig {
    pub redact_emails: bool,
    pub redact_phones: bool,
    pub strip_api_keys: bool,
    pub max_prompt_length: usize,
    pub blocked_patterns: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CacheConfig {
    pub enabled: bool,
    pub redis_url: Option<String>,
    pub ttl_seconds: u64,
    pub max_entries: usize,
}

impl Default for OrchestratorConfig {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                host: "0.0.0.0".to_string(),
                port: 8080,
                metrics_port: 9090,
                max_concurrent_requests: 100,
                request_timeout_secs: 300,
            },
            models: ModelsConfig {
                gemma: ModelConfig {
                    repo: "google/gemma-270m-it-q4_k_m".to_string(),
                    context_limit: 8192,
                    temperature: 0.3,  // Lower temp for classification
                    top_p: 0.9,
                    max_new_tokens: 512,  // Smaller outputs for fast routing
                    enable_thinking: false,
                },
                qwen: ModelConfig {
                    repo: "qwen/qwen2.5-30b-a3b-moe-q4_k_m".to_string(),
                    context_limit: 32768,
                    temperature: 0.8,
                    top_p: 0.9,
                    max_new_tokens: 4096,
                    enable_thinking: true,  // MoE benefits from thinking
                },
                mistral: None,
            },
            hosted_ai: None,
            monitoring: MonitoringConfig {
                prometheus_enabled: true,
                jaeger_enabled: false,
                jaeger_endpoint: None,
                log_level: "info".to_string(),
                structured_logs: true,
            },
            safety: SafetyConfig {
                redact_emails: true,
                redact_phones: true,
                strip_api_keys: true,
                max_prompt_length: 100000,
                blocked_patterns: vec![],
            },
            cache: CacheConfig {
                enabled: false,
                redis_url: None,
                ttl_seconds: 3600,
                max_entries: 1000,
            },
        }
    }
}

impl OrchestratorConfig {
    /// Load configuration from multiple sources with precedence:
    /// 1. Environment variables (highest)
    /// 2. Config file
    /// 3. Defaults (lowest)
    pub fn load() -> Result<Self> {
        let mut config = Self::load_from_file()
            .unwrap_or_else(|_| Self::default());
        
        // Override with environment variables
        config.apply_env_overrides()?;
        
        // Validate configuration
        config.validate()?;
        
        Ok(config)
    }
    
    /// Load from configuration file
    pub fn load_from_file() -> Result<Self> {
        let config_path = Self::find_config_file()?;
        let content = fs::read_to_string(&config_path)
            .context(format!("Failed to read config file: {:?}", config_path))?;
        
        // Support both YAML and TOML
        if config_path.extension().and_then(|e| e.to_str()) == Some("yaml") ||
           config_path.extension().and_then(|e| e.to_str()) == Some("yml") {
            serde_yaml::from_str(&content)
                .context("Failed to parse YAML config")
        } else {
            toml::from_str(&content)
                .context("Failed to parse TOML config")
        }
    }
    
    /// Find configuration file in standard locations
    fn find_config_file() -> Result<PathBuf> {
        let possible_paths = vec![
            PathBuf::from("homeskillet.yaml"),
            PathBuf::from("homeskillet.yml"),
            PathBuf::from("homeskillet.toml"),
            PathBuf::from("config/homeskillet.yaml"),
            PathBuf::from("config/homeskillet.yml"),
            PathBuf::from("config/homeskillet.toml"),
            PathBuf::from("/etc/homeskillet/config.yaml"),
            PathBuf::from("/etc/homeskillet/config.yml"),
            PathBuf::from("/etc/homeskillet/config.toml"),
        ];
        
        // Check HOMESKILLET_CONFIG env var first
        if let Ok(path) = env::var("HOMESKILLET_CONFIG") {
            let path = PathBuf::from(path);
            if path.exists() {
                return Ok(path);
            }
        }
        
        // Check standard locations
        for path in possible_paths {
            if path.exists() {
                return Ok(path);
            }
        }
        
        anyhow::bail!("No configuration file found")
    }
    
    /// Apply environment variable overrides
    fn apply_env_overrides(&mut self) -> Result<()> {
        // Server settings
        if let Ok(host) = env::var("HOMESKILLET_HOST") {
            self.server.host = host;
        }
        if let Ok(port) = env::var("HOMESKILLET_PORT") {
            self.server.port = port.parse()?;
        }
        if let Ok(port) = env::var("HOMESKILLET_METRICS_PORT") {
            self.server.metrics_port = port.parse()?;
        }
        
        // Hosted AI settings
        if let Ok(url) = env::var("HOSTED_AI_BASE_URL") {
            let hosted_ai = self.hosted_ai.get_or_insert(HostedAiConfig {
                base_url: url.clone(),
                api_key: String::new(),
                pool: "default".to_string(),
                overcommit: false,
                timeout_secs: 30,
                max_retries: 3,
            });
            hosted_ai.base_url = url;
        }
        
        if let Ok(key) = env::var("HOSTED_AI_API_KEY") {
            if let Some(ref mut hosted_ai) = self.hosted_ai {
                hosted_ai.api_key = key;
            }
        }
        
        if let Ok(pool) = env::var("HOSTED_AI_POOL_ID") {
            if let Some(ref mut hosted_ai) = self.hosted_ai {
                hosted_ai.pool = pool;
            }
        }
        
        // Cache settings
        if let Ok(redis_url) = env::var("REDIS_URL") {
            self.cache.redis_url = Some(redis_url);
            self.cache.enabled = true;
        }
        
        // Monitoring settings
        if let Ok(level) = env::var("RUST_LOG") {
            self.monitoring.log_level = level;
        }
        
        Ok(())
    }
    
    /// Validate configuration
    fn validate(&self) -> Result<()> {
        // Validate server settings
        if self.server.port == 0 {
            anyhow::bail!("Invalid server port: 0");
        }
        
        if self.server.max_concurrent_requests == 0 {
            anyhow::bail!("Invalid max_concurrent_requests: 0");
        }
        
        // Validate model settings
        if self.models.gemma.context_limit == 0 {
            anyhow::bail!("Invalid Gemma context limit: 0");
        }
        
        if self.models.qwen.context_limit == 0 {
            anyhow::bail!("Invalid Qwen context limit: 0");
        }
        
        // Validate Hosted AI settings if present
        if let Some(ref hosted_ai) = self.hosted_ai {
            if hosted_ai.api_key.is_empty() {
                anyhow::bail!("Hosted AI API key is required when hosted_ai is configured");
            }
            
            if !hosted_ai.base_url.starts_with("http://") && !hosted_ai.base_url.starts_with("https://") {
                anyhow::bail!("Invalid Hosted AI base URL: must start with http:// or https://");
            }
        }
        
        Ok(())
    }
    
    /// Save configuration to file
    pub fn save_to_file(&self, path: &Path) -> Result<()> {
        let content = if path.extension().and_then(|e| e.to_str()) == Some("yaml") ||
                         path.extension().and_then(|e| e.to_str()) == Some("yml") {
            serde_yaml::to_string(self)?
        } else {
            toml::to_string_pretty(self)?
        };
        
        fs::write(path, content)?;
        Ok(())
    }
}

/// Builder for constructing configuration programmatically
pub struct ConfigBuilder {
    config: OrchestratorConfig,
}

impl ConfigBuilder {
    pub fn new() -> Self {
        Self {
            config: OrchestratorConfig::default(),
        }
    }
    
    pub fn with_server(mut self, host: &str, port: u16) -> Self {
        self.config.server.host = host.to_string();
        self.config.server.port = port;
        self
    }
    
    pub fn with_hosted_ai(mut self, base_url: &str, api_key: &str, pool: &str) -> Self {
        self.config.hosted_ai = Some(HostedAiConfig {
            base_url: base_url.to_string(),
            api_key: api_key.to_string(),
            pool: pool.to_string(),
            overcommit: false,
            timeout_secs: 30,
            max_retries: 3,
        });
        self
    }
    
    pub fn with_cache(mut self, redis_url: &str) -> Self {
        self.config.cache.enabled = true;
        self.config.cache.redis_url = Some(redis_url.to_string());
        self
    }
    
    pub fn with_monitoring(mut self, prometheus: bool, jaeger: bool) -> Self {
        self.config.monitoring.prometheus_enabled = prometheus;
        self.config.monitoring.jaeger_enabled = jaeger;
        self
    }
    
    pub fn build(self) -> Result<OrchestratorConfig> {
        self.config.validate()?;
        Ok(self.config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_default_config() {
        let config = OrchestratorConfig::default();
        assert_eq!(config.server.port, 8080);
        assert_eq!(config.models.gemma.repo, "google/gemma-270m-it-q4_k_m");
    }
    
    #[test]
    fn test_config_builder() {
        let config = ConfigBuilder::new()
            .with_server("localhost", 3000)
            .with_hosted_ai("https://api.hosted.ai", "test-key", "premium")
            .with_cache("redis://localhost:6379")
            .with_monitoring(true, false)
            .build()
            .unwrap();
        
        assert_eq!(config.server.host, "localhost");
        assert_eq!(config.server.port, 3000);
        assert!(config.hosted_ai.is_some());
        assert!(config.cache.enabled);
    }
    
    #[test]
    fn test_env_override() {
        env::set_var("HOMESKILLET_PORT", "9999");
        
        let mut config = OrchestratorConfig::default();
        config.apply_env_overrides().unwrap();
        
        assert_eq!(config.server.port, 9999);
        
        env::remove_var("HOMESKILLET_PORT");
    }
    
    #[test]
    fn test_validation() {
        let mut config = OrchestratorConfig::default();
        config.server.port = 0;
        
        assert!(config.validate().is_err());
    }
}