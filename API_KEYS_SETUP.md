# 🔑 API Keys Setup Guide for Harpoon v2

## Overview

Harpoon v2 uses **Cloudflare AI Gateway** with a unified OpenAI-compatible endpoint to access multiple AI providers. You have two options for authentication:

1. **BYOK (Bring Your Own Keys)** - Store provider keys in Cloudflare AI Gateway (Recommended for production)
2. **Direct Keys** - Pass keys in requests (Good for development/testing)

## Current Configuration

Your Cloudflare AI Gateway is configured:
- **Account ID**: `824702a2f59c9132af79667ba5f92192`
- **Gateway ID**: `cf-gateway`
- **Gateway Token**: `QcoTKOOff8k0jLWIwFc84p48txA2-qm6LYwUVzqJ`
- **Workers AI Token**: `Ds22ScuRCCTHYw-JLXNE7UaR3Qc3TwnTi1zCNl9d`

## Option 1: BYOK (Store Keys in Cloudflare) ⭐ RECOMMENDED

### Why BYOK?
- ✅ Keys never exposed in requests
- ✅ Centralized key management
- ✅ Easy rotation and updates
- ✅ Works seamlessly with AI Gateway

### How to Set Up BYOK

1. **Go to Cloudflare Dashboard**
   ```
   https://dash.cloudflare.com/
   ```

2. **Navigate to AI Gateway**
   - Workers & Pages → AI Gateway → cf-gateway

3. **Add Provider Keys**
   - Click "Settings" or "API Keys"
   - Add your Groq API key
   - Add your OpenAI API key

4. **Test the Setup**
   Once keys are stored in Cloudflare, your `.dev.vars` file only needs:
   ```bash
   # Cloudflare Configuration
   CLOUDFLARE_ACCOUNT_ID=824702a2f59c9132af79667ba5f92192
   AI_GATEWAY_ID=cf-gateway
   AI_GATEWAY_TOKEN=QcoTKOOff8k0jLWIwFc84p48txA2-qm6LYwUVzqJ
   WORKERS_AI_TOKEN=Ds22ScuRCCTHYw-JLXNE7UaR3Qc3TwnTi1zCNl9d
   
   # No need for these with BYOK:
   # GROQ_API_KEY=
   # OPENAI_API_KEY=
   ```

## Option 2: Direct Keys (Development)

### Get Your API Keys

#### Groq API Key
1. Visit: https://console.groq.com/keys
2. Sign in / Create account
3. Click "Create API Key"
4. Copy the key (starts with `gsk_`)

#### OpenAI API Key
1. Visit: https://platform.openai.com/api-keys
2. Sign in / Create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

### Add Keys to `.dev.vars`

Edit `/home/user/webapp/v2/.dev.vars`:

```bash
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=824702a2f59c9132af79667ba5f92192
CLOUDFLARE_API_TOKEN=8LycdDUKJ1kCrkyTcawwVQfln22tAXOMZ7agBI7z
AI_GATEWAY_ID=cf-gateway
AI_GATEWAY_TOKEN=QcoTKOOff8k0jLWIwFc84p48txA2-qm6LYwUVzqJ
WORKERS_AI_TOKEN=Ds22ScuRCCTHYw-JLXNE7UaR3Qc3TwnTi1zCNl9d

# Provider API Keys (Replace placeholders with real keys)
GROQ_API_KEY=gsk_your_actual_groq_key_here
OPENAI_API_KEY=sk-your_actual_openai_key_here

# AI Gateway URLs (Already configured)
AI_GATEWAY_BASE_URL=https://gateway.ai.cloudflare.com/v1/824702a2f59c9132af79667ba5f92192/cf-gateway
AI_GATEWAY_COMPAT_URL=https://gateway.ai.cloudflare.com/v1/824702a2f59c9132af79667ba5f92192/cf-gateway/compat/chat/completions
```

### Restart the Service

```bash
cd /home/user/webapp/v2
pm2 restart harpoon-v2
```

## Testing Your Setup

### 1. Health Check
```bash
curl http://localhost:3000/api/health | jq '.'
```

### 2. List Models
```bash
curl http://localhost:3000/api/models | jq '.total'
```

### 3. Test Chat (Workers AI - Always Available)
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Say hello",
    "tier": "edge"
  }' | jq '{content, model, latency: .performance.latency_ms}'
```

### 4. Test Chat (Groq - Requires API Key)
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing in one sentence",
    "tier": "primary"
  }' | jq '{content, model, cost: .cost.amount}'
```

### 5. Test Chat (OpenAI - Requires API Key)
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a haiku about AI",
    "tier": "flagship"
  }' | jq '{content, model}'
```

## Orchestration Patterns Testing

### 1. Parallelization (Batch Processing)
```bash
curl -X POST http://localhost:3000/api/orchestrate/parallel \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "messages": [{"role": "user", "content": "What is 2+2?"}],
        "model": "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast"
      },
      {
        "messages": [{"role": "user", "content": "What is 5*5?"}],
        "model": "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast"
      }
    ]
  }' | jq '.data.successful'
```

### 2. Orchestrator-Workers (Complex Workflows)
```bash
curl -X POST http://localhost:3000/api/orchestrate/workers \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Plan a 3-day trip to Tokyo with budget breakdown",
    "orchestrator_model": "openai/gpt-4o-mini",
    "worker_model": "groq/llama-3.1-8b-instant"
  }' | jq '.data.final_answer'
```

### 3. Evaluator-Optimizer (Quality Improvement)
```bash
curl -X POST http://localhost:3000/api/orchestrate/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Write a professional email apologizing for a delayed shipment",
    "quality_threshold": 8.5,
    "max_iterations": 3
  }' | jq '{final_score: .data.final_score, iterations: .data.iterations}'
```

## Troubleshooting

### "Unauthorized" Error
**Problem**: `{"error": "Unauthorized", "code": 2009}`

**Solutions**:
1. Check if API keys are correctly set in `.dev.vars`
2. Verify keys don't have extra spaces or quotes
3. For BYOK: Ensure keys are saved in Cloudflare AI Gateway dashboard
4. Restart service after updating keys: `pm2 restart harpoon-v2`

### Workers AI Works, Groq/OpenAI Don't
**This is expected!** Workers AI uses the `WORKERS_AI_TOKEN` which you already have. Groq and OpenAI require their specific API keys.

**Solution**: Add Groq and OpenAI API keys to `.dev.vars` OR use BYOK.

### All Providers Fail
**Problem**: Even Workers AI returns errors

**Solutions**:
1. Check AI Gateway authentication:
   ```bash
   curl -H "cf-aig-authorization: Bearer QcoTKOOff8k0jLWIwFc84p48txA2-qm6LYwUVzqJ" \
     https://gateway.ai.cloudflare.com/v1/824702a2f59c9132af79667ba5f92192/cf-gateway
   ```
2. Verify Cloudflare account and gateway are active
3. Check logs: `pm2 logs harpoon-v2 --nostream --lines 30`

## Cost Optimization Tips

### 1. Use Smart Routing (Automatic)
The system automatically selects the cheapest model that meets quality requirements:
- Simple queries → **Groq** (fastest, cheapest)
- Moderate queries → **Workers AI** (low latency, free tier available)
- Complex queries → **OpenAI** (highest quality)

### 2. Specify Tier for Cost Control
```bash
# Force cheapest tier (Groq)
curl -X POST http://localhost:3000/api/chat \
  -d '{"prompt": "...", "tier": "primary"}'

# Force free tier (Workers AI - with limits)
curl -X POST http://localhost:3000/api/chat \
  -d '{"prompt": "...", "tier": "edge"}'
```

### 3. Use Orchestration Patterns Wisely
- **Parallelization**: Process batch requests efficiently
- **Orchestrator-Workers**: Use cheap workers, smart orchestrator
- **Evaluator-Optimizer**: Set reasonable quality thresholds to avoid unnecessary iterations

## Cost Estimates

### Per-Request Cost (Approximate)
- **Groq (Primary)**: $0.00001 - $0.00010 per request
- **Workers AI (Edge)**: Free tier available, then ~$0.01 per 1000 requests
- **OpenAI (Flagship)**: $0.001 - $0.010 per request

### Monthly Cost Examples
**10,000 requests/month**:
- 100% Groq: **~$1-5**
- 100% Workers AI: **$0-10** (depending on free tier)
- 100% OpenAI: **~$100-200**
- Smart routing (mixed): **~$10-20** (95% savings vs OpenAI-only)

## Next Steps

1. ✅ **Choose your authentication method** (BYOK recommended)
2. ✅ **Add your API keys**
3. ✅ **Restart the service**: `pm2 restart harpoon-v2`
4. ✅ **Test the endpoints** using the examples above
5. ✅ **Explore orchestration patterns** for advanced use cases
6. ✅ **Monitor costs** using AI Gateway analytics

## Support

- **Cloudflare AI Gateway Docs**: https://developers.cloudflare.com/ai-gateway/
- **Groq API Docs**: https://console.groq.com/docs
- **OpenAI API Docs**: https://platform.openai.com/docs

---

**Ready to go?** Add your keys and restart! 🚀

```bash
# Quick start:
nano /home/user/webapp/v2/.dev.vars  # Add your keys
cd /home/user/webapp/v2 && pm2 restart harpoon-v2
curl http://localhost:3000/api/health | jq '.'
```
