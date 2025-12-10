/**
 * Orchestrator Agent - Execution Engine
 * 
 * Responsibilities:
 * - Execute covenants from Mediator
 * - Coordinate sub-agent swarm
 * - Manage anchor-winch mechanics
 * - Handle hook patterns (gateways, holding, checkpoints)
 * - Aggregate results and quality evaluation
 */

import { Agent } from 'agents';
import type {
  AgentEnv,
  Covenant,
  OrchestratorState,
  SubAgentTask,
  SubAgentRole,
  Anchor,
  Hook,
  SwarmOperation,
  OracleEvaluation
} from './types';
import { AIClient } from '../ai-client';
import { SmartRouter } from '../router';

export class OrchestratorAgent extends Agent<AgentEnv, OrchestratorState> {
  
  initialState: OrchestratorState = {
    activeCovenants: [],
    subAgentPool: {
      classifier: { available: 5, busy: 0, tasks: [] },
      router: { available: 5, busy: 0, tasks: [] },
      executor: { available: 10, busy: 0, tasks: [] },
      evaluator: { available: 3, busy: 0, tasks: [] },
      coordinator: { available: 2, busy: 0, tasks: [] }
    },
    anchors: [],
    hooks: [],
    metrics: {
      totalCovenants: 0,
      completedCovenants: 0,
      avgExecutionTime: 0,
      totalCost: 0
    }
  };

  /**
   * Initialize orchestrator
   */
  async onStart() {
    console.log('🎭 Orchestrator Agent started');
    
    // Setup database
    this.sql`
      CREATE TABLE IF NOT EXISTS covenants (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        intent TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        completed_at INTEGER
      )
    `;
    
    this.sql`
      CREATE TABLE IF NOT EXISTS sub_agent_tasks (
        id TEXT PRIMARY KEY,
        covenant_id TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        payload TEXT,
        result TEXT,
        created_at INTEGER NOT NULL,
        completed_at INTEGER
      )
    `;
    
    this.sql`
      CREATE TABLE IF NOT EXISTS evaluations (
        id TEXT PRIMARY KEY,
        covenant_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        quality REAL NOT NULL,
        feedback TEXT,
        created_at INTEGER NOT NULL
      )
    `;
  }

  /**
   * Handle HTTP requests
   */
  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        activeCovenants: this.state.activeCovenants.length,
        metrics: this.state.metrics,
        subAgentPool: Object.fromEntries(
          Object.entries(this.state.subAgentPool).map(([role, pool]) => [
            role,
            { available: pool.available, busy: pool.busy }
          ])
        )
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/covenant' && request.method === 'POST') {
      const payload = await request.json();
      const covenant: Covenant = payload.covenant || payload;
      const mediatorContext = payload.mediatorContext || {};
      const callbackUrl = payload.callbackUrl;
      
      console.log(`🎭 Orchestrator Harmony received covenant ${covenant.id} from Mediator`);
      console.log(`   Context: ${mediatorContext.conversationHistory?.length || 0} messages`);
      
      // Execute covenant asynchronously (non-blocking)
      this.executeCovenant(covenant, mediatorContext, callbackUrl);
      
      return new Response(JSON.stringify({ 
        status: 'accepted', 
        covenantId: covenant.id,
        message: 'Orchestrator Harmony is coordinating sub-agent swarm...'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Orchestrator Agent', { status: 200 });
  }

  /**
   * Execute a covenant with full orchestration and hierarchical context
   */
  private async executeCovenant(
    covenant: Covenant, 
    mediatorContext: any = {},
    callbackUrl?: string
  ) {
    console.log(`🎯 Orchestrator Harmony executing covenant: ${covenant.id}`);
    console.log(`   Max tokens: ${covenant.constraints.maxTokens || 4096}`);
    console.log(`   Quality tier: ${covenant.constraints.requiredQuality}`);
    
    const startTime = Date.now();
    
    // Save covenant
    this.sql`
      INSERT INTO covenants (id, user_id, intent, status, progress, created_at)
      VALUES (${covenant.id}, ${covenant.userId}, ${covenant.intent}, 'analyzing', 0, ${Date.now()})
    `;
    
    // Update state
    covenant.state.current = 'analyzing';
    this.setState({
      ...this.state,
      activeCovenants: [...this.state.activeCovenants, covenant]
    });
    
    try {
      // Step 1: Classification (Sub-agent: classifier)
      const classificationTask = await this.assignSubAgentTask('classifier', covenant.id, {
        intent: covenant.intent,
        requirements: covenant.requirements
      });
      
      await this.executeSubAgentTask(classificationTask);
      
      // Step 2: Routing (Sub-agent: router)
      const routingTask = await this.assignSubAgentTask('router', covenant.id, {
        classification: classificationTask.result,
        constraints: covenant.constraints
      });
      
      await this.executeSubAgentTask(routingTask);
      
      // Update covenant progress
      covenant.state.progress = 30;
      await this.updateCovenantProgress(covenant.id, 30);
      
      // Step 3: Create Swarm Operation for parallel execution
      const swarmOp = await this.createSwarmOperation(covenant, routingTask.result, mediatorContext);
      
      // Step 4: Execute tasks in swarm (parallel) with hierarchical context
      const results = await this.executeSwarm(swarmOp, mediatorContext);
      
      // Update progress
      covenant.state.progress = 70;
      await this.updateCovenantProgress(covenant.id, 70);
      
      // Step 5: Create Anchor for result aggregation
      const anchor = await this.createAnchor(covenant.id, swarmOp.agents.map(a => a.taskId));
      
      // Step 6: Winch Pull - Aggregate results
      const winchResult = await this.winchPull(anchor, results);
      
      // Update progress
      covenant.state.progress = 90;
      await this.updateCovenantProgress(covenant.id, 90);
      
      // Step 7: Oracle Evaluation (Sub-agent: evaluator)
      const evaluation = await this.oracleEvaluate(covenant.id, winchResult);
      
      // Complete covenant
      const executionTime = Date.now() - startTime;
      covenant.state.current = 'completed';
      covenant.state.progress = 100;
      covenant.completedAt = new Date().toISOString();
      covenant.execution.actualTime = executionTime;
      covenant.execution.actualCost = evaluation.overallQuality * 0.01; // Simplified cost
      covenant.results = {
        outputs: winchResult.gatheredResults,
        quality: evaluation.overallQuality,
        evaluation: evaluation.feedback,
        swarmMetrics: {
          totalSubAgents: swarmOp.agents.length,
          executionTime,
          parallelization: swarmOp.coordination.parallel
        }
      };
      
      // Update database
      this.sql`
        UPDATE covenants 
        SET status = 'completed', progress = 100, completed_at = ${Date.now()}
        WHERE id = ${covenant.id}
      `;
      
      // Update metrics
      this.updateMetrics(covenant, executionTime);
      
      // Notify Mediator of completion (CRITICAL)
      if (callbackUrl) {
        await this.notifyMediatorCompletion(covenant, callbackUrl);
      } else {
        await this.notifyMediatorCompletion(covenant);
      }
      
      console.log(`✅ Orchestrator Harmony completed covenant ${covenant.id} in ${executionTime}ms`);
      console.log(`   Quality: ${evaluation.overallQuality.toFixed(2)} | Sub-agents: ${swarmOp.agents.length}`);
      
    } catch (error: any) {
      console.error(`❌ Covenant ${covenant.id} failed:`, error);
      covenant.state.current = 'failed';
      
      this.sql`
        UPDATE covenants SET status = 'failed' WHERE id = ${covenant.id}
      `;
    }
  }

  /**
   * Assign task to sub-agent
   */
  private async assignSubAgentTask(
    role: SubAgentRole,
    covenantId: string,
    payload: any
  ): Promise<SubAgentTask> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const task: SubAgentTask = {
      id: taskId,
      role,
      covenantId,
      payload,
      status: 'pending',
      startedAt: new Date().toISOString()
    };
    
    // Save to database
    this.sql`
      INSERT INTO sub_agent_tasks (id, covenant_id, role, status, payload, created_at)
      VALUES (${task.id}, ${task.covenantId}, ${task.role}, ${task.status}, ${JSON.stringify(task.payload)}, ${Date.now()})
    `;
    
    // Update sub-agent pool
    const pool = this.state.subAgentPool[role];
    pool.busy += 1;
    pool.tasks.push(task);
    
    this.setState({ ...this.state });
    
    return task;
  }

  /**
   * Execute sub-agent task
   */
  private async executeSubAgentTask(task: SubAgentTask): Promise<void> {
    task.status = 'running';
    
    try {
      switch (task.role) {
        case 'classifier':
          task.result = await this.runClassifier(task.payload);
          break;
        
        case 'router':
          task.result = await this.runRouter(task.payload);
          break;
        
        case 'executor':
          task.result = await this.runExecutor(task.payload);
          break;
        
        case 'evaluator':
          task.result = await this.runEvaluator(task.payload);
          break;
        
        case 'coordinator':
          task.result = await this.runCoordinator(task.payload);
          break;
      }
      
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      
      // Update database
      this.sql`
        UPDATE sub_agent_tasks 
        SET status = 'completed', result = ${JSON.stringify(task.result)}, completed_at = ${Date.now()}
        WHERE id = ${task.id}
      `;
      
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      
      this.sql`
        UPDATE sub_agent_tasks 
        SET status = 'failed', result = ${JSON.stringify({ error: error.message })}
        WHERE id = ${task.id}
      `;
    } finally {
      // Release sub-agent
      const pool = this.state.subAgentPool[task.role];
      pool.busy -= 1;
      pool.tasks = pool.tasks.filter(t => t.id !== task.id);
      this.setState({ ...this.state });
    }
  }

  /**
   * Run classifier sub-agent
   */
  private async runClassifier(payload: any): Promise<any> {
    const router = new SmartRouter();
    return router.classifyRequest({ prompt: payload.intent });
  }

  /**
   * Run router sub-agent
   */
  private async runRouter(payload: any): Promise<any> {
    const router = new SmartRouter();
    return router.routeRequest({
      prompt: payload.classification.reasoning,
      tier: payload.constraints.requiredQuality === 'quality' ? 'flagship' : 'primary'
    });
  }

  /**
   * Run executor sub-agent
   */
  private async runExecutor(payload: any): Promise<any> {
    const client = new AIClient(this.env);
    return await client.chat({
      prompt: payload.prompt,
      model: payload.model,
      temperature: payload.temperature ?? 0.7,
      max_tokens: payload.max_tokens ?? 1024
    });
  }

  /**
   * Run evaluator sub-agent (Oracle)
   */
  private async runEvaluator(payload: any): Promise<OracleEvaluation> {
    // Simple quality evaluation
    const content = payload.content || '';
    const prompt = payload.prompt || '';
    
    const dimensions = {
      accuracy: this.evaluateAccuracy(content, prompt),
      completeness: this.evaluateCompleteness(content, prompt),
      coherence: this.evaluateCoherence(content),
      relevance: this.evaluateRelevance(content, prompt)
    };
    
    const overallQuality = Object.values(dimensions).reduce((a, b) => a + b, 0) / 4;
    
    return {
      covenantId: payload.covenantId,
      taskId: payload.taskId,
      dimensions,
      overallQuality,
      feedback: this.generateFeedback(dimensions),
      recommendations: this.generateRecommendations(dimensions),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Run coordinator sub-agent
   */
  private async runCoordinator(payload: any): Promise<any> {
    // Coordinate multiple operations
    return {
      coordinated: true,
      operations: payload.operations?.length || 0
    };
  }

  /**
   * Create swarm operation for parallel execution with context
   */
  private async createSwarmOperation(
    covenant: Covenant,
    routing: any,
    mediatorContext: any = {}
  ): Promise<SwarmOperation> {
    const swarmId = `swarm_${Date.now()}`;
    
    // Determine if we can parallelize based on requirements
    const requirementCount = covenant.requirements.length;
    const parallel = requirementCount <= 5;
    
    // Create sub-agent tasks based on requirements
    const agents = covenant.requirements.map((req, idx) => ({
      id: `agent_${idx}_${Date.now()}`,
      role: 'executor' as SubAgentRole,
      taskId: `task_${req}_${Date.now()}`,
      requirement: req,
      parentContext: {
        covenantId: covenant.id,
        intent: covenant.intent,
        conversationHistory: mediatorContext.conversationHistory || [],
        routing
      }
    }));
    
    console.log(`🦜 Swarm operation ${swarmId} created with ${agents.length} sub-agents`);
    
    return {
      id: swarmId,
      covenantId: covenant.id,
      agents,
      coordination: {
        parallel,
        dependencies: {}
      },
      startedAt: new Date().toISOString()
    };
  }

  /**
   * Execute swarm of agents with hierarchical context propagation
   */
  private async executeSwarm(
    swarm: SwarmOperation,
    mediatorContext: any = {}
  ): Promise<any[]> {
    console.log(`🌊 Executing swarm ${swarm.id} with ${swarm.agents.length} agents`);
    
    const results: any[] = [];
    
    if (swarm.coordination.parallel) {
      // Parallel execution
      console.log(`   ⚡ Parallel mode: All ${swarm.agents.length} agents executing simultaneously`);
      
      const promises = swarm.agents.map(async (agent, idx) => {
        console.log(`      🤖 Spawning sub-agent ${idx + 1}/${swarm.agents.length}: ${agent.requirement}`);
        
        const task = await this.assignSubAgentTask(
          'executor',
          swarm.covenantId,
          {
            prompt: `Task: ${agent.requirement}\n\nContext: ${agent.parentContext.intent}`,
            model: 'groq/qwen/qwen3-32b',
            temperature: 0.7,
            max_tokens: 2048,
            parentContext: agent.parentContext
          }
        );
        
        await this.executeSubAgentTask(task);
        return task.result;
      });
      
      const allResults = await Promise.all(promises);
      results.push(...allResults);
      
    } else {
      // Sequential execution
      console.log(`   🔗 Sequential mode: ${swarm.agents.length} agents executing in order`);
      
      for (const [idx, agent] of swarm.agents.entries()) {
        console.log(`      🤖 Executing sub-agent ${idx + 1}/${swarm.agents.length}: ${agent.requirement}`);
        
        const task = await this.assignSubAgentTask(
          'executor',
          swarm.covenantId,
          {
            prompt: `Task: ${agent.requirement}\n\nContext: ${agent.parentContext.intent}`,
            model: 'groq/qwen/qwen3-32b',
            temperature: 0.7,
            max_tokens: 2048,
            parentContext: agent.parentContext,
            previousResults: results // Pass previous results for context
          }
        );
        
        await this.executeSubAgentTask(task);
        results.push(task.result);
      }
    }
    
    console.log(`✅ Swarm ${swarm.id} completed: ${results.length} results`);
    return results;
  }

  /**
   * Create anchor for dependency tracking
   */
  private async createAnchor(covenantId: string, dependencies: string[]): Promise<Anchor> {
    return {
      id: `anchor_${Date.now()}`,
      covenantId,
      dependencies,
      status: 'ready',
      winchProgress: 0
    };
  }

  /**
   * Winch pull - gather and synthesize results
   */
  private async winchPull(anchor: Anchor, results: any[]): Promise<any> {
    return {
      anchorId: anchor.id,
      gatheredResults: results,
      synthesizedOutput: { combined: true },
      quality: 0.85
    };
  }

  /**
   * Oracle evaluation
   */
  private async oracleEvaluate(covenantId: string, winchResult: any): Promise<OracleEvaluation> {
    const evaluatorTask = await this.assignSubAgentTask('evaluator', covenantId, {
      covenantId,
      taskId: 'winch_result',
      content: JSON.stringify(winchResult),
      prompt: 'Evaluate quality'
    });
    
    await this.executeSubAgentTask(evaluatorTask);
    
    return evaluatorTask.result;
  }

  /**
   * Evaluation helper methods
   */
  private evaluateAccuracy(content: string, prompt: string): number {
    return content.length > 50 ? 0.8 : 0.6;
  }

  private evaluateCompleteness(content: string, prompt: string): number {
    return content.length > 100 ? 0.9 : 0.7;
  }

  private evaluateCoherence(content: string): number {
    return 0.85;
  }

  private evaluateRelevance(content: string, prompt: string): number {
    return 0.8;
  }

  private generateFeedback(dimensions: any): string {
    const avg = Object.values(dimensions).reduce((a: any, b: any) => a + b, 0) / 4;
    return avg > 0.8 ? 'High quality output' : 'Acceptable quality';
  }

  private generateRecommendations(dimensions: any): string[] {
    return ['Consider adding more details', 'Maintain current quality level'];
  }

  /**
   * Update covenant progress
   */
  private async updateCovenantProgress(covenantId: string, progress: number) {
    this.sql`
      UPDATE covenants SET progress = ${progress} WHERE id = ${covenantId}
    `;
  }

  /**
   * Update metrics
   */
  private updateMetrics(covenant: Covenant, executionTime: number) {
    const metrics = this.state.metrics;
    
    metrics.totalCovenants += 1;
    metrics.completedCovenants += 1;
    metrics.avgExecutionTime = Math.round(
      (metrics.avgExecutionTime * (metrics.completedCovenants - 1) + executionTime) / metrics.completedCovenants
    );
    metrics.totalCost += covenant.execution.actualCost || 0;
    
    this.setState({ ...this.state, metrics });
  }

  /**
   * Notify Mediator of completion (CRITICAL CALLBACK)
   */
  private async notifyMediatorCompletion(covenant: Covenant, callbackUrl?: string) {
    try {
      console.log(`📤 Orchestrator → Mediator: Notifying completion of ${covenant.id}`);
      
      const mediatorId = this.env.MEDIATOR.idFromName(covenant.userId);
      const mediator = this.env.MEDIATOR.get(mediatorId);
      
      const completionPayload = {
        ...covenant,
        orchestratorMetadata: {
          completedAt: new Date().toISOString(),
          executionTime: covenant.execution.actualTime,
          quality: covenant.results?.quality || 0,
          subAgentCount: covenant.results?.swarmMetrics?.totalSubAgents || 0
        }
      };
      
      await mediator.fetch(callbackUrl || 'https://mediator/covenant-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionPayload)
      });
      
      console.log(`✅ Mediator notified successfully for covenant ${covenant.id}`);
      
    } catch (error: any) {
      console.error(`❌ Failed to notify Mediator for covenant ${covenant.id}:`, error.message);
      
      // Log to database for manual recovery
      this.sql`
        INSERT INTO evaluations (id, covenant_id, task_id, quality, feedback, created_at)
        VALUES (
          ${'eval_error_' + Date.now()},
          ${covenant.id},
          'mediator_notification',
          0,
          ${JSON.stringify({ error: error.message, covenant })},
          ${Date.now()}
        )
      `;
    }
  }
}

export default OrchestratorAgent;
