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
    
    // Handle completion callback from Orchestrator
    if (url.pathname === '/covenant-complete' && request.method === 'POST') {
      const completedCovenant: Covenant = await request.json();
      await this.handleCovenantCompletion(completedCovenant);
      return new Response(JSON.stringify({ status: 'acknowledged' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Mediator Agent', { status: 200 });
  }
  
  /**
   * Handle covenant completion from Orchestrator
   */
  private async handleCovenantCompletion(covenant: Covenant) {
    console.log(`✅ Mediator received completion for covenant ${covenant.id}`);
    
    // Update database
    this.sql`
      UPDATE mediator_covenants 
      SET status = ${covenant.state.current}, updated_at = ${Date.now()}
      WHERE id = ${covenant.id}
    `;
    
    // Quality evaluation by Mediator
    const qualityCheck = this.evaluateOrchestratorResult(covenant);
    
    if (qualityCheck.approved) {
      console.log(`✅ Mediator APPROVED covenant ${covenant.id} | Quality: ${qualityCheck.quality}`);
      
      // Store message with orchestrator results
      this.sql`
        INSERT INTO mediator_messages (id, covenant_id, role, content, timestamp)
        VALUES (
          ${'msg_' + Date.now()},
          ${covenant.id},
          'assistant',
          ${JSON.stringify(covenant.results)},
          ${Date.now()}
        )
      `;
    } else {
      console.log(`❌ Mediator REJECTED covenant ${covenant.id} | Reason: ${qualityCheck.reason}`);
      
      // Could trigger re-execution with adjusted parameters
      // For now, just log rejection
    }
    
    // Update state
    this.setState({
      ...this.state,
      activeCovenants: this.state.activeCovenants.filter(id => id !== covenant.id)
    });
  }
  
  /**
   * Evaluate Orchestrator result quality
   */
  private evaluateOrchestratorResult(covenant: Covenant): { approved: boolean; quality: number; reason?: string } {
    if (!covenant.results) {
      return { approved: false, quality: 0, reason: 'No results returned' };
    }
    
    const quality = covenant.results.quality || 0;
    
    if (quality < 0.6) {
      return { approved: false, quality, reason: `Quality too low: ${quality}` };
    }
    
    if (covenant.state.current === 'failed') {
      return { approved: false, quality: 0, reason: 'Orchestrator marked as failed' };
    }
    
    return { approved: true, quality };
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
   * Handle user messages with intelligent complexity analysis
   */
  private async handleUserMessage(content: string, connection: any) {
    const startTime = Date.now();
    
    // Add message to conversation
    this.messages.push({
      role: 'user',
      content
    });
    
    // Deep complexity analysis
    const complexity = this.analyzeComplexity(content);
    const router = new SmartRouter();
    const classification = router.classifyRequest({ prompt: content });
    
    console.log(`🎯 Mediator analyzing request | Complexity: ${complexity.score.toFixed(2)} | Type: ${complexity.type}`);
    
    // Send analysis to client
    connection.send(JSON.stringify({
      type: 'mediator_analysis',
      complexity,
      classification
    }));
    
    // ALWAYS delegate moderate/complex queries to Orchestrator for full swarm orchestration
    if (complexity.score > 0.4 || classification.complexity !== 'simple') {
      console.log(`✅ Delegating to Orchestrator (complexity: ${complexity.score.toFixed(2)})`);
      
      const covenant = await this.createCovenant(content, {
        maxLatency: complexity.score > 0.7 ? 30000 : 15000,
        requiredQuality: complexity.score > 0.7 ? 'quality' : 'balanced',
        maxCost: 0.50,
        maxTokens: complexity.score > 0.7 ? 8192 : 4096
      });
      
      connection.send(JSON.stringify({
        type: 'covenant_created',
        covenant,
        message: `🎭 Mediator delegating to Orchestrator Harmony for ${complexity.type} task...`
      }));
      
      // Delegate to Orchestrator (non-blocking)
      await this.delegateToOrchestrator(covenant, connection);
      
      // Track performance
      const latency = Date.now() - startTime;
      this.updatePerformance(latency, true);
      
      return;
    }
    
    // Only trivial queries: Handle directly with fast response
    console.log(`⚡ Fast-path for simple query`);
    
    connection.send(JSON.stringify({
      type: 'response_start',
      classification
    }));
    
    const client = new AIClient(this.env);
    const response = await client.chat({
      prompt: content,
      tier: 'primary',
      max_tokens: 2048
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
   * Analyze request complexity for delegation decision
   */
  private analyzeComplexity(intent: string): { score: number; type: string; factors: string[] } {
    const factors: string[] = [];
    let score = 0;
    
    // Token length analysis
    const words = intent.split(/\s+/).length;
    if (words > 50) {
      score += 0.4;
      factors.push('long_query');
    } else if (words > 20) {
      score += 0.2;
      factors.push('medium_query');
    }
    
    // Multi-step/multi-task indicators
    const multiStepPatterns = /\b(and|then|also|after|before|first|second|third|finally|additionally)\b/gi;
    const multiSteps = (intent.match(multiStepPatterns) || []).length;
    if (multiSteps >= 3) {
      score += 0.4;
      factors.push('multi_step');
    } else if (multiSteps >= 1) {
      score += 0.2;
      factors.push('sequential');
    }
    
    // Quality/depth requirements
    const qualityPatterns = /\b(detailed|comprehensive|thorough|in-depth|complete|extensive|analyze|compare|research)\b/gi;
    if (qualityPatterns.test(intent)) {
      score += 0.3;
      factors.push('high_quality_required');
    }
    
    // Complex task types
    if (/\b(analyze|research|investigate|compare|synthesize|summarize)\b/i.test(intent)) {
      score += 0.3;
      factors.push('complex_task');
    }
    
    // Reasoning requirements
    if (/\b(why|how|explain|reason|cause|because)\b/i.test(intent)) {
      score += 0.2;
      factors.push('reasoning_required');
    }
    
    const type = score > 0.7 ? 'highly_complex' : score > 0.4 ? 'moderately_complex' : 'simple';
    
    return {
      score: Math.min(score, 1.0),
      type,
      factors
    };
  }
  
  /**
   * Parse requirements from natural language intent
   */
  private parseRequirements(intent: string): string[] {
    const requirements: string[] = [];
    
    // Comprehensive keyword-based parsing
    if (/\b(analyze|analysis)\b/i.test(intent)) {
      requirements.push('deep_analysis');
    }
    if (/\b(compare|comparison|versus|vs)\b/i.test(intent)) {
      requirements.push('comparison');
    }
    if (/\b(generate|create|build|design)\b/i.test(intent)) {
      requirements.push('generation');
    }
    if (/\b(explain|elaborate|clarify)\b/i.test(intent)) {
      requirements.push('explanation');
    }
    if (/\b(research|investigate|study)\b/i.test(intent)) {
      requirements.push('research');
    }
    if (/\b(summarize|summary|overview)\b/i.test(intent)) {
      requirements.push('summarization');
    }
    
    return requirements.length > 0 ? requirements : ['general_query'];
  }

  /**
   * Delegate complex work to Orchestrator Harmony
   */
  private async delegateToOrchestrator(covenant: Covenant, connection: any) {
    try {
      console.log(`🎭 Mediator → Orchestrator: Delegating covenant ${covenant.id}`);
      
      // Get Orchestrator Durable Object stub (named 'harmony')
      const orchestratorId = this.env.ORCHESTRATOR.idFromName('harmony');
      const orchestrator = this.env.ORCHESTRATOR.get(orchestratorId);
      
      // Send covenant to orchestrator with full context
      const delegationPayload = {
        covenant,
        mediatorContext: {
          userId: this.state.userId,
          conversationHistory: this.messages.slice(-5), // Last 5 messages for context
          performance: this.state.performance
        },
        callbackUrl: `https://mediator/covenant-complete`
      };
      
      await orchestrator.fetch('https://orchestrator/covenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(delegationPayload)
      });
      
      console.log(`✅ Delegated covenant ${covenant.id} to Orchestrator Harmony`);
      
      // Update database
      this.sql`
        UPDATE mediator_covenants 
        SET status = 'delegated_to_orchestrator'
        WHERE id = ${covenant.id}
      `;
      
      // Notify client
      connection.send(JSON.stringify({
        type: 'delegation_complete',
        covenantId: covenant.id,
        message: '🎭 Orchestrator Harmony is now coordinating sub-agent swarm...'
      }));
      
      // Start monitoring for completion (non-blocking)
      this.monitorCovenantCompletion(covenant.id, connection);
      
    } catch (error: any) {
      console.error(`❌ Failed to delegate to Orchestrator:`, error);
      connection.send(JSON.stringify({
        type: 'delegation_error',
        covenantId: covenant.id,
        error: error.message
      }));
    }
  }
  
  /**
   * Monitor covenant completion (polling mechanism)
   */
  private async monitorCovenantCompletion(covenantId: string, connection: any) {
    const maxAttempts = 60; // 60 attempts = 30 seconds max wait
    let attempts = 0;
    
    const checkInterval = setInterval(async () => {
      attempts++;
      
      // Check database for covenant status
      const results = this.sql<{ status: string; updated_at: number }>`
        SELECT status, updated_at FROM mediator_covenants WHERE id = ${covenantId}
      `;
      
      if (results.length > 0) {
        const status = results[0].status;
        
        if (status === 'completed' || status === 'failed') {
          clearInterval(checkInterval);
          console.log(`✅ Covenant ${covenantId} ${status}`);
          return;
        }
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.log(`⏱️ Covenant ${covenantId} monitoring timeout`);
      }
    }, 500); // Check every 500ms
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
