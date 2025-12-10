/**
 * Harpoon v2 Multi-Provider AI Client
 * Unified interface for Groq (via AI Gateway), Workers AI, and OpenAI (via AI Gateway)
 */

import type { Env, AIRequest, AIResponse, AIProvider } from './types';
import { getModelById } from './models';

export class AIClient {
  constructor(private env: Env) {}

  /**
   * Main inference method - routes to appropriate provider
   */
  async chat(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    // Determine which provider to use
    const model = getModelById(request.model || 'llama-3.1-8b-instant');
    if (!model) {
      throw new Error(`Model not found: ${request.model}`);
    }

    const provider = request.provider || model.provider;

    try {
      let result;
      switch (provider) {
        case 'groq':
          result = await this.callGroq(request, model.id);
          break;
        case 'workers-ai':
          result = await this.callWorkersAI(request, model.id);
          break;
        case 'openai':
          result = await this.callOpenAI(request, model.id);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

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
      console.error(`AI Client Error (${provider}):`, error);
      throw new Error(`${provider} error: ${error.message}`);
    }
  }

  /**
   * Call Groq via AI Gateway
   */
  private async callGroq(request: AIRequest, modelId: string): Promise<any> {
    // Groq endpoint: https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/groq/chat/completions
    const url = `https://gateway.ai.cloudflare.com/v1/${this.env.CLOUDFLARE_ACCOUNT_ID}/${this.env.AI_GATEWAY_ID}/groq/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: request.prompt }],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 1024,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  }

  /**
   * Call Cloudflare Workers AI (via REST API)
   */
  private async callWorkersAI(request: AIRequest, modelId: string): Promise<any> {
    // Use REST API for Workers AI
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${modelId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.WORKERS_AI_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: request.prompt,
        max_tokens: request.max_tokens ?? 1024
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Workers AI error: ${error}`);
    }

    const data = await response.json();
    
    // Workers AI returns different format
    return {
      content: data.result?.response || data.result?.text || '',
      usage: {
        prompt_tokens: 0, // Workers AI doesn't return token counts
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  }

  /**
   * Call OpenAI via AI Gateway
   */
  private async callOpenAI(request: AIRequest, modelId: string): Promise<any> {
    // OpenAI endpoint: https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/openai/chat/completions
    const url = `https://gateway.ai.cloudflare.com/v1/${this.env.CLOUDFLARE_ACCOUNT_ID}/${this.env.AI_GATEWAY_ID}/openai/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: request.prompt }],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 1024,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  }

  /**
   * Health check for all providers
   */
  async healthCheck(): Promise<any> {
    const checks = await Promise.allSettled([
      this.checkGroq(),
      this.checkWorkersAI(),
      this.checkOpenAI()
    ]);

    return {
      status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded',
      providers: {
        groq: checks[0].status === 'fulfilled' ? checks[0].value : { available: false, error: (checks[0] as any).reason },
        'workers-ai': checks[1].status === 'fulfilled' ? checks[1].value : { available: false, error: (checks[1] as any).reason },
        openai: checks[2].status === 'fulfilled' ? checks[2].value : { available: false, error: (checks[2] as any).reason }
      },
      timestamp: new Date().toISOString()
    };
  }

  private async checkGroq() {
    const start = Date.now();
    try {
      await this.callGroq({ prompt: 'test' }, 'llama-3.1-8b-instant');
      return { available: true, latency_ms: Date.now() - start };
    } catch (error: any) {
      return { available: false, error: error.message };
    }
  }

  private async checkWorkersAI() {
    const start = Date.now();
    try {
      await this.callWorkersAI({ prompt: 'test' }, '@cf/meta/llama-3.1-8b-instruct-fast');
      return { available: true, latency_ms: Date.now() - start };
    } catch (error: any) {
      return { available: false, error: error.message };
    }
  }

  private async checkOpenAI() {
    const start = Date.now();
    try {
      await this.callOpenAI({ prompt: 'test' }, 'gpt-4o-mini');
      return { available: true, latency_ms: Date.now() - start };
    } catch (error: any) {
      return { available: false, error: error.message };
    }
  }
}
