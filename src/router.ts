/**
 * Harpoon v2 Smart Routing Engine
 * Intelligent model selection based on task complexity, cost, and latency
 */

import type { AIRequest, ClassificationResult, RoutingDecision, ModelTier } from './types';
import { MODEL_REGISTRY, getModelsByTier, getDefaultModel } from './models';

export class SmartRouter {
  /**
   * Classify request complexity
   */
  classifyRequest(request: AIRequest): ClassificationResult {
    const prompt = request.prompt.toLowerCase();
    const wordCount = prompt.split(/\s+/).length;
    
    // Simple heuristics for classification
    let complexity: ClassificationResult['complexity'];
    let recommended_tier: ModelTier;
    let reasoning: string;

    // Check for complex indicators
    const complexIndicators = [
      'analyze', 'explain in detail', 'comprehensive', 'compare',
      'evaluate', 'critique', 'research', 'multi-step'
    ];
    
    const simpleIndicators = [
      'hello', 'hi', 'what is', 'define', 'list', 'name'
    ];

    const hasComplexIndicator = complexIndicators.some(ind => prompt.includes(ind));
    const hasSimpleIndicator = simpleIndicators.some(ind => prompt.includes(ind));

    if (wordCount < 10 && hasSimpleIndicator) {
      complexity = 'simple';
      recommended_tier = 'edge';
      reasoning = 'Short, simple query - use ultra-fast edge models';
    } else if (wordCount < 50 && !hasComplexIndicator) {
      complexity = 'moderate';
      recommended_tier = 'primary';
      reasoning = 'Moderate query - use Groq for speed and cost efficiency';
    } else if (hasComplexIndicator || wordCount > 100) {
      complexity = 'complex';
      recommended_tier = 'primary';
      reasoning = 'Complex query - use powerful Groq models';
    } else {
      complexity = 'moderate';
      recommended_tier = 'primary';
      reasoning = 'Standard query - use balanced Groq models';
    }

    // Override for explicit tier request
    if (request.tier) {
      recommended_tier = request.tier;
      reasoning = `User-specified tier: ${request.tier}`;
    }

    return {
      complexity,
      confidence: 0.85,
      recommended_tier,
      recommended_model: getDefaultModel(recommended_tier).id,
      reasoning
    };
  }

  /**
   * Make routing decision based on classification
   */
  routeRequest(request: AIRequest): RoutingDecision {
    const classification = this.classifyRequest(request);
    
    // Select primary model - ALWAYS use Groq unless explicitly specified
    const groqModel = MODEL_REGISTRY.find(m => m.provider === 'groq');
    const selectedModel = request.model 
      ? MODEL_REGISTRY.find(m => m.id === request.model) || groqModel
      : groqModel;

    // Select fallback models - OpenAI as backup
    const openaiModel = MODEL_REGISTRY.find(m => m.provider === 'openai');
    const fallbackModels = openaiModel && openaiModel.id !== selectedModel?.id ? [openaiModel] : [];

    // Estimate cost and latency
    const estimatedTokens = Math.max(
      request.prompt.split(/\s+/).length * 1.3, // prompt tokens
      (request.max_tokens || 1024) // completion tokens
    );
    
    const estimatedCost = (estimatedTokens / 1000000) * selectedModel.costPer1M;
    const estimatedLatency = (estimatedTokens / selectedModel.speed) * 1000;

    return {
      selected_model: selectedModel,
      fallback_models: fallbackModels,
      reasoning: `${classification.reasoning}. Selected ${selectedModel.id} (${selectedModel.speed} T/sec)`,
      estimated_cost: estimatedCost,
      estimated_latency: estimatedLatency
    };
  }

  /**
   * Get routing explanation for UI
   */
  explainRouting(decision: RoutingDecision): string {
    const model = decision.selected_model;
    return `🎯 **Routing Decision**
    
**Selected Model**: ${model.id}
**Provider**: ${model.provider.toUpperCase()}
**Tier**: ${model.tier.toUpperCase()}
**Speed**: ${model.speed} tokens/sec
**Cost**: $${model.costPer1M}/1M tokens

**Reasoning**: ${decision.reasoning}

**Estimated**:
- Cost: $${decision.estimated_cost.toFixed(6)}
- Latency: ~${Math.round(decision.estimated_latency)}ms

**Fallback Models**: ${decision.fallback_models.map(m => m.id).join(', ') || 'None'}`;
  }
}
