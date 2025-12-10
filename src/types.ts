/**
 * Harpoon v2 Type Definitions
 * Multi-provider AI orchestration types
 */

// Environment bindings
export interface Env {
  AI: any; // Cloudflare Workers AI binding
  CLOUDFLARE_ACCOUNT_ID: string;
  AI_GATEWAY_ID: string;
  AI_GATEWAY_TOKEN: string;
  WORKERS_AI_TOKEN: string;
  GROQ_API_KEY: string;
  OPENAI_API_KEY: string;
  AI_GATEWAY_BASE_URL: string;
  GROQ_GATEWAY_URL: string;
  OPENAI_GATEWAY_URL: string;
}

// AI Provider Types
export type AIProvider = 'groq' | 'workers-ai' | 'openai' | 'google-ai-studio';

export type ModelTier = 'primary' | 'edge' | 'flagship';

// Model Definitions
export interface ModelConfig {
  id: string;
  provider: AIProvider;
  tier: ModelTier;
  speed: number; // tokens per second
  costPer1M: number; // cost per 1M tokens
  contextWindow: number;
  capabilities: string[];
  description: string;
}

// Request/Response Types
export interface AIRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  provider?: AIProvider;
  tier?: ModelTier;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: AIProvider;
  tier: ModelTier;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  performance: {
    latency_ms: number;
    tokens_per_second: number;
  };
  cost: {
    amount: number;
    currency: string;
  };
}

// Classification Types
export interface ClassificationResult {
  complexity: 'simple' | 'moderate' | 'complex' | 'flagship';
  confidence: number;
  recommended_tier: ModelTier;
  recommended_model: string;
  reasoning: string;
}

// Smart Routing Types
export interface RoutingDecision {
  selected_model: ModelConfig;
  fallback_models: ModelConfig[];
  reasoning: string;
  estimated_cost: number;
  estimated_latency: number;
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  providers: {
    [key in AIProvider]: {
      available: boolean;
      latency_ms?: number;
      error?: string;
    };
  };
  timestamp: string;
}

// Error Types
export interface AIError {
  code: string;
  message: string;
  provider?: AIProvider;
  model?: string;
  retryable: boolean;
}
