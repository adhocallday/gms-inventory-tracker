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
  const [lastResult, setLastResult] = useState<{ shows: Show[]; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      setError('Please enter some tour dates');
      return;
    }

    setProcessing(true);
    setError(null);
    setLastResult(null);

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

      setLastResult({
        shows: result.shows,
        message: `Found ${result.validShows} show${result.validShows !== 1 ? 's' : ''}`
      });

      // Add shows to parent component
      onShowsExtracted(result.shows);

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

        {lastResult && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-400 font-semibold mb-2">
              ✓ {lastResult.message}
            </p>
            <div className="space-y-1">
              {lastResult.shows.slice(0, 3).map((show, i) => (
                <p key={i} className="text-xs text-green-400/80">
                  • {new Date(show.showDate).toLocaleDateString()} - {show.city}, {show.state} ({show.venueName})
                </p>
              ))}
              {lastResult.shows.length > 3 && (
                <p className="text-xs text-green-400/60">
                  ...and {lastResult.shows.length - 3} more
                </p>
              )}
            </div>
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
    </div>
  );
}
