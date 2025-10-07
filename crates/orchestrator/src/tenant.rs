use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use async_trait::async_trait;

/// Tenant configuration for multi-tenant deployments
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TenantConfig {
    pub tenant_id: Uuid,
    pub organization_name: String,
    pub deployment_mode: DeploymentMode,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub status: TenantStatus,
    pub resource_limits: ResourceLimits,
    pub billing_config: Option<BillingConfig>,
    pub branding: Option<BrandingConfig>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum DeploymentMode {
    Shared,        // Multi-tenant SaaS
    Dedicated,     // Single-tenant instance  
    WhiteLabel,    // Custom branded instance
    OnPremise,     // Self-hosted with Hosted.AI
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum TenantStatus {
    Active,
    Suspended,
    Trial,
    Pending,
    Terminated,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ResourceLimits {
    pub max_concurrent_allocations: u32,
    pub max_monthly_gpu_hours: f64,
    pub max_tokens_per_minute: u64,
    pub allowed_models: Vec<String>,
    pub priority_tier: PriorityTier,
    pub cost_limit_usd: Option<f64>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum PriorityTier {
    Free,
    Basic,
    Pro,
    Enterprise,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BillingConfig {
    pub billing_provider: BillingProvider,
    pub customer_id: String,
    pub subscription_id: Option<String>,
    pub billing_email: String,
    pub payment_terms: PaymentTerms,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BillingProvider {
    Stripe { 
        webhook_endpoint_id: String,
    },
    Paddle { 
        vendor_id: String,
    },
    EnterpriseInvoicing {
        contract_id: String,
        billing_contact: String,
    },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PaymentTerms {
    pub net_days: u32,
    pub currency: String,
    pub tax_exempt: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BrandingConfig {
    pub brand_name: String,
    pub logo_url: String,
    pub primary_color: String,
    pub custom_domain: Option<String>,
    pub support_email: String,
    pub documentation_url: Option<String>,
}

/// Context for the current request including tenant information
#[derive(Clone, Debug)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub api_key_id: Uuid,
    pub permissions: Permissions,
    pub resource_limits: Arc<ResourceLimits>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Permissions {
    pub can_read: bool,
    pub can_write: bool,
    pub can_delete: bool,
    pub is_admin: bool,
    pub allowed_operations: Vec<String>,
}

/// Usage tracking for billing
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UsageEvent {
    pub event_id: Uuid,
    pub tenant_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub event_type: UsageEventType,
    pub cost_usd: Option<f64>,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum UsageEventType {
    GpuAllocation {
        allocation_id: String,
        pool_id: String,
        gpu_type: String,
        duration_seconds: u32,
        tflops: f32,
        vram_mb: u32,
    },
    InferenceRequest {
        model: String,
        input_tokens: u32,
        output_tokens: u32,
        latency_ms: u64,
        gpu_time_ms: u64,
    },
    ApiCall {
        endpoint: String,
        method: String,
        response_code: u16,
        response_time_ms: u64,
    },
    StorageUsage {
        bytes_stored: u64,
        bytes_transferred: u64,
    },
}

/// Trait for tenant management operations
#[async_trait]
pub trait TenantManager: Send + Sync {
    /// Get tenant by ID
    async fn get_tenant(&self, tenant_id: Uuid) -> Result<TenantConfig>;
    
    /// Get tenant context from API key
    async fn get_context_from_api_key(&self, api_key: &str) -> Result<TenantContext>;
    
    /// Check if tenant has permission for operation
    async fn check_permission(&self, context: &TenantContext, operation: &str) -> Result<bool>;
    
    /// Update tenant resource usage
    async fn update_usage(&self, tenant_id: Uuid, usage: f64) -> Result<()>;
    
    /// Check if tenant is within resource limits
    async fn check_limits(&self, context: &TenantContext, resource_type: &str, amount: f64) -> Result<bool>;
}

/// Trait for usage tracking and billing
#[async_trait]
pub trait UsageTracker: Send + Sync {
    /// Record a usage event
    async fn record_event(&self, event: UsageEvent) -> Result<()>;
    
    /// Get usage summary for a tenant
    async fn get_usage_summary(&self, tenant_id: Uuid, start: DateTime<Utc>, end: DateTime<Utc>) -> Result<UsageSummary>;
    
    /// Get current month usage
    async fn get_current_usage(&self, tenant_id: Uuid) -> Result<CurrentUsage>;
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UsageSummary {
    pub tenant_id: Uuid,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub total_gpu_hours: f64,
    pub total_tokens: u64,
    pub total_api_calls: u64,
    pub total_cost_usd: f64,
    pub breakdown: HashMap<String, UsageBreakdown>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UsageBreakdown {
    pub count: u64,
    pub total_cost_usd: f64,
    pub details: HashMap<String, f64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CurrentUsage {
    pub gpu_hours_used: f64,
    pub gpu_hours_limit: f64,
    pub tokens_used: u64,
    pub tokens_limit: u64,
    pub current_allocations: u32,
    pub allocation_limit: u32,
    pub cost_usd: f64,
    pub cost_limit_usd: Option<f64>,
}

/// Mock implementation for development
pub struct MockTenantManager {
    tenants: Arc<parking_lot::RwLock<HashMap<Uuid, TenantConfig>>>,
    api_keys: Arc<parking_lot::RwLock<HashMap<String, TenantContext>>>,
}

impl MockTenantManager {
    pub fn new() -> Self {
        let mut tenants = HashMap::new();
        let mut api_keys = HashMap::new();
        
        // Create default tenant for development
        let tenant_id = Uuid::new_v4();
        let default_tenant = TenantConfig {
            tenant_id,
            organization_name: "Development Tenant".to_string(),
            deployment_mode: DeploymentMode::Shared,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            status: TenantStatus::Active,
            resource_limits: ResourceLimits {
                max_concurrent_allocations: 10,
                max_monthly_gpu_hours: 1000.0,
                max_tokens_per_minute: 100_000,
                allowed_models: vec!["*".to_string()],
                priority_tier: PriorityTier::Pro,
                cost_limit_usd: Some(1000.0),
            },
            billing_config: None,
            branding: None,
        };
        
        let context = TenantContext {
            tenant_id,
            organization_id: tenant_id,
            api_key_id: Uuid::new_v4(),
            permissions: Permissions {
                can_read: true,
                can_write: true,
                can_delete: true,
                is_admin: true,
                allowed_operations: vec!["*".to_string()],
            },
            resource_limits: Arc::new(default_tenant.resource_limits.clone()),
        };
        
        tenants.insert(tenant_id, default_tenant);
        api_keys.insert("dev-api-key".to_string(), context);
        
        Self {
            tenants: Arc::new(parking_lot::RwLock::new(tenants)),
            api_keys: Arc::new(parking_lot::RwLock::new(api_keys)),
        }
    }
}

#[async_trait]
impl TenantManager for MockTenantManager {
    async fn get_tenant(&self, tenant_id: Uuid) -> Result<TenantConfig> {
        self.tenants
            .read()
            .get(&tenant_id)
            .cloned()
            .context("Tenant not found")
    }
    
    async fn get_context_from_api_key(&self, api_key: &str) -> Result<TenantContext> {
        self.api_keys
            .read()
            .get(api_key)
            .cloned()
            .context("Invalid API key")
    }
    
    async fn check_permission(&self, context: &TenantContext, operation: &str) -> Result<bool> {
        Ok(context.permissions.is_admin || 
           context.permissions.allowed_operations.contains(&operation.to_string()) ||
           context.permissions.allowed_operations.contains(&"*".to_string()))
    }
    
    async fn update_usage(&self, _tenant_id: Uuid, _usage: f64) -> Result<()> {
        // Mock implementation - just return OK
        Ok(())
    }
    
    async fn check_limits(&self, context: &TenantContext, resource_type: &str, amount: f64) -> Result<bool> {
        match resource_type {
            "gpu_hours" => Ok(amount <= context.resource_limits.max_monthly_gpu_hours),
            "concurrent_allocations" => Ok(amount <= context.resource_limits.max_concurrent_allocations as f64),
            "tokens_per_minute" => Ok(amount <= context.resource_limits.max_tokens_per_minute as f64),
            _ => Ok(true),
        }
    }
}

/// Mock usage tracker for development
pub struct MockUsageTracker {
    events: Arc<parking_lot::RwLock<Vec<UsageEvent>>>,
}

impl MockUsageTracker {
    pub fn new() -> Self {
        Self {
            events: Arc::new(parking_lot::RwLock::new(Vec::new())),
        }
    }
}

#[async_trait]
impl UsageTracker for MockUsageTracker {
    async fn record_event(&self, event: UsageEvent) -> Result<()> {
        self.events.write().push(event);
        Ok(())
    }
    
    async fn get_usage_summary(&self, tenant_id: Uuid, start: DateTime<Utc>, end: DateTime<Utc>) -> Result<UsageSummary> {
        let events = self.events.read();
        let filtered: Vec<_> = events
            .iter()
            .filter(|e| e.tenant_id == tenant_id && e.timestamp >= start && e.timestamp <= end)
            .collect();
        
        let mut total_cost = 0.0;
        let mut gpu_hours = 0.0;
        let mut tokens = 0u64;
        let mut api_calls = 0u64;
        
        for event in filtered {
            if let Some(cost) = event.cost_usd {
                total_cost += cost;
            }
            
            match &event.event_type {
                UsageEventType::GpuAllocation { duration_seconds, .. } => {
                    gpu_hours += *duration_seconds as f64 / 3600.0;
                }
                UsageEventType::InferenceRequest { input_tokens, output_tokens, .. } => {
                    tokens += (*input_tokens + *output_tokens) as u64;
                }
                UsageEventType::ApiCall { .. } => {
                    api_calls += 1;
                }
                _ => {}
            }
        }
        
        Ok(UsageSummary {
            tenant_id,
            period_start: start,
            period_end: end,
            total_gpu_hours: gpu_hours,
            total_tokens: tokens,
            total_api_calls: api_calls,
            total_cost_usd: total_cost,
            breakdown: HashMap::new(),
        })
    }
    
    async fn get_current_usage(&self, tenant_id: Uuid) -> Result<CurrentUsage> {
        let now = Utc::now();
        let month_start = DateTime::from_timestamp(
            now.timestamp() - (now.timestamp() % (30 * 24 * 3600)), 
            0
        ).unwrap();
        
        let summary = self.get_usage_summary(tenant_id, month_start, now).await?;
        
        Ok(CurrentUsage {
            gpu_hours_used: summary.total_gpu_hours,
            gpu_hours_limit: 1000.0, // Mock limit
            tokens_used: summary.total_tokens,
            tokens_limit: 100_000_000, // Mock limit
            current_allocations: 2, // Mock value
            allocation_limit: 10,
            cost_usd: summary.total_cost_usd,
            cost_limit_usd: Some(1000.0),
        })
    }
}