'use client';

import { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import { AnalysisPanel } from './AnalysisPanel';

interface EnhancedAIAgentPanelProps {
  tourId: string;
  scenarioId: string;
  onGenerateProjections: () => Promise<void>;
  currentInputs: {
    expectedAttendance: number;
    expectedPerHead: number;
  };
}

export function EnhancedAIAgentPanel({
  tourId,
  scenarioId,
  onGenerateProjections,
  currentInputs
}: EnhancedAIAgentPanelProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setGenerated(false);
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
      const data = await response.json();
      setAnalysis(data.analysis);

      // Generate and apply projections
      await onGenerateProjections();
      setGenerated(true);
    } catch (error) {
      console.error('Failed to generate:', error);
    } finally {
      setLoading(false);
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

      <div className="flex gap-2 mb-4 border-b border-[var(--g-border)]">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 ${activeTab === 'analysis' ? 'border-b-2 border-[var(--g-accent)] text-[var(--g-text)]' : 'text-[var(--g-text-muted)]'}`}
        >
          Analysis
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
        {activeTab === 'chat' && (
          <ChatInterface tourId={tourId} scenarioId={scenarioId} />
        )}
      </div>
    </div>
  );
}

// Export with both names for compatibility during transition
export { EnhancedAIAgentPanel as AIAgentPanel };
