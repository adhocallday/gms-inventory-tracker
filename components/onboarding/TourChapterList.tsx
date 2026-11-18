'use client';

import { CHAPTERS } from './tour-chapters';
import { requestTour } from './tour-control';

/** The tour's chapters as cards on /welcome; each starts the tour at that chapter. */
export function TourChapterList() {
  return (
    <ol data-tour="welcome-chapters" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CHAPTERS.map((chapter, index) => (
        <li key={chapter.id}>
          <button
            type="button"
            onClick={() => requestTour(index)}
            className="g-card w-full h-full text-left p-4 space-y-1 hover:border-[var(--color-text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-red-primary)] transition"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">
                <span className="tabular-nums text-[var(--color-red-primary)] mr-2">{index}</span>
                {chapter.title}
              </span>
              <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                {chapter.steps.length} steps
              </span>
            </span>
            <span className="block text-sm text-[var(--color-text-secondary)]">{chapter.summary}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
