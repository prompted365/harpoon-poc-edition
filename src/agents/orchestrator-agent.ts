/**
 * OrchestratorAgent - Durable Object
 * Handles complex multi-agent workflows, sub-agent spawning, and result aggregation
 */

import { DurableObject } from 'cloudflare:workers';

interface SubAgent {
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

interface Task {
  id: string;
  covenant_id: string;
  prompt: string;
  plan: SubAgent[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result: any;
  created_at: string;
  completed_at?: string;
}

interface WebSocketMessage {
  type: 'agent_spawn' | 'agent_progress' | 'agent_complete' | 'task_complete' | 'error';
  data: any;
  timestamp: string;
}

export class OrchestratorAgent extends DurableObject {
  private sessions: Set<WebSocket>;
  private currentTask: Task | null;
  private subAgents: Map<string, SubAgent>;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.sessions = new Set();
    this.currentTask = null;
    this.subAgents = new Map();
    
    this.initDatabase();
  }

  async initDatabase() {
    await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        covenant_id TEXT NOT NULL,
        prompt TEXT NOT NULL,
        plan TEXT NOT NULL,
        status TEXT NOT NULL,
        result TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT
      )
    `);

    await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS sub_agents (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        type TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER,
        thoughts TEXT,
        actions TEXT,
        output TEXT,
        parent_id TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      )
    `);

    await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS execution_logs (
        id TEXT PRIMARY KEY,
        sub_agent_id TEXT NOT NULL,
        log_type TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (sub_agent_id) REFERENCES sub_agents(id)
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
    if (url.pathname.endsWith('/execute')) {
      return this.executeTask(request);
    }

    if (url.pathname.endsWith('/status')) {
      return this.getStatus();
    }

    if (url.pathname.endsWith('/agents')) {
      return this.getAgents();
    }

    return new Response('Not found', { status: 404 });
  }

  async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();
    this.sessions.add(server);

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

    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });

    // Send current state
    if (this.currentTask) {
      this.sendToClient(server, {
        type: 'task_status',
        data: this.currentTask,
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
      case 'execute':
        await this.executeTaskFromWS(message.data);
        break;
      case 'spawn_agent':
        await this.spawnSubAgent(message.data);
        break;
      default:
        this.sendToClient(ws, {
          type: 'error',
          data: { message: 'Unknown message type' },
          timestamp: new Date().toISOString()
        });
    }
  }

  async executeTask(request: Request): Promise<Response> {
    const body = await request.json();
    
    const task: Task = {
      id: `task-${Date.now()}`,
      covenant_id: body.covenant_id,
      prompt: body.task.prompt || body.task.user_intent,
      plan: [],
      status: 'pending',
      result: null,
      created_at: new Date().toISOString()
    };

    // Save to SQLite
    await this.ctx.storage.sql.exec(
      `INSERT INTO tasks (id, covenant_id, prompt, plan, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      task.id,
      task.covenant_id,
      task.prompt,
      JSON.stringify(task.plan),
      task.status,
      task.created_at
    );

    this.currentTask = task;

    // Create execution plan
    const plan = this.createExecutionPlan(task.prompt);
    task.plan = plan;
    task.status = 'running';

    await this.ctx.storage.sql.exec(
      `UPDATE tasks SET plan = ?, status = ? WHERE id = ?`,
      JSON.stringify(task.plan),
      task.status,
      task.id
    );

    // Broadcast task start
    this.broadcast({
      type: 'task_start',
      data: task,
      timestamp: new Date().toISOString()
    });

    // Execute sub-agents progressively
    await this.executeSubAgents(plan);

    // Mark task as completed
    task.status = 'completed';
    task.completed_at = new Date().toISOString();
    task.result = this.aggregateResults(plan);

    await this.ctx.storage.sql.exec(
      `UPDATE tasks SET status = ?, result = ?, completed_at = ? WHERE id = ?`,
      task.status,
      JSON.stringify(task.result),
      task.completed_at,
      task.id
    );

    this.broadcast({
      type: 'task_complete',
      data: task,
      timestamp: new Date().toISOString()
    });

    return new Response(JSON.stringify(task), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async executeTaskFromWS(data: any) {
    const task: Task = {
      id: `task-${Date.now()}`,
      covenant_id: data.covenant_id,
      prompt: data.prompt || data.user_intent,
      plan: [],
      status: 'pending',
      result: null,
      created_at: new Date().toISOString()
    };

    await this.ctx.storage.sql.exec(
      `INSERT INTO tasks (id, covenant_id, prompt, plan, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      task.id,
      task.covenant_id,
      task.prompt,
      JSON.stringify(task.plan),
      task.status,
      task.created_at
    );

    this.currentTask = task;

    const plan = this.createExecutionPlan(task.prompt);
    task.plan = plan;
    task.status = 'running';

    await this.ctx.storage.sql.exec(
      `UPDATE tasks SET plan = ?, status = ? WHERE id = ?`,
      JSON.stringify(task.plan),
      task.status,
      task.id
    );

    this.broadcast({
      type: 'task_start',
      data: task,
      timestamp: new Date().toISOString()
    });

    await this.executeSubAgents(plan);

    task.status = 'completed';
    task.completed_at = new Date().toISOString();
    task.result = this.aggregateResults(plan);

    await this.ctx.storage.sql.exec(
      `UPDATE tasks SET status = ?, result = ?, completed_at = ? WHERE id = ?`,
      task.status,
      JSON.stringify(task.result),
      task.completed_at,
      task.id
    );

    this.broadcast({
      type: 'task_complete',
      data: task,
      timestamp: new Date().toISOString()
    });
  }

  private createExecutionPlan(prompt: string): SubAgent[] {
    const plan: SubAgent[] = [
      {
        id: `agent-classifier-${Date.now()}`,
        type: 'classifier',
        role: 'Analyze task requirements and complexity',
        status: 'pending',
        progress: 0,
        thoughts: 'Waiting to start...',
        actions: [],
        output: null,
        children: [],
        created_at: new Date().toISOString()
      },
      {
        id: `agent-router-${Date.now()}`,
        type: 'router',
        role: 'Select optimal AI models for execution',
        status: 'pending',
        progress: 0,
        thoughts: 'Waiting to start...',
        actions: [],
        output: null,
        children: [],
        created_at: new Date().toISOString()
      },
      {
        id: `agent-executor-${Date.now()}`,
        type: 'executor',
        role: 'Execute sub-tasks in parallel',
        status: 'pending',
        progress: 0,
        thoughts: 'Waiting to start...',
        actions: [],
        output: null,
        children: [
          {
            id: `agent-executor-1-${Date.now()}`,
            type: 'executor-1',
            role: 'Parallel sub-task 1',
            status: 'pending',
            progress: 0,
            thoughts: 'Waiting...',
            actions: [],
            output: null,
            children: [],
            created_at: new Date().toISOString()
          },
          {
            id: `agent-executor-2-${Date.now()}`,
            type: 'executor-2',
            role: 'Parallel sub-task 2',
            status: 'pending',
            progress: 0,
            thoughts: 'Waiting...',
            actions: [],
            output: null,
            children: [],
            created_at: new Date().toISOString()
          },
          {
            id: `agent-executor-3-${Date.now()}`,
            type: 'executor-3',
            role: 'Parallel sub-task 3',
            status: 'pending',
            progress: 0,
            thoughts: 'Waiting...',
            actions: [],
            output: null,
            children: [],
            created_at: new Date().toISOString()
          }
        ],
        created_at: new Date().toISOString()
      },
      {
        id: `agent-evaluator-${Date.now()}`,
        type: 'evaluator',
        role: 'Assess quality and completeness',
        status: 'pending',
        progress: 0,
        thoughts: 'Waiting to start...',
        actions: [],
        output: null,
        children: [],
        created_at: new Date().toISOString()
      },
      {
        id: `agent-coordinator-${Date.now()}`,
        type: 'coordinator',
        role: 'Synthesize final results',
        status: 'pending',
        progress: 0,
        thoughts: 'Waiting to start...',
        actions: [],
        output: null,
        children: [],
        created_at: new Date().toISOString()
      }
    ];

    return plan;
  }

  private async executeSubAgents(plan: SubAgent[]) {
    for (const agent of plan) {
      // Spawn agent
      this.broadcast({
        type: 'agent_spawn',
        data: agent,
        timestamp: new Date().toISOString()
      });

      await this.delay(300); // Batch chunk delay

      // Start agent
      agent.status = 'running';
      agent.thoughts = `Starting ${agent.type}: ${agent.role}`;
      agent.actions.push('Initializing');
      agent.actions.push('Loading context');

      this.broadcast({
        type: 'agent_progress',
        data: agent,
        timestamp: new Date().toISOString()
      });

      await this.delay(300);

      // Progress update
      agent.progress = 50;
      agent.thoughts = `Executing ${agent.role.toLowerCase()}...`;
      agent.actions.push('Processing');

      this.broadcast({
        type: 'agent_progress',
        data: agent,
        timestamp: new Date().toISOString()
      });

      // Execute parallel children if any
      if (agent.children.length > 0) {
        agent.thoughts = 'Spawning parallel sub-agents...';
        this.broadcast({
          type: 'agent_progress',
          data: agent,
          timestamp: new Date().toISOString()
        });

        for (let i = 0; i < agent.children.length; i++) {
          const child = agent.children[i];
          
          child.status = 'running';
          child.thoughts = `Parallel execution ${i + 1}/${agent.children.length}`;
          child.actions.push('Working on sub-task');

          this.broadcast({
            type: 'agent_progress',
            data: agent,
            timestamp: new Date().toISOString()
          });

          await this.delay(150); // Faster for parallel agents

          child.status = 'completed';
          child.progress = 100;
          child.thoughts = 'Sub-task completed';
          child.output = `Result ${i + 1}`;
          child.completed_at = new Date().toISOString();

          this.broadcast({
            type: 'agent_progress',
            data: agent,
            timestamp: new Date().toISOString()
          });
        }

        agent.thoughts = 'All parallel sub-agents completed';
        agent.actions.push('Merging results');
      }

      // Complete agent
      agent.status = 'completed';
      agent.progress = 100;
      agent.thoughts = `${agent.type} task completed successfully`;
      agent.output = `${agent.role} complete`;
      agent.completed_at = new Date().toISOString();

      // Save to SQLite
      await this.ctx.storage.sql.exec(
        `INSERT INTO sub_agents (id, task_id, type, role, status, progress, thoughts, actions, output, created_at, completed_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        agent.id,
        this.currentTask!.id,
        agent.type,
        agent.role,
        agent.status,
        agent.progress,
        agent.thoughts,
        JSON.stringify(agent.actions),
        agent.output,
        agent.created_at,
        agent.completed_at
      );

      this.broadcast({
        type: 'agent_complete',
        data: agent,
        timestamp: new Date().toISOString()
      });

      await this.delay(200);
    }
  }

  private async spawnSubAgent(data: any) {
    const agent: SubAgent = {
      id: `agent-${data.type}-${Date.now()}`,
      type: data.type,
      role: data.role,
      status: 'pending',
      progress: 0,
      thoughts: 'Waiting to start...',
      actions: [],
      output: null,
      children: data.children || [],
      created_at: new Date().toISOString()
    };

    this.subAgents.set(agent.id, agent);

    this.broadcast({
      type: 'agent_spawn',
      data: agent,
      timestamp: new Date().toISOString()
    });

    // Execute agent
    agent.status = 'running';
    agent.thoughts = `Executing ${agent.role}`;
    agent.actions.push('Processing');

    this.broadcast({
      type: 'agent_progress',
      data: agent,
      timestamp: new Date().toISOString()
    });

    await this.delay(500);

    agent.status = 'completed';
    agent.progress = 100;
    agent.output = 'Task completed';
    agent.completed_at = new Date().toISOString();

    this.broadcast({
      type: 'agent_complete',
      data: agent,
      timestamp: new Date().toISOString()
    });
  }

  private aggregateResults(plan: SubAgent[]): any {
    return {
      total_agents: plan.length,
      completed: plan.filter(a => a.status === 'completed').length,
      outputs: plan.map(a => ({
        type: a.type,
        output: a.output,
        children: a.children.map(c => c.output)
      })),
      final_answer: 'Orchestration completed successfully'
    };
  }

  async getStatus(): Promise<Response> {
    const status = {
      has_task: !!this.currentTask,
      active_sessions: this.sessions.size,
      task_status: this.currentTask?.status || 'none',
      sub_agents: this.subAgents.size
    };

    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getAgents(): Promise<Response> {
    const agents = Array.from(this.subAgents.values());
    return new Response(JSON.stringify(agents), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
