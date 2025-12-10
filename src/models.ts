/**
 * Harpoon v2 Model Registry
 * Complete catalog of available AI models across all providers
 */

import type { ModelConfig } from './types';

export const MODEL_REGISTRY: ModelConfig[] = [
  // TIER 1: PRIMARY - Groq Models (Ultra-fast, cost-effective)
  // Using confirmed working model: groq/qwen/qwen3-32b
  {
    id: 'groq/qwen/qwen3-32b',
    provider: 'groq',
    tier: 'primary',
    speed: 450,
    costPer1M: 0.10,
    contextWindow: 131072,
    capabilities: ['chat', 'code', 'reasoning', 'complex-tasks', 'multilingual'],
    description: '450 T/sec Qwen3 32B - Excellent multilingual, fast and cost-effective'
  },
  
  // FREE MODELS - Google AI Studio
  {
    id: 'google-ai-studio/gemma-3-1b-it:free',
    provider: 'google-ai-studio',
    tier: 'edge',
    speed: 300,
    costPer1M: 0,
    contextWindow: 8192,
    capabilities: ['chat', 'code', 'simple-tasks'],
    description: 'Gemma 3 1B - FREE Google model'
  },

  // TIER 2: EDGE - Workers AI (Cloudflare's built-in AI)
  {
    id: 'workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    provider: 'workers-ai',
    tier: 'edge',
    speed: 200,
    costPer1M: 0.011,
    contextWindow: 8192,
    capabilities: ['chat', 'code', 'reasoning'],
    description: 'Edge-optimized Llama 3.3 70B - Ultra-low latency'
  },
  {
    id: 'workers-ai/@cf/meta/llama-3.1-8b-instruct-fast',
    provider: 'workers-ai',
    tier: 'edge',
    speed: 400,
    costPer1M: 0.011,
    contextWindow: 8192,
    capabilities: ['chat', 'code', 'simple-tasks'],
    description: 'Edge-optimized Llama 3.1 8B - Instant responses'
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
