'use client';

import { TOURS, chapterNumber, type TourId } from './tour-chapters';
import { requestTour } from './tour-control';

const ORDER: TourId[] = ['overview', 'full'];

/**
 * The two guided tours side by side, each with its chapter list and a start
 * button: on /welcome, and (compact) in the NavBar's "Replay tour" menu.
 * Every chapter row starts its tour at that chapter.
 */
export function TourChoices({ compact = false, onStart }: { compact?: boolean; onStart?: () => void }) {
  const start = (tour: TourId, chapter = 0) => {
    onStart?.();
    requestTour(tour, chapter);
  };

  return (
    <div data-tour={compact ? undefined : 'welcome-tours'} className="grid gap-4 md:grid-cols-2">
      {ORDER.map((id) => {
        const tour = TOURS[id];
        const primary = id === 'overview';
        const steps = tour.chapters.reduce((sum, c) => sum + c.steps.length, 0);
        return (
          <section
            key={id}
            data-tour={compact ? undefined : `welcome-tour-${id}`}
            aria-labelledby={`tour-${id}-${compact ? 'menu' : 'page'}`}
            className="g-card p-5 flex flex-col gap-4"
          >
            <div className="space-y-1">
              <h3 id={`tour-${id}-${compact ? 'menu' : 'page'}`} className="text-lg font-semibold">
                {tour.title}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {tour.audience}. {tour.chapters.length} chapters, {steps} steps.
              </p>
            </div>
            <button
              type="button"
              onClick={() => start(id)}
              className={
                primary
                  ? 'self-start inline-flex items-center h-10 px-5 rounded-md text-sm font-semibold bg-[var(--color-red-primary)] text-white hover:bg-[var(--color-red-hover)] active:bg-[var(--color-red-active)] transition'
                  : 'self-start inline-flex items-center h-10 px-5 rounded-md text-sm font-semibold border border-[var(--color-bg-border)] text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)] transition'
              }
            >
              {primary ? 'Start the overview' : 'Start the full walkthrough'}
            </button>
            <ol
              data-tour={!compact && id === 'full' ? 'welcome-chapters' : undefined}
              aria-label={`${tour.title} chapters`}
              className="space-y-0.5 -mx-2"
            >
              {tour.chapters.map((chapter, index) => (
                <li key={chapter.id}>
                  <button
                    type="button"
                    onClick={() => start(id, index)}
                    className="w-full text-left rounded-md px-2 py-1.5 hover:bg-[var(--color-bg-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-red-primary)]"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">
                        <span className="inline-block w-6 tabular-nums text-[var(--color-red-primary)]">
                          {chapterNumber(id, index)}
                        </span>
                        {chapter.title}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap tabular-nums">
                        {chapter.steps.length} steps
                      </span>
                    </span>
                    {!compact && (
                      <span className="block pl-6 text-xs text-[var(--color-text-secondary)]">{chapter.summary}</span>
                    )}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
