/**
 * Projection Agent Type Definitions
 *
 * @module agents/types
 * @version 1.0.0
 */

export interface ProjectionContext {
  tourId: string;
  tourName: string;
  productSummary: unknown[];
  showSummary: unknown[];
  inventoryBalances: unknown[];
  poOpenQuantities: unknown[];
  expectedAttendance: number;
  expectedPerHead: number;
  warehouseLocations?: Array<{
    id: string;
    name: string;
    location_type: string;
    display_order: number;
  }>;
}

export interface AIRecommendation {
  sku: string;
  size?: string;
  bucket?: string;
  recommendedUnits: number;
  reasoning: string;
  confidence: number;
  type: 'baseline' | 'size_adjustment' | 'risk_mitigation' | 'product_priority';
  supportingData?: unknown;
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
  sizeBreakdown: Record<string, number>;
  warehouseAllocations: Record<string, number>;
  confidence: number;
  reasoning: string;
}

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
