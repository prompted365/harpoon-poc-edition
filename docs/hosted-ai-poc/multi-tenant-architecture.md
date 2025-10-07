# Multi-Tenant Architecture for Ubiquity Harpoon + Hosted.AI

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Implementation Required

## Executive Summary

This document outlines the necessary architecture changes to support multi-tenant deployments, private instances, and enterprise billing for Ubiquity Harpoon using Hosted.AI as the GPU infrastructure provider.

## Current State vs Target State

### Current State (Single-Tenant)
- Global API configuration
- No tenant isolation
- No usage tracking
- No billing integration
- Single deployment model

### Target State (Multi-Tenant SaaS)
- Per-tenant API keys and resource pools
- Complete tenant isolation
- Comprehensive usage metering
- Automated billing and invoicing
- White-label and private deployment options

## Architecture Components

### 1. Tenant Management Layer

```rust
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TenantConfig {
    pub tenant_id: Uuid,
    pub organization_name: String,
    pub deployment_mode: DeploymentMode,
    pub hosted_ai_config: TenantHostedAiConfig,
    pub resource_limits: ResourceLimits,
    pub billing_config: BillingConfig,
    pub branding: Option<BrandingConfig>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum DeploymentMode {
    Shared,           // Multi-tenant SaaS
    Dedicated,        // Single-tenant instance
    WhiteLabel,       // Custom branded instance
    OnPremise,        // Self-hosted with Hosted.AI
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TenantHostedAiConfig {
    pub api_key: SecureString,
    pub pool_mappings: HashMap<ModelTier, PoolConfig>,
    pub fallback_pools: Vec<String>,
    pub cost_limits: CostLimits,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ResourceLimits {
    pub max_concurrent_allocations: u32,
    pub max_monthly_gpu_hours: f64,
    pub max_tokens_per_minute: u64,
    pub allowed_models: Vec<String>,
    pub priority_tier: PriorityTier,
}
```

### 2. Usage Metering System

```rust
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UsageEvent {
    pub event_id: Uuid,
    pub tenant_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub event_type: UsageEventType,
    pub metadata: UsageMetadata,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum UsageEventType {
    GpuAllocation {
        allocation_id: String,
        pool_id: String,
        gpu_type: String,
        duration_seconds: u32,
        cost_per_hour: Decimal,
    },
    InferenceRequest {
        model: String,
        input_tokens: u32,
        output_tokens: u32,
        latency_ms: u64,
        gpu_time_ms: u64,
    },
    StorageUsage {
        bytes_stored: u64,
        bytes_transferred: u64,
    },
    ApiCall {
        endpoint: String,
        response_code: u16,
        response_time_ms: u64,
    },
}

pub trait UsageAggregator {
    async fn record_event(&self, event: UsageEvent) -> Result<()>;
    async fn get_usage_summary(&self, tenant_id: Uuid, period: Period) -> Result<UsageSummary>;
    async fn generate_invoice(&self, tenant_id: Uuid, period: Period) -> Result<Invoice>;
}
```

### 3. Billing Integration

```rust
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BillingConfig {
    pub billing_provider: BillingProvider,
    pub customer_id: String,
    pub subscription_id: Option<String>,
    pub payment_method_id: Option<String>,
    pub billing_email: String,
    pub invoice_settings: InvoiceSettings,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BillingProvider {
    Stripe {
        webhook_secret: SecureString,
        price_mappings: HashMap<UsageType, String>,
    },
    Paddle {
        vendor_id: String,
        api_key: SecureString,
    },
    EnterpriseInvoicing {
        contract_id: String,
        billing_contact: String,
        payment_terms: PaymentTerms,
    },
}

pub struct BillingService {
    provider: Box<dyn BillingProviderTrait>,
    usage_store: Arc<dyn UsageStore>,
    invoice_generator: Arc<InvoiceGenerator>,
}

impl BillingService {
    pub async fn process_billing_cycle(&self, tenant_id: Uuid) -> Result<Invoice> {
        // 1. Aggregate usage for billing period
        let usage = self.usage_store.get_period_usage(tenant_id).await?;
        
        // 2. Calculate costs based on pricing model
        let line_items = self.calculate_line_items(usage).await?;
        
        // 3. Apply discounts, credits, commitments
        let adjusted_items = self.apply_pricing_adjustments(line_items).await?;
        
        // 4. Generate invoice
        let invoice = self.invoice_generator.create_invoice(tenant_id, adjusted_items).await?;
        
        // 5. Submit to billing provider
        self.provider.create_invoice(invoice).await?;
        
        Ok(invoice)
    }
}
```

### 4. Request Routing with Tenant Context

```rust
#[derive(Clone)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub user_id: Option<Uuid>,
    pub api_key_id: Uuid,
    pub resource_limits: Arc<ResourceLimits>,
    pub usage_tracker: Arc<dyn UsageTracker>,
}

// Middleware for extracting tenant context
pub async fn tenant_middleware(
    headers: HeaderMap,
    state: State<AppState>,
    mut req: Request<Body>,
    next: Next<Body>,
) -> Result<Response, StatusCode> {
    // Extract API key from Authorization header
    let api_key = extract_api_key(&headers)
        .ok_or(StatusCode::UNAUTHORIZED)?;
    
    // Look up tenant from API key
    let tenant_context = state.tenant_service
        .get_context_from_api_key(&api_key)
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;
    
    // Check rate limits
    if !state.rate_limiter.check_limit(&tenant_context).await {
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }
    
    // Inject tenant context into request
    req.extensions_mut().insert(tenant_context);
    
    Ok(next.run(req).await)
}
```

### 5. White-Label Configuration

```rust
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BrandingConfig {
    pub brand_name: String,
    pub logo_url: String,
    pub primary_color: String,
    pub custom_domain: Option<String>,
    pub support_email: String,
    pub documentation_url: Option<String>,
    pub feature_flags: HashMap<String, bool>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WhiteLabelDeployment {
    pub deployment_id: Uuid,
    pub tenant_id: Uuid,
    pub branding: BrandingConfig,
    pub infrastructure: InfrastructureConfig,
    pub api_endpoints: ApiEndpoints,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InfrastructureConfig {
    pub deployment_region: String,
    pub instance_type: InstanceType,
    pub hosted_ai_pools: Vec<String>,
    pub dedicated_resources: bool,
    pub backup_config: BackupConfig,
    pub monitoring_config: MonitoringConfig,
}
```

### 6. Enterprise Features

```rust
#[derive(Clone, Debug)]
pub struct EnterpriseFeatures {
    pub sso_config: Option<SsoConfig>,
    pub audit_log: Arc<AuditLogger>,
    pub compliance: ComplianceConfig,
    pub data_residency: DataResidencyConfig,
    pub support_tier: SupportTier,
}

#[derive(Clone, Debug)]
pub struct SsoConfig {
    pub provider: SsoProvider,
    pub metadata_url: String,
    pub entity_id: String,
    pub attribute_mappings: HashMap<String, String>,
}

#[derive(Clone, Debug)]
pub enum SsoProvider {
    Okta,
    AzureAd,
    GoogleWorkspace,
    OneLogin,
    Custom(String),
}

pub trait AuditLogger {
    async fn log_event(&self, event: AuditEvent) -> Result<()>;
    async fn query_logs(&self, filter: AuditFilter) -> Result<Vec<AuditEvent>>;
    async fn export_logs(&self, filter: AuditFilter, format: ExportFormat) -> Result<Bytes>;
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Implement tenant management data models
- [ ] Add tenant context middleware
- [ ] Create tenant-aware API routing
- [ ] Implement basic usage tracking

### Phase 2: Metering & Billing (Week 3-4)
- [ ] Build usage aggregation system
- [ ] Implement billing provider integrations
- [ ] Create invoice generation
- [ ] Add usage dashboards

### Phase 3: Enterprise Features (Week 5-6)
- [ ] Implement SSO integration
- [ ] Add comprehensive audit logging
- [ ] Build admin portal
- [ ] Create tenant provisioning API

### Phase 4: White-Label Support (Week 7-8)
- [ ] Implement branding configuration
- [ ] Add deployment automation
- [ ] Create isolated tenant environments
- [ ] Build configuration management

## Database Schema

```sql
-- Tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    organization_name VARCHAR(255) NOT NULL,
    deployment_mode VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL,
    metadata JSONB
);

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    permissions JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL
);

-- Usage Events table (partitioned by month)
CREATE TABLE usage_events (
    id UUID,
    tenant_id UUID REFERENCES tenants(id),
    timestamp TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    metadata JSONB,
    cost_usd DECIMAL(10, 6),
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Resource Limits table
CREATE TABLE resource_limits (
    tenant_id UUID REFERENCES tenants(id) PRIMARY KEY,
    max_concurrent_allocations INTEGER,
    max_monthly_gpu_hours DECIMAL(10, 2),
    max_tokens_per_minute BIGINT,
    allowed_models TEXT[],
    priority_tier VARCHAR(50),
    custom_limits JSONB
);

-- Billing Configuration table
CREATE TABLE billing_config (
    tenant_id UUID REFERENCES tenants(id) PRIMARY KEY,
    billing_provider VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255),
    subscription_id VARCHAR(255),
    payment_method_id VARCHAR(255),
    billing_email VARCHAR(255),
    config JSONB
);
```

## API Changes

### Tenant Management APIs
```http
# Create tenant
POST /admin/v1/tenants

# Update tenant configuration  
PATCH /admin/v1/tenants/{tenant_id}

# List tenant usage
GET /admin/v1/tenants/{tenant_id}/usage

# Generate invoice
POST /admin/v1/tenants/{tenant_id}/invoices
```

### Tenant-Scoped APIs
```http
# All existing APIs now require tenant context
GET /v1/models
Authorization: Bearer {TENANT_API_KEY}

# Tenant-specific metrics
GET /v1/metrics
Authorization: Bearer {TENANT_API_KEY}
```

## Leveraging Existing Compliance Infrastructure

Ubiquity Harpoon already contains sophisticated compliance mechanisms through:

1. **Covenant/Strike/Receipt Pattern**
   - Multi-signature approval (covenants)
   - Atomic execution tracking (strikes)
   - Cryptographic proof of completion (receipts)
   - Already provides SOC2-compliant audit trails

2. **Plock File System**
   - Governance state tracking (latched → tensioning → integrated)
   - Winch states for cable management
   - Immutable history of all state changes
   - Natural change management compliance

3. **Built-in Audit Mechanisms**
   - Every covenant blessed/signed is logged
   - Every strike execution is tracked
   - Every receipt is cryptographically sealed
   - Governance trails are immutable audit logs

See [Enterprise Compliance Formalization](./enterprise-compliance-formalization.md) for details.

## Security Considerations

1. **Tenant Isolation** (Extend Existing Covenant Namespacing)
   - Covenant-level tenant isolation
   - Strike execution in tenant context
   - Receipt sealing with tenant metadata
   - Plock files scoped per tenant

2. **API Security**
   - Per-tenant rate limiting
   - API key rotation policies
   - IP whitelisting per tenant
   - Request signing for sensitive operations

3. **Data Privacy**
   - Tenant data segregation
   - GDPR compliance tools
   - Data residency controls
   - Right to deletion implementation

## Monitoring & Operations

```yaml
# Prometheus metrics per tenant
harpoon_requests_total{tenant_id="...", model="...", status="..."}
harpoon_gpu_usage_seconds{tenant_id="...", pool="...", gpu_type="..."}
harpoon_tokens_processed{tenant_id="...", model="...", type="input|output"}
harpoon_api_errors{tenant_id="...", error_type="...", endpoint="..."}

# Grafana dashboards
- Global Operations Dashboard
- Per-Tenant Usage Dashboard
- Billing & Cost Dashboard
- SLA Compliance Dashboard
```

## Cost Model

### Pricing Components
1. **Base Platform Fee**: $X/month per tenant
2. **GPU Usage**: $Y per GPU-hour (varies by type)
3. **Token Usage**: $Z per million tokens
4. **API Calls**: $W per million requests
5. **Storage**: $V per GB-month
6. **Support**: Based on tier (Basic/Pro/Enterprise)

### Volume Discounts
- 10% off for >1000 GPU-hours/month
- 20% off for >5000 GPU-hours/month
- Custom pricing for >10000 GPU-hours/month

## Next Steps

1. Review and approve architecture
2. Set up development environment with PostgreSQL
3. Implement Phase 1 components
4. Create integration tests
5. Deploy staging environment
6. Begin customer pilot program