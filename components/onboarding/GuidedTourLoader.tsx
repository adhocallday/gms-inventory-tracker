'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  TOUR_EVENT,
  TOUR_MENU_EVENT,
  TOUR_SHOWN_EVENT,
  readTourState,
  requestTour,
} from './tour-control';
import type { TourId } from './tour-types';

/**
 * Mounted in the root layout in place of the guided tour. The tour itself
 * (GuidedTour, driver.js and its CSS, and the tour text) is loaded only when a
 * tour is running (a reload mid-tour), started, or the tour menu is opened,
 * or ahead of a start on /welcome (preloadTour). Other pages never load it.
 */

const loadTour = () => import('./GuidedTour');

const LazyGuidedTour = dynamic(() => loadTour().then((m) => m.GuidedTour), { ssr: false });

/** Fired by preloadTour(): mount the (idle) tour ahead of a start. */
const PRELOAD_EVENT = 'mf:tour-preload';

/**
 * Loads and mounts the tour ahead of a start (on /welcome once idle, or when a
 * start button is hovered or focused), so the first step appears at once.
 * Mounted with no tour running, it renders only the closed chapter menu.
 */
export function preloadTour() {
  void loadTour();
  window.dispatchEvent(new Event(PRELOAD_EVENT));
}

export function GuidedTour() {
  const [load, setLoad] = useState(false);

  useEffect(() => {
    if (readTourState()) setLoad(true);
    const onRequest = () => setLoad(true);
    const events = [TOUR_EVENT, TOUR_MENU_EVENT, PRELOAD_EVENT];
    events.forEach((name) => window.addEventListener(name, onRequest));
    return () => events.forEach((name) => window.removeEventListener(name, onRequest));
  }, []);

  return load ? <LazyGuidedTour /> : null;
}

/**
 * Start buttons: `start(tour, chapter)` requests the tour and marks that
 * button pending (`pending` is "tour:chapter") until the tour is on screen.
 */
export function useTourStart() {
  const [pending, setPending] = useState<string | null>(null);

  const start = useCallback((tour: TourId, chapter = 0) => {
    const key = `${tour}:${chapter}`;
    setPending(key);
    // Listen before requesting: an already loaded tour may show its step synchronously.
    const done = () => {
      setPending((current) => (current === key ? null : current));
      window.removeEventListener(TOUR_SHOWN_EVENT, done);
      window.clearTimeout(timer);
    };
    window.addEventListener(TOUR_SHOWN_EVENT, done);
    const timer = window.setTimeout(done, 10000);
    requestTour(tour, chapter);
  }, []);

  return { pending, start };
}

/** The spinner shown in a pending start button. */
export function TourSpinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-[spin_2s_linear_infinite]"
    />
  );
}
