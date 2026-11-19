/**
 * Onboarding state shared by /welcome, the guided tour and the NavBar.
 *
 * localStorage `mf.onboarding.v3` records that the first-visit redirect to
 * /welcome has happened, so it never repeats (v3: visitors who saw the single
 * tour are sent to /welcome once more, to see the choice of overview or full
 * walkthrough). The running tour (which one, its position, the ids and live
 * figures it resolved) lives in sessionStorage so it survives the page
 * changes between steps. Every storage access is wrapped: private windows and
 * blocked storage throw.
 *
 * This module is small on purpose: the NavBar imports it, and it must not pull
 * in the tour text (./tour-chapters) or driver.js. GuidedTourLoader loads the
 * tour itself only once a tour is started or the tour menu is opened.
 */

import { DEFAULT_TOUR, isTourId, type TourId, type TourIds, type TourPosition } from './tour-types';
import type { TourFacts } from './tour-facts';

export const ONBOARDING_KEY = 'mf.onboarding.v3';
export const TOUR_STATE_KEY = 'mf.tour.state';
/** Window events: start the tour at a chapter, or open the chapter menu. */
export const TOUR_EVENT = 'mf:tour';
export const TOUR_MENU_EVENT = 'mf:tour-menu';
/** Fired by the tour once a step (or the menu) is on screen, or the tour ended: start buttons stop spinning. */
export const TOUR_SHOWN_EVENT = 'mf:tour-shown';

export interface TourState extends TourPosition {
  /** Resolved once when the tour starts; undefined until then. */
  ids?: TourIds;
  /** Live figures for the resolved tour; null when they could not be loaded. */
  facts?: TourFacts | null;
}

export function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

export function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: string | null) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {}
}

export function readTourState(): TourState | null {
  const raw = readSession(TOUR_STATE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TourState>;
    if (typeof parsed?.chapter !== 'number' || typeof parsed?.step !== 'number') return null;
    // State saved before there were two tours belongs to the full walkthrough.
    return { ...parsed, tour: isTourId(parsed.tour) ? parsed.tour : 'full' } as TourState;
  } catch {
    return null;
  }
}

export function writeTourState(state: TourState | null) {
  writeSession(TOUR_STATE_KEY, state ? JSON.stringify(state) : null);
}

export function markOnboardingSeen() {
  writeLocal(ONBOARDING_KEY, new Date().toISOString());
}

/** What the tour needs from the database: the ids its dynamic pages open, and the overview's live figures. */
export interface TourContext {
  ids: TourIds;
  facts: TourFacts | null;
}

let contextPromise: Promise<TourContext> | null = null;

/**
 * The tour context from /api/onboarding/context, fetched once per page load
 * and shared. Started as soon as a tour is requested, so it loads while the
 * first step (which needs no ids) is already on screen.
 */
export function loadTourContext(): Promise<TourContext> {
  contextPromise ??= fetch('/api/onboarding/context', { cache: 'no-store' })
    .then(async (res) => {
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { data?: TourContext };
      return {
        ids: body.data?.ids ?? { tourId: null, showId: null, docId: null },
        facts: body.data?.facts ?? null,
      };
    })
    .catch(() => {
      // Try again next time; this time the tour explains the missing data.
      contextPromise = null;
      return { ids: { tourId: null, showId: null, docId: null }, facts: null };
    });
  return contextPromise;
}

/** A start or menu request made before the (lazily loaded) tour was mounted. */
let pendingRequest: 'start' | 'menu' | null = null;

/** Returns and clears the request the tour has not handled yet. */
export function takePendingRequest(): 'start' | 'menu' | null {
  const request = pendingRequest;
  pendingRequest = null;
  return request;
}

/** Starts `tour` (default: the overview) at the first step of `chapter` (default: the beginning). */
export function requestTour(tour: TourId = DEFAULT_TOUR, chapter = 0) {
  markOnboardingSeen();
  // Keep ids and figures resolved earlier in this session; fetch them in the background if absent.
  const previous = readTourState();
  writeTourState({ tour, chapter, step: 0, ids: previous?.ids, facts: previous?.facts });
  if (!previous?.ids || previous.facts === undefined) void loadTourContext();
  pendingRequest = 'start';
  window.dispatchEvent(new Event(TOUR_EVENT));
}

/** Opens the tour menu (the NavBar's "Replay tour"): both tours and their chapters. */
export function openTourMenu() {
  pendingRequest = 'menu';
  window.dispatchEvent(new Event(TOUR_MENU_EVENT));
}

/** Tells start buttons the tour is on screen (or has ended), so they stop showing a pending state. */
export function announceTourShown() {
  window.dispatchEvent(new Event(TOUR_SHOWN_EVENT));
}
