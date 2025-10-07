# Billing & Usage Tracking Implementation Plan

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Ready for Implementation

## Overview

This document outlines a practical implementation plan for adding billing and usage tracking to Ubiquity Harpoon's existing Hosted.AI integration, leveraging the covenant/strike/receipt pattern for natural cost tracking.

## Cost Tracking Architecture

### 1. Natural Cost Points in Existing System

The covenant/strike/receipt flow already captures key billing events:

```rust
// Existing strike execution already has natural cost points
impl Strike {
    pub async fn execute(&self) -> Result<StrikeReceipt> {
        // 1. GPU Allocation (COST POINT)
        let allocation = self.allocate_gpu_resources().await?;
        
        // 2. Model Inference (COST POINT)
        let inference_result = self.run_inference(allocation).await?;
        
        // 3. Receipt Generation (AUDIT POINT)
        let receipt = StrikeReceipt {
            strike_id: self.id,
            allocation_id: allocation.id,
            gpu_hours_used: allocation.duration_hours(),
            tokens_processed: inference_result.total_tokens(),
            cost_breakdown: self.calculate_costs(&allocation, &inference_result),
            ..Default::default()
        };
        
        Ok(receipt)
    }
}
```

### 2. Enhanced Receipt with Cost Data

```rust
#[derive(Serialize, Deserialize)]
pub struct StrikeReceipt {
    // Existing fields
    pub strike_id: Uuid,
    pub covenant_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub status: StrikeStatus,
    
    // Cost tracking additions
    pub cost_data: CostData,
    pub tenant_id: Uuid,
}

#[derive(Serialize, Deserialize)]
pub struct CostData {
    pub gpu_allocation: GpuCost,
    pub inference: InferenceCost,
    pub total_usd: f64,
    pub billing_metadata: HashMap<String, Value>,
}

#[derive(Serialize, Deserialize)]
pub struct GpuCost {
    pub allocation_id: String,
    pub gpu_type: String,
    pub duration_seconds: u32,
    pub rate_per_hour: f64,
    pub total_cost: f64,
}

#[derive(Serialize, Deserialize)]
pub struct InferenceCost {
    pub model: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub cost_per_1k_tokens: f64,
    pub total_cost: f64,
}
```

### 3. Usage Aggregation Service

```rust
pub struct UsageAggregationService {
    receipt_store: Arc<dyn ReceiptStore>,
    pricing_engine: Arc<PricingEngine>,
    billing_store: Arc<dyn BillingStore>,
}

impl UsageAggregationService {
    /// Aggregate usage from strike receipts
    pub async fn aggregate_tenant_usage(
        &self, 
        tenant_id: Uuid,
        period: BillingPeriod,
    ) -> Result<TenantUsage> {
        // Query all receipts for tenant in period
        let receipts = self.receipt_store
            .query_by_tenant(tenant_id, period.start, period.end)
            .await?;
        
        // Aggregate by resource type
        let gpu_usage = self.aggregate_gpu_usage(&receipts);
        let token_usage = self.aggregate_token_usage(&receipts);
        let api_usage = self.aggregate_api_usage(&receipts);
        
        // Calculate total cost
        let total_cost = self.pricing_engine.calculate_total(
            &gpu_usage,
            &token_usage,
            &api_usage,
            tenant_id,
        ).await?;
        
        Ok(TenantUsage {
            tenant_id,
            period,
            gpu_usage,
            token_usage,
            api_usage,
            total_cost,
            line_items: self.generate_line_items(&receipts).await?,
        })
    }
}
```

## Billing Integration Options

### Option 1: Stripe Integration (Recommended for SaaS)

```rust
pub struct StripeBillingProvider {
    stripe_client: stripe::Client,
    webhook_handler: Arc<WebhookHandler>,
}

impl BillingProvider for StripeBillingProvider {
    async fn sync_usage(&self, tenant_id: Uuid, usage: TenantUsage) -> Result<()> {
        let customer_id = self.get_stripe_customer(tenant_id).await?;
        
        // Report usage to Stripe
        for line_item in usage.line_items {
            match line_item.resource_type {
                ResourceType::GpuHours => {
                    stripe::UsageRecord::create(
                        &self.stripe_client,
                        &customer_id,
                        CreateUsageRecord {
                            quantity: line_item.quantity as i64,
                            timestamp: line_item.timestamp,
                            subscription_item: line_item.subscription_item_id,
                            ..Default::default()
                        }
                    ).await?;
                }
                ResourceType::Tokens => {
                    // Report token usage
                }
                _ => {}
            }
        }
        
        Ok(())
    }
}
```

### Option 2: Enterprise Invoice Generation

```rust
pub struct EnterpriseInvoiceGenerator {
    template_engine: Arc<TemplateEngine>,
    usage_store: Arc<dyn UsageStore>,
}

impl EnterpriseInvoiceGenerator {
    pub async fn generate_invoice(
        &self,
        tenant: &TenantConfig,
        usage: TenantUsage,
    ) -> Result<Invoice> {
        let invoice = Invoice {
            invoice_number: self.generate_invoice_number(),
            tenant_id: tenant.tenant_id,
            billing_period: usage.period,
            line_items: usage.line_items.into_iter().map(|item| {
                InvoiceLineItem {
                    description: self.format_description(&item),
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total: item.total_cost,
                }
            }).collect(),
            subtotal: usage.total_cost,
            tax: self.calculate_tax(tenant, usage.total_cost),
            total: usage.total_cost + tax,
            due_date: Utc::now() + Duration::days(tenant.payment_terms.net_days),
        };
        
        // Generate PDF
        let pdf = self.template_engine.render_invoice(&invoice).await?;
        
        // Store invoice
        self.invoice_store.save_invoice(invoice, pdf).await?;
        
        Ok(invoice)
    }
}
```

## Implementation Steps

### Phase 1: Core Usage Tracking (Week 1)

1. **Extend Strike Receipts**
   ```rust
   // In hosted_ai.rs
   impl HostedAiConnector {
       pub async fn execute_with_cost_tracking(
           &self,
           request: InferenceRequest,
           tenant_context: &TenantContext,
       ) -> Result<(InferenceResponse, CostData)> {
           let allocation = self.allocate_gpu(request.model).await?;
           let start = Instant::now();
           
           let response = self.run_inference(allocation, request).await?;
           
           let cost_data = CostData {
               gpu_allocation: GpuCost {
                   allocation_id: allocation.id,
                   gpu_type: allocation.gpu_type,
                   duration_seconds: start.elapsed().as_secs(),
                   rate_per_hour: self.get_gpu_rate(&allocation.gpu_type),
                   total_cost: self.calculate_gpu_cost(&allocation, start.elapsed()),
               },
               inference: InferenceCost {
                   model: request.model,
                   input_tokens: response.input_tokens,
                   output_tokens: response.output_tokens,
                   cost_per_1k_tokens: self.get_token_rate(&request.model),
                   total_cost: self.calculate_token_cost(&response),
               },
               total_usd: gpu_cost + token_cost,
               billing_metadata: HashMap::new(),
           };
           
           // Record usage event
           self.usage_tracker.record_event(UsageEvent {
               tenant_id: tenant_context.tenant_id,
               event_type: UsageEventType::InferenceRequest { ... },
               cost_usd: Some(cost_data.total_usd),
               ..Default::default()
           }).await?;
           
           Ok((response, cost_data))
       }
   }
   ```

2. **Create Usage Storage**
   ```sql
   -- Simple usage tracking table
   CREATE TABLE usage_receipts (
       id UUID PRIMARY KEY,
       tenant_id UUID NOT NULL,
       strike_id UUID NOT NULL,
       timestamp TIMESTAMPTZ NOT NULL,
       resource_type VARCHAR(50) NOT NULL,
       quantity DECIMAL(10, 4) NOT NULL,
       unit_cost DECIMAL(10, 6) NOT NULL,
       total_cost DECIMAL(10, 6) NOT NULL,
       metadata JSONB,
       INDEX idx_usage_tenant_time (tenant_id, timestamp)
   );
   ```

### Phase 2: Billing Provider Integration (Week 2)

1. **Add Stripe SDK**
   ```toml
   [dependencies]
   stripe-rust = "0.15"
   ```

2. **Implement Usage Sync**
   ```rust
   pub async fn sync_usage_to_stripe(&self) -> Result<()> {
       let pending_usage = self.get_unsynced_usage().await?;
       
       for (tenant_id, usage_items) in pending_usage.group_by_tenant() {
           let customer = self.get_stripe_customer(tenant_id).await?;
           
           for item in usage_items {
               self.stripe_client.report_usage(
                   customer.id,
                   item.into_stripe_format()
               ).await?;
           }
       }
       
       Ok(())
   }
   ```

### Phase 3: Usage Dashboard (Week 3)

1. **Add Usage Endpoints**
   ```rust
   // In server.rs
   .route("/v1/usage/current", get(current_usage_handler))
   .route("/v1/usage/history", get(usage_history_handler))
   .route("/v1/usage/invoice-preview", get(invoice_preview_handler))
   ```

2. **Create Usage Dashboard**
   ```typescript
   // Simple React component
   export function UsageDashboard({ tenantId }) {
     const { data: usage } = useQuery(['usage', tenantId], 
       () => fetchTenantUsage(tenantId)
     );
     
     return (
       <div>
         <h2>Current Month Usage</h2>
         <UsageChart data={usage.daily} />
         <CostBreakdown items={usage.breakdown} />
         <ProjectedCost amount={usage.projected} />
       </div>
     );
   }
   ```

## Pricing Model

### GPU Pricing (via Hosted.AI)

| GPU Type | VRAM | $/hour | Included in Tier |
|----------|------|--------|-----------------|
| A100 40GB | 40GB | $2.50 | Enterprise |
| A100 80GB | 80GB | $4.00 | Enterprise |
| RTX 4090 | 24GB | $0.90 | Pro, Enterprise |
| RTX 3090 | 24GB | $0.60 | All |

### Token Pricing

| Model | Input ($/1K tokens) | Output ($/1K tokens) |
|-------|-------------------|---------------------|
| Gemma-2B | $0.0001 | $0.0002 |
| Qwen-30B | $0.001 | $0.002 |
| Qwen-70B | $0.003 | $0.006 |

### Platform Tiers

```yaml
tiers:
  free:
    name: "Free"
    monthly_price: $0
    included:
      gpu_hours: 10
      tokens: 1_000_000
      api_calls: 10_000
    
  pro:
    name: "Pro"
    monthly_price: $99
    included:
      gpu_hours: 100
      tokens: 10_000_000
      api_calls: 100_000
    
  enterprise:
    name: "Enterprise"
    monthly_price: "Custom"
    included: "Negotiated"
    features:
      - Dedicated GPU pools
      - SLA guarantees
      - Priority support
      - Custom models
```

## Testing Strategy

```rust
#[cfg(test)]
mod billing_tests {
    #[tokio::test]
    async fn test_usage_aggregation() {
        let service = create_test_service();
        let tenant_id = create_test_tenant();
        
        // Generate some usage
        for _ in 0..10 {
            service.record_inference_usage(tenant_id, ...).await?;
        }
        
        // Aggregate
        let usage = service.aggregate_usage(tenant_id, current_month()).await?;
        
        assert_eq!(usage.total_inferences, 10);
        assert!(usage.total_cost > 0.0);
    }
    
    #[tokio::test]
    async fn test_stripe_webhook() {
        let webhook_payload = include_str!("fixtures/stripe_webhook.json");
        let signature = "test_signature";
        
        let result = handle_stripe_webhook(webhook_payload, signature).await;
        assert!(result.is_ok());
    }
}
```

## Monitoring

```prometheus
# Usage metrics
harpoon_usage_gpu_hours{tenant_id="...", gpu_type="..."} 
harpoon_usage_tokens{tenant_id="...", model="...", type="input|output"}
harpoon_usage_cost_usd{tenant_id="...", resource="..."}

# Billing metrics
harpoon_billing_sync_success{provider="stripe"}
harpoon_billing_sync_errors{provider="stripe", error_type="..."}
harpoon_invoice_generated{tenant_id="...", amount="..."}
```

## Migration Path

For existing deployments:

1. **Backfill Historical Usage**
   ```rust
   pub async fn backfill_usage_from_receipts() {
       let receipts = self.get_all_receipts().await?;
       
       for receipt in receipts {
           if let Some(cost_data) = extract_cost_from_receipt(&receipt) {
               self.record_historical_usage(cost_data).await?;
           }
       }
   }
   ```

2. **Gradual Rollout**
   - Start with usage tracking only (no billing)
   - Add billing for new tenants
   - Migrate existing tenants with notice period

## Conclusion

This implementation leverages Ubiquity Harpoon's existing covenant/strike/receipt pattern for natural cost tracking. The receipts already serve as immutable billing records, and the strike execution flow provides perfect cost capture points. With minimal additions, we can build a complete billing system that feels native to the architecture.