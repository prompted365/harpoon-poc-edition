/**
 * Type definitions for Agents SDK
 */

export interface AgentEnv {
  MEDIATOR: DurableObjectNamespace;
  ORCHESTRATOR: DurableObjectNamespace;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_TOKEN?: string;
  WORKERS_AI_TOKEN?: string;
  GROQ_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

export interface Covenant {
  id: string;
  user_intent: string;
  constraints: {
    cost: number;
    latency: number;
    quality: number;
  };
  status: 'draft' | 'active' | 'completed';
  mediator_decision: string;
  orchestration_plan?: string;
  created_at: string;
  completed_at?: string;
}

export interface SubAgent {
  id: string;
  type: string;
  role: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  thoughts: string;
  actions: string[];
  output: string | null;
  children: SubAgent[];
  created_at: string;
  completed_at?: string;
}

export interface Task {
  id: string;
  covenant_id: string;
  prompt: string;
  plan: SubAgent[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result: any;
  created_at: string;
  completed_at?: string;
}

export interface WebSocketMessage {
  type: 'covenant_update' | 'status_change' | 'agent_spawn' | 'agent_progress' | 
        'agent_complete' | 'task_start' | 'task_complete' | 'delegation' | 'error';
  data: any;
  timestamp: string;
}

export interface AgentMetrics {
  id: string;
  covenant_id: string;
  latency_ms: number;
  cost_usd: number;
  models_used: string[];
  success: boolean;
  created_at: string;
}
