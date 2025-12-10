/**
 * Mediator Agent - User-Facing Layer
 * 
 * Responsibilities:
 * - Handle immediate user requests
 * - Maintain conversation threads
 * - Spawn non-blocking UX optimizations
 * - Delegate complex work to Orchestrator
 * - Provide fast, streaming responses
 */

import { AIChatAgent } from 'agents/ai-chat-agent';
import type { Message } from 'ai';
import type { AgentEnv, Covenant, MediatorState, AgentMessage } from './types';
import { AIClient } from '../ai-client';
import { SmartRouter } from '../router';

export class MediatorAgent extends AIChatAgent<AgentEnv, MediatorState> {
  
  initialState: MediatorState = {
    userId: 'default',
    activeCovenants: [],
    conversationHistory: [],
    uiOptimizations: {
      pendingUpdates: [],
      backgroundTasks: []
    },
    performance: {
      avgResponseTime: 0,
      successRate: 1.0
    }
  };

  /**
   * Initialize the agent when it starts
   */
  async onStart() {
    console.log(`🎯 Mediator Agent started for user: ${this.state.userId}`);
    
    // Setup database tables for mediator
    this.sql`
      CREATE TABLE IF NOT EXISTS mediator_covenants (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        intent TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;
    
    this.sql`
      CREATE TABLE IF NOT EXISTS mediator_messages (
        id TEXT PRIMARY KEY,
        covenant_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `;
  }

  /**
   * Handle HTTP requests (non-WebSocket)
   */
  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        userId: this.state.userId,
        activeCovenants: this.state.activeCovenants.length,
        performance: this.state.performance
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/covenant' && request.method === 'POST') {
      const data = await request.json();
      const covenant = await this.createCovenant(data.intent, data.constraints);
      return new Response(JSON.stringify(covenant), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Mediator Agent', { status: 200 });
  }

  /**
   * Handle WebSocket connection
   */
  async onConnect(connection: any, ctx: any) {
    console.log(`👤 User connected: ${this.state.userId}`);
    
    // Send current state to newly connected client
    connection.send(JSON.stringify({
      type: 'state_sync',
      state: this.state
    }));
  }

  /**
   * Handle incoming WebSocket messages
   */
  async onMessage(connection: any, message: string | ArrayBuffer) {
    if (typeof message !== 'string') return;
    
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'user_message':
          await this.handleUserMessage(data.content, connection);
          break;
        
        case 'create_covenant':
          const covenant = await this.createCovenant(data.intent, data.constraints);
          connection.send(JSON.stringify({
            type: 'covenant_created',
            covenant
          }));
          break;
        
        case 'query_status':
          await this.sendCovenantStatus(data.covenantId, connection);
          break;
      }
    } catch (error: any) {
      connection.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  }

  /**
   * Handle user messages with fast, smart routing
   */
  private async handleUserMessage(content: string, connection: any) {
    const startTime = Date.now();
    
    // Add message to conversation
    this.messages.push({
      role: 'user',
      content
    });
    
    // Quick classification
    const router = new SmartRouter();
    const classification = router.classifyRequest({ prompt: content });
    
    // Simple queries: Handle directly with fast response
    if (classification.complexity === 'simple') {
      connection.send(JSON.stringify({
        type: 'response_start',
        classification
      }));
      
      const client = new AIClient(this.env);
      const response = await client.chat({
        prompt: content,
        tier: 'edge' // Force edge tier for speed
      });
      
      connection.send(JSON.stringify({
        type: 'response_complete',
        content: response.content,
        metadata: {
          model: response.model,
          latency: Date.now() - startTime,
          cost: response.cost.amount
        }
      }));
      
      this.messages.push({
        role: 'assistant',
        content: response.content
      });
      
      return;
    }
    
    // Complex queries: Create covenant and delegate to Orchestrator
    const covenant = await this.createCovenant(content, {
      maxLatency: 5000,
      requiredQuality: 'balanced'
    });
    
    connection.send(JSON.stringify({
      type: 'covenant_created',
      covenant,
      message: 'Processing your request with our orchestration layer...'
    }));
    
    // Delegate to Orchestrator (non-blocking)
    await this.delegateToOrchestrator(covenant);
    
    // Track performance
    const latency = Date.now() - startTime;
    this.updatePerformance(latency, true);
  }

  /**
   * Create a new Covenant (social contract)
   */
  private async createCovenant(
    intent: string, 
    constraints: any = {}
  ): Promise<Covenant> {
    const covenantId = `cov_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Parse requirements from intent
    const requirements = this.parseRequirements(intent);
    
    const covenant: Covenant = {
      id: covenantId,
      userId: this.state.userId,
      intent,
      requirements,
      constraints: {
        maxCost: constraints.maxCost ?? 0.10,
        maxLatency: constraints.maxLatency ?? 10000,
        requiredQuality: constraints.requiredQuality ?? 'balanced'
      },
      state: {
        current: 'draft',
        progress: 0,
        lastUpdate: new Date().toISOString()
      },
      execution: {
        selectedModels: [],
        estimatedCost: 0,
        estimatedTime: 0
      },
      createdAt: new Date().toISOString()
    };
    
    // Save to database
    this.sql`
      INSERT INTO mediator_covenants (id, user_id, intent, status, created_at, updated_at)
      VALUES (${covenant.id}, ${covenant.userId}, ${covenant.intent}, ${covenant.state.current}, ${Date.now()}, ${Date.now()})
    `;
    
    // Update state
    this.setState({
      ...this.state,
      activeCovenants: [...this.state.activeCovenants, covenant.id]
    });
    
    return covenant;
  }

  /**
   * Parse requirements from natural language intent
   */
  private parseRequirements(intent: string): string[] {
    const requirements: string[] = [];
    
    // Simple keyword-based parsing
    if (intent.toLowerCase().includes('analyze')) {
      requirements.push('deep_analysis');
    }
    if (intent.toLowerCase().includes('compare')) {
      requirements.push('comparison');
    }
    if (intent.toLowerCase().includes('generate')) {
      requirements.push('generation');
    }
    if (intent.toLowerCase().includes('explain')) {
      requirements.push('explanation');
    }
    
    return requirements.length > 0 ? requirements : ['general_query'];
  }

  /**
   * Delegate complex work to Orchestrator
   */
  private async delegateToOrchestrator(covenant: Covenant) {
    try {
      // Get Orchestrator Durable Object stub
      const orchestratorId = this.env.ORCHESTRATOR.idFromName('main');
      const orchestrator = this.env.ORCHESTRATOR.get(orchestratorId);
      
      // Send covenant to orchestrator
      await orchestrator.fetch('https://orchestrator/covenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(covenant)
      });
      
      console.log(`✅ Delegated covenant ${covenant.id} to Orchestrator`);
    } catch (error: any) {
      console.error(`❌ Failed to delegate to Orchestrator:`, error);
    }
  }

  /**
   * Send covenant status to client
   */
  private async sendCovenantStatus(covenantId: string, connection: any) {
    const results = this.sql<{ status: string; updated_at: number }>`
      SELECT status, updated_at FROM mediator_covenants WHERE id = ${covenantId}
    `;
    
    if (results.length > 0) {
      connection.send(JSON.stringify({
        type: 'covenant_status',
        covenantId,
        status: results[0].status,
        lastUpdate: results[0].updated_at
      }));
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformance(latency: number, success: boolean) {
    const currentAvg = this.state.performance.avgResponseTime;
    const currentRate = this.state.performance.successRate;
    
    // Simple moving average
    const newAvg = (currentAvg * 0.9) + (latency * 0.1);
    const newRate = (currentRate * 0.95) + (success ? 0.05 : 0);
    
    this.setState({
      ...this.state,
      performance: {
        avgResponseTime: Math.round(newAvg),
        successRate: parseFloat(newRate.toFixed(3))
      }
    });
  }

  /**
   * Handle AI chat messages (from AIChatAgent)
   */
  async onChatMessage(onFinish: any): Promise<Response | undefined> {
    // This would integrate with AI SDK for streaming responses
    // For now, we handle messages in onMessage method
    return undefined;
  }
}

export default MediatorAgent;
