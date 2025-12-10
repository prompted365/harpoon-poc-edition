# 🚀 Harpoon v2 - Quick Start Guide

## 🌐 Your Production URL
```
https://22d39a50.harpoon-v2.pages.dev
```

---

## ⚡ Quick Test

### 1. Open Production URL
Visit: https://22d39a50.harpoon-v2.pages.dev

### 2. Try Sample Query
```
Delegate a covenant for sub-agent spawning of sub-agents plz and ensure each returns a color of the rainbow and output to centralized context in gradient order starting with red
```

### 3. Watch the Magic
- **Left Panel (25%):** Active Covenant details
- **Center Panel (33%):** Chat interface
- **Right Panel (42%):** Live Orchestration Tree with raw I/O

---

## 🎨 UI Features

### Command Palette (Cmd+K or Ctrl+K)
- New Covenant
- Show Insights
- Force Full Orchestration
- Mediator Only Mode
- Clear History
- Export Covenant

### Orchestration Tree
- **📥 Input:** Raw request data (click to expand)
- **📤 Output:** Raw response data (click to expand)
- **Status Indicators:** 
  - 🟡 Pending
  - 🔵 Running
  - 🟢 Completed
  - 🔴 Failed

---

## 🔧 API Endpoints

### Health Check
```bash
curl https://22d39a50.harpoon-v2.pages.dev/api/health
```

### Smart Chat
```bash
curl -X POST https://22d39a50.harpoon-v2.pages.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain quantum computing"}'
```

### List Models
```bash
curl https://22d39a50.harpoon-v2.pages.dev/api/models
```

### Orchestration Patterns
```bash
# Parallel execution
curl -X POST https://22d39a50.harpoon-v2.pages.dev/api/orchestrate/parallel \
  -H "Content-Type: application/json" \
  -d '{"requests": [{"prompt": "Task 1"}, {"prompt": "Task 2"}]}'

# Smart routing with fallback
curl -X POST https://22d39a50.harpoon-v2.pages.dev/api/orchestrate/smart \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Complex analysis task"}'
```

---

## ⚙️ Configuration (Optional)

### Add Gemini API Key
```bash
npx wrangler pages secret put GEMINI_API_KEY --project-name harpoon-v2
# When prompted, paste your Gemini API key
```

### Enable WebSocket (Durable Objects)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **harpoon-v2**
3. **Settings** → **Functions** → **Durable Object bindings**
4. Add bindings:
   - `MEDIATOR` → `MediatorAgent`
   - `ORCHESTRATOR` → `OrchestratorAgent`

See `DURABLE_OBJECTS_SETUP.md` for details.

---

## 📊 Available AI Models

### Groq (Ultra-Fast)
- `llama-3-8b-8192` - Fast, balanced
- `llama-3-70b-8192` - High quality
- `mixtral-8x7b-32768` - Long context

### Cloudflare Workers AI
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast` - Fast inference
- `@cf/qwen/qwen3-32b-text-only-v1` - Qwen 32B

### OpenAI
- `gpt-3.5-turbo` - Fast, cost-effective
- `gpt-4` - Highest quality

### Google AI Studio (via AI Gateway)
- `gemini-3-1b-it:free` - Free tier

---

## 🐛 Troubleshooting

### "Durable Objects not available"
**Normal:** WebSocket features require manual DO binding configuration.  
**Solution:** Follow `DURABLE_OBJECTS_SETUP.md`

### "Missing Authorization header" (Gemini)
**Solution:** Add Gemini API key as a secret (see Configuration above)

### WebSocket connection failed
**Solution:** Ensure DO bindings are configured in Dashboard

---

## 📚 Full Documentation

- **DEPLOYMENT_COMPLETE.md** - Complete deployment summary
- **DURABLE_OBJECTS_SETUP.md** - WebSocket configuration guide
- **FIX_SUMMARY.md** - UI fixes and error resolutions
- **README.md** - Project overview

---

## 🎯 What Works Right Now

✅ **Smart AI Routing** - Automatic model selection  
✅ **Multi-Provider Support** - Groq, Workers AI, OpenAI, Gemini  
✅ **Command Palette** - Cmd+K / Ctrl+K  
✅ **3-Column Layout** - Optimal screen usage  
✅ **Raw I/O Display** - Full transparency  
✅ **Orchestration Patterns** - Parallel, Workers, Optimize, Smart  
✅ **Global Edge Deployment** - Cloudflare's network  
✅ **Production Ready** - All critical fixes applied  

---

## 🔮 Coming Soon (With DO Bindings)

⏳ **Real-Time WebSocket** - Live updates  
⏳ **Persistent Covenants** - SQLite storage  
⏳ **Multi-Agent Swarm** - Parallel sub-agents  
⏳ **Live Tree Updates** - Real-time progress  

---

## 💡 Pro Tips

1. **Use Command Palette:** Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) for quick access
2. **Expand Raw Data:** Click `📥 Input` or `📤 Output` to see full request/response
3. **Test Different Models:** Use `/api/models` to see all available options
4. **Check Health:** Use `/api/health` to verify all providers are operational
5. **Complex Tasks:** Use "Force Full Orchestration" mode for multi-step tasks

---

## 🚀 Ready to Go!

Your Harpoon v2 is deployed and ready to use at:

**https://22d39a50.harpoon-v2.pages.dev**

Start with a simple query or try the rainbow covenant example! 🌈
