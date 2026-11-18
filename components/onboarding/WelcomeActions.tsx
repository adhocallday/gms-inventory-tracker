'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { markOnboardingSeen, requestTour } from './tour-control';

/** "Start the tour" and "Skip". Viewing /welcome counts as the first visit. */
export function WelcomeActions() {
  const router = useRouter();

  useEffect(() => {
    markOnboardingSeen();
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={requestTour}
        className="inline-flex items-center h-10 px-5 rounded-md text-sm font-semibold bg-[var(--color-red-primary)] text-white hover:bg-[var(--color-red-hover)] active:bg-[var(--color-red-active)] transition"
      >
        Start the tour
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
