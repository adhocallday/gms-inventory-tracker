import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Types
export interface ProjectionContext {
  tourId: string;
  tourName: string;
  productSummary: any[]; // from product_summary_view
  showSummary: any[];    // from show_summary_view
  inventoryBalances: any[];
  poOpenQuantities: any[];
  expectedAttendance: number;
  expectedPerHead: number;
  buckets?: string[]; // Dynamic buckets based on tour cities
}

export interface AIRecommendation {
  sku: string;
  size?: string;
  bucket?: string;
  recommendedUnits: number;
  reasoning: string;
  confidence: number;
  type: 'baseline' | 'size_adjustment' | 'risk_mitigation' | 'product_priority';
  supportingData?: any;
}

export interface ProjectionAnalysis {
  sizeCurveRecommendations: {
    sku: string;
    historicalCurve: Record<string, number>;
    recommendedCurve: Record<string, number>;
    reasoning: string;
  }[];
  productPerformance: {
    topPerformers: { sku: string; totalSold: number; margin: number; reasoning: string }[];
    underperformers: { sku: string; totalSold: number; margin: number; reasoning: string }[];
    opportunities: { sku: string; reasoning: string }[];
  };
  stockoutRisks: {
    sku: string;
    size?: string;
    forecastDemand: number;
    currentSupply: number;
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
    recommendation: string;
  }[];
}

export interface ComprehensiveProjection {
  sku: string;
  baselineUnits: number;
  retailPrice: number;
  sizeBreakdown: Record<string, number>; // {S: 50, M: 100, L: 120, ...}
  bucketAllocation: Record<string, number>; // {TOUR: 200, CITY_A: 50, ...}
  confidence: number;
  reasoning: string;
}

// Main analysis function
export async function analyzeProjectionData(
  context: ProjectionContext
): Promise<ProjectionAnalysis> {
  const prompt = buildAnalysisPrompt(context);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16384,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const content = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  return parseAnalysisResponse(content);
}

// Generate recommendations
export async function generateRecommendations(
  context: ProjectionContext,
  constraints?: {
    maxBudget?: number;
    priorityProducts?: string[];
    avoidStockouts?: boolean;
  }
): Promise<AIRecommendation[]> {
  const prompt = buildRecommendationPrompt(context, constraints);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16384,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const content = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  return parseRecommendationsResponse(content);
}

// Chat interface
export async function chatWithAgent(
  conversationHistory: { role: string; content: string }[],
  context: ProjectionContext
): Promise<string> {
  const systemPrompt = buildChatSystemPrompt(context);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: conversationHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))
  });

  return response.content[0].type === 'text'
    ? response.content[0].text
    : '';
}

// Generate comprehensive projections (prices, units, sizes, buckets)
export async function generateComprehensiveProjections(
  context: ProjectionContext
): Promise<ComprehensiveProjection[]> {
  const prompt = buildComprehensiveProjectionPrompt(context);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16384,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const content = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  return parseComprehensiveProjectionsResponse(content);
}

// Prompt builders
function buildAnalysisPrompt(context: ProjectionContext): string {
  return `You are an expert merchandise inventory analyst for concert tours.

TOUR: ${context.tourName}

HISTORICAL SALES DATA:
${JSON.stringify(context.productSummary, null, 2)}

SHOW PERFORMANCE:
${JSON.stringify(context.showSummary, null, 2)}

CURRENT INVENTORY:
${JSON.stringify(context.inventoryBalances, null, 2)}

OPEN PURCHASE ORDERS:
${JSON.stringify(context.poOpenQuantities, null, 2)}

PROJECTION INPUTS:
- Expected attendance: ${context.expectedAttendance.toLocaleString()}
- Expected per-head: $${context.expectedPerHead.toFixed(2)}
- Expected gross: $${(context.expectedAttendance * context.expectedPerHead).toLocaleString()}

Analyze this data and return a JSON object with:

1. **sizeCurveRecommendations**: Array of size distribution recommendations per product
   - Include historical curve (actual sales by size)
   - Recommended curve (may differ if patterns suggest changes)
   - Reasoning for any deviations

2. **productPerformance**:
   - topPerformers: Top 5 products by total sold and margin
   - underperformers: Products with low sell-through or margin
   - opportunities: Products that could perform better with different strategy

3. **stockoutRisks**:
   - Identify products at risk of stockout
   - Calculate forecast demand vs current supply (on-hand + on-order)
   - Risk level (critical/high/medium/low)
   - Specific recommendations

Return ONLY valid JSON matching this structure:
{
  "sizeCurveRecommendations": [{
    "sku": "string",
    "historicalCurve": {"S": 0.12, "M": 0.26, ...},
    "recommendedCurve": {"S": 0.12, "M": 0.26, ...},
    "reasoning": "string"
  }],
  "productPerformance": {
    "topPerformers": [{"sku": "string", "totalSold": number, "margin": number, "reasoning": "string"}],
    "underperformers": [{"sku": "string", "totalSold": number, "margin": number, "reasoning": "string"}],
    "opportunities": [{"sku": "string", "reasoning": "string"}]
  },
  "stockoutRisks": [{
    "sku": "string",
    "size": "string or null",
    "forecastDemand": number,
    "currentSupply": number,
    "riskLevel": "critical|high|medium|low",
    "recommendation": "string"
  }]
}`;
}

function buildRecommendationPrompt(
  context: ProjectionContext,
  constraints?: any
): string {
  return `You are generating projection recommendations for ${context.tourName}.

HISTORICAL DATA: ${JSON.stringify(context.productSummary, null, 2)}
EXPECTED GROSS: $${(context.expectedAttendance * context.expectedPerHead).toLocaleString()}
CONSTRAINTS: ${JSON.stringify(constraints || {})}

Generate specific unit recommendations. For each product:
1. Baseline units (overall forecast)
2. Size adjustments (S/M/L/XL/2XL/3XL breakdown)

Return JSON array:
[{
  "sku": "string",
  "size": "string or null",
  "bucket": "string or null",
  "recommendedUnits": number,
  "reasoning": "2-3 sentence explanation",
  "confidence": 0.0-1.0,
  "type": "baseline|size_adjustment|risk_mitigation|product_priority"
}]

Focus on actionable recommendations with clear reasoning.`;
}

function buildChatSystemPrompt(context: ProjectionContext): string {
  return `You are an AI assistant helping with merchandise projections for ${context.tourName}.

You have access to:
- Historical sales data by product/size
- Show performance (attendance, per-head revenue)
- Current inventory and open POs
- Projection inputs (expected attendance: ${context.expectedAttendance}, expected per-head: $${context.expectedPerHead})

Answer questions conversationally using data to support your responses. Suggest actionable next steps when appropriate.`;
}

function buildComprehensiveProjectionPrompt(context: ProjectionContext): string {
  // Get buckets (cities) for this tour
  const buckets = context.buckets || ['TOUR', 'WEB'];
  const cityBuckets = buckets.filter(b => b !== 'TOUR' && b !== 'WEB');

  // Build allocation instructions based on actual cities
  let allocationInstructions = '';
  let exampleAllocation = '';

  if (cityBuckets.length === 0) {
    allocationInstructions = `   - Distribute baseline units across ${buckets.join('/')}
   - Typical distribution: TOUR 95%, WEB 5%`;
    exampleAllocation = buckets.map(b => `"${b}": number`).join(', ');
  } else {
    const cityPercentage = Math.floor(90 / (cityBuckets.length + 1));
    const tourPercentage = 90 - (cityPercentage * cityBuckets.length);
    allocationInstructions = `   - Distribute baseline units across ${buckets.join('/')}
   - Suggested distribution: TOUR ${tourPercentage}%, ${cityBuckets.map(c => `${c} ${cityPercentage}%`).join(', ')}, WEB 10%
   - Adjust based on show data if certain cities had stronger sales`;
    exampleAllocation = buckets.map(b => `"${b}": number`).join(', ');
  }

  return `You are generating complete projection data for ${context.tourName}.

IMPORTANT: The historical data below contains SIZE-LEVEL records (one row per SKU+SIZE combination).
You MUST aggregate these by SKU to generate projections.

HISTORICAL SALES DATA (SIZE-LEVEL):
${JSON.stringify(context.productSummary, null, 2)}

SHOW PERFORMANCE:
${JSON.stringify(context.showSummary, null, 2)}

CURRENT INVENTORY:
${JSON.stringify(context.inventoryBalances, null, 2)}

OPEN PURCHASE ORDERS:
${JSON.stringify(context.poOpenQuantities, null, 2)}

PROJECTION INPUTS:
- Expected attendance: ${context.expectedAttendance.toLocaleString()}
- Expected per-head: $${context.expectedPerHead.toFixed(2)}
- Expected gross: $${(context.expectedAttendance * context.expectedPerHead).toLocaleString()}

INSTRUCTIONS:

For EACH UNIQUE SKU (aggregating across all sizes):

1. **Calculate Baseline Units**:
   - Sum total_sold across all sizes for this SKU
   - Calculate this SKU's % of historical gross sales
   - Apply same % to expected gross to get projected revenue
   - Divide by average selling price to get baseline units

2. **Determine Retail Price**:
   - Calculate: total_gross / total_sold across all sizes
   - This gives average selling price per unit
   - Use this as the recommended retail price

3. **Calculate Size Breakdown**:
   - For each size (S/M/L/XL/2XL/3XL):
     - Calculate: (units sold in this size) / (total units sold across all sizes)
     - This gives the size distribution percentage
     - Apply this % to baseline units to get units per size
   - Example: If S was 20% historically, and baseline is 100 units, then S gets 20 units

4. **Estimate Location/Bucket Allocation**:
${allocationInstructions}

Return ONLY valid JSON array with ONE object per unique SKU:
[{
  "sku": "string",
  "baselineUnits": number,
  "retailPrice": number,
  "sizeBreakdown": {"S": number, "M": number, "L": number, "XL": number, "2XL": number, "3XL": number},
  "bucketAllocation": {${exampleAllocation}},
  "confidence": 0.0-1.0,
  "reasoning": "brief 1-2 sentence explanation of this SKU's forecast"
}]

CRITICAL VALIDATION:
- Size breakdown units MUST sum to baselineUnits
- Bucket allocation units MUST sum to baselineUnits
- Include all bucket locations: ${buckets.join(', ')}
- Include all sizes even if 0 units
- Confidence: 0.9+ for SKUs with strong historical data, lower for sparse data`;
}

// Response parsers
function parseAnalysisResponse(content: string): ProjectionAnalysis {
  // Extract JSON from markdown code blocks if present
  let jsonText = content;
  if (content.includes('```')) {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) jsonText = match[1];
  }

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse analysis response:', error);
    console.error('Content:', content);
    throw new Error('Invalid AI response format');
  }
}

function parseRecommendationsResponse(content: string): AIRecommendation[] {
  let jsonText = content;
  if (content.includes('```')) {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) jsonText = match[1];
  }

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse recommendations response:', error);
    throw new Error('Invalid AI response format');
  }
}

function parseComprehensiveProjectionsResponse(content: string): ComprehensiveProjection[] {
  let jsonText = content;
  if (content.includes('```')) {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) jsonText = match[1];
  }

  try {
    const projections = JSON.parse(jsonText);

    // Validate each projection
    for (const proj of projections) {
      // Check size breakdown sums to baseline
      const sizeTotal = Object.values(proj.sizeBreakdown || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
      if (Math.abs(sizeTotal - proj.baselineUnits) > 1) {
        console.warn(`Size breakdown mismatch for ${proj.sku}: ${sizeTotal} vs ${proj.baselineUnits}`);
      }

      // Check bucket allocation sums to baseline
      const bucketTotal = Object.values(proj.bucketAllocation || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
      if (Math.abs(bucketTotal - proj.baselineUnits) > 1) {
        console.warn(`Bucket allocation mismatch for ${proj.sku}: ${bucketTotal} vs ${proj.baselineUnits}`);
      }

      // Ensure all required fields exist
      if (!proj.sku || !proj.baselineUnits || !proj.retailPrice || !proj.sizeBreakdown || !proj.bucketAllocation) {
        console.error(`Missing required fields for projection:`, proj);
      }
    }

    console.log(`✅ Successfully parsed ${projections.length} projections`);
    return projections;
  } catch (error) {
    console.error('Failed to parse comprehensive projections response:', error);
    console.error('Content:', content);
    throw new Error('Invalid AI response format');
  }
}
