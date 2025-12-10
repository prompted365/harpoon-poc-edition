/**
 * Type definitions for Agents SDK
 */

export interface AgentEnv {
  MEDIATOR: DurableObjectNamespace;
  ORCHESTRATOR: DurableObjectNamespace;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_TOKEN?: string;
  AI_GATEWAY_BASE_URL?: string;
  AI_GATEWAY_COMPAT_URL?: string;
  WORKERS_AI_TOKEN?: string;
  GROQ_API_KEY?: string;
  OPENAI_API_KEY?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
}

// Comprehensive Covenant definition
export interface Covenant {
  id: string;
  userId: string;
  intent: string;
  requirements: string[];
  constraints: {
    maxCost: number;
    maxLatency: number;
    requiredQuality: 'speed' | 'balanced' | 'quality';
    maxTokens?: number;
  };
  state: {
    current: 'draft' | 'analyzing' | 'delegated_to_orchestrator' | 'executing' | 'completed' | 'failed';
    progress: number;
    lastUpdate: string;
  };
  execution: {
    selectedModels: string[];
    estimatedCost: number;
    estimatedTime: number;
    actualCost?: number;
    actualTime?: number;
  };
  results?: {
    outputs: any[];
    quality: number;
    evaluation: string;
    swarmMetrics?: {
      totalSubAgents: number;
      executionTime: number;
      parallelization: boolean;
    };
  };
  createdAt: string;
  completedAt?: string;
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

// Expanded WebSocket message types
export interface WebSocketMessage {
  type: 'mediator_analysis' | 'covenant_created' | 'delegation_complete' | 'response_start' | 'response_complete' | 
        'covenant_update' | 'status_change' | 'agent_spawn' | 'agent_progress' | 
        'agent_complete' | 'task_start' | 'task_complete' | 'delegation' | 'delegation_error' | 'error';
  data: any;
  timestamp?: string;
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

// Sub-Agent Types
export type SubAgentRole = 'classifier' | 'router' | 'executor' | 'evaluator' | 'coordinator';

export interface SubAgentTask {
  id: string;
  role: SubAgentRole;
  covenantId: string;
  payload: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  result?: any;
  error?: string;
}

// Mediator State
export interface MediatorState {
  userId: string;
  activeCovenants: string[];
  conversationHistory: Array<{ role: string; content: string }>;
  uiOptimizations: {
    pendingUpdates: any[];
    backgroundTasks: any[];
  };
  performance: {
    avgResponseTime: number;
    successRate: number;
  };
}

// Orchestrator State
export interface OrchestratorState {
  activeCovenants: Covenant[];
  subAgentPool: Record<SubAgentRole, {
    available: number;
    busy: number;
    tasks: SubAgentTask[];
  }>;
  anchors: Anchor[];
  hooks: Hook[];
  metrics: {
    totalCovenants: number;
    completedCovenants: number;
    avgExecutionTime: number;
    totalCost: number;
  };
}

// Swarm Orchestration Types
export interface SwarmOperation {
  id: string;
  covenantId: string;
  agents: Array<{
    id: string;
    role: SubAgentRole;
    taskId: string;
    requirement?: string;
    parentContext?: any;
  }>;
  coordination: {
    parallel: boolean;
    dependencies: Record<string, string[]>;
  };
  startedAt: string;
  completedAt?: string;
}

// Anchor and Hook Types (from Harpoon-core)
export interface Anchor {
  id: string;
  covenantId: string;
  dependencies: string[];
  status: 'ready' | 'pulling' | 'complete';
  winchProgress: number;
}

export interface Hook {
  id: string;
  type: 'gateway' | 'holding' | 'checkpoint';
  covenantId: string;
  condition: string;
  status: 'active' | 'triggered' | 'released';
}

// Oracle Evaluation
export interface OracleEvaluation {
  covenantId: string;
  taskId: string;
  dimensions: {
    accuracy: number;
    completeness: number;
    coherence: number;
    relevance: number;
  };
  overallQuality: number;
  feedback: string;
  recommendations: string[];
  timestamp: string;
}

// Agent Message Type
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}
