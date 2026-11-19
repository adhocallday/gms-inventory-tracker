'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { markOnboardingSeen } from './tour-control';
import { TourSpinner, preloadTour, useTourStart } from './GuidedTourLoader';

/** "Start the overview" and "Skip". Viewing /welcome counts as the first visit. */
export function WelcomeActions() {
  const router = useRouter();
  const { pending, start } = useTourStart();

  useEffect(() => {
    markOnboardingSeen();
    // Tours start from this page: fetch the tour code while the visitor reads.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    idle(() => preloadTour());
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => start('overview')}
        aria-busy={pending === 'overview:0' || undefined}
        className="inline-flex items-center gap-2 h-10 px-5 rounded-md text-sm font-semibold bg-[var(--color-red-primary)] text-white hover:bg-[var(--color-red-hover)] active:bg-[var(--color-red-active)] transition"
      >
        {pending === 'overview:0' && <TourSpinner />}
        Start the overview
      </button>
      <button
        type="button"
        onClick={() => {
          markOnboardingSeen();
          router.push('/');
        }}
        className="inline-flex items-center h-10 px-5 rounded-md text-sm font-semibold border border-[var(--color-bg-border)] text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)] transition"
      >
        Skip
      </button>
    </div>
  );
}
