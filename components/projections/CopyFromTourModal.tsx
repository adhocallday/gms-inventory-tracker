'use client';

import { useEffect, useState } from 'react';
import { X, Copy, Search, Check, AlertCircle } from 'lucide-react';

type MatchMode = 'show_number' | 'venue' | 'city';

interface Tour {
  id: string;
  name: string;
  artist: string | null;
  status: string;
}

interface Scenario {
  id: string;
  name: string;
  is_baseline: boolean;
}

interface ShowMatch {
  targetShow: {
    id: string;
    show_date: string;
    venue_name: string | null;
    city: string | null;
  };
  matchedSourceShow: {
    id: string;
    show_date: string;
    venue_name: string | null;
    city: string | null;
  } | null;
}

interface CopyFromTourModalProps {
  tourId: string;
  targetScenarioId: string;
  onClose: () => void;
  onCopyComplete: () => void;
}

export function CopyFromTourModal({
  tourId,
  targetScenarioId,
  onClose,
  onCopyComplete,
}: CopyFromTourModalProps) {
  const [step, setStep] = useState<'select-tour' | 'configure' | 'preview'>('select-tour');
  const [tours, setTours] = useState<Tour[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [matchMode, setMatchMode] = useState<MatchMode>('show_number');
  const [scaleByAttendance, setScaleByAttendance] = useState(false);
  const [includeInitialInventory, setIncludeInitialInventory] = useState(true);
  const [preview, setPreview] = useState<ShowMatch[]>([]);
  const [previewSummary, setPreviewSummary] = useState<{
    totalSourceShows: number;
    totalTargetShows: number;
    matchedShows: number;
    unmatchedShows: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tours
  useEffect(() => {
    async function loadTours() {
      try {
        const response = await fetch('/api/tours');
        if (response.ok) {
          const data = await response.json();
          // Filter out current tour
          setTours((data || []).filter((t: Tour) => t.id !== tourId));
        }
      } catch (error) {
        console.error('Failed to load tours:', error);
      }
    }
    loadTours();
  }, [tourId]);

  // Load scenarios when tour is selected
  useEffect(() => {
    if (!selectedTourId) {
      setScenarios([]);
      return;
    }

    async function loadScenarios() {
      try {
        const response = await fetch(`/api/forecast-scenarios?tourId=${selectedTourId}`);
        if (response.ok) {
          const data = await response.json();
          setScenarios(data.scenarios || []);
          // Auto-select baseline if exists
          const baseline = data.scenarios?.find((s: Scenario) => s.is_baseline);
          if (baseline) {
            setSelectedScenarioId(baseline.id);
          }
        }
      } catch (error) {
        console.error('Failed to load scenarios:', error);
      }
    }
    loadScenarios();
  }, [selectedTourId]);

  // Load preview when configuration changes
  useEffect(() => {
    if (!selectedTourId || step !== 'preview') return;

    async function loadPreview() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/tours/${tourId}/projections/copy?source_tour_id=${selectedTourId}&match_mode=${matchMode}`
        );
        if (response.ok) {
          const data = await response.json();
          setPreview(data.preview || []);
          setPreviewSummary(data.summary);
        }
      } catch (error) {
        console.error('Failed to load preview:', error);
        setError('Failed to load preview');
      } finally {
        setIsLoading(false);
      }
    }
    loadPreview();
  }, [tourId, selectedTourId, matchMode, step]);

  const handleCopy = async () => {
    if (!selectedTourId || !selectedScenarioId) return;

    setIsCopying(true);
    setError(null);
    try {
      const response = await fetch(`/api/tours/${tourId}/projections/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_tour_id: selectedTourId,
          source_scenario_id: selectedScenarioId,
          target_scenario_id: targetScenarioId,
          match_mode: matchMode,
          scale_by_attendance: scaleByAttendance,
          include_initial_inventory: includeInitialInventory,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to copy projections');
      }

      const result = await response.json();
      console.log('Copy complete:', result);
      onCopyComplete();
      onClose();
    } catch (error: any) {
      console.error('Failed to copy:', error);
      setError(error.message || 'Failed to copy projections');
    } finally {
      setIsCopying(false);
    }
  };

  const filteredTours = tours.filter(
    (tour) =>
      tour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.artist?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTour = tours.find((t) => t.id === selectedTourId);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-[var(--g-accent)]" />
            <h2 className="font-semibold">Copy Projections from Another Tour</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
          {[
            { key: 'select-tour', label: 'Select Tour' },
            { key: 'configure', label: 'Configure' },
            { key: 'preview', label: 'Preview & Copy' },
          ].map((s, idx) => (
            <div key={s.key} className="flex items-center gap-2">
              {idx > 0 && <div className="w-8 h-px bg-slate-300" />}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
                  step === s.key
                    ? 'bg-[var(--g-accent)] text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">
                  {idx + 1}
                </span>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Select Tour */}
          {step === 'select-tour' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tours..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--g-accent)] focus:border-transparent"
                />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredTours.map((tour) => (
                  <button
                    key={tour.id}
                    onClick={() => setSelectedTourId(tour.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition ${
                      selectedTourId === tour.id
                        ? 'border-[var(--g-accent)] bg-[var(--g-accent)]/5'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{tour.name}</div>
                      {tour.artist && (
                        <div className="text-sm text-[var(--g-text-muted)]">{tour.artist}</div>
                      )}
                    </div>
                    {selectedTourId === tour.id && (
                      <Check className="w-5 h-5 text-[var(--g-accent)]" />
                    )}
                  </button>
                ))}
                {filteredTours.length === 0 && (
                  <div className="text-center py-8 text-[var(--g-text-muted)]">
                    No tours found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && selectedTour && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-[var(--g-text-muted)]">Copying from</div>
                <div className="font-semibold">{selectedTour.name}</div>
              </div>

              {/* Scenario selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Source Scenario</label>
                <select
                  value={selectedScenarioId || ''}
                  onChange={(e) => setSelectedScenarioId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--g-accent)] focus:border-transparent"
                >
                  <option value="">Select a scenario...</option>
                  {scenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.name}
                      {scenario.is_baseline ? ' (baseline)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Match mode */}
              <div>
                <label className="block text-sm font-medium mb-2">Match Shows By</label>
                <div className="space-y-2">
                  {[
                    {
                      value: 'show_number',
                      label: 'Show Number',
                      description: 'Match 1st show to 1st show, 2nd to 2nd, etc.',
                    },
                    {
                      value: 'venue',
                      label: 'Venue Name',
                      description: 'Match shows at the same venue',
                    },
                    {
                      value: 'city',
                      label: 'City',
                      description: 'Match shows in the same city',
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        matchMode === option.value
                          ? 'border-[var(--g-accent)] bg-[var(--g-accent)]/5'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="matchMode"
                        value={option.value}
                        checked={matchMode === option.value}
                        onChange={() => setMatchMode(option.value as MatchMode)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-[var(--g-text-muted)]">
                          {option.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scaleByAttendance}
                    onChange={(e) => setScaleByAttendance(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <div>
                    <div className="font-medium">Scale by attendance</div>
                    <div className="text-sm text-[var(--g-text-muted)]">
                      Adjust projections based on venue capacity differences
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInitialInventory}
                    onChange={(e) => setIncludeInitialInventory(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <div>
                    <div className="font-medium">Copy initial inventory</div>
                    <div className="text-sm text-[var(--g-text-muted)]">
                      Also copy the starting inventory quantities
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-sm text-[var(--g-text-muted)]">Loading preview...</div>
                </div>
              ) : (
                <>
                  {previewSummary && (
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-semibold">
                          {previewSummary.totalSourceShows}
                        </div>
                        <div className="text-xs text-[var(--g-text-muted)]">Source Shows</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-semibold">
                          {previewSummary.totalTargetShows}
                        </div>
                        <div className="text-xs text-[var(--g-text-muted)]">Target Shows</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-semibold text-green-700">
                          {previewSummary.matchedShows}
                        </div>
                        <div className="text-xs text-green-600">Matched</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-semibold text-amber-700">
                          {previewSummary.unmatchedShows}
                        </div>
                        <div className="text-xs text-amber-600">Unmatched</div>
                      </div>
                    </div>
                  )}

                  <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium">Target Show</th>
                          <th className="text-left py-2 px-3 font-medium">Matched Source</th>
                          <th className="text-center py-2 px-3 font-medium w-20">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((match, idx) => (
                          <tr key={idx} className="border-t border-slate-100">
                            <td className="py-2 px-3">
                              <div className="font-medium">
                                {formatDate(match.targetShow.show_date)}
                              </div>
                              <div className="text-xs text-[var(--g-text-muted)]">
                                {match.targetShow.city || match.targetShow.venue_name || 'TBD'}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              {match.matchedSourceShow ? (
                                <>
                                  <div className="font-medium">
                                    {formatDate(match.matchedSourceShow.show_date)}
                                  </div>
                                  <div className="text-xs text-[var(--g-text-muted)]">
                                    {match.matchedSourceShow.city ||
                                      match.matchedSourceShow.venue_name ||
                                      'TBD'}
                                  </div>
                                </>
                              ) : (
                                <span className="text-[var(--g-text-muted)]">No match</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {match.matchedSourceShow ? (
                                <Check className="w-4 h-4 text-green-600 inline" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-amber-500 inline" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 border-t border-slate-200">
          <button
            onClick={() => {
              if (step === 'configure') setStep('select-tour');
              else if (step === 'preview') setStep('configure');
              else onClose();
            }}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            {step === 'select-tour' ? 'Cancel' : 'Back'}
          </button>

          {step === 'select-tour' && (
            <button
              onClick={() => setStep('configure')}
              disabled={!selectedTourId}
              className="px-4 py-2 text-sm rounded-lg bg-[var(--g-accent)] text-white hover:bg-[var(--g-accent-2)] disabled:opacity-50"
            >
              Next
            </button>
          )}

          {step === 'configure' && (
            <button
              onClick={() => setStep('preview')}
              disabled={!selectedScenarioId}
              className="px-4 py-2 text-sm rounded-lg bg-[var(--g-accent)] text-white hover:bg-[var(--g-accent-2)] disabled:opacity-50"
            >
              Preview
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={handleCopy}
              disabled={isCopying || isLoading}
              className="px-4 py-2 text-sm rounded-lg bg-[var(--g-accent)] text-white hover:bg-[var(--g-accent-2)] disabled:opacity-50"
            >
              {isCopying ? 'Copying...' : 'Copy Projections'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
