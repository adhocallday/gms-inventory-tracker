'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { driver, type Driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  TOUR_EVENT,
  TOUR_STEP_KEY,
  TOUR_TOUR_ID_KEY,
  readSession,
  writeSession,
} from './tour-control';

/**
 * The guided tour (driver.js). Steps are anchored by data-tour="…" attributes
 * and span three pages: the dashboard, one tour, and that tour's reports. The
 * current step is kept in sessionStorage so the tour resumes after each page
 * change. Start it with requestTour() from ./tour-control.
 */

type Where = 'dashboard' | 'tour' | 'reports';

const STEPS: { anchor: string; where: Where; title: string; description: string }[] = [
  {
    anchor: 'tours-dashboard',
    where: 'dashboard',
    title: 'Tours',
    description:
      'Every tour, with its shows, products and gross sales. Open a tour to see its detail.',
  },
  {
    anchor: 'upload',
    where: 'dashboard',
    title: 'Upload',
    description:
      'Add one document at a time: a purchase order, packing list, sales report or settlement. The tracker reads it and drafts the entries.',
  },
  {
    anchor: 'documents',
    where: 'dashboard',
    title: 'Documents and review',
    description:
      'Parsed documents wait here. Only flagged items need checking before you approve and post them.',
  },
  {
    anchor: 'inventory',
    where: 'tour',
    title: 'Inventory',
    description: 'Stock on hand by product and size, updated from approved documents.',
  },
  {
    anchor: 'merch-flow-report',
    where: 'reports',
    title: 'Merch flow report',
    description:
      'Gross, units, per heads and product ratios for the tour, built from the tracker data.',
  },
  {
    anchor: 'charts-link',
    where: 'reports',
    title: 'Make a sales chart',
    description:
      'Opens MerchFlow Charts with this tour already loaded, so no spreadsheet export is needed.',
  },
  {
    anchor: 'pos-link',
    where: 'reports',
    title: 'MerchFlow POS',
    description:
      'The iPad point of sale. Sales recorded at the table go straight into the tracker.',
  },
];

function pathFor(where: Where, tourId: string | null) {
  if (where === 'dashboard' || !tourId) return '/';
  return where === 'tour' ? `/tours/${tourId}` : `/tours/${tourId}/reports`;
}

/** The first tour linked from the dashboard, used for the tour and reports steps. */
function findTourId(): string | null {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/tours/"]'));
  for (const link of links) {
    const match = link.getAttribute('href')?.match(/^\/tours\/([^/?#]+)/);
    if (match) return match[1];
  }
  return null;
}

function waitFor(selector: string, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (document.querySelector(selector) || Date.now() - started > timeoutMs) resolve();
      else window.setTimeout(tick, 100);
    };
    tick();
  });
}

export function GuidedTour() {
  const pathname = usePathname();
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);
  /** True while the tour is torn down only to move to another page. */
  const navigatingRef = useRef(false);

  const stop = useCallback((keepState: boolean) => {
    navigatingRef.current = keepState;
    driverRef.current?.destroy();
    driverRef.current = null;
    navigatingRef.current = false;
  }, []);

  const run = useCallback(async () => {
    const raw = readSession(TOUR_STEP_KEY);
    if (raw === null) return;
    const index = Number(raw);
    if (!Number.isInteger(index) || index < 0 || index >= STEPS.length) {
      writeSession(TOUR_STEP_KEY, null);
      return;
    }

    let tourId = readSession(TOUR_TOUR_ID_KEY);
    if (!tourId && pathname === '/') {
      await waitFor('[data-tour="tours-dashboard"]');
      tourId = findTourId();
      if (tourId) writeSession(TOUR_TOUR_ID_KEY, tourId);
    }

    const target = pathFor(STEPS[index].where, tourId);
    if (target !== pathname) {
      stop(true);
      router.push(target);
      return; // resumes when the pathname changes
    }

    await waitFor(`[data-tour="${STEPS[index].anchor}"]`);
    stop(true);

    const go = (next: number) => {
      if (next >= STEPS.length) {
        writeSession(TOUR_STEP_KEY, null);
        writeSession(TOUR_TOUR_ID_KEY, null);
        stop(false);
        return;
      }
      if (next < 0) return;
      writeSession(TOUR_STEP_KEY, String(next));
      if (pathFor(STEPS[next].where, tourId) === pathname) {
        driverRef.current?.moveTo(next);
      } else {
        stop(true);
        router.push(pathFor(STEPS[next].where, tourId));
      }
    };

    const steps: DriveStep[] = STEPS.map((step) => ({
      element: `[data-tour="${step.anchor}"]`,
      popover: { title: step.title, description: step.description },
    }));

    const instance = driver({
      steps,
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      popoverClass: 'mf-tour',
      overlayOpacity: 0.45,
      stagePadding: 6,
      stageRadius: 8,
      onNextClick: () => go((instance.getActiveIndex() ?? index) + 1),
      onPrevClick: () => go((instance.getActiveIndex() ?? index) - 1),
      onDestroyed: () => {
        if (!navigatingRef.current) {
          writeSession(TOUR_STEP_KEY, null);
          writeSession(TOUR_TOUR_ID_KEY, null);
        }
      },
    });
    driverRef.current = instance;
    instance.drive(index);
  }, [pathname, router, stop]);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => {
    const onRequest = () => {
      writeSession(TOUR_TOUR_ID_KEY, null);
      run();
    };
    window.addEventListener(TOUR_EVENT, onRequest);
    return () => window.removeEventListener(TOUR_EVENT, onRequest);
  }, [run]);

  useEffect(() => () => stop(true), [stop]);

  return null;
}
