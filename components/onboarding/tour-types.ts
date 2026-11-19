/**
 * The small tour types shared by the tour data (./tour-chapters), the
 * start/stop API (./tour-control) and the NavBar. Kept apart from
 * tour-chapters so the NavBar and every page do not load the tour text.
 */

export type TourId = 'overview' | 'full';

export const DEFAULT_TOUR: TourId = 'overview';

export function isTourId(value: unknown): value is TourId {
  return value === 'overview' || value === 'full';
}

export interface TourIds {
  tourId: string | null;
  showId: string | null;
  docId: string | null;
}

export interface TourPosition {
  /** Which tour; positions saved before there were two tours mean the full walkthrough. */
  tour: TourId;
  chapter: number;
  step: number;
}
