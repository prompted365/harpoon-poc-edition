/**
 * Harpoon v2 Model Registry
 * Complete catalog of available AI models across all providers
 */

import type { ModelConfig } from './types';

export const MODEL_REGISTRY: ModelConfig[] = [
  // TIER 1: PRIMARY - Groq Models (Ultra-fast, cost-effective)
  {
    id: 'llama-3.1-8b-instant',
    provider: 'groq',
    tier: 'primary',
    speed: 560,
    costPer1M: 0.05,
    contextWindow: 131072,
    capabilities: ['chat', 'code', 'reasoning', 'function-calling'],
    description: '560 T/sec Llama 3.1 8B - Lightning fast for simple tasks'
  },
  {
    id: 'llama-3.3-70b-versatile',
    provider: 'groq',
    tier: 'primary',
    speed: 280,
    costPer1M: 0.59,
    contextWindow: 131072,
    capabilities: ['chat', 'code', 'reasoning', 'complex-tasks', 'function-calling'],
    description: '280 T/sec Llama 3.3 70B - Balanced power and speed'
  },
  {
    id: 'openai/gpt-oss-20b',
    provider: 'groq',
    tier: 'primary',
    speed: 1000,
    costPer1M: 0.075,
    contextWindow: 131072,
    capabilities: ['chat', 'code', 'reasoning', 'function-calling'],
    description: '1000 T/sec GPT OSS 20B - Blazing fast open model'
  },
  {
    id: 'openai/gpt-oss-120b',
    provider: 'groq',
    tier: 'primary',
    speed: 500,
    costPer1M: 0.15,
    contextWindow: 131072,
    capabilities: ['chat', 'code', 'reasoning', 'complex-tasks', 'function-calling'],
    description: '500 T/sec GPT OSS 120B - High-power open model'
  },
  {
    id: 'qwen/qwen3-32b',
    provider: 'groq',
    tier: 'primary',
    speed: 450,
    costPer1M: 0.10,
    contextWindow: 131072,
    capabilities: ['chat', 'code', 'multilingual', 'reasoning'],
    description: '450 T/sec Qwen3 32B - Excellent multilingual support'
  },

  // TIER 2: EDGE - Cloudflare Workers AI (Ultra-low latency)
  {
    id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    provider: 'workers-ai',
    tier: 'edge',
    speed: 200,
    costPer1M: 0.011,
    contextWindow: 8192,
    capabilities: ['chat', 'code', 'reasoning'],
    description: 'Edge-optimized Llama 3.3 70B - Ultra-low latency'
  },
  {
    id: '@cf/meta/llama-3.1-8b-instruct-fast',
    provider: 'workers-ai',
    tier: 'edge',
    speed: 400,
    costPer1M: 0.011,
    contextWindow: 8192,
    capabilities: ['chat', 'code', 'simple-tasks'],
    description: 'Edge-optimized Llama 3.1 8B - Instant responses'
  },
  {
    id: '@cf/qwen/qwen2.5-7b-instruct-awq',
    provider: 'workers-ai',
    tier: 'edge',
    speed: 350,
    costPer1M: 0.011,
    contextWindow: 32768,
    capabilities: ['chat', 'code', 'multilingual'],
    description: 'Edge-optimized Qwen 2.5 7B - Great for multilingual'
  },

  // TIER 3: FLAGSHIP - OpenAI (Highest quality)
  {
    id: 'gpt-4o',
    provider: 'openai',
    tier: 'flagship',
    speed: 50,
    costPer1M: 2.50,
    contextWindow: 128000,
    capabilities: ['chat', 'code', 'reasoning', 'complex-tasks', 'vision', 'function-calling'],
    description: 'GPT-4o - Flagship multimodal model'
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    tier: 'flagship',
    speed: 100,
    costPer1M: 0.15,
    contextWindow: 128000,
    capabilities: ['chat', 'code', 'reasoning', 'function-calling'],
    description: 'GPT-4o Mini - Cost-effective flagship model'
  }
];

// Helper functions
export function getModelById(modelId: string): ModelConfig | undefined {
  return MODEL_REGISTRY.find(m => m.id === modelId);
}

export function getModelsByProvider(provider: string): ModelConfig[] {
  return MODEL_REGISTRY.filter(m => m.provider === provider);
}

export function getModelsByTier(tier: string): ModelConfig[] {
  return MODEL_REGISTRY.filter(m => m.tier === tier);
}

export function getDefaultModel(tier: string = 'primary'): ModelConfig {
  const models = getModelsByTier(tier);
  return models[0] || MODEL_REGISTRY[0];
}
