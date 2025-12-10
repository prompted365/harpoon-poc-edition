# Harpoon v2 - Quick Start Guide

## 🚀 Live Demo

**URL**: https://3000-i7tdn5pzeobka2ioncxfo-a402f90a.sandbox.novita.ai

## ⚡ Try It Now

### 1. View All Models
```bash
curl https://3000-i7tdn5pzeobka2ioncxfo-a402f90a.sandbox.novita.ai/api/models | jq
```

### 2. Check System Health
```bash
curl https://3000-i7tdn5pzeobka2ioncxfo-a402f90a.sandbox.novita.ai/api/health | jq
```

### 3. Preview Routing Decision
```bash
curl -X POST https://3000-i7tdn5pzeobka2ioncxfo-a402f90a.sandbox.novita.ai/api/route \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain quantum computing"}' | jq
```

**Result**:
```json
{
  "decision": {
    "selected_model": {
      "id": "llama-3.1-8b-instant",
      "provider": "groq",
      "tier": "primary",
      "speed": 560,
      "costPer1M": 0.05
    }
  },
  "reasoning": "Moderate query - use Groq for speed and cost efficiency"
}
```

### 4. Interactive Web UI

Visit: https://3000-i7tdn5pzeobka2ioncxfo-a402f90a.sandbox.novita.ai

Features:
- Beautiful gradient UI
- Real-time chat interface
- Performance metrics
- Cost tracking
- Model information

## 📊 Model Tiers

### Tier 1: PRIMARY (Groq) - Ultra-Fast & Cost-Effective
- `llama-3.1-8b-instant` - 560 T/sec, $0.05/1M
- `llama-3.3-70b-versatile` - 280 T/sec, $0.59/1M  
- `openai/gpt-oss-20b` - 1000 T/sec, $0.075/1M
- `openai/gpt-oss-120b` - 500 T/sec, $0.15/1M
- `qwen/qwen3-32b` - 450 T/sec, $0.10/1M

### Tier 2: EDGE (Cloudflare Workers AI) - Ultra-Low Latency
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast` - $0.011/1M
- `@cf/meta/llama-3.1-8b-instruct-fast` - $0.011/1M
- `@cf/qwen/qwen2.5-7b-instruct-awq` - $0.011/1M

### Tier 3: FLAGSHIP (OpenAI) - Highest Quality
- `gpt-4o` - 50 T/sec, $2.50/1M
- `gpt-4o-mini` - 100 T/sec, $0.15/1M

## 🎯 Smart Routing Examples

### Simple Query → Edge Tier
```bash
curl -X POST .../api/route \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}'

# Routes to: @cf/meta/llama-3.1-8b-instruct-fast (EDGE)
# Reason: Short, simple query
```

### Moderate Query → Primary Tier
```bash
curl -X POST .../api/route \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain how neural networks work"}'

# Routes to: llama-3.1-8b-instant (PRIMARY/Groq)
# Reason: Moderate complexity, optimize for speed & cost
```

### Complex Query → Primary+ Tier
```bash
curl -X POST .../api/route \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Analyze the economic implications of quantum computing on current encryption standards and propose mitigation strategies"}'

# Routes to: llama-3.3-70b-versatile (PRIMARY/Groq)
# Reason: Complex, multi-step reasoning required
```

## 💡 Force Specific Tier

```bash
# Force Edge tier
curl -X POST .../api/route \
  -d '{"prompt": "Complex query", "tier": "edge"}'

# Force Flagship tier
curl -X POST .../api/route \
  -d '{"prompt": "Simple query", "tier": "flagship"}'
```

## 🔑 Adding API Keys (For Real Inference)

To enable real AI inference, add API keys to `.dev.vars`:

```bash
# v2/.dev.vars
GROQ_API_KEY=gsk_xxx...
OPENAI_API_KEY=sk-xxx...
```

Then use the chat endpoint:

```bash
curl -X POST .../api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is AI orchestration?"}'
```

## 📖 Full Documentation

- **[Complete README](README.md)** - Full feature documentation
- **[Phase 1 Report](../docs/PHASE1_COMPLETE.md)** - Implementation details
- **[Complete Roadmap](../docs/HARPOON_V2_COMPLETE_ROADMAP.md)** - Future plans

## 🎬 For HostedAI Meeting (Dec 11th)

**Demo Flow**:

1. **Show Homepage** → Beautiful UI
2. **List Models** → 10 models across 3 tiers
3. **Preview Routing** → Smart complexity analysis
4. **Show Metrics** → Speed & cost comparison
5. **Discuss Integration** → HostedAI GPU pools

**Key Points**:

- ✅ 95-99% cost reduction
- ✅ 4x-20x faster inference  
- ✅ Automatic model selection
- ✅ Production-ready architecture
- ✅ Cloudflare-native design

## 🔗 Links

- **Live Demo**: https://3000-i7tdn5pzeobka2ioncxfo-a402f90a.sandbox.novita.ai
- **GitHub**: https://github.com/prompted365/harpoon-poc-edition
- **Docs**: /docs/HARPOON_V2_COMPLETE_ROADMAP.md

---

**Status**: ✅ Phase 1 Complete  
**Next**: Add API keys → Real inference → HostedAI integration  
**Ready for**: Dec 11th demo ✅
