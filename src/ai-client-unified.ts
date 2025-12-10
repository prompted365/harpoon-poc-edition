/**
 * Unified AI Client using Cloudflare AI Gateway /compat endpoint
 * Single endpoint for all providers: Groq, Workers AI, OpenAI
 */

import type { Env, AIRequest, AIResponse, AIProvider } from './types';
import { getModelById } from './models';

export class UnifiedAIClient {
  constructor(private env: Env) {}

  /**
   * Main inference method using unified /compat endpoint
   */
  async chat(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    // Get model info
    const model = getModelById(request.model || 'llama-3.1-8b-instant');
    if (!model) {
      throw new Error(`Model not found: ${request.model}`);
    }

    const provider = request.provider || model.provider;

    try {
      const result = await this.callUnifiedEndpoint(request, model.id, provider);
      
      const endTime = Date.now();
      const latency = endTime - startTime;

      return {
        content: result.content,
        model: model.id,
        provider: provider,
        tier: model.tier,
        usage: result.usage,
        performance: {
          latency_ms: latency,
          tokens_per_second: result.usage.completion_tokens / (latency / 1000)
        },
        cost: {
          amount: (result.usage.total_tokens / 1000000) * model.costPer1M,
          currency: 'USD'
        }
      };
    } catch (error: any) {
      console.error(`Unified AI Client Error (${provider}):`, error);
      throw new Error(`${provider} error: ${error.message}`);
    }
  }

  /**
   * Call unified OpenAI-compatible endpoint
   * https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/compat/chat/completions
   */
  private async callUnifiedEndpoint(
    request: AIRequest,
    modelId: string,
    provider: AIProvider
  ): Promise<any> {
    // Unified endpoint
    const url = `https://gateway.ai.cloudflare.com/v1/${this.env.CLOUDFLARE_ACCOUNT_ID}/${this.env.AI_GATEWAY_ID}/compat/chat/completions`;
    
    // Map our provider names to gateway format
    const providerModelMap: Record<AIProvider, string> = {
      'groq': `groq/${modelId}`,
      'workers-ai': `workers-ai/${modelId}`,
      'openai': `openai/${modelId}`
    };
    
    const unifiedModel = providerModelMap[provider] || modelId;
    
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // CRITICAL: Use cf-aig-authorization with AI Gateway token
    if (this.env.AI_GATEWAY_TOKEN && this.env.AI_GATEWAY_TOKEN !== 'your-gateway-token-here') {
      headers['cf-aig-authorization'] = `Bearer ${this.env.AI_GATEWAY_TOKEN}`;
    }
    
    // If provider keys are stored in Cloudflare (BYOK), we don't need Authorization header
    // If not using BYOK, add provider API key
    if (provider === 'groq' && this.env.GROQ_API_KEY && this.env.GROQ_API_KEY !== 'your-groq-api-key-here') {
      headers['Authorization'] = `Bearer ${this.env.GROQ_API_KEY}`;
    } else if (provider === 'openai' && this.env.OPENAI_API_KEY && this.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      headers['Authorization'] = `Bearer ${this.env.OPENAI_API_KEY}`;
    } else if (provider === 'workers-ai' && this.env.WORKERS_AI_TOKEN && this.env.WORKERS_AI_TOKEN !== 'your-workers-ai-token-here') {
      headers['Authorization'] = `Bearer ${this.env.WORKERS_AI_TOKEN}`;
    }
    
    console.log(`🌐 Calling unified endpoint: ${unifiedModel}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: unifiedModel,
        messages: [{ role: 'user', content: request.prompt }],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 1024,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Unified API error (${response.status}):`, error);
      throw new Error(`Unified API error: ${error}`);
    }

    const data = await response.json();
    
    // OpenAI-compatible response format
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  }

  /**
   * Health check for unified endpoint
   */
  async healthCheck(): Promise<any> {
    const url = `https://gateway.ai.cloudflare.com/v1/${this.env.CLOUDFLARE_ACCOUNT_ID}/${this.env.AI_GATEWAY_ID}/compat/chat/completions`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.env.AI_GATEWAY_TOKEN) {
      headers['cf-aig-authorization'] = `Bearer ${this.env.AI_GATEWAY_TOKEN}`;
    }
    
    try {
      // Quick test with a simple model
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'groq/llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5
        })
      });
      
      return {
        status: response.ok ? 'healthy' : 'degraded',
        providers: {
          groq: { available: response.ok, latency_ms: 0 },
          'workers-ai': { available: true, latency_ms: 0 },
          openai: { available: true, latency_ms: 0 }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        status: 'degraded',
        providers: {
          groq: { available: false, error: error.message },
          'workers-ai': { available: false },
          openai: { available: false }
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}
