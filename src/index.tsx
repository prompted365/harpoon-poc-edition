/**
 * Harpoon v2 - Next-Gen AI Orchestration
 * Cloudflare Workers + Hono + Multi-Provider AI + Agents SDK
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { readFileSync } from 'fs';
import { join } from 'path';
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

// Serve static files (simple approach for Node.js dev mode)
app.get('/static/:file{.+}', (c) => {
  try {
    const file = c.req.param('file');
    const filePath = join(process.cwd(), 'public', file);
    const content = readFileSync(filePath, 'utf-8');
    
    // Set content type based on extension
    const ext = file.split('.').pop();
    const contentTypes: Record<string, string> = {
      'js': 'application/javascript',
      'css': 'text/css',
      'html': 'text/html',
      'json': 'application/json'
    };
    
    return c.text(content, 200, {
      'Content-Type': contentTypes[ext || 'txt'] || 'text/plain'
    });
  } catch (error) {
    return c.text('File not found', 404);
  }
});

// Health check endpoint
app.get('/api/health', async (c) => {
  try {
    const client = new UnifiedAIClient(c.env);
    const health = await client.healthCheck();
    
    return c.json({
      status: 'ok',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      providers: health.providers
    });
  } catch (error: any) {
    return c.json({
      status: 'error',
      error: error.message
    }, 500);
  }
});

// Models catalog endpoint
app.get('/api/models', (c) => {
  const provider = c.req.query('provider');
  const tier = c.req.query('tier');

  let models = MODEL_REGISTRY;
  
  if (provider) {
    models = getModelsByProvider(provider);
  }
  
  if (tier) {
    models = getModelsByTier(tier);
  }

  return c.json({
    total: models.length,
    models: models
  });
});

// Get specific model details
app.get('/api/models/:id', (c) => {
  const modelId = c.req.param('id');
  const model = getModelById(modelId);

  if (!model) {
    return c.json({ error: 'Model not found' }, 404);
  }

  return c.json(model);
});

// Smart routing decision endpoint (preview)
app.post('/api/route', async (c) => {
  try {
    const body = await c.req.json();
    const router = new SmartRouter();
    
    const decision = router.routeRequest({
      prompt: body.prompt,
      model: body.model,
      tier: body.tier
    });

    return c.json({
      decision,
      explanation: router.explainRouting(decision)
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Main chat completion endpoint
app.post('/api/chat', async (c) => {
  try {
    const body = await c.req.json();
    
    // Validate request
    if (!body.prompt) {
      return c.json({ error: 'Prompt is required' }, 400);
    }

    // Smart routing
    const router = new SmartRouter();
    const routing = router.routeRequest({
      prompt: body.prompt,
      model: body.model,
      tier: body.tier,
      temperature: body.temperature,
      max_tokens: body.max_tokens
    });

    // Execute AI request using unified endpoint
    const client = new UnifiedAIClient(c.env);
    const response = await client.chat({
      prompt: body.prompt,
      model: routing.selected_model.id,
      temperature: body.temperature,
      max_tokens: body.max_tokens
    });

    return c.json({
      ...response,
      routing: {
        decision: routing.selected_model.id,
        reasoning: routing.reasoning
      }
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return c.json({ 
      error: error.message,
      details: error.stack
    }, 500);
  }
});

// Batch processing endpoint
app.post('/api/batch', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!Array.isArray(body.requests)) {
      return c.json({ error: 'requests array is required' }, 400);
    }

    const client = new UnifiedAIClient(c.env);
    const router = new SmartRouter();

    const results = await Promise.all(
      body.requests.map(async (req: any) => {
        try {
          const routing = router.routeRequest(req);
          const response = await client.chat({
            prompt: req.prompt,
            model: routing.selected_model.id,
            temperature: req.temperature,
            max_tokens: req.max_tokens
          });
          return { success: true, ...response };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      })
    );

    return c.json({
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// ORCHESTRATION PATTERNS
// Advanced AI coordination patterns
// ========================================

// Pattern 1: Parallelization - Execute multiple tasks simultaneously
app.post('/api/orchestrate/parallel', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!Array.isArray(body.requests)) {
      return c.json({ error: 'requests array is required' }, 400);
    }

    const client = new UnifiedAIClient(c.env);
    const pattern = new ParallelizationPattern(client);
    
    const result = await pattern.execute(body.requests);
    
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Pattern 2: Orchestrator-Workers - Delegate tasks to specialized workers
app.post('/api/orchestrate/workers', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.prompt) {
      return c.json({ error: 'prompt is required' }, 400);
    }

    const client = new UnifiedAIClient(c.env);
    const pattern = new OrchestratorWorkersPattern(
      client,
      body.orchestrator_model,
      body.worker_model
    );
    
    const result = await pattern.execute(body.prompt, body.context);
    
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Pattern 3: Evaluator-Optimizer - Iterative quality improvement
app.post('/api/orchestrate/optimize', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.task) {
      return c.json({ error: 'task is required' }, 400);
    }

    const client = new UnifiedAIClient(c.env);
    const pattern = new EvaluatorOptimizerPattern(
      client,
      body.generator_model,
      body.evaluator_model,
      body.max_iterations
    );
    
    const result = await pattern.execute(body.task, body.quality_threshold || 8.0);
    
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Pattern 4: Smart Router with Fallback
app.post('/api/orchestrate/smart', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.prompt) {
      return c.json({ error: 'prompt is required' }, 400);
    }

    const client = new UnifiedAIClient(c.env);
    const router = new SmartRouter();
    const pattern = new SmartRouterPattern(client, router);
    
    const result = await pattern.execute(body.prompt, body.preferences);
    
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// AGENTS SDK ROUTES (Production Only)
// For development, these return 503
// For production deployment, use worker.ts
// ========================================

app.get('/api/agents/status', (c) => {
  return c.json({
    agents_enabled: false,
    mode: 'development',
    message: 'Agents SDK is only available in Cloudflare Workers production deployment',
    recommendation: 'Use orchestration patterns (/api/orchestrate/*) for similar functionality'
  });
});

// Root route - Serve the minimal UI
app.get('/', (c) => {
  try {
    const htmlPath = join(process.cwd(), 'public', 'index.html');
    const html = readFileSync(htmlPath, 'utf-8');
    return c.html(html);
  } catch (error) {
    return c.text('UI not found', 404);
  }
});

export default app;
