/**
 * Harpoon v2 Agent Types
 * Type definitions for dual-orchestrator architecture with sub-agents
 */

import type { Message } from 'ai';
import type { Env as BaseEnv } from '../types';

// Extended environment for agents
export interface AgentEnv extends BaseEnv {
  // Durable Object bindings
  MEDIATOR: DurableObjectNamespace;
  ORCHESTRATOR: DurableObjectNamespace;
  SUB_AGENT: DurableObjectNamespace;
  
  // Additional bindings for agents
  AGENTS_DB?: D1Database;
}

// Covenant Framework: Social contract between user intent and system execution
export interface Covenant {
  id: string;
  userId: string;
  intent: string; // User's natural language intent
  requirements: string[]; // Parsed requirements
  constraints: {
    maxCost?: number;
    maxLatency?: number;
    requiredQuality?: 'fast' | 'balanced' | 'quality';
  };
  state: {
    current: 'draft' | 'analyzing' | 'executing' | 'completed' | 'failed';
    progress: number; // 0-100
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
    quality: number; // 0-1
    evaluation: string;
  };
  createdAt: string;
  completedAt?: string;
}

// Sub-Agent types
export type SubAgentRole = 
  | 'classifier'    // Request classification
  | 'router'        // Model routing
  | 'executor'      // Execute AI requests
  | 'evaluator'     // Quality evaluation (Oracle)
  | 'coordinator';  // Coordinate multiple operations

export interface SubAgentTask {
  id: string;
  role: SubAgentRole;
  covenantId: string;
  payload: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

// Anchor-Winch Mechanics: Track dependencies and pull distributed work
export interface Anchor {
  id: string;
  covenantId: string;
  dependencies: string[]; // Task IDs that must complete first
  status: 'waiting' | 'ready' | 'pulling' | 'completed';
  winchProgress: number; // 0-100
}

export interface WinchResult {
  anchorId: string;
  gatheredResults: any[];
  synthesizedOutput: any;
  quality: number;
}

// Hook Patterns: Gateways, holding patterns, checkpoints
export interface Hook {
  id: string;
  type: 'gateway' | 'holding' | 'checkpoint';
  covenantId: string;
  condition: string; // Condition to evaluate
  onPass: string; // Next step if condition passes
  onFail: string; // Next step if condition fails
  status: 'active' | 'passed' | 'failed';
}

// Mediator State: Fast, user-facing responses
export interface MediatorState {
  userId: string;
  activeCovenants: string[];
  conversationHistory: Message[];
  uiOptimizations: {
    pendingUpdates: any[];
    backgroundTasks: string[];
  };
  performance: {
    avgResponseTime: number;
    successRate: number;
  };
}

// Orchestrator State: Complex execution engine
export interface OrchestratorState {
  activeCovenants: Covenant[];
  subAgentPool: {
    [role: string]: {
      available: number;
      busy: number;
      tasks: SubAgentTask[];
    };
  };
  anchors: Anchor[];
  hooks: Hook[];
  metrics: {
    totalCovenants: number;
    completedCovenants: number;
    avgExecutionTime: number;
    totalCost: number;
  };
}

// Messages between agents
export interface AgentMessage {
  type: 
    | 'covenant_created'
    | 'covenant_updated'
    | 'task_assigned'
    | 'task_completed'
    | 'anchor_ready'
    | 'winch_pull'
    | 'hook_triggered'
    | 'evaluation_complete';
  from: 'mediator' | 'orchestrator' | 'sub-agent';
  to: 'mediator' | 'orchestrator' | 'sub-agent';
  payload: any;
  timestamp: string;
}

// Oracle Evaluation: Deep quality assessment
export interface OracleEvaluation {
  covenantId: string;
  taskId: string;
  dimensions: {
    accuracy: number; // 0-1
    completeness: number; // 0-1
    coherence: number; // 0-1
    relevance: number; // 0-1
  };
  overallQuality: number; // 0-1
  feedback: string;
  recommendations: string[];
  timestamp: string;
}

// Swarm Coordination
export interface SwarmOperation {
  id: string;
  covenantId: string;
  agents: {
    role: SubAgentRole;
    taskId: string;
    status: 'assigned' | 'running' | 'completed' | 'failed';
  }[];
  coordination: {
    parallel: boolean;
    dependencies: { [taskId: string]: string[] };
  };
  startedAt: string;
  completedAt?: string;
}
