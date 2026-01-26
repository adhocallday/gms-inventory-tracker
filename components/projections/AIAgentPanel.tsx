'use client';

import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { ChatInterface } from './ChatInterface';
import { AnalysisPanel } from './AnalysisPanel';
import { SizeAnalysisPanel } from './SizeAnalysisPanel';

interface SizeAnalysisData {
  analysis: Record<string, {
    historicalCurve: Record<string, number>;
    recommendedCurve: Record<string, number>;
    confidence: number;
    reasoning: string;
    insights: string[];
  }>;
  globalInsights: {
    audienceDemographic: string;
    sizeTrends: string[];
    recommendations: string[];
  };
  productNames?: Record<string, string>; // SKU -> Product Name mapping
}

interface EnhancedAIAgentPanelProps {
  tourId: string;
  scenarioId: string;
  onGenerateProjections: () => Promise<void>;
  onApplySizeRecommendation?: (sku: string, curve: Record<string, number>) => void;
  onApplyAllSizeRecommendations?: (analysis: SizeAnalysisData['analysis']) => void;
  currentInputs: {
    expectedAttendance: number;
    expectedPerHead: number;
  };
  warehouseLocations?: Array<{
    id: string;
    name: string;
    location_type: string;
    display_order: number;
  }>;
}

export function EnhancedAIAgentPanel({
  tourId,
  scenarioId,
  onGenerateProjections,
  onApplySizeRecommendation,
  onApplyAllSizeRecommendations,
  currentInputs,
  warehouseLocations
}: EnhancedAIAgentPanelProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'sizes' | 'chat'>('analysis');
  const [analysis, setAnalysis] = useState<any>(null);
  const [sizeAnalysis, setSizeAnalysis] = useState<SizeAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sizeLoading, setSizeLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setGenerated(false);
    setError(null);
    try {
      // Load analysis first
      const response = await fetch('/api/projections/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          expectedAttendance: currentInputs.expectedAttendance,
          expectedPerHead: currentInputs.expectedPerHead
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data.analysis);

      // Generate and apply projections
      await onGenerateProjections();
      setGenerated(true);
    } catch (error: any) {
      console.error('Failed to generate:', error);
      setError(error.message || 'Failed to generate projections. Please check console for details.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyzeSizes() {
    setSizeLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/projections/analyze-sizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourId, scenarioId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      setSizeAnalysis(data);
    } catch (error: any) {
      console.error('Failed to analyze sizes:', error);
      setError(error.message || 'Failed to analyze size distribution.');
    } finally {
      setSizeLoading(false);
    }
  }

  function handleApplySizeRecommendation(sku: string, curve: Record<string, number>) {
    if (onApplySizeRecommendation) {
      onApplySizeRecommendation(sku, curve);
    }
  }

  function handleApplyAllSizeRecommendations() {
    if (onApplyAllSizeRecommendations && sizeAnalysis) {
      onApplyAllSizeRecommendations(sizeAnalysis.analysis);
    }
  }

  return (
    <div className="g-card p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold g-title">AI Projection Assistant</h2>
          <p className="text-sm text-[var(--g-text-muted)] mt-1">
            Generate complete projections from historical data with one click
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-3 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition disabled:opacity-50 font-semibold text-lg whitespace-nowrap"
        >
          {loading ? 'Generating...' : 'Generate AI Projections'}
        </button>
      </div>

      {generated && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-500">
          ✓ Projections generated and applied successfully! All data has been populated in the spreadsheet below.
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
          ✗ Error: {error}
        </div>
      )}

      <div className="flex gap-2 mb-4 border-b border-[var(--g-border)]">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 ${activeTab === 'analysis' ? 'border-b-2 border-[var(--g-accent)] text-[var(--g-text)]' : 'text-[var(--g-text-muted)]'}`}
        >
          Analysis
        </button>
        <button
          onClick={() => setActiveTab('sizes')}
          className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'sizes' ? 'border-b-2 border-[var(--g-accent)] text-[var(--g-text)]' : 'text-[var(--g-text-muted)]'}`}
        >
          <BarChart3 className="w-4 h-4" />
          Size Analysis
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 ${activeTab === 'chat' ? 'border-b-2 border-[var(--g-accent)] text-[var(--g-text)]' : 'text-[var(--g-text-muted)]'}`}
        >
          Chat
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'analysis' && (
          <AnalysisPanel analysis={analysis} loading={loading} />
        )}
        {activeTab === 'sizes' && (
          <div className="space-y-4">
            {!sizeAnalysis && !sizeLoading && (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-600 mb-4">
                  Analyze historical sales data to optimize size distribution for each product.
                </p>
                <button
                  onClick={handleAnalyzeSizes}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  Analyze Size Distribution
                </button>
              </div>
            )}
            {(sizeAnalysis || sizeLoading) && (
              <SizeAnalysisPanel
                analysis={sizeAnalysis?.analysis || {}}
                globalInsights={sizeAnalysis?.globalInsights || { audienceDemographic: '', sizeTrends: [], recommendations: [] }}
                productNames={sizeAnalysis?.productNames || {}}
                onApplyRecommendation={handleApplySizeRecommendation}
                onApplyAll={handleApplyAllSizeRecommendations}
                isLoading={sizeLoading}
              />
            )}
          </div>
        )}
        {activeTab === 'chat' && (
          <ChatInterface tourId={tourId} scenarioId={scenarioId} />
        )}
      </div>
    </div>
  );
}

// Export with both names for compatibility during transition
export { EnhancedAIAgentPanel as AIAgentPanel };
