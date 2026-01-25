'use client';

import { useState, useEffect } from 'react';
import { RecommendationCard } from './RecommendationCard';
import { ChatInterface } from './ChatInterface';
import { AnalysisPanel } from './AnalysisPanel';

interface AIAgentPanelProps {
  tourId: string;
  scenarioId: string;
  onApplyRecommendation: (sku: string, size: string | null, bucket: string | null, units: number) => void;
  currentInputs: {
    expectedAttendance: number;
    expectedPerHead: number;
  };
}

export function AIAgentPanel({
  tourId,
  scenarioId,
  onApplyRecommendation,
  currentInputs
}: AIAgentPanelProps) {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'analysis' | 'chat'>('recommendations');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load analysis on mount
  useEffect(() => {
    loadAnalysis();
  }, [tourId]);

  async function loadAnalysis() {
    setLoading(true);
    try {
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
    } catch (error) {
      console.error('Failed to load analysis:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateRecommendations() {
    setLoading(true);
    try {
      const response = await fetch('/api/projections/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          scenarioId,
          expectedAttendance: currentInputs.expectedAttendance,
          expectedPerHead: currentInputs.expectedPerHead
        })
      });

      const data = await response.json();
      setRecommendations(data.recommendations);
      setActiveTab('recommendations');
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="g-card p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold g-title">AI Projection Assistant</h2>
        <button
          onClick={generateRecommendations}
          disabled={loading}
          className="px-4 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Get AI Recommendations'}
        </button>
      </div>

      <div className="flex gap-2 mb-4 border-b border-[var(--g-border)]">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-4 py-2 ${activeTab === 'recommendations' ? 'border-b-2 border-[var(--g-accent)] text-[var(--g-text)]' : 'text-[var(--g-text-muted)]'}`}
        >
          Recommendations ({recommendations.length})
        </button>
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
        {activeTab === 'recommendations' && (
          <div className="space-y-3">
            {recommendations.length === 0 ? (
              <p className="text-sm text-[var(--g-text-muted)]">
                Click "Get AI Recommendations" to generate projections based on historical data.
              </p>
            ) : (
              recommendations.map(rec => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onAccept={() => onApplyRecommendation(rec.target_sku, rec.target_size, rec.target_bucket, rec.recommended_units)}
                  onReject={() => {/* Mark as rejected */}}
                />
              ))
            )}
          </div>
        )}

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
