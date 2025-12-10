/**
 * AI Orchestration Patterns for Harpoon v2
 * 
 * These patterns work in both Node.js (dev) and Cloudflare Workers (production)
 * Based on Cloudflare's recommended AI patterns
 */

import type { ChatMessage, ChatRequest, ChatResponse, AIModel } from '../types';

export interface OrchestrationResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    pattern: string;
    duration_ms: number;
    cost_estimate: number;
    models_used: string[];
  };
}

/**
 * Pattern 1: Parallelization
 * Execute multiple AI tasks simultaneously
 * 
 * Use case: Process batch requests, generate multiple variations
 */
export class ParallelizationPattern {
  constructor(
    private aiClient: any // UnifiedAIClient instance
  ) {}

  async execute(requests: ChatRequest[]): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const modelsUsed: string[] = [];
    let totalCost = 0;

    try {
      // Execute all requests in parallel
      const results = await Promise.allSettled(
        requests.map(async (req) => {
          const response = await this.aiClient.chat({
            model: req.model || 'groq/llama-3.1-8b-instant',
            messages: req.messages,
            temperature: req.temperature,
            max_tokens: req.max_tokens
          });
          
          modelsUsed.push(req.model || 'groq/llama-3.1-8b-instant');
          totalCost += this.estimateCost(req, response);
          
          return response;
        })
      );

      // Aggregate results
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      return {
        success: failed.length === 0,
        data: {
          total: results.length,
          successful: successful.length,
          failed: failed.length,
          results: results.map((r, i) => ({
            index: i,
            status: r.status,
            data: r.status === 'fulfilled' ? r.value : null,
            error: r.status === 'rejected' ? r.reason.message : null
          }))
        },
        metadata: {
          pattern: 'parallelization',
          duration_ms: Date.now() - startTime,
          cost_estimate: totalCost,
          models_used: [...new Set(modelsUsed)]
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          pattern: 'parallelization',
          duration_ms: Date.now() - startTime,
          cost_estimate: totalCost,
          models_used: modelsUsed
        }
      };
    }
  }

  private estimateCost(request: ChatRequest, response: any): number {
    const inputTokens = JSON.stringify(request.messages).length / 4;
    const outputTokens = response.content?.length / 4 || 0;
    
    // Rough cost estimate (adjust based on actual pricing)
    const costPerMToken = 0.05; // $0.05 per 1M tokens for Groq
    return ((inputTokens + outputTokens) / 1_000_000) * costPerMToken;
  }
}

/**
 * Pattern 2: Orchestrator-Workers
 * Central orchestrator LLM delegates tasks to specialized worker LLMs
 * 
 * Use case: Complex workflows, multi-step reasoning
 */
export class OrchestratorWorkersPattern {
  constructor(
    private aiClient: any,
    private orchestratorModel: string = 'openai/gpt-4o-mini', // Smart orchestrator
    private workerModel: string = 'groq/llama-3.1-8b-instant' // Fast workers
  ) {}

  async execute(userPrompt: string, context?: any): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const modelsUsed: string[] = [];
    let totalCost = 0;

    try {
      // Step 1: Orchestrator analyzes and creates task plan
      const orchestratorPrompt = `You are an orchestrator AI. Analyze this user request and break it into specific sub-tasks that can be executed in parallel.

User Request: ${userPrompt}

${context ? `Context: ${JSON.stringify(context)}` : ''}

Return a JSON array of tasks with format:
[
  { "id": "task1", "description": "Specific task description", "dependencies": [] },
  { "id": "task2", "description": "Another task", "dependencies": ["task1"] }
]

Return ONLY valid JSON, no other text.`;

      const orchestratorResponse = await this.aiClient.chat({
        model: this.orchestratorModel,
        messages: [{ role: 'user', content: orchestratorPrompt }],
        temperature: 0.3,
        max_tokens: 1000
      });
      
      modelsUsed.push(this.orchestratorModel);
      totalCost += 0.001; // Estimated orchestrator cost

      // Parse task plan
      let tasks: any[];
      try {
        const jsonMatch = orchestratorResponse.content.match(/\[[\s\S]*\]/);
        tasks = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch (e) {
        tasks = [{ id: 'fallback', description: userPrompt, dependencies: [] }];
      }

      // Step 2: Execute tasks with workers (respecting dependencies)
      const taskResults: Record<string, any> = {};
      const executedTasks = new Set<string>();

      while (executedTasks.size < tasks.length) {
        // Find tasks ready to execute (all dependencies met)
        const readyTasks = tasks.filter(
          task => !executedTasks.has(task.id) && 
                  task.dependencies.every((dep: string) => executedTasks.has(dep))
        );

        if (readyTasks.length === 0 && executedTasks.size < tasks.length) {
          throw new Error('Circular dependency detected in task plan');
        }

        // Execute ready tasks in parallel
        const results = await Promise.all(
          readyTasks.map(async (task) => {
            // Build context from dependencies
            const depContext = task.dependencies
              .map((depId: string) => `${depId}: ${taskResults[depId]}`)
              .join('\n');

            const workerPrompt = `${task.description}

${depContext ? `Previous results:\n${depContext}` : ''}

Provide a clear, concise answer.`;

            const response = await this.aiClient.chat({
              model: this.workerModel,
              messages: [{ role: 'user', content: workerPrompt }],
              temperature: 0.7,
              max_tokens: 500
            });

            return { taskId: task.id, result: response.content };
          })
        );

        // Store results and mark as executed
        results.forEach(({ taskId, result }) => {
          taskResults[taskId] = result;
          executedTasks.add(taskId);
        });

        modelsUsed.push(...Array(results.length).fill(this.workerModel));
        totalCost += results.length * 0.0001;
      }

      // Step 3: Orchestrator synthesizes final result
      const synthesisPrompt = `You are an orchestrator AI. Synthesize these task results into a coherent final answer for the user.

Original Request: ${userPrompt}

Task Results:
${Object.entries(taskResults).map(([id, result]) => `${id}: ${result}`).join('\n\n')}

Provide a comprehensive, well-structured final answer.`;

      const finalResponse = await this.aiClient.chat({
        model: this.orchestratorModel,
        messages: [{ role: 'user', content: synthesisPrompt }],
        temperature: 0.5,
        max_tokens: 1000
      });

      modelsUsed.push(this.orchestratorModel);
      totalCost += 0.001;

      return {
        success: true,
        data: {
          plan: tasks,
          task_results: taskResults,
          final_answer: finalResponse.content
        },
        metadata: {
          pattern: 'orchestrator-workers',
          duration_ms: Date.now() - startTime,
          cost_estimate: totalCost,
          models_used: [...new Set(modelsUsed)]
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          pattern: 'orchestrator-workers',
          duration_ms: Date.now() - startTime,
          cost_estimate: totalCost,
          models_used: modelsUsed
        }
      };
    }
  }
}

/**
 * Pattern 3: Evaluator-Optimizer
 * One LLM generates, another evaluates and provides feedback in a loop
 * 
 * Use case: Quality improvement, code review, content refinement
 */
export class EvaluatorOptimizerPattern {
  constructor(
    private aiClient: any,
    private generatorModel: string = 'groq/llama-3.1-8b-instant', // Fast generator
    private evaluatorModel: string = 'openai/gpt-4o-mini', // Smart evaluator
    private maxIterations: number = 3
  ) {}

  async execute(
    task: string,
    qualityThreshold: number = 8.0
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const modelsUsed: string[] = [];
    let totalCost = 0;

    try {
      let currentOutput = '';
      let currentScore = 0;
      let iteration = 0;
      const history: Array<{iteration: number; output: string; score: number; feedback: string}> = [];

      while (iteration < this.maxIterations && currentScore < qualityThreshold) {
        iteration++;

        // Step 1: Generator creates/improves output
        const generatorPrompt = iteration === 1
          ? `Task: ${task}\n\nProvide your best solution.`
          : `Task: ${task}

Previous attempt (score: ${currentScore}/10):
${currentOutput}

Feedback for improvement:
${history[history.length - 1]?.feedback}

Create an improved version addressing the feedback.`;

        const generatorResponse = await this.aiClient.chat({
          model: this.generatorModel,
          messages: [{ role: 'user', content: generatorPrompt }],
          temperature: 0.7,
          max_tokens: 1000
        });

        currentOutput = generatorResponse.content;
        modelsUsed.push(this.generatorModel);
        totalCost += 0.0001;

        // Step 2: Evaluator assesses quality
        const evaluatorPrompt = `You are a quality evaluator. Assess this output for the given task.

Task: ${task}

Output to evaluate:
${currentOutput}

Provide:
1. A score from 1-10 (10 being perfect)
2. Specific feedback for improvement

Format your response as JSON:
{
  "score": <number>,
  "feedback": "<detailed feedback>",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"]
}`;

        const evaluatorResponse = await this.aiClient.chat({
          model: this.evaluatorModel,
          messages: [{ role: 'user', content: evaluatorPrompt }],
          temperature: 0.3,
          max_tokens: 500
        });

        modelsUsed.push(this.evaluatorModel);
        totalCost += 0.0005;

        // Parse evaluation
        let evaluation: any;
        try {
          const jsonMatch = evaluatorResponse.content.match(/\{[\s\S]*\}/);
          evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 5, feedback: 'No detailed feedback' };
        } catch (e) {
          evaluation = { score: 5, feedback: evaluatorResponse.content };
        }

        currentScore = evaluation.score;

        history.push({
          iteration,
          output: currentOutput,
          score: currentScore,
          feedback: evaluation.feedback
        });

        // Break if quality threshold met
        if (currentScore >= qualityThreshold) {
          break;
        }
      }

      return {
        success: true,
        data: {
          final_output: currentOutput,
          final_score: currentScore,
          iterations: iteration,
          history,
          quality_threshold: qualityThreshold,
          threshold_met: currentScore >= qualityThreshold
        },
        metadata: {
          pattern: 'evaluator-optimizer',
          duration_ms: Date.now() - startTime,
          cost_estimate: totalCost,
          models_used: [...new Set(modelsUsed)]
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          pattern: 'evaluator-optimizer',
          duration_ms: Date.now() - startTime,
          cost_estimate: totalCost,
          models_used: modelsUsed
        }
      };
    }
  }
}

/**
 * Pattern 4: Smart Router with Fallback
 * Route to optimal model with automatic fallback on failure
 */
export class SmartRouterPattern {
  constructor(
    private aiClient: any,
    private router: any // SmartRouter instance
  ) {}

  async execute(
    prompt: string,
    preferences?: { maxCost?: number; maxLatency?: number; minQuality?: number }
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();

    try {
      // Get routing decision
      const decision = this.router.routeRequest({ prompt, ...preferences });
      const primaryModel = decision.selected_model.id;
      const fallbackModels = (decision.fallback_models || []).map((m: any) => m.id);

      let response;
      let modelUsed = primaryModel;
      let attempts = 0;

      // Try primary model, then fallbacks
      const modelsToTry = [primaryModel, ...fallbackModels];

      for (const model of modelsToTry) {
        attempts++;
        try {
          response = await this.aiClient.chat({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
          });
          modelUsed = model;
          break; // Success!
        } catch (error) {
          if (attempts === modelsToTry.length) {
            throw error; // All models failed
          }
          // Try next model
          continue;
        }
      }

      return {
        success: true,
        data: {
          answer: response.content,
          routing_decision: decision,
          model_used: modelUsed,
          attempts,
          used_fallback: modelUsed !== primaryModel
        },
        metadata: {
          pattern: 'smart-router',
          duration_ms: Date.now() - startTime,
          cost_estimate: decision.estimated_cost,
          models_used: [modelUsed]
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          pattern: 'smart-router',
          duration_ms: Date.now() - startTime,
          cost_estimate: 0,
          models_used: []
        }
      };
    }
  }
}
