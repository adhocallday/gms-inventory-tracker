/**
 * Streaming Projection Agent
 *
 * Provides streaming AI responses for projection analysis with visible thought process.
 * Uses Server-Sent Events (SSE) compatible async generators.
 *
 * @module streaming-projection-agent
 */

import Anthropic from '@anthropic-ai/sdk';
import { getModelForTask, getModelName } from './models';
import type { ProjectionContext, ComprehensiveProjection, ProjectionAnalysis } from './projection-agent';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * Suggested override from AI intervention
 */
export interface SuggestedOverride {
  sku: string;
  productName: string;
  size?: string | null;
  bucket: 'estimated_sellout' | 'minimum_stock' | 'opening_stock';
  currentValue: number;
  suggestedValue: number;
  reason: string;
}

/**
 * Stream event types for UI consumption
 */
export interface StreamEvent {
  type: 'phase' | 'thinking' | 'content' | 'json' | 'override_suggestion' | 'complete' | 'error';
  phase?: string;
  content?: string;
  data?: any;
  progress?: number;
  overrides?: SuggestedOverride[];
}

/**
 * Stream analysis with visible thought process
 */
export async function* streamAnalysis(
  context: ProjectionContext
): AsyncGenerator<StreamEvent> {
  const model = getModelForTask('projection-analysis');
  console.log(`[StreamingAgent] streamAnalysis using ${getModelName(model)}`);

  yield { type: 'phase', phase: 'Connecting to AI...' };

  const prompt = buildStreamingAnalysisPrompt(context);

  try {
    yield { type: 'phase', phase: 'Analyzing historical sales data...', progress: 10 };

    const stream = anthropic.messages.stream({
      model,
      max_tokens: 16384,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    let accumulatedText = '';
    let currentSection = '';
    const sections = ['SIZE_CURVES', 'PERFORMANCE', 'STOCKOUT_RISKS', 'SUMMARY'];
    let sectionIndex = 0;

    yield { type: 'phase', phase: 'Processing response...', progress: 20 };

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        accumulatedText += text;

        // Detect section changes for phase updates
        for (const section of sections) {
          if (text.includes(section) && currentSection !== section) {
            currentSection = section;
            sectionIndex = sections.indexOf(section);
            const phaseMap: Record<string, string> = {
              'SIZE_CURVES': 'Analyzing size distribution patterns...',
              'PERFORMANCE': 'Evaluating product performance...',
              'STOCKOUT_RISKS': 'Assessing inventory risks...',
              'SUMMARY': 'Generating final analysis...'
            };
            yield {
              type: 'phase',
              phase: phaseMap[section] || 'Processing...',
              progress: 30 + (sectionIndex * 15)
            };
          }
        }

        // Stream the content
        yield { type: 'content', content: text };
      }

      if (event.type === 'message_stop') {
        yield { type: 'phase', phase: 'Parsing results...', progress: 90 };

        // Parse the accumulated response
        try {
          const analysis = parseStreamedAnalysis(accumulatedText);
          yield { type: 'json', data: analysis };
        } catch (parseError) {
          console.error('[StreamingAgent] Parse error:', parseError);
          yield { type: 'error', content: 'Failed to parse analysis results' };
        }
      }
    }

    yield { type: 'phase', phase: 'Complete', progress: 100 };
    yield { type: 'complete' };

  } catch (error: any) {
    console.error('[StreamingAgent] Stream error:', error);
    yield { type: 'error', content: error.message || 'Stream failed' };
  }
}

/**
 * Stream comprehensive projections generation
 */
export async function* streamComprehensiveProjections(
  context: ProjectionContext
): AsyncGenerator<StreamEvent> {
  const model = getModelForTask('comprehensive-projections');
  console.log(`[StreamingAgent] streamComprehensiveProjections using ${getModelName(model)}`);

  yield { type: 'phase', phase: 'Initializing projection model...', progress: 5 };

  const prompt = buildStreamingProjectionPrompt(context);

  try {
    yield { type: 'thinking', content: 'Analyzing tour data and historical patterns...' };

    const stream = anthropic.messages.stream({
      model,
      max_tokens: 16384,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    let accumulatedText = '';
    let productCount = 0;
    const totalProducts = context.productSummary?.length || 10;

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        accumulatedText += text;

        // Count SKUs being processed for progress
        const skuMatches = text.match(/"sku":/g);
        if (skuMatches) {
          productCount += skuMatches.length;
          yield {
            type: 'phase',
            phase: `Processing products (${productCount}/${totalProducts})...`,
            progress: Math.min(20 + (productCount / totalProducts) * 60, 80)
          };
        }

        // Stream thinking content (non-JSON parts)
        if (!text.includes('{') && !text.includes('}') && text.trim()) {
          yield { type: 'thinking', content: text };
        }
      }

      if (event.type === 'message_stop') {
        yield { type: 'phase', phase: 'Finalizing projections...', progress: 90 };

        try {
          const projections = parseStreamedProjections(accumulatedText);
          yield { type: 'json', data: projections };
        } catch (parseError) {
          console.error('[StreamingAgent] Parse error:', parseError);
          yield { type: 'error', content: 'Failed to parse projections' };
        }
      }
    }

    yield { type: 'phase', phase: 'Complete', progress: 100 };
    yield { type: 'complete' };

  } catch (error: any) {
    console.error('[StreamingAgent] Stream error:', error);
    yield { type: 'error', content: error.message || 'Stream failed' };
  }
}

/**
 * Stream chat responses token by token
 * Parses override suggestions from <overrides> tags and emits them separately
 */
export async function* streamChat(
  conversationHistory: { role: string; content: string }[],
  context: ProjectionContext
): AsyncGenerator<StreamEvent> {
  const model = getModelForTask('chat');
  console.log(`[StreamingAgent] streamChat using ${getModelName(model)}`);

  const systemPrompt = buildChatSystemPrompt(context);

  try {
    const stream = anthropic.messages.stream({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: conversationHistory.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    });

    let accumulatedText = '';
    let isInsideOverrides = false;
    let overridesBuffer = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        accumulatedText += text;

        // Check for <overrides> tag opening
        if (text.includes('<overrides>')) {
          isInsideOverrides = true;
          // Emit any text before the tag
          const beforeTag = text.split('<overrides>')[0];
          if (beforeTag.trim()) {
            yield { type: 'content', content: beforeTag };
          }
          overridesBuffer = '';
          continue;
        }

        // Check for </overrides> tag closing
        if (text.includes('</overrides>')) {
          isInsideOverrides = false;
          const parts = text.split('</overrides>');
          overridesBuffer += parts[0];

          // Parse and emit the overrides
          try {
            const overrides = parseOverrides(overridesBuffer);
            if (overrides.length > 0) {
              yield { type: 'override_suggestion', overrides };
            }
          } catch (parseError) {
            console.warn('[StreamingAgent] Failed to parse overrides:', parseError);
          }

          // Emit any text after the closing tag
          if (parts[1] && parts[1].trim()) {
            yield { type: 'content', content: parts[1] };
          }
          continue;
        }

        // If inside overrides block, buffer the content
        if (isInsideOverrides) {
          overridesBuffer += text;
          continue;
        }

        // Normal content - emit token by token
        yield { type: 'content', content: text };
      }

      if (event.type === 'message_stop') {
        yield { type: 'complete' };
      }
    }
  } catch (error: any) {
    console.error('[StreamingAgent] Chat stream error:', error);
    yield { type: 'error', content: error.message || 'Chat failed' };
  }
}

/**
 * Parse override suggestions from JSON string
 */
function parseOverrides(jsonString: string): SuggestedOverride[] {
  try {
    // Clean up the string
    const cleaned = jsonString.trim();

    // Try to find JSON array
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const parsed = JSON.parse(arrayMatch[0]);
      return Array.isArray(parsed) ? parsed : [];
    }

    // Try parsing directly
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error('[StreamingAgent] Override parse error:', error);
    return [];
  }
}

// Prompt builders

function buildStreamingAnalysisPrompt(context: ProjectionContext): string {
  return `You are an expert merchandise analyst. Analyze this tour's sales data and provide insights.

THINK THROUGH YOUR ANALYSIS STEP BY STEP. As you analyze, explain your reasoning.

TOUR DATA:
- Tour: ${context.tourName}
- Expected Attendance: ${context.expectedAttendance.toLocaleString()}
- Expected Per-Head: $${context.expectedPerHead.toFixed(2)}

PRODUCT SUMMARY (${context.productSummary?.length || 0} products):
${JSON.stringify(context.productSummary?.slice(0, 20), null, 2)}

SHOW PERFORMANCE:
${JSON.stringify(context.showSummary?.slice(0, 10), null, 2)}

Provide your analysis in this JSON format:

\`\`\`json
{
  "sizeCurveRecommendations": [
    {
      "sku": "SKU",
      "historicalCurve": {"S": 0.12, "M": 0.26, "L": 0.28, "XL": 0.20, "2XL": 0.09, "3XL": 0.05},
      "recommendedCurve": {"S": 0.10, "M": 0.25, "L": 0.30, "XL": 0.22, "2XL": 0.08, "3XL": 0.05},
      "reasoning": "Based on sales patterns..."
    }
  ],
  "productPerformance": {
    "topPerformers": [{"sku": "SKU", "totalSold": 500, "margin": 0.65, "reasoning": "..."}],
    "underperformers": [{"sku": "SKU", "totalSold": 50, "margin": 0.45, "reasoning": "..."}],
    "opportunities": [{"sku": "SKU", "reasoning": "Could perform better with..."}]
  },
  "stockoutRisks": [
    {
      "sku": "SKU",
      "size": "L",
      "forecastDemand": 200,
      "currentSupply": 50,
      "riskLevel": "high",
      "recommendation": "Order additional units immediately"
    }
  ]
}
\`\`\`

IMPORTANT: Return ONLY the JSON wrapped in code blocks. Show your thinking before the JSON.`;
}

function buildStreamingProjectionPrompt(context: ProjectionContext): string {
  const warehouseNames = context.warehouseLocations?.map(w => w.name) || ['Road', 'Warehouse', 'Web'];

  return `Generate comprehensive projections for this tour's merchandise.

TOUR: ${context.tourName}
Expected Attendance: ${context.expectedAttendance.toLocaleString()}
Expected Per-Head: $${context.expectedPerHead.toFixed(2)}

PRODUCT DATA:
${JSON.stringify(context.productSummary?.slice(0, 30), null, 2)}

WAREHOUSE LOCATIONS: ${warehouseNames.join(', ')}

For each product, provide:
1. baselineUnits - Total units to forecast
2. retailPrice - Suggested retail price
3. sizeBreakdown - Units per size (S, M, L, XL, 2XL, 3XL)
4. warehouseAllocations - Units per warehouse location
5. confidence - 0.0 to 1.0
6. reasoning - Brief explanation

Return as JSON array:
\`\`\`json
[
  {
    "sku": "PRODUCT_SKU",
    "baselineUnits": 500,
    "retailPrice": 35.00,
    "sizeBreakdown": {"S": 60, "M": 130, "L": 140, "XL": 100, "2XL": 45, "3XL": 25},
    "warehouseAllocations": {"Road": 350, "Warehouse": 100, "Web": 50},
    "confidence": 0.85,
    "reasoning": "Strong historical sales, expected to continue..."
  }
]
\`\`\`

IMPORTANT: Return valid JSON only.`;
}

function buildChatSystemPrompt(context: ProjectionContext): string {
  // Build product list for context
  const productList = context.productSummary?.slice(0, 30).map(p => ({
    sku: p.sku,
    name: p.product_name,
    totalSold: p.total_sold,
    avgPrice: p.avg_price
  })) || [];

  return `You are an AI merchandise projection assistant for ${context.tourName}.

## Context
- Products: ${context.productSummary?.length || 0} SKUs
- Shows: ${context.showSummary?.length || 0} completed
- Expected attendance: ${context.expectedAttendance.toLocaleString()}
- Expected per-head: $${context.expectedPerHead.toFixed(2)}

## Product Data (Top 30)
${JSON.stringify(productList, null, 2)}

## Your Role
You help users analyze projections and make adjustments through natural conversation.

## Intervention Recognition
When users request projection adjustments, respond with:
1. A clear explanation of what you'll change
2. Structured override suggestions in <overrides> tags

### Examples of Adjustment Requests:
- "Increase hoodies by 20%" → Calculate +20% for all hoodie SKUs
- "Double the XL quantities" → Apply 2x multiplier to XL size overrides
- "We expect 50% more attendance" → Recalculate based on higher attendance
- "Use smaller sizes" → Shift size curve toward S/M/L
- "Cancel those changes" → Acknowledge and don't output overrides

### Override Response Format
When suggesting changes, include this JSON block:

<overrides>
[
  {
    "sku": "HOODIE-BLK",
    "productName": "Black Hoodie",
    "size": null,
    "bucket": "estimated_sellout",
    "currentValue": 500,
    "suggestedValue": 600,
    "reason": "+20% per user request"
  }
]
</overrides>

### Override Fields:
- sku: Product SKU (required)
- productName: Human-readable name (required)
- size: Size code (S/M/L/XL/2XL/3XL) or null for total units
- bucket: "estimated_sellout" | "minimum_stock" | "opening_stock"
- currentValue: Current projection value
- suggestedValue: Your recommended value
- reason: Brief explanation

## Important Guidelines
1. Only output <overrides> when the user explicitly requests changes
2. For questions or analysis, respond naturally without overrides
3. Calculate specific values based on the product data provided
4. Support multi-turn refinement ("Actually, make it 30% instead")
5. Be concise but thorough in explanations`;
}

// Response parsers

function parseStreamedAnalysis(text: string): ProjectionAnalysis {
  // Extract JSON from markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }

  // Try parsing the whole text as JSON
  const directMatch = text.match(/\{[\s\S]*\}/);
  if (directMatch) {
    return JSON.parse(directMatch[0]);
  }

  throw new Error('Could not find JSON in response');
}

function parseStreamedProjections(text: string): ComprehensiveProjection[] {
  // Extract JSON array from markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }

  // Try parsing array directly
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return JSON.parse(arrayMatch[0]);
  }

  throw new Error('Could not find JSON array in response');
}
