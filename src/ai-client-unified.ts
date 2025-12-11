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
   * Call provider-specific endpoint with BYOK
   * BYOK = Keys already stored in Cloudflare AI Gateway Dashboard
   * Use cf-aig-authorization header, NOT Authorization header
   */
  private async callUnifiedEndpoint(
    request: AIRequest,
    modelId: string,
    provider: AIProvider
  ): Promise<any> {
    // Provider-specific endpoints (BYOK format)
    // https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/{provider}/chat/completions
    const providerEndpoints: Record<AIProvider, string> = {
      'groq': `https://gateway.ai.cloudflare.com/v1/${this.env.CLOUDFLARE_ACCOUNT_ID}/${this.env.AI_GATEWAY_ID}/groq/chat/completions`,
      'openai': `https://gateway.ai.cloudflare.com/v1/${this.env.CLOUDFLARE_ACCOUNT_ID}/${this.env.AI_GATEWAY_ID}/openai/chat/completions`,
      'workers-ai': `https://gateway.ai.cloudflare.com/v1/${this.env.CLOUDFLARE_ACCOUNT_ID}/${this.env.AI_GATEWAY_ID}/workers-ai/v1/chat/completions`,
      'google-ai-studio': `https://gateway.ai.cloudflare.com/v1/${this.env.CLOUDFLARE_ACCOUNT_ID}/${this.env.AI_GATEWAY_ID}/google-ai-studio/v1beta/chat/completions`
    };
    
    const url = providerEndpoints[provider];
    
    // Strip provider prefix from model ID for provider-specific endpoints
    // e.g., "groq/qwen/qwen3-32b" → "qwen/qwen3-32b" when calling groq endpoint
    const modelIdWithoutPrefix = modelId.startsWith(`${provider}/`) 
      ? modelId.substring(`${provider}/`.length) 
      : modelId;
    
    // Build headers - CRITICAL: Use cf-aig-authorization for AI Gateway
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'cf-aig-authorization': `Bearer ${this.env.AI_GATEWAY_TOKEN || ''}`
    };
    
    console.log(`🌐 Calling ${provider} via AI Gateway: ${modelIdWithoutPrefix}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelIdWithoutPrefix,
        messages: [{ role: 'user', content: request.prompt }],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 1024,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`${provider} API error (${response.status}):`, error);
      throw new Error(`${provider} API error: ${error}`);
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
