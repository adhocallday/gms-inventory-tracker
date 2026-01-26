'use client';

import Link from 'next/link';
import { Calendar, MapPin, Music } from 'lucide-react';

export interface UpcomingShow {
  id: string;
  tour_id: string;
  show_date: string;
  venue_name: string | null;
  city: string | null;
  tour_name: string;
}

interface UpcomingShowsPanelProps {
  shows: UpcomingShow[];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  const formatted = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (diffDays === 0) return `Today`;
  if (diffDays === 1) return `Tomorrow`;
  if (diffDays < 7) return `${formatted} (${diffDays}d)`;
  return formatted;
}

export function UpcomingShowsPanel({ shows }: UpcomingShowsPanelProps) {
  return (
    <div className="g-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold g-title">Upcoming Shows</h2>
      </div>

      {shows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="w-10 h-10 text-[var(--g-text-muted)] mb-3" />
          <p className="text-sm text-[var(--g-text-muted)]">No upcoming shows</p>
          <p className="text-xs text-[var(--g-text-muted)] mt-1">
            Shows will appear here as they're scheduled
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shows.map((show) => (
            <Link
              key={show.id}
              href={`/tours/${show.tour_id}/shows/${show.id}`}
              className="flex items-start gap-3 p-3 rounded-lg border border-[var(--g-border)] hover:border-[var(--g-accent)]/50 hover:bg-[var(--g-bg-subtle)] transition group"
            >
              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-[var(--g-accent)]/10 text-[var(--g-accent)]">
                <span className="text-xs font-medium uppercase">
                  {new Date(show.show_date).toLocaleDateString('en-US', { month: 'short' })}
                </span>
                <span className="text-lg font-bold leading-none">
                  {new Date(show.show_date).getDate()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--g-text)] truncate group-hover:text-[var(--g-accent)] transition">
                  {show.venue_name || 'Venue TBD'}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--g-text-muted)]">
                  {show.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {show.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Music className="w-3 h-3" />
                    {show.tour_name}
                  </span>
                </div>
              </div>
              <span className="text-xs text-[var(--g-text-muted)] whitespace-nowrap">
                {formatDate(show.show_date)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
