import Anthropic from '@anthropic-ai/sdk';
import { getModelForTask, getModelName } from './models';

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
  warehouseLocations?: Array<{
    id: string;
    name: string;
    location_type: string;
    display_order: number;
  }>; // Warehouse locations for allocation
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
  warehouseAllocations: Record<string, number>; // {Road: 500, Warehouse: 200, Web: 100, ...}
  confidence: number;
  reasoning: string;
}

// Main analysis function
export async function analyzeProjectionData(
  context: ProjectionContext
): Promise<ProjectionAnalysis> {
  const prompt = buildAnalysisPrompt(context);
  const model = getModelForTask('projection-analysis');

  console.log(`[ProjectionAgent] analyzeProjectionData using ${getModelName(model)}`);

  const response = await anthropic.messages.create({
    model,
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
  const model = getModelForTask('recommendations');

  console.log(`[ProjectionAgent] generateRecommendations using ${getModelName(model)}`);

  const response = await anthropic.messages.create({
    model,
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

// Chat interface (uses Sonnet for balanced conversational performance)
export async function chatWithAgent(
  conversationHistory: { role: string; content: string }[],
  context: ProjectionContext
): Promise<string> {
  const systemPrompt = buildChatSystemPrompt(context);
  const model = getModelForTask('chat');

  console.log(`[ProjectionAgent] chatWithAgent using ${getModelName(model)}`);

  const response = await anthropic.messages.create({
    model,
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
  const model = getModelForTask('comprehensive-projections');

  console.log(`[ProjectionAgent] generateComprehensiveProjections using ${getModelName(model)}`);

  const response = await anthropic.messages.create({
    model,
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
  // Get warehouse locations for this tour
  const warehouseLocations = context.warehouseLocations || [];
  const locationNames = warehouseLocations.map(loc => loc.name);

  // Build allocation instructions based on warehouse locations
  const allocationInstructions = `   - Distribute baseline units across warehouse locations: ${locationNames.join(', ')}
   - Typical distribution:
     * Road: 50-60% (touring stock that travels)
     * Warehouse: 20-30% (backup inventory)
     * Web: 5-10% (online store)
     * Custom locations: Remaining based on regional demand`;

  const exampleAllocation = locationNames.length > 0
    ? locationNames.map((name: string) => `"${name}": number`).join(', ')
    : '"Road": number, "Warehouse": number, "Web": number';

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

4. **Estimate Warehouse Allocation**:
${allocationInstructions}

Return ONLY valid JSON array with ONE object per unique SKU:
[{
  "sku": "string",
  "baselineUnits": number,
  "retailPrice": number,
  "sizeBreakdown": {"S": number, "M": number, "L": number, "XL": number, "2XL": number, "3XL": number},
  "warehouseAllocations": {${exampleAllocation}},
  "confidence": 0.0-1.0,
  "reasoning": "brief 1-2 sentence explanation of this SKU's forecast"
}]

CRITICAL VALIDATION:
- Size breakdown units MUST sum to baselineUnits
- Warehouse allocation units MUST sum to baselineUnits
- Include all warehouse locations: ${locationNames.join(', ')}
- Include all sizes even if 0 units
- Confidence: 0.9+ for SKUs with strong historical data, lower for sparse data
- CRITICAL: warehouseAllocations must use the exact location names listed above`;
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

      // Check warehouse allocation sums to baseline
      const warehouseTotal = Object.values(proj.warehouseAllocations || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
      if (Math.abs(warehouseTotal - proj.baselineUnits) > 1) {
        console.warn(`Warehouse allocation mismatch for ${proj.sku}: ${warehouseTotal} vs ${proj.baselineUnits}`);
      }

      // Ensure all required fields exist
      if (!proj.sku || !proj.baselineUnits || !proj.retailPrice || !proj.sizeBreakdown || !proj.warehouseAllocations) {
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

// ============================================================================
// SIZE DISTRIBUTION ANALYSIS
// ============================================================================

export interface SizeAnalysisResult {
  analysis: {
    [sku: string]: {
      historicalCurve: Record<string, number>;
      recommendedCurve: Record<string, number>;
      confidence: number;
      reasoning: string;
      insights: string[];
    };
  };
  globalInsights: {
    audienceDemographic: string;
    sizeTrends: string[];
    recommendations: string[];
  };
}

export async function analyzeSizeDistribution(
  context: ProjectionContext
): Promise<SizeAnalysisResult> {
  const prompt = buildSizeAnalysisPrompt(context);
  const model = getModelForTask('size-distribution');

  console.log(`[ProjectionAgent] analyzeSizeDistribution using ${getModelName(model)}`);

  const response = await anthropic.messages.create({
    model,
    max_tokens: 16384,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const content = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  return parseSizeAnalysisResponse(content);
}

function buildSizeAnalysisPrompt(context: ProjectionContext): string {
  // Calculate historical size curves from product summary WITH QUANTITIES
  const sizeData: Record<string, { sizes: Record<string, { sold: number; gross: number }>; totalSold: number; totalGross: number }> = {};

  context.productSummary.forEach((row: any) => {
    if (!row.sku) return;
    if (!sizeData[row.sku]) {
      sizeData[row.sku] = { sizes: {}, totalSold: 0, totalGross: 0 };
    }
    const size = row.size || 'ONE_SIZE';
    if (!sizeData[row.sku].sizes[size]) {
      sizeData[row.sku].sizes[size] = { sold: 0, gross: 0 };
    }
    sizeData[row.sku].sizes[size].sold += row.total_sold || 0;
    sizeData[row.sku].sizes[size].gross += row.total_gross || 0;
    sizeData[row.sku].totalSold += row.total_sold || 0;
    sizeData[row.sku].totalGross += row.total_gross || 0;
  });

  // Calculate percentages AND include raw quantities
  const sizeAnalysis = Object.entries(sizeData).map(([sku, data]) => {
    const curve: Record<string, number> = {};
    const quantities: Record<string, number> = {};
    Object.entries(data.sizes).forEach(([size, stats]) => {
      curve[size] = data.totalSold ? Math.round((stats.sold / data.totalSold) * 1000) / 1000 : 0;
      quantities[size] = stats.sold;
    });
    return {
      sku,
      totalUnits: data.totalSold,
      totalGross: data.totalGross,
      avgPrice: data.totalSold ? Math.round(data.totalGross / data.totalSold * 100) / 100 : 0,
      historicalCurve: curve,
      quantitiesBySizeActual: quantities  // RAW QUANTITIES for analysis
    };
  });

  // Calculate overall distribution across ALL products
  const overallSizes: Record<string, number> = {};
  let overallTotal = 0;
  Object.values(sizeData).forEach(data => {
    Object.entries(data.sizes).forEach(([size, stats]) => {
      overallSizes[size] = (overallSizes[size] || 0) + stats.sold;
      overallTotal += stats.sold;
    });
  });
  const overallPercentages: Record<string, string> = {};
  Object.entries(overallSizes).forEach(([size, qty]) => {
    overallPercentages[size] = `${qty.toLocaleString()} units (${((qty / overallTotal) * 100).toFixed(1)}%)`;
  });

  return `You are an expert merchandise analyst specializing in concert tour merchandise sizing patterns.

TOUR: ${context.tourName}

CRITICAL: Pay close attention to the RAW QUANTITIES (quantitiesBySizeActual) - not just percentages.
The quantities tell you whether you have enough data to make confident recommendations.

INDUSTRY STANDARD SIZE DISTRIBUTION (typical bell curve):
- S: 12% (smaller audience segment)
- M: 26% (common size)
- L: 28% (most common)
- XL: 20% (second most common)
- 2XL: 9% (larger sizes)
- 3XL: 5% (specialty size)

OVERALL SIZE DISTRIBUTION ACROSS ALL PRODUCTS:
Total units: ${overallTotal.toLocaleString()}
${JSON.stringify(overallPercentages, null, 2)}

HISTORICAL SIZE DATA BY PRODUCT (includes raw quantities):
${JSON.stringify(sizeAnalysis, null, 2)}

SHOW PERFORMANCE (for context):
${JSON.stringify(context.showSummary.slice(0, 10), null, 2)}

TASK: Analyze the size distribution patterns and provide recommendations.

DATA QUALITY CHECKS TO PERFORM:
1. Is the distribution realistic? (Uniform distribution ~16-17% each size is SUSPICIOUS - may indicate test data)
2. Does the data follow expected patterns? (M/L should typically be highest)
3. Are there enough total units for statistical significance? (< 100 units = low confidence)
4. Are there anomalies that suggest data issues?

For each product (SKU), analyze:
1. **Historical Curve** - The actual sales distribution by size (use the calculated percentages)
2. **Recommended Curve** - Your optimized recommendation:
   - If historical data is suspicious/uniform, recommend industry standard curve
   - If historical data looks realistic, use it with minor adjustments
   - If sample size is small, weight toward industry average
3. **Confidence** - Score based on:
   - Sample size (totalUnits): < 50 = 0.3-0.5, 50-200 = 0.5-0.7, 200+ = 0.7-0.9
   - Data quality: Suspicious patterns reduce confidence by 0.2
   - Consistency: Matching industry patterns = higher confidence
4. **Reasoning** - Include specific quantities and explain your recommendation
5. **Insights** - Flag any data quality concerns, include quantities in observations

Also provide global insights:
- **Audience Demographic** - What the ACTUAL QUANTITIES suggest (be skeptical of unrealistic distributions)
- **Size Trends** - Notable patterns WITH quantities cited
- **Recommendations** - If data quality is questionable, recommend collecting more data or using industry defaults

IMPORTANT GUIDELINES:
- Size keys should be: S, M, L, XL, 2XL, 3XL (or ONE_SIZE for non-sized items)
- Curves must sum to 1.0 (100%)
- ALWAYS mention actual quantities in your reasoning
- If distribution looks suspiciously uniform (all sizes ~15-17%), FLAG THIS and recommend industry defaults
- Be honest about data quality concerns

Return ONLY valid JSON matching this structure:
{
  "analysis": {
    "SKU1": {
      "historicalCurve": {"S": 0.12, "M": 0.26, "L": 0.28, "XL": 0.20, "2XL": 0.09, "3XL": 0.05},
      "recommendedCurve": {"S": 0.12, "M": 0.26, "L": 0.28, "XL": 0.20, "2XL": 0.09, "3XL": 0.05},
      "confidence": 0.85,
      "reasoning": "Based on 1,234 units sold: M (320) and L (345) lead as expected. Pattern matches industry standards.",
      "insights": ["Data quality: Good - realistic bell curve pattern", "Sample size: 1,234 units provides high confidence"]
    }
  },
  "globalInsights": {
    "audienceDemographic": "Based on 15,000 total units: Size distribution suggests [demographic]. [Any data quality concerns]",
    "sizeTrends": ["L (4,200 units, 28%) is top seller - matches industry average", "2XL at 1,350 units (9%) - in line with expectations"],
    "recommendations": ["Data quality assessment: [GOOD/SUSPICIOUS/INSUFFICIENT]", "Recommendation based on [X] total units"]
  }
}`;
}

function parseSizeAnalysisResponse(content: string): SizeAnalysisResult {
  let jsonText = content;
  if (content.includes('```')) {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) jsonText = match[1];
  }

  try {
    const result = JSON.parse(jsonText);

    // Validate structure
    if (!result.analysis || !result.globalInsights) {
      throw new Error('Missing required fields in response');
    }

    // Validate each SKU analysis
    for (const [sku, analysis] of Object.entries(result.analysis)) {
      const a = analysis as any;
      if (!a.historicalCurve || !a.recommendedCurve) {
        console.warn(`Missing curves for ${sku}`);
      }
      // Ensure curves sum to ~1.0
      const histSum = Object.values(a.historicalCurve || {}).reduce((sum: number, v: any) => sum + (v || 0), 0);
      const recSum = Object.values(a.recommendedCurve || {}).reduce((sum: number, v: any) => sum + (v || 0), 0);
      if (Math.abs(histSum - 1) > 0.05) {
        console.warn(`Historical curve for ${sku} sums to ${histSum}, normalizing`);
        // Normalize
        if (histSum > 0) {
          Object.keys(a.historicalCurve).forEach(k => {
            a.historicalCurve[k] = a.historicalCurve[k] / histSum;
          });
        }
      }
      if (Math.abs(recSum - 1) > 0.05) {
        console.warn(`Recommended curve for ${sku} sums to ${recSum}, normalizing`);
        if (recSum > 0) {
          Object.keys(a.recommendedCurve).forEach(k => {
            a.recommendedCurve[k] = a.recommendedCurve[k] / recSum;
          });
        }
      }
    }

    console.log(`✅ Successfully parsed size analysis for ${Object.keys(result.analysis).length} SKUs`);
    return result;
  } catch (error) {
    console.error('Failed to parse size analysis response:', error);
    console.error('Content:', content);
    throw new Error('Invalid AI response format for size analysis');
  }
}
