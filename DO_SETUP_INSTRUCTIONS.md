# 🔧 Durable Objects Setup - Cloudflare Dashboard Method

**Date:** December 11, 2025  
**Status:** Manual configuration required  

---

## 🚨 Current Issue

**Error:** `Cannot apply new-class migration to class 'MediatorAgent' that is not exported by script`

**Cause:** Vite bundler is not preserving Durable Object class exports in the Pages build.

**Solution:** Configure Durable Objects via Cloudflare Dashboard UI

---

## ✅ Step-by-Step Setup (Cloudflare Dashboard)

### Step 1: Deploy Pages First (Without DOs)
```bash
cd /home/user/webapp/v2
npm run build
npx wrangler pages deploy dist --project-name harpoon-v2
```

### Step 2: Open Cloudflare Dashboard
1. Go to: https://dash.cloudflare.com/824702a2f59c9132af79667ba5f92192/workers-and-pages
2. Click on **harpoon-v2** Pages project
3. Click on **Settings** tab
4. Scroll to **Functions** section

### Step 3: Add Durable Object Bindings
1. Click **Add binding** under "Durable Object bindings"
2. Add **MEDIATOR** binding:
   - Variable name: `MEDIATOR`
   - Durable Object namespace: Create new → Name: `MediatorAgent`
   - Class name: `MediatorAgent`
3. Click **Add binding** again
4. Add **ORCHESTRATOR** binding:
   - Variable name: `ORCHESTRATOR`
   - Durable Object namespace: Create new → Name: `OrchestratorAgent`
   - Class name: `OrchestratorAgent`
5. Click **Save**

### Step 4: Redeploy
```bash
cd /home/user/webapp/v2
npm run build
npx wrangler pages deploy dist --project-name harpoon-v2
```

---

## 🔄 Alternative: Use Workers Instead of Pages

If Dashboard method doesn't work, deploy as a Worker:

### Create Separate Worker Config
```toml
# wrangler-worker.toml
name = "harpoon-v2-worker"
main = "src/index.tsx"
compatibility_date = "2025-12-10"
compatibility_flags = ["nodejs_compat"]

[durable_objects]
bindings = [
  { name = "MEDIATOR", class_name = "MediatorAgent" },
  { name = "ORCHESTRATOR", class_name = "OrchestratorAgent" }
]

[[migrations]]
tag = "v1"
new_classes = ["MediatorAgent", "OrchestratorAgent"]

[[durable_objects.bindings]]
name = "MEDIATOR"
class_name = "MediatorAgent"
script_name = "harpoon-v2-worker"

[[durable_objects.bindings]]
name = "ORCHESTRATOR"
class_name = "OrchestratorAgent"  
script_name = "harpoon-v2-worker"
```

### Deploy Worker
```bash
npx wrangler deploy --config wrangler-worker.toml
```

---

## 🐛 Why This Is Hard

### Vite Bundling Issue
- **Problem:** `@hono/vite-build/cloudflare-pages` bundles everything into single `_worker.js`
- **Issue:** Durable Object classes must be exported at module top-level
- **Vite behavior:** Wraps exports in module closure, breaking DO requirements

### Cloudflare Requirements
- DOs must be exported: `export class MediatorAgent { ... }`
- Must be at top-level (not wrapped)
- Must match exact class names in configuration

### Current Behavior
```javascript
// What Vite outputs (doesn't work):
(function() {
  class MediatorAgent { ... }
  // Not exported!
})()

// What Cloudflare needs:
export class MediatorAgent { ... }
export class OrchestratorAgent { ... }
```

---

## 🎯 Recommended Approach

### Option 1: Dashboard Configuration (EASIEST)
✅ Use Cloudflare Dashboard UI to add DO bindings  
✅ No code changes needed  
✅ Works with current Pages setup  
⏱️ Takes 5 minutes  

### Option 2: Separate Worker (COMPLEX)
⚠️ Deploy DOs as separate Worker  
⚠️ Pages calls Worker via Service Bindings  
⚠️ More configuration needed  
⏱️ Takes 30+ minutes  

### Option 3: Fix Vite Build (ADVANCED)
⚠️ Customize Vite config to preserve exports  
⚠️ May require custom plugin  
⚠️ High complexity  
⏱️ Takes 1+ hours  

---

## 📋 What You Need

### Required Information
- **Account ID:** `824702a2f59c9132af79667ba5f92192`
- **Project Name:** `harpoon-v2`
- **DO Classes:** `MediatorAgent`, `OrchestratorAgent`
- **Binding Names:** `MEDIATOR`, `ORCHESTRATOR`

### Verification After Setup
```bash
# Test DO endpoint
curl -X POST https://your-deployment.pages.dev/api/orchestrate/full \
  -H "Content-Type: application/json" \
  -d '{"query": "Test DO"}'

# Should NOT return "Durable Objects not available" error
```

---

## 🚫 What Doesn't Work

### ❌ These Won't Work:
- Adding `durable_objects` to `wrangler.jsonc` (Pages config doesn't support it)
- Adding `migrations` to `wrangler.jsonc` (Pages doesn't support migrations)
- Using `npx wrangler deploy` with Pages project (needs Worker mode)
- Vite build with DO exports (bundler strips exports)

### ✅ What Works:
- Cloudflare Dashboard UI configuration
- Separate Worker deployment with DO bindings
- Manual namespace creation via `wrangler` CLI

---

## 🆘 If You're Still Stuck

### Check These:
1. **Paid Plan Active?** - DOs require Workers Paid ($5/month)
2. **DO Namespaces Created?** - Check Dashboard → Workers → Durable Objects
3. **Bindings Configured?** - Settings → Functions → Durable Object bindings
4. **Classes Exported?** - Check `dist/_worker.js` for `export class`

### Get Help:
- Cloudflare Docs: https://developers.cloudflare.com/durable-objects/
- Discord: https://discord.cloudflare.com
- GitHub Issues: https://github.com/cloudflare/workers-sdk/issues

---

## 🎯 Next Steps

1. **Try Dashboard Method First** (recommended)
2. If that doesn't work, I'll help set up as a Worker
3. Then we'll configure Pages to call the Worker via Service Bindings

Let me know which approach you want to take!
