/**
 * Harpoon v2 - Next-Gen AI Orchestration
 * Cloudflare Workers + Hono + Multi-Provider AI + Agents SDK
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Env } from './types';
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

// Export Durable Object classes for Cloudflare Workers
export { MediatorAgent } from './agents/mediator-agent';
export { OrchestratorAgent } from './agents/orchestrator-agent';

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
// AGENTS SDK ROUTES (Durable Objects + WebSocket)
// ========================================

// Mediator Agent WebSocket Connection
app.get('/api/agents/mediator/:userId/ws', async (c) => {
  const env = c.env as any;
  
  // Check if running in Cloudflare Workers (has DO bindings)
  if (!env.MEDIATOR) {
    return c.json({
      error: 'Durable Objects not available in development mode',
      message: 'Deploy to Cloudflare Pages for full agent functionality'
    }, 503);
  }

  const userId = c.req.param('userId');
  const id = env.MEDIATOR.idFromName(userId);
  const stub = env.MEDIATOR.get(id);
  
  return stub.fetch(c.req.raw);
});

// Full Orchestration: User → Mediator → Orchestrator Harmony
app.post('/api/orchestrate/full', async (c) => {
  const env = c.env as any;
  
  if (!env.MEDIATOR || !env.ORCHESTRATOR) {
    return c.json({ 
      success: false,
      error: 'Durable Objects not available',
      message: 'Deploy to Cloudflare Pages and configure DO bindings'
    }, 503);
  }

  try {
    const { prompt, userId = 'default' } = await c.req.json();
    
    console.log(`🚀 Full orchestration requested | User: ${userId} | Prompt: ${prompt.substring(0, 50)}...`);
    
    // Get Mediator Durable Object
    const mediatorId = env.MEDIATOR.idFromName(userId);
    const mediator = env.MEDIATOR.get(mediatorId);
    
    // Send prompt to Mediator - it will handle complexity analysis and delegation
    const mediatorResponse = await mediator.fetch(new Request('http://mediator/covenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: prompt,
        constraints: {
          maxCost: 0.50,
          maxLatency: 30000,
          requiredQuality: 'balanced'
        }
      })
    }));
    
    const covenant = await mediatorResponse.json();
    
    console.log(`✅ Covenant created: ${covenant.id} | Mediator will analyze and delegate`);
    
    return c.json({
      success: true,
      covenant,
      message: 'Mediator analyzing request - will delegate to Orchestrator Harmony if needed',
      flow: 'User → Mediator → Orchestrator Harmony → Sub-agents',
      websocket_available: true,
      websocket_url: `/api/agents/mediator/${userId}/ws`
    });
    
  } catch (error: any) {
    console.error('Full orchestration error:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// Mediator Agent REST API
app.post('/api/agents/mediator/:userId/covenant', async (c) => {
  const env = c.env as any;
  
  if (!env.MEDIATOR) {
    return c.json({ error: 'Durable Objects not available' }, 503);
  }

  const userId = c.req.param('userId');
  const id = env.MEDIATOR.idFromName(userId);
  const stub = env.MEDIATOR.get(id);
  
  return stub.fetch(new Request('http://mediator/covenant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(await c.req.json())
  }));
});

app.get('/api/agents/mediator/:userId/status', async (c) => {
  const env = c.env as any;
  
  if (!env.MEDIATOR) {
    return c.json({ error: 'Durable Objects not available' }, 503);
  }

  const userId = c.req.param('userId');
  const id = env.MEDIATOR.idFromName(userId);
  const stub = env.MEDIATOR.get(id);
  
  return stub.fetch(new Request('http://mediator/status'));
});

// Orchestrator Agent WebSocket Connection
app.get('/api/agents/orchestrator/:taskId/ws', async (c) => {
  const env = c.env as any;
  
  if (!env.ORCHESTRATOR) {
    return c.json({ error: 'Durable Objects not available' }, 503);
  }

  const taskId = c.req.param('taskId');
  const id = env.ORCHESTRATOR.idFromName(taskId);
  const stub = env.ORCHESTRATOR.get(id);
  
  return stub.fetch(c.req.raw);
});

// Orchestrator Agent REST API
app.post('/api/agents/orchestrator/:taskId/execute', async (c) => {
  const env = c.env as any;
  
  if (!env.ORCHESTRATOR) {
    return c.json({ error: 'Durable Objects not available' }, 503);
  }

  const taskId = c.req.param('taskId');
  const id = env.ORCHESTRATOR.idFromName(taskId);
  const stub = env.ORCHESTRATOR.get(id);
  
  return stub.fetch(new Request('http://orchestrator/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(await c.req.json())
  }));
});

app.get('/api/agents/orchestrator/:taskId/status', async (c) => {
  const env = c.env as any;
  
  if (!env.ORCHESTRATOR) {
    return c.json({ error: 'Durable Objects not available' }, 503);
  }

  const taskId = c.req.param('taskId');
  const id = env.ORCHESTRATOR.idFromName(taskId);
  const stub = env.ORCHESTRATOR.get(id);
  
  return stub.fetch(new Request('http://orchestrator/status'));
});

// Overall agent status
app.get('/api/agents/status', (c) => {
  const env = c.env as any;
  const hasAgents = !!(env.MEDIATOR && env.ORCHESTRATOR);
  
  return c.json({
    agents_enabled: hasAgents,
    mode: hasAgents ? 'production' : 'development',
    mediator: hasAgents ? 'available' : 'unavailable',
    orchestrator: hasAgents ? 'available' : 'unavailable',
    websockets: hasAgents ? 'supported' : 'not_supported',
    message: hasAgents 
      ? 'Durable Objects active - WebSocket connections available'
      : 'Deploy to Cloudflare Pages for Durable Objects support'
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
