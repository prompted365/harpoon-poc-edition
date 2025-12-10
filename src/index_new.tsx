/**
 * Harpoon v2 - Next-Gen AI Orchestration
 * Cloudflare Workers + Hono + Multi-Provider AI + Agents SDK
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { Env } from './types';
import type { AgentEnv } from './agents/types';
import { AIClient } from './ai-client';
import { UnifiedAIClient } from './ai-client-unified';
import { SmartRouter } from './router';
import { MODEL_REGISTRY, getModelById, getModelsByProvider, getModelsByTier } from './models';
import {
  ParallelizationPattern,
  OrchestratorWorkersPattern,
  EvaluatorOptimizerPattern,
  SmartRouterPattern
} from './orchestration/patterns';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use('/api/*', cors());

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }));

