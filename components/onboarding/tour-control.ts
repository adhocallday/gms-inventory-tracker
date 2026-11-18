/**
 * Onboarding state shared by /welcome, the guided tour and the NavBar.
 *
 * localStorage `mf.onboarding.v1` records that the first-visit redirect to
 * /welcome has happened, so it never repeats. The running tour's position
 * lives in sessionStorage so it survives the page changes between steps.
 * Every storage access is wrapped: private windows and blocked storage throw.
 */

export const ONBOARDING_KEY = 'mf.onboarding.v1';
export const TOUR_STEP_KEY = 'mf.tour.step';
export const TOUR_TOUR_ID_KEY = 'mf.tour.tourId';
export const TOUR_EVENT = 'mf:tour';

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

export function markOnboardingSeen() {
  writeLocal(ONBOARDING_KEY, new Date().toISOString());
}

/** Starts (or restarts) the guided tour from step 1. */
export function requestTour() {
  markOnboardingSeen();
  writeSession(TOUR_STEP_KEY, '0');
  window.dispatchEvent(new Event(TOUR_EVENT));
}
