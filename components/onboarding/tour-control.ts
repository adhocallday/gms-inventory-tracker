/**
 * Onboarding state shared by /welcome, the guided tour and the NavBar.
 *
 * localStorage `mf.onboarding.v2` records that the first-visit redirect to
 * /welcome has happened, so it never repeats (v2: visitors who saw the first,
 * shorter tour are sent to /welcome once more). The running tour's position
 * and the ids it resolved live in sessionStorage so they survive the page
 * changes between steps. Every storage access is wrapped: private windows and
 * blocked storage throw.
 */

import type { TourIds, TourPosition } from './tour-chapters';

export const ONBOARDING_KEY = 'mf.onboarding.v2';
export const TOUR_STATE_KEY = 'mf.tour.state';
/** Window events: start the tour at a chapter, or open the chapter menu. */
export const TOUR_EVENT = 'mf:tour';
export const TOUR_MENU_EVENT = 'mf:tour-menu';

export interface TourState extends TourPosition {
  /** Resolved once when the tour starts; undefined until then. */
  ids?: TourIds;
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
    const parsed = JSON.parse(raw) as TourState;
    return typeof parsed?.chapter === 'number' && typeof parsed?.step === 'number' ? parsed : null;
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

/** Starts the guided tour at the first step of `chapter` (default: the beginning). */
export function requestTour(chapter = 0) {
  markOnboardingSeen();
  // Keep ids resolved earlier in this session; the tour re-resolves if absent.
  const ids = readTourState()?.ids;
  writeTourState({ chapter, step: 0, ids });
  window.dispatchEvent(new Event(TOUR_EVENT));
}

/** Opens the chapter menu (the NavBar's "Replay tour"). */
export function openTourMenu() {
  window.dispatchEvent(new Event(TOUR_MENU_EVENT));
}
