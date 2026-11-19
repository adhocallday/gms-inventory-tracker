'use client';

import { useState, useCallback } from 'react';
import { BarChart3, Brain, Check, Sparkles, X } from 'lucide-react';
import { ChatInterface } from './ChatInterface';
import { AnalysisPanel } from './AnalysisPanel';
import { SizeAnalysisPanel } from './SizeAnalysisPanel';
import { ThinkingDisplay } from './ThinkingDisplay';
import { readSseEvents } from './sse';

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
  productNames?: Record<string, string>;
}

interface StreamEvent {
  type: 'phase' | 'thinking' | 'content' | 'json' | 'complete' | 'error';
  phase?: string;
  content?: string;
  data?: any;
  progress?: number;
}

interface EnhancedAIAgentPanelProps {
  tourId: string;
  scenarioId: string;
  onGenerateProjections: () => Promise<void>;
  onApplySizeRecommendation?: (sku: string, curve: Record<string, number>) => void;
  onApplyAllSizeRecommendations?: (analysis: SizeAnalysisData['analysis']) => void;
  onOverridesApplied?: () => void;
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
  onOverridesApplied,
  currentInputs,
  warehouseLocations
}: EnhancedAIAgentPanelProps) {
  const [activeTab, setActiveTab] = useState<'thinking' | 'analysis' | 'sizes' | 'chat'>('thinking');
  const [analysis, setAnalysis] = useState<any>(null);
  const [sizeAnalysis, setSizeAnalysis] = useState<SizeAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sizeLoading, setSizeLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [streamPhase, setStreamPhase] = useState('');
  const [streamProgress, setStreamProgress] = useState(0);

  // Stream-based generation with visible thought process
  const handleGenerateWithStreaming = useCallback(async () => {
    setLoading(true);
    setIsStreaming(true);
    setGenerated(false);
    setError(null);
    setStreamContent('');
    setStreamPhase('Initializing...');
    setStreamProgress(0);
    setActiveTab('thinking');

    try {
      const response = await fetch('/api/projections/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          expectedAttendance: currentInputs.expectedAttendance,
          expectedPerHead: currentInputs.expectedPerHead,
          mode: 'analysis'
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      let streamError: string | null = null;
      for await (const event of readSseEvents<StreamEvent>(response)) {
        switch (event.type) {
          case 'phase':
            setStreamPhase(event.phase || '');
            if (event.progress !== undefined) {
              setStreamProgress(event.progress);
            }
            break;

          case 'thinking':
          case 'content':
            setStreamContent(prev => prev + (event.content || ''));
            break;

          case 'json':
            setAnalysis(event.data);
            break;

          case 'complete':
            setGenerated(true);
            setStreamPhase('Complete');
            setStreamProgress(100);
            // Also generate projections
            await onGenerateProjections();
            break;

          case 'error':
            streamError = event.content || 'Stream error';
            break;
        }
      }
      if (streamError) throw new Error(streamError);
    } catch (error: any) {
      console.error('Streaming failed:', error);
      setError(error.message || 'Failed to generate projections');
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  }, [tourId, currentInputs, onGenerateProjections]);

  // Legacy non-streaming generation (fallback)
  async function handleGenerate() {
    // Use streaming by default
    await handleGenerateWithStreaming();
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
    <div className="g-card p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-ai" aria-hidden="true" />
            Projection assistant
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Claude drafts units per product and size from this tour&apos;s sales so far, and shows its reasoning. Nothing is saved until you apply it.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="px-4 py-2.5 bg-[var(--color-red-primary)] text-white rounded-md hover:bg-[var(--color-red-hover)] active:bg-[var(--color-red-active)] transition-colors disabled:opacity-60 font-semibold text-sm whitespace-nowrap flex items-center gap-2"
        >
          {loading ? (
            <>
              <Brain className="w-4 h-4 animate-pulse" aria-hidden="true" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Generate projections
            </>
          )}
        </button>
      </div>

      {generated && !isStreaming && (
        <div className="mb-4 p-5 bg-success-bg border border-success-border rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-bg-surface)] shadow-inner">
              <Check className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-success">Projections generated</p>
              <p className="text-xs text-success">All data has been populated in the spreadsheet below.</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-5 bg-danger-bg border border-danger-border rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-bg-surface)] shadow-inner">
              <X className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-danger">Error</p>
              <p className="text-xs text-danger">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 border-b border-[var(--color-bg-border)]">
        <button
          onClick={() => setActiveTab('thinking')}
          className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'thinking' ? 'border-b-2 border-[var(--color-red-primary)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}
        >
          <Brain className="w-4 h-4" />
          Reasoning
          {isStreaming && <span className="w-2 h-2 rounded-full bg-success animate-pulse" />}
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 ${activeTab === 'analysis' ? 'border-b-2 border-[var(--color-red-primary)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}
        >
          Analysis
        </button>
        <button
          onClick={() => setActiveTab('sizes')}
          className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'sizes' ? 'border-b-2 border-[var(--color-red-primary)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}
        >
          <BarChart3 className="w-4 h-4" />
          Size analysis
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 ${activeTab === 'chat' ? 'border-b-2 border-[var(--color-red-primary)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}
        >
          Chat
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'thinking' && (
          <ThinkingDisplay
            content={streamContent}
            phase={streamPhase}
            progress={streamProgress}
            isActive={isStreaming}
            variant="light"
          />
        )}
        {activeTab === 'analysis' && (
          <AnalysisPanel analysis={analysis} loading={loading && !isStreaming} />
        )}
        {activeTab === 'sizes' && (
          <div className="space-y-4">
            {!sizeAnalysis && !sizeLoading && (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-secondary)] opacity-50" />
                <p className="text-[var(--color-text-secondary)] mb-4">
                  Analyze historical sales data to optimize size distribution for each product.
                </p>
                <button
                  onClick={handleAnalyzeSizes}
                  className="px-6 py-3 bg-[var(--color-red-primary)] text-white rounded-lg hover:bg-[var(--color-red-hover)] transition font-medium"
                >
                  Analyze size distribution
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
          <ChatInterface
            tourId={tourId}
            scenarioId={scenarioId}
            useStreaming={true}
            onOverridesApplied={onOverridesApplied}
            expectedAttendance={currentInputs.expectedAttendance}
            expectedPerHead={currentInputs.expectedPerHead}
          />
        )}
      </div>
    </div>
  );
}

// Export with both names for compatibility during transition
export { EnhancedAIAgentPanel as AIAgentPanel };
