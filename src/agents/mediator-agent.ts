/**
 * MediatorAgent - Durable Object
 * Handles user intent analysis, covenant management, and orchestration delegation
 */

import { DurableObject } from 'cloudflare:workers';

interface Covenant {
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
}

interface WebSocketMessage {
  type: 'covenant_update' | 'status_change' | 'agent_progress' | 'delegation' | 'error';
  data: any;
  timestamp: string;
}

export class MediatorAgent extends DurableObject {
  private sessions: Set<WebSocket>;
  private currentCovenant: Covenant | null;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.sessions = new Set();
    this.currentCovenant = null;
    
    // Initialize SQLite schema
    this.initDatabase();
  }

  async initDatabase() {
    await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS covenants (
        id TEXT PRIMARY KEY,
        user_intent TEXT NOT NULL,
        constraints TEXT NOT NULL,
        status TEXT NOT NULL,
        mediator_decision TEXT,
        orchestration_plan TEXT,
        created_at TEXT NOT NULL
      )
    `);

    await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS agent_executions (
        id TEXT PRIMARY KEY,
        covenant_id TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        thoughts TEXT,
        actions TEXT,
        output TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (covenant_id) REFERENCES covenants(id)
      )
    `);

    await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS metrics (
        id TEXT PRIMARY KEY,
        covenant_id TEXT NOT NULL,
        latency_ms INTEGER,
        cost_usd REAL,
        models_used TEXT,
        success BOOLEAN,
        created_at TEXT NOT NULL,
        FOREIGN KEY (covenant_id) REFERENCES covenants(id)
      )
    `);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // REST API endpoints
    if (url.pathname.endsWith('/covenant')) {
      if (request.method === 'POST') {
        return this.createCovenant(request);
      } else if (request.method === 'GET') {
        return this.getCovenant();
      }
    }

    if (url.pathname.endsWith('/analyze')) {
      return this.analyzeIntent(request);
    }

    if (url.pathname.endsWith('/delegate')) {
      return this.delegateToOrchestrator(request);
    }

    if (url.pathname.endsWith('/status')) {
      return this.getStatus();
    }

    return new Response('Not found', { status: 404 });
  }

  async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection
    server.accept();
    this.sessions.add(server);

    // Handle incoming messages
    server.addEventListener('message', async (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string);
        await this.handleWebSocketMessage(server, message);
      } catch (error) {
        this.sendToClient(server, {
          type: 'error',
          data: { message: 'Invalid message format' },
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle connection close
    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });

    // Send initial state
    if (this.currentCovenant) {
      this.sendToClient(server, {
        type: 'covenant_update',
        data: this.currentCovenant,
        timestamp: new Date().toISOString()
      });
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleWebSocketMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'create_covenant':
        await this.createCovenantFromWS(message.data);
        break;
      case 'analyze':
        await this.analyzeIntentFromWS(message.data);
        break;
      case 'delegate':
        await this.delegateToOrchestratorFromWS(message.data);
        break;
      default:
        this.sendToClient(ws, {
          type: 'error',
          data: { message: 'Unknown message type' },
          timestamp: new Date().toISOString()
        });
    }
  }

  async createCovenant(request: Request): Promise<Response> {
    const body = await request.json();
    const covenant: Covenant = {
      id: `covenant-${Date.now()}`,
      user_intent: body.user_intent || body.intent || '',
      constraints: body.constraints || {
        cost: 0.01,
        latency: 5000,
        quality: 8.0
      },
      status: 'draft',
      mediator_decision: '',
      created_at: new Date().toISOString()
    };

    // Save to SQLite
    await this.ctx.storage.sql.exec(
      `INSERT INTO covenants (id, user_intent, constraints, status, mediator_decision, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      covenant.id,
      covenant.user_intent,
      JSON.stringify(covenant.constraints),
      covenant.status,
      covenant.mediator_decision,
      covenant.created_at
    );

    this.currentCovenant = covenant;

    // Broadcast to all connected clients
    this.broadcast({
      type: 'covenant_update',
      data: covenant,
      timestamp: new Date().toISOString()
    });

    return new Response(JSON.stringify(covenant), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async createCovenantFromWS(data: any) {
    const covenant: Covenant = {
      id: `covenant-${Date.now()}`,
      user_intent: data.user_intent || data.intent || '',
      constraints: data.constraints || {
        cost: 0.01,
        latency: 5000,
        quality: 8.0
      },
      status: 'draft',
      mediator_decision: '',
      created_at: new Date().toISOString()
    };

    await this.ctx.storage.sql.exec(
      `INSERT INTO covenants (id, user_intent, constraints, status, mediator_decision, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      covenant.id,
      covenant.user_intent,
      JSON.stringify(covenant.constraints),
      covenant.status,
      covenant.mediator_decision,
      covenant.created_at
    );

    this.currentCovenant = covenant;
    this.broadcast({
      type: 'covenant_update',
      data: covenant,
      timestamp: new Date().toISOString()
    });
  }

  async analyzeIntent(request: Request): Promise<Response> {
    const body = await request.json();
    const complexity = this.calculateComplexity(body.user_intent);

    const decision = complexity > 0.6
      ? 'Complex query - delegating to full orchestrator'
      : 'Simple query - handling with mediator sub-agents';

    if (this.currentCovenant) {
      this.currentCovenant.mediator_decision = decision;
      this.currentCovenant.status = 'active';

      // Update SQLite
      await this.ctx.storage.sql.exec(
        `UPDATE covenants SET mediator_decision = ?, status = ? WHERE id = ?`,
        decision,
        'active',
        this.currentCovenant.id
      );

      this.broadcast({
        type: 'covenant_update',
        data: this.currentCovenant,
        timestamp: new Date().toISOString()
      });
    }

    return new Response(JSON.stringify({
      decision,
      complexity,
      use_orchestrator: complexity > 0.6
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async analyzeIntentFromWS(data: any) {
    const complexity = this.calculateComplexity(data.user_intent);
    const decision = complexity > 0.6
      ? 'Complex query - delegating to full orchestrator'
      : 'Simple query - handling with mediator sub-agents';

    if (this.currentCovenant) {
      this.currentCovenant.mediator_decision = decision;
      this.currentCovenant.status = 'active';

      await this.ctx.storage.sql.exec(
        `UPDATE covenants SET mediator_decision = ?, status = ? WHERE id = ?`,
        decision,
        'active',
        this.currentCovenant.id
      );

      this.broadcast({
        type: 'covenant_update',
        data: this.currentCovenant,
        timestamp: new Date().toISOString()
      });

      this.broadcast({
        type: 'status_change',
        data: { status: 'active', decision },
        timestamp: new Date().toISOString()
      });
    }
  }

  async delegateToOrchestrator(request: Request): Promise<Response> {
    const body = await request.json();

    // Get Orchestrator DO stub
    const orchestratorId = this.env.ORCHESTRATOR.idFromName(body.task_id || 'default');
    const orchestrator = this.env.ORCHESTRATOR.get(orchestratorId);

    // Update covenant
    if (this.currentCovenant) {
      this.currentCovenant.mediator_decision += ' → Delegating to Orchestrator';
      this.currentCovenant.orchestration_plan = body.plan || 'Orchestrator will create detailed plan';

      await this.ctx.storage.sql.exec(
        `UPDATE covenants SET mediator_decision = ?, orchestration_plan = ? WHERE id = ?`,
        this.currentCovenant.mediator_decision,
        this.currentCovenant.orchestration_plan,
        this.currentCovenant.id
      );

      this.broadcast({
        type: 'covenant_update',
        data: this.currentCovenant,
        timestamp: new Date().toISOString()
      });

      this.broadcast({
        type: 'delegation',
        data: { to: 'orchestrator', task_id: body.task_id },
        timestamp: new Date().toISOString()
      });
    }

    // Forward to orchestrator
    const response = await orchestrator.fetch(new Request('http://orchestrator/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        covenant_id: this.currentCovenant?.id,
        task: body
      })
    }));

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async delegateToOrchestratorFromWS(data: any) {
    const orchestratorId = this.env.ORCHESTRATOR.idFromName(data.task_id || 'default');
    const orchestrator = this.env.ORCHESTRATOR.get(orchestratorId);

    if (this.currentCovenant) {
      this.currentCovenant.mediator_decision += ' → Delegating to Orchestrator';
      this.currentCovenant.orchestration_plan = data.plan || 'Orchestrator will create detailed plan';

      await this.ctx.storage.sql.exec(
        `UPDATE covenants SET mediator_decision = ?, orchestration_plan = ? WHERE id = ?`,
        this.currentCovenant.mediator_decision,
        this.currentCovenant.orchestration_plan,
        this.currentCovenant.id
      );

      this.broadcast({
        type: 'covenant_update',
        data: this.currentCovenant,
        timestamp: new Date().toISOString()
      });

      this.broadcast({
        type: 'delegation',
        data: { to: 'orchestrator', task_id: data.task_id },
        timestamp: new Date().toISOString()
      });
    }

    // Forward to orchestrator via DO stub
    await orchestrator.fetch(new Request('http://orchestrator/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        covenant_id: this.currentCovenant?.id,
        task: data
      })
    }));
  }

  async getCovenant(): Promise<Response> {
    if (!this.currentCovenant) {
      return new Response(JSON.stringify({ error: 'No active covenant' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(this.currentCovenant), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getStatus(): Promise<Response> {
    const status = {
      has_covenant: !!this.currentCovenant,
      active_sessions: this.sessions.size,
      covenant_status: this.currentCovenant?.status || 'none',
      last_update: this.currentCovenant?.created_at || null
    };

    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private calculateComplexity(intent: string): number {
    const words = intent.split(/\s+/).length;
    const hasMultipleTasks = /\band\b|\bthen\b|\balso\b/i.test(intent);
    const hasQualityTerms = /\bdetailed\b|\bcomprehensive\b|\bthorough\b/i.test(intent);

    let score = 0;
    if (words > 20) score += 0.3;
    if (words > 50) score += 0.2;
    if (hasMultipleTasks) score += 0.4;
    if (hasQualityTerms) score += 0.3;

    return Math.min(score, 1.0);
  }

  private broadcast(message: WebSocketMessage) {
    const data = JSON.stringify(message);
    this.sessions.forEach(ws => {
      try {
        ws.send(data);
      } catch (error) {
        console.error('Failed to send to client:', error);
        this.sessions.delete(ws);
      }
    });
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send to client:', error);
      this.sessions.delete(ws);
    }
  }
}
