# Durable Objects & WebSocket Configuration Guide

## ✅ Configuration Completed

### 1. Durable Objects Bindings Added to `wrangler.jsonc`

```jsonc
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
```

### 2. Durable Object Classes Exported in `src/index.tsx`

```typescript
// Export Durable Object classes for Cloudflare Workers
export { MediatorAgent } from './agents/mediator-agent';
export { OrchestratorAgent } from './agents/orchestrator-agent';
```

### 3. Environment Variables (Cloudflare Secrets)

**Already Configured Secrets:**
- ✅ `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- ✅ `AI_GATEWAY_ID`: AI Gateway configuration
- ✅ `AI_GATEWAY_TOKEN`: AI Gateway authentication
- ✅ `WORKERS_AI_TOKEN`: Workers AI authentication

**Optional API Keys (for additional providers):**
- `GEMINI_API_KEY` - Google Gemini API (if using direct Gemini calls)
- `GROQ_API_KEY` - Groq API (if not using BYOK)
- `OPENAI_API_KEY` - OpenAI API (if not using BYOK)

**Note:** If you're using Cloudflare AI Gateway's BYOK (Bring Your Own Key) feature, you don't need to set provider API keys as secrets. They're managed in the Cloudflare Dashboard.

## 🚀 How to Add New Secrets

### Command Line Method:

```bash
# Add Gemini API key
npx wrangler pages secret put GEMINI_API_KEY --project-name harpoon-v2
# When prompted, paste your API key

# Add Groq API key
npx wrangler pages secret put GROQ_API_KEY --project-name harpoon-v2

# Add OpenAI API key
npx wrangler pages secret put OPENAI_API_KEY --project-name harpoon-v2
```

### Cloudflare Dashboard Method:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages**
3. Select **harpoon-v2** project
4. Go to **Settings** → **Environment Variables**
5. Under **Production** environment, click **Add Variable**
6. Select **Encrypt** for sensitive API keys
7. Click **Save**

## 🔄 Deployment with Durable Objects

### First-Time Deployment (Already Done):

```bash
# Build the project
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name harpoon-v2
```

### Production URL:
https://01c798d3.harpoon-v2.pages.dev

## 🧪 Testing WebSocket Connections

### 1. Check Agent Status:

```bash
curl https://01c798d3.harpoon-v2.pages.dev/api/agents/status
```

**Expected Response (Production with DOs):**
```json
{
  "agents_enabled": true,
  "mode": "production",
  "mediator": "available",
  "orchestrator": "available",
  "websockets": "supported",
  "message": "Durable Objects active - WebSocket connections available"
}
```

### 2. Test WebSocket Connection (Browser Console):

```javascript
// Connect to Mediator Agent WebSocket
const ws = new WebSocket('wss://01c798d3.harpoon-v2.pages.dev/api/agents/mediator/test-user/ws');

ws.onopen = () => {
  console.log('✅ WebSocket connected!');
  
  // Create a covenant
  ws.send(JSON.stringify({
    type: 'create_covenant',
    data: {
      user_intent: 'Generate rainbow colors with sub-agents',
      constraints: {
        cost: 0.50,
        latency: 30000,
        quality: 'balanced'
      }
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('📥 Message:', message);
};

ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};
```

### 3. Test Full Orchestration (REST API):

```bash
curl -X POST https://01c798d3.harpoon-v2.pages.dev/api/orchestrate/full \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Delegate a covenant for sub-agent spawning of sub-agents plz and ensure each returns a color of the rainbow and output to centralized context in gradient order starting with red",
    "userId": "test-user"
  }'
```

## 📊 Durable Objects Features

### MediatorAgent (Covenant Manager)
- **SQLite Storage:** Persistent covenant tracking
- **Complexity Analysis:** Smart routing decisions
- **WebSocket Broadcasting:** Real-time updates to all clients
- **Delegation:** Forwards complex tasks to Orchestrator

### OrchestratorAgent (Task Executor)
- **SQLite Storage:** Task and sub-agent execution history
- **Multi-Agent Swarm:** Spawns classifier, router, executor, evaluator, coordinator
- **Parallel Execution:** 3 parallel executor sub-agents
- **WebSocket Progress:** Real-time agent status updates
- **Result Aggregation:** Synthesizes final outputs

## 🔐 Security Best Practices

1. **Never expose API keys in frontend code**
2. **Use Cloudflare secrets for all sensitive tokens**
3. **Validate all WebSocket messages**
4. **Implement rate limiting** (Cloudflare Pages automatically provides DDoS protection)
5. **Use HTTPS/WSS only** (enforced by Cloudflare)

## 🐛 Troubleshooting

### WebSocket Connection Failed:
```
Error: WebSocket connection failed
```
**Solution:** Ensure you're accessing the **production URL** (not localhost). Durable Objects are only available on Cloudflare's edge network.

### "Durable Objects not available":
```json
{
  "error": "Durable Objects not available in development mode",
  "message": "Deploy to Cloudflare Pages for full agent functionality"
}
```
**Solution:** This is expected in local development. Deploy to Cloudflare Pages to enable DOs.

### Missing Authorization Header (Gemini):
```
Error: Missing Authorization header
```
**Solution:** Add `GEMINI_API_KEY` as a Cloudflare secret:
```bash
npx wrangler pages secret put GEMINI_API_KEY --project-name harpoon-v2
```

## 📚 Additional Resources

- [Cloudflare Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [WebSocket API](https://developers.cloudflare.com/workers/runtime-apis/websockets/)
- [Hono Framework](https://hono.dev/)

## ✅ Verification Checklist

- [x] Durable Objects bindings added to `wrangler.jsonc`
- [x] DO classes exported in `src/index.tsx`
- [x] Environment variables configured as Cloudflare secrets
- [x] Project deployed to Cloudflare Pages
- [ ] WebSocket connection tested in browser
- [ ] Full orchestration tested with rainbow covenant
- [ ] Gemini API key added (if needed)
- [ ] Real-time UI updates verified

## 🎯 Next Steps

1. **Test WebSocket in production:** Visit https://01c798d3.harpoon-v2.pages.dev
2. **Add Gemini API key** (if needed):
   ```bash
   npx wrangler pages secret put GEMINI_API_KEY --project-name harpoon-v2
   ```
3. **Test rainbow covenant:** Use the delegated sub-agent spawning query
4. **Monitor real-time updates:** Watch the Orchestration Tree update live via WebSocket
