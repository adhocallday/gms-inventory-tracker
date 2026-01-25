'use client';

import { useState } from 'react';

interface Show {
  showDate: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  capacity?: number;
}

interface ScheduleChatAssistantProps {
  tourName: string;
  artist: string;
  onShowsExtracted: (shows: Show[]) => void;
}

export default function ScheduleChatAssistant({ tourName, artist, onShowsExtracted }: ScheduleChatAssistantProps) {
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingShows, setPendingShows] = useState<Show[] | null>(null);

  const updatePendingShow = (index: number, field: keyof Show, value: string | number) => {
    if (!pendingShows) return;
    const updated = [...pendingShows];
    updated[index] = { ...updated[index], [field]: value };
    setPendingShows(updated);
  };

  const removePendingShow = (index: number) => {
    if (!pendingShows) return;
    setPendingShows(pendingShows.filter((_, i) => i !== index));
  };

  const confirmShows = () => {
    if (!pendingShows) return;
    onShowsExtracted(pendingShows);
    setPendingShows(null);
  };

  const cancelReview = () => {
    setPendingShows(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      setError('Please enter some tour dates');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/parse-schedule-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: input,
          tourName,
          artist
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse schedule');
      }

      const result = await response.json();

      if (result.shows.length === 0) {
        setError('No shows found in the text. Try rephrasing with dates, cities, and venues.');
        return;
      }

      // Set pending shows for review
      setPendingShows(result.shows);

      // Clear input
      setInput('');
    } catch (err: any) {
      setError(err.message);
      console.error('Schedule text parse error:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="border border-white/10 rounded-lg bg-[var(--g-surface-2)] p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--g-text)] mb-1">
          AI Chat Assistant
        </h3>
        <p className="text-xs text-[var(--g-text-muted)]">
          Paste your tour schedule as plain text. Example: "January 15 Tampa, FL at Amalie Arena, Jan 17 Atlanta GA"
        </p>
      </div>

      {!pendingShows ? (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste tour dates here...&#10;&#10;Example:&#10;January 15 Tampa, FL at Amalie Arena&#10;Jan 17 Atlanta, GA&#10;1/19 Nashville TN - Bridgestone Arena"
                className="w-full h-32 px-4 py-3 bg-[var(--g-surface)] border border-white/10 rounded-lg text-sm text-[var(--g-text)] placeholder:text-[var(--g-text-muted)] focus:outline-none focus:border-[var(--g-accent)] resize-y"
                disabled={processing}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={processing || !input.trim()}
              className="w-full px-4 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Processing...
                </span>
              ) : (
                'Parse Schedule'
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-[var(--g-text-muted)]">
              <strong>💡 Tips:</strong> You can paste dates in any format (1/15, Jan 15, January 15th). Include city and state. Venue names are optional.
            </p>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-400 font-semibold">
              ✓ Found {pendingShows.length} show{pendingShows.length !== 1 ? 's' : ''}. Review and edit before adding:
            </p>
          </div>

          <div className="border border-white/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--g-text-muted)]">Date</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--g-text-muted)]">Venue</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--g-text-muted)]">City</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--g-text-muted)]">State</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--g-text-muted)]">Country</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {pendingShows.map((show, index) => (
                    <tr key={index} className="hover:bg-white/5">
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          className="g-input text-xs w-full"
                          value={show.showDate}
                          onChange={(e) => updatePendingShow(index, 'showDate', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          className="g-input text-xs w-full"
                          placeholder="Venue"
                          value={show.venueName}
                          onChange={(e) => updatePendingShow(index, 'venueName', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          className="g-input text-xs w-full"
                          placeholder="City"
                          value={show.city}
                          onChange={(e) => updatePendingShow(index, 'city', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          className="g-input text-xs w-full"
                          placeholder="State"
                          value={show.state}
                          onChange={(e) => updatePendingShow(index, 'state', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          className="g-input text-xs w-full"
                          placeholder="Country"
                          value={show.country}
                          onChange={(e) => updatePendingShow(index, 'country', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removePendingShow(index)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={confirmShows}
              className="flex-1 px-4 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition font-semibold text-sm"
            >
              Add {pendingShows.length} Show{pendingShows.length !== 1 ? 's' : ''}
            </button>
            <button
              type="button"
              onClick={cancelReview}
              className="px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition text-[var(--g-text)] text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
