# 🔧 Cloudflare Durable Objects Setup Guide

## Overview

This guide explains how to configure Durable Objects bindings for **Harpoon v2** to enable real-time agent communication via WebSockets.

**Current Status**: ⚠️ DO bindings not configured (manual setup required)

---

## Prerequisites

- ✅ Cloudflare Pages project deployed (`harpoon-v2`)
- ✅ Cloudflare account with Workers Paid plan (Durable Objects require paid plan)
- ✅ Code deployed with DO classes exported (`MediatorAgent`, `OrchestratorAgent`)

---

## Step 1: Verify Durable Object Classes Are Deployed

Your Worker must export the DO classes. This is already done in `src/index.tsx`:

```typescript
// These exports are REQUIRED for Cloudflare to recognize the DO classes
export { MediatorAgent } from './agents/mediator-agent';
export { OrchestratorAgent } from './agents/orchestrator-agent';
```

**Verify deployment**:
```bash
npm run build
npx wrangler pages deploy dist --project-name harpoon-v2
```

---

## Step 2: Configure Durable Objects Bindings (Dashboard Method)

### Option A: Via Cloudflare Dashboard (Recommended)

1. **Go to Cloudflare Dashboard**:
   - Navigate to: https://dash.cloudflare.com/
   - Click on your account → **Pages** → **harpoon-v2**

2. **Open Settings → Functions**:
   - Click **Settings** tab
   - Scroll to **Functions** section
   - Click **Durable Objects Bindings**

3. **Add MEDIATOR Binding**:
   - Click **Add Binding**
   - **Variable name**: `MEDIATOR`
   - **Durable Object class**: Select `MediatorAgent`
   - **Script name**: `harpoon-v2` (same project)
   - Click **Save**

4. **Add ORCHESTRATOR Binding**:
   - Click **Add Binding** again
   - **Variable name**: `ORCHESTRATOR`
   - **Durable Object class**: Select `OrchestratorAgent`
   - **Script name**: `harpoon-v2` (same project)
   - Click **Save**

5. **Redeploy** (may be required):
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name harpoon-v2
   ```

---

### Option B: Via wrangler.jsonc (Alternative)

If you prefer configuration as code, `wrangler.jsonc` already has the bindings defined:

```jsonc
{
  "name": "harpoon-v2",
  "compatibility_date": "2025-12-10",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  
  "durable_objects": {
    "bindings": [
      {
        "name": "MEDIATOR",
        "class_name": "MediatorAgent",
        "script_name": "harpoon-v2"
      },
      {
        "name": "ORCHESTRATOR",
        "class_name": "OrchestratorAgent",
        "script_name": "harpoon-v2"
      }
    ]
  }
}
```

**Note**: For Cloudflare Pages, bindings must be configured via the **Dashboard** (Option A). The `wrangler.jsonc` config is for reference and local development with `wrangler dev`.

---

## Step 3: Verify Durable Objects Are Active

### Test 1: Check Agent Status API

```bash
curl -s https://harpoon-v2.pages.dev/api/agents/status | jq .
```

**Expected Response** (after DO setup):
```json
{
  "agents_enabled": true,
  "mode": "production",
  "mediator": "available",
  "orchestrator": "available",
  "websockets": "supported"
}
```

**Current Response** (before DO setup):
```json
{
  "agents_enabled": false,
  "mode": "development",
  "mediator": "unavailable",
  "orchestrator": "unavailable",
  "websockets": "not_supported",
  "message": "Deploy to Cloudflare Pages for Durable Objects support"
}
```

### Test 2: WebSocket Connection

```bash
# Install wscat (WebSocket testing tool)
npm install -g wscat

# Connect to Mediator WebSocket
wscat -c wss://harpoon-v2.pages.dev/api/agents/mediator/test-user/ws
```

**Expected**:
```
Connected (press CTRL+C to quit)
```

Then send a message:
```json
{"type": "create_covenant", "data": {"user_intent": "Test query"}}
```

**Expected Response**:
```json
{"type": "covenant_update", "data": {...}}
```

### Test 3: REST API via DO

```bash
# Create covenant
curl -X POST https://harpoon-v2.pages.dev/api/agents/mediator/test-user/covenant \
  -H "Content-Type: application/json" \
  -d '{"user_intent": "Plan a 3-day Tokyo trip"}'

# Get covenant
curl https://harpoon-v2.pages.dev/api/agents/mediator/test-user/covenant
```

---

## Step 4: Monitor Durable Objects

### Via Cloudflare Dashboard

1. **Go to Workers & Pages** → **Durable Objects**
2. **Select your namespace** (e.g., `MEDIATOR`, `ORCHESTRATOR`)
3. **View active instances**:
   - Instance IDs
   - Memory usage
   - Request count
   - Active WebSocket connections

### Via Wrangler CLI

```bash
# List Durable Objects
npx wrangler pages durable-objects list --project-name harpoon-v2

# Check specific DO instance
npx wrangler pages durable-objects info --project-name harpoon-v2 --id <instance-id>
```

---

## Troubleshooting

### Issue 1: "agents_enabled: false" in Production

**Cause**: DO bindings not configured in Cloudflare Dashboard.

**Solution**:
1. Go to Dashboard → Pages → harpoon-v2 → Settings → Functions
2. Add MEDIATOR and ORCHESTRATOR bindings (see Step 2)
3. Redeploy if needed

### Issue 2: "WebSocket connection failed"

**Cause**: DO bindings not active or Worker not deployed with DO exports.

**Solution**:
1. Verify `src/index.tsx` exports DO classes:
   ```typescript
   export { MediatorAgent } from './agents/mediator-agent';
   export { OrchestratorAgent } from './agents/orchestrator-agent';
   ```
2. Rebuild and redeploy:
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name harpoon-v2
   ```
3. Check browser console for WebSocket errors

### Issue 3: "Script harpoon-v2 not found"

**Cause**: Worker not deployed yet or DO classes not exported.

**Solution**:
1. Deploy Worker first:
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name harpoon-v2
   ```
2. Then configure DO bindings in Dashboard

### Issue 4: "Durable Objects require Workers Paid plan"

**Cause**: Your Cloudflare account is on the Free plan.

**Solution**:
1. Upgrade to Workers Paid plan ($5/month)
2. Go to Dashboard → Workers & Pages → Plans
3. Select **Workers Paid** plan

**Note**: Durable Objects are only available on paid plans. The free plan does not support DO.

---

## Cost Considerations

### Durable Objects Pricing

| Metric | Cost |
|--------|------|
| **Requests** | $0.15 per million |
| **Duration** | $12.50 per million GB-seconds |
| **Compute** | Included in requests |

**Estimated Monthly Cost** (1000 users, 10k requests):
- Requests: 10,000 × $0.15 / 1,000,000 = $0.0015
- Duration: ~1 GB-sec × $12.50 / 1,000,000 = $0.0125
- **Total**: ~$0.01-0.02/month for light usage

**Note**: First 1 million requests per month are included in Workers Paid plan ($5/month).

---

## Development vs Production

### Local Development (Node.js)

- **DO Support**: ❌ Not available
- **WebSocket**: ❌ Fallback to HTTP polling
- **SQLite**: ❌ No persistent storage
- **Orchestration**: ✅ Uses HTTP-based patterns

**Run locally**:
```bash
npm run build
pm2 start ecosystem.config.cjs
```

### Production (Cloudflare Pages)

- **DO Support**: ✅ Full support (after config)
- **WebSocket**: ✅ Real-time bidirectional
- **SQLite**: ✅ Persistent storage per DO
- **Orchestration**: ✅ DO-based agent communication

**Deploy**:
```bash
npm run build
npx wrangler pages deploy dist --project-name harpoon-v2
```

---

## Next Steps

1. ✅ **Deploy to Cloudflare Pages** (already done)
2. ⏸️ **Configure DO bindings** in Dashboard (manual step)
3. ⏸️ **Test WebSocket connections** via `wscat`
4. ⏸️ **Monitor DO performance** in Dashboard
5. ⏸️ **Add API keys** (GROQ_API_KEY, OPENAI_API_KEY) for real AI inference

---

## Additional Resources

- [Cloudflare Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
- [WebSocket API Reference](https://developers.cloudflare.com/workers/runtime-apis/websockets/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)

---

**Document Version**: 1.0  
**Last Updated**: December 10, 2025  
**Status**: Ready for manual DO configuration
