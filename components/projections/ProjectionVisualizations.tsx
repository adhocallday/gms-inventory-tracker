'use client';

import { useMemo } from 'react';
import { SizeDistributionChart } from './charts/SizeDistributionChart';
import { HistoricalTrendsChart } from './charts/HistoricalTrendsChart';
import { ProductPerformanceChart } from './charts/ProductPerformanceChart';
import { InventoryGapChart } from './charts/InventoryGapChart';

interface ProjectionVisualizationsProps {
  projectionData: Array<{
    sku: string;
    baselineUnits: number;
    retailPrice: number;
    sizeBreakdown: Record<string, number>;
    bucketAllocation: Record<string, number>;
    confidence: number;
    reasoning: string;
  }>;
  historicalData: Array<{
    sku: string;
    total_sold?: number | null;
    total_gross?: number | null;
  }>;
  showData: Array<{
    show_date?: string | null;
    total_gross?: number | null;
  }>;
  inventoryData: Array<{
    product_id: string;
    sku?: string | null;
    size?: string | null;
    balance?: number | null;
  }>;
  poData: Array<{
    product_id: string;
    sku?: string | null;
    size?: string | null;
    open_quantity?: number | null;
  }>;
}

export function ProjectionVisualizations({
  projectionData,
  historicalData,
  showData,
  inventoryData,
  poData
}: ProjectionVisualizationsProps) {
  // Calculate inventory gaps
  const inventoryGaps = useMemo(() => {
    return projectionData.flatMap(proj => {
      return Object.entries(proj.sizeBreakdown).map(([size, forecastUnits]) => {
        // Find matching inventory and PO data
        const inv = inventoryData.find(i => i.sku === proj.sku && i.size === size);
        const po = poData.find(p => p.sku === proj.sku && p.size === size);

        const onHand = inv?.balance || 0;
        const onOrder = po?.open_quantity || 0;
        const forecastDemand = forecastUnits;
        const gap = Math.max(0, forecastDemand - onHand - onOrder);

        let riskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
        if (gap > 0) {
          const coverageRatio = (onHand + onOrder) / forecastDemand;
          if (coverageRatio < 0.5) riskLevel = 'critical';
          else if (coverageRatio < 0.7) riskLevel = 'high';
          else if (coverageRatio < 0.9) riskLevel = 'medium';
        }

        return {
          sku: proj.sku,
          size,
          forecastDemand,
          onHand,
          onOrder,
          gap,
          riskLevel
        };
      });
    }).filter(g => g.gap > 0);
  }, [projectionData, inventoryData, poData]);

  if (!projectionData || projectionData.length === 0) {
    return (
      <div className="g-card p-8 text-center text-[var(--color-text-muted)]">
        <p>Generate AI projections to see visualizations</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Size distribution charts for top products */}
      <div>
        <h3 className="text-lg font-semibold g-title mb-4">Size Distributions</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projectionData.slice(0, 4).map((proj) => (
            <SizeDistributionChart
              key={proj.sku}
              sku={proj.sku}
              sizeBreakdown={proj.sizeBreakdown}
            />
          ))}
        </div>
      </div>

      {/* Historical trends and performance comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HistoricalTrendsChart data={showData} />
        <ProductPerformanceChart
          products={projectionData}
          historicalData={historicalData}
        />
      </div>

      {/* Inventory gaps */}
      {inventoryGaps.length > 0 && (
        <InventoryGapChart gaps={inventoryGaps} />
      )}
    </div>
  );
}
