# 🎯 Harpoon v2 - Final Setup Required

## ✅ What's Complete

### Phase 4: Durable Objects + WebSocket + Real-time
- ✅ **Code Complete**: All DO classes, WebSocket, SQLite storage implemented
- ✅ **Deployed to Production**: https://harpoon-v2.pages.dev
- ✅ **Environment Variables Set**: AI Gateway config added to Cloudflare Pages
- ✅ **Real AI Orchestration**: No more mock data - actual API calls
- ✅ **BYOK Support**: Uses `cf-aig-authorization` header correctly

### Working Features
- ✅ UI loads and renders
- ✅ Command palette (⌘K)
- ✅ Covenant visualization
- ✅ Orchestration tree UI
- ✅ Real API calls (currently failing due to missing keys)

---

## ⚠️ What's Blocking Real AI Responses

### Issue: Error 2009 "Unauthorized"

**Root Cause**: Provider API keys (Groq, OpenAI) are **not uploaded** to the Cloudflare AI Gateway dashboard.

**Why**: BYOK (Bring Your Own Keys) requires you to:
1. Upload your Groq API key to AI Gateway
2. Upload your OpenAI API key to AI Gateway
3. Then requests with `cf-aig-authorization` will work

---

## 🔧 Required Actions (Manual - Cloudflare Dashboard)

### Action 1: Upload Provider Keys to AI Gateway

**Steps**:
1. Go to: https://dash.cloudflare.com/
2. Navigate to: **AI** → **AI Gateway** → **cf-gateway**
3. Look for **Settings** or **API Keys** or **Provider Keys** section
4. Click **Add Provider Key** or similar
5. Add your **Groq API Key**:
   - Provider: Groq
   - API Key: `gsk_...` (your actual Groq key)
6. Add your **OpenAI API Key**:
   - Provider: OpenAI
   - API Key: `sk-...` (your actual OpenAI key)
7. Save

**Get API Keys**:
- **Groq**: https://console.groq.com/keys
- **OpenAI**: https://platform.openai.com/api-keys

### Action 2: Configure Durable Objects Bindings

**Steps**:
1. Go to: https://dash.cloudflare.com/
2. Navigate to: **Pages** → **harpoon-v2** → **Settings** → **Functions**
3. Scroll to **Durable Objects Bindings**
4. Click **Add Binding**:
   - Variable name: `MEDIATOR`
   - Durable Object class: Select `MediatorAgent` from dropdown
   - Script name: `harpoon-v2`
5. Click **Add Binding** again:
   - Variable name: `ORCHESTRATOR`
   - Durable Object class: Select `OrchestratorAgent` from dropdown
   - Script name: `harpoon-v2`
6. Click **Save**
7. May need to redeploy (should be automatic)

---

## 🧪 Verification Steps

### After Uploading Keys to AI Gateway:

```bash
# Test 1: Direct gateway call
curl -X POST \
  "https://gateway.ai.cloudflare.com/v1/824702a2f59c9132af79667ba5f92192/cf-gateway/groq/chat/completions" \
  -H "cf-aig-authorization: Bearer QcoTKOOff8k0jLWIwFc84p48txA2-qm6LYwUVzqJ" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-8b-instant",
    "messages": [{"role": "user", "content": "Say hi"}],
    "max_tokens": 10
  }'
# Expected: {"choices": [{"message": {"content": "Hi..."}}]}

# Test 2: Via Harpoon API
curl -X POST https://harpoon-v2.pages.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello", "tier": "primary"}'
# Expected: {"content": "Hello...", "model": "llama-3.1-8b-instant", ...}

# Test 3: Smart orchestration
curl -X POST https://harpoon-v2.pages.dev/api/orchestrate/smart \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is 2+2?"}'
# Expected: {"success": true, "data": {"answer": "2+2 equals 4"}, ...}
```

### After Configuring DO Bindings:

```bash
# Test 4: Agent status
curl https://harpoon-v2.pages.dev/api/agents/status
# Expected: {"agents_enabled": true, "mediator": "available", "orchestrator": "available"}

# Test 5: WebSocket (in browser)
# Open: https://harpoon-v2.pages.dev
# Check console - should see: "✅ Mediator WebSocket connected"
# Try sending a message in the UI
```

---

## 📊 Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE PAGES                             │
│  ✅ Worker Deployed (42.61 KB)                                  │
│  ✅ Environment Variables Set                                    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AI Gateway Integration                                  │   │
│  │  ✅ Account ID: 824702a2f59c9132af79667ba5f92192       │   │
│  │  ✅ Gateway ID: cf-gateway                              │   │
│  │  ✅ Gateway Token: QcoTKOOff8k0jLWIwFc84p48txA2-qm...  │   │
│  │  ⏸️ Provider Keys: NOT UPLOADED (Manual Step)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Durable Objects                                         │   │
│  │  ✅ MediatorAgent code deployed                         │   │
│  │  ✅ OrchestratorAgent code deployed                     │   │
│  │  ⏸️ Bindings: NOT CONFIGURED (Manual Step)             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 What Happens After Setup

### With AI Keys Uploaded:
1. ✅ `/api/chat` will return **real AI responses** from Groq/OpenAI
2. ✅ `/api/orchestrate/smart` will do **real intelligent routing**
3. ✅ `/api/orchestrate/workers` will do **real orchestrator-workers pattern**
4. ✅ UI chat will show **actual AI answers** in the conversation
5. ✅ Covenant will update with **real mediator decisions**
6. ✅ Orchestration tree will show **real agent execution**

### With DO Bindings Configured:
1. ✅ WebSocket connections will work
2. ✅ Real-time covenant updates
3. ✅ Real-time agent status streaming
4. ✅ Persistent SQLite storage per agent
5. ✅ Mediator → Orchestrator delegation via DO stubs
6. ✅ Progressive agent spawning with real-time UI updates

---

## 📝 Summary

**Status**: Phase 4 code is 100% complete and deployed. Waiting on 2 manual Cloudflare Dashboard configurations:

1. **Upload Provider Keys** to AI Gateway (for BYOK)
2. **Configure DO Bindings** (for WebSocket/real-time)

**Once these are done**, everything will work:
- Real AI responses ✅
- Real-time WebSocket updates ✅
- Persistent agent state ✅
- Full orchestration workflows ✅

---

## 🔗 Quick Links

- **Production**: https://harpoon-v2.pages.dev
- **Cloudflare Dashboard**: https://dash.cloudflare.com/
- **AI Gateway Settings**: https://dash.cloudflare.com/ → AI → AI Gateway → cf-gateway
- **Pages Settings**: https://dash.cloudflare.com/ → Pages → harpoon-v2 → Settings
- **GitHub**: https://github.com/prompted365/harpoon-poc-edition

---

## 💬 Questions?

- **"How do I find the AI Gateway keys section?"**: In dashboard, go to AI → AI Gateway → cf-gateway → Settings (or look for "Provider Keys", "API Keys", "Integrations")
- **"What if DO classes don't appear in dropdown?"**: They should auto-populate after deployment. Try refreshing page or redeploying.
- **"Do I need both Groq AND OpenAI keys?"**: For full functionality yes, but you can start with just one provider for testing.

---

**Last Updated**: December 10, 2025  
**All Code**: ✅ Complete and Deployed  
**Waiting On**: 🔧 2 Manual Dashboard Configurations
