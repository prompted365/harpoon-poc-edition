/**
 * Harpoon v2 - Next-Gen AI Orchestration
 * Cloudflare Workers + Hono + Multi-Provider AI
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { AIClient } from './ai-client';
import { SmartRouter } from './router';
import { MODEL_REGISTRY, getModelById, getModelsByProvider, getModelsByTier } from './models';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use('/api/*', cors());

// Health check endpoint
app.get('/api/health', async (c) => {
  try {
    const client = new AIClient(c.env);
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

    // Execute AI request
    const client = new AIClient(c.env);
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

    const client = new AIClient(c.env);
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

// Root route with HTML UI
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Harpoon v2 - Next-Gen AI Orchestration</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen">
        <div class="container mx-auto px-4 py-8">
            <!-- Header -->
            <div class="text-center mb-12">
                <h1 class="text-5xl font-bold text-white mb-4">
                    <i class="fas fa-anchor text-purple-400"></i>
                    Harpoon v2
                </h1>
                <p class="text-xl text-purple-200">Next-Generation AI Orchestration Platform</p>
                <p class="text-sm text-purple-300 mt-2">
                    Groq × Cloudflare Workers AI × OpenAI | Smart Routing | 95%+ Cost Savings
                </p>
            </div>

            <!-- Status Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-purple-500/30">
                    <div class="text-purple-400 text-2xl mb-2"><i class="fas fa-bolt"></i></div>
                    <h3 class="text-white font-semibold mb-2">Tier 1: PRIMARY</h3>
                    <p class="text-purple-200 text-sm">Groq Models (560-1000 T/sec)</p>
                    <div class="mt-3 space-y-1 text-xs text-purple-300">
                        <div>• Llama 3.1 8B (560 T/sec)</div>
                        <div>• GPT OSS 20B (1000 T/sec)</div>
                        <div>• Qwen3 32B (450 T/sec)</div>
                    </div>
                </div>

                <div class="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-blue-500/30">
                    <div class="text-blue-400 text-2xl mb-2"><i class="fas fa-globe"></i></div>
                    <h3 class="text-white font-semibold mb-2">Tier 2: EDGE</h3>
                    <p class="text-blue-200 text-sm">Workers AI (Ultra-low latency)</p>
                    <div class="mt-3 space-y-1 text-xs text-blue-300">
                        <div>• Llama 3.3 70B FP8</div>
                        <div>• Llama 3.1 8B Fast</div>
                        <div>• Qwen 2.5 7B AWQ</div>
                    </div>
                </div>

                <div class="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-amber-500/30">
                    <div class="text-amber-400 text-2xl mb-2"><i class="fas fa-crown"></i></div>
                    <h3 class="text-white font-semibold mb-2">Tier 3: FLAGSHIP</h3>
                    <p class="text-amber-200 text-sm">OpenAI (Highest quality)</p>
                    <div class="mt-3 space-y-1 text-xs text-amber-300">
                        <div>• GPT-4o</div>
                        <div>• GPT-4o Mini</div>
                        <div>• Vision + Function Calling</div>
                    </div>
                </div>
            </div>

            <!-- Chat Interface -->
            <div class="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-purple-500/30 mb-8">
                <h2 class="text-2xl font-bold text-white mb-4">
                    <i class="fas fa-comments"></i> AI Chat
                </h2>

                <div class="space-y-4">
                    <div>
                        <label class="block text-purple-200 mb-2">Your Message</label>
                        <textarea 
                            id="prompt" 
                            class="w-full p-3 bg-slate-800/50 text-white rounded border border-purple-500/30 focus:border-purple-500 outline-none"
                            rows="4"
                            placeholder="Ask anything... Smart routing will select the best model for you!"
                        ></textarea>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-purple-200 mb-2 text-sm">Tier (Optional)</label>
                            <select id="tier" class="w-full p-2 bg-slate-800/50 text-white rounded border border-purple-500/30">
                                <option value="">Auto (Smart Routing)</option>
                                <option value="primary">Primary (Groq)</option>
                                <option value="edge">Edge (Workers AI)</option>
                                <option value="flagship">Flagship (OpenAI)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-purple-200 mb-2 text-sm">Temperature</label>
                            <input 
                                type="number" 
                                id="temperature" 
                                value="0.7" 
                                step="0.1" 
                                min="0" 
                                max="2"
                                class="w-full p-2 bg-slate-800/50 text-white rounded border border-purple-500/30"
                            />
                        </div>

                        <div>
                            <label class="block text-purple-200 mb-2 text-sm">Max Tokens</label>
                            <input 
                                type="number" 
                                id="max_tokens" 
                                value="1024" 
                                step="128"
                                class="w-full p-2 bg-slate-800/50 text-white rounded border border-purple-500/30"
                            />
                        </div>
                    </div>

                    <button 
                        id="sendBtn"
                        class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded transition duration-200"
                    >
                        <i class="fas fa-paper-plane mr-2"></i> Send Message
                    </button>
                </div>

                <!-- Response Area -->
                <div id="response" class="mt-6 hidden">
                    <h3 class="text-white font-semibold mb-3">Response:</h3>
                    <div id="responseContent" class="bg-slate-800/50 p-4 rounded border border-purple-500/30 text-purple-100"></div>
                    
                    <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div class="bg-slate-800/30 p-3 rounded">
                            <div class="text-purple-400">Model</div>
                            <div id="respModel" class="text-white font-mono text-xs"></div>
                        </div>
                        <div class="bg-slate-800/30 p-3 rounded">
                            <div class="text-purple-400">Latency</div>
                            <div id="respLatency" class="text-white font-bold"></div>
                        </div>
                        <div class="bg-slate-800/30 p-3 rounded">
                            <div class="text-purple-400">Tokens</div>
                            <div id="respTokens" class="text-white font-bold"></div>
                        </div>
                        <div class="bg-slate-800/30 p-3 rounded">
                            <div class="text-purple-400">Cost</div>
                            <div id="respCost" class="text-white font-bold"></div>
                        </div>
                    </div>
                </div>

                <!-- Loading -->
                <div id="loading" class="mt-6 text-center text-purple-300 hidden">
                    <i class="fas fa-spinner fa-spin mr-2"></i> Processing...
                </div>
            </div>

            <!-- API Documentation -->
            <div class="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-purple-500/30">
                <h2 class="text-2xl font-bold text-white mb-4">
                    <i class="fas fa-code"></i> API Endpoints
                </h2>
                <div class="space-y-3 text-sm">
                    <div class="bg-slate-800/30 p-3 rounded">
                        <code class="text-green-400">GET /api/health</code>
                        <p class="text-purple-200 mt-1">Check system health and provider status</p>
                    </div>
                    <div class="bg-slate-800/30 p-3 rounded">
                        <code class="text-blue-400">GET /api/models</code>
                        <p class="text-purple-200 mt-1">List all available models</p>
                    </div>
                    <div class="bg-slate-800/30 p-3 rounded">
                        <code class="text-purple-400">POST /api/chat</code>
                        <p class="text-purple-200 mt-1">Send chat completion request</p>
                    </div>
                    <div class="bg-slate-800/30 p-3 rounded">
                        <code class="text-amber-400">POST /api/route</code>
                        <p class="text-purple-200 mt-1">Preview routing decision without execution</p>
                    </div>
                    <div class="bg-slate-800/30 p-3 rounded">
                        <code class="text-red-400">POST /api/batch</code>
                        <p class="text-purple-200 mt-1">Process multiple requests in parallel</p>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            const sendBtn = document.getElementById('sendBtn');
            const promptInput = document.getElementById('prompt');
            const responseDiv = document.getElementById('response');
            const loadingDiv = document.getElementById('loading');
            const responseContent = document.getElementById('responseContent');

            sendBtn.addEventListener('click', async () => {
                const prompt = promptInput.value.trim();
                if (!prompt) {
                    alert('Please enter a message');
                    return;
                }

                // Show loading
                loadingDiv.classList.remove('hidden');
                responseDiv.classList.add('hidden');
                sendBtn.disabled = true;

                try {
                    const response = await axios.post('/api/chat', {
                        prompt,
                        tier: document.getElementById('tier').value || undefined,
                        temperature: parseFloat(document.getElementById('temperature').value),
                        max_tokens: parseInt(document.getElementById('max_tokens').value)
                    });

                    const data = response.data;

                    // Display response
                    responseContent.textContent = data.content;
                    document.getElementById('respModel').textContent = data.model;
                    document.getElementById('respLatency').textContent = data.performance.latency_ms + ' ms';
                    document.getElementById('respTokens').textContent = data.usage.total_tokens;
                    document.getElementById('respCost').textContent = '$' + data.cost.amount.toFixed(6);

                    responseDiv.classList.remove('hidden');
                } catch (error) {
                    alert('Error: ' + (error.response?.data?.error || error.message));
                } finally {
                    loadingDiv.classList.add('hidden');
                    sendBtn.disabled = false;
                }
            });
        </script>
    </body>
    </html>
  `);
});

export default app;
