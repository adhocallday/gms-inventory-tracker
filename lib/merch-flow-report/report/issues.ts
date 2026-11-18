import type { Show } from './types';
import type { MatchRow } from './build';
import { titleCase, cleanName } from './derive';
import { shortDate } from '../format';

/**
 * Things worth a human look before publishing.
 *
 * Every issue is a suggestion with an explicit action — nothing is corrected
 * on the operator's behalf. A tour that genuinely started early is not an
 * error, and a product the tracker spells oddly may be spelled that way on
 * purpose.
 */

export type IssueKind = 'missingPhoto' | 'outsideRange' | 'perHeadSuspect' | 'spelling';

export type Issue = {
  kind: IssueKind;
  title: string;
  detail: string;
  /** Label for the action button, when there is something to do. */
  action?: string;
};

const PER_HEAD_SUSPECT_BELOW = 5;
const TOP_N = 10;

export const CITY_TYPOS: Record<string, string> = {
  HUNTSVILE: 'Huntsville',
  'VIRGINA BEACH': 'Virginia Beach',
};

/** Product-name typos worth offering, keyed on the tracker's own spelling. */
export const NAME_TYPOS: Record<string, string> = {
  CAPTIANS: 'Captains',
};

export function citySuggestions(shows: Show[]): { from: string; to: string }[] {
  const seen = new Map<string, string>();
  for (const show of shows) {
    const key = show.city.trim().toUpperCase();
    const fix = CITY_TYPOS[key];
    if (fix && !seen.has(show.city)) seen.set(show.city, fix);
  }
  return [...seen].map(([from, to]) => ({ from, to }));
}

export function nameSuggestions(rows: MatchRow[]): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  for (const row of rows) {
    const name = row.trackerName;
    if (!name) continue;
    for (const [wrong, right] of Object.entries(NAME_TYPOS)) {
      if (new RegExp(`\\b${wrong}\\b`, 'i').test(name)) {
        out.push({ from: wrong, to: right });
      }
    }
  }
  // One entry per distinct correction.
  return [...new Map(out.map((o) => [o.from, o])).values()];
}

export function findIssues({
  rows,
  shows,
  tourStart,
}: {
  rows: MatchRow[];
  shows: Show[];
  tourStart?: string;
}): Issue[] {
  const issues: Issue[] = [];

  const ranked = rows
    .filter((r) => r.unitsSold !== undefined)
    .sort((a, b) => (b.unitsSold ?? 0) - (a.unitsSold ?? 0));

  const topWithoutPhoto = ranked
    .slice(0, TOP_N)
    .map((row, i) => ({ row, rank: i + 1 }))
    .filter(({ row }) => !row.imageKey);

  if (topWithoutPhoto.length) {
    issues.push({
      kind: 'missingPhoto',
      title: `${topWithoutPhoto.length} top-${TOP_N} product${topWithoutPhoto.length === 1 ? ' has' : 's have'} no photo`,
      detail: topWithoutPhoto
        .map(
          ({ row, rank }) =>
            `${row.displayName ?? cleanName(row.trackerName ?? row.sku).display} (#${rank})`,
        )
        .join(', '),
      action: 'Add photos',
    });
  }

  const outside = tourStart ? shows.filter((s) => s.date < tourStart) : [];
  if (outside.length) {
    issues.push({
      kind: 'outsideRange',
      title: `${outside.length} show${outside.length === 1 ? ' is' : 's are'} outside the main tour leg`,
      detail: outside.map((s) => `${titleCase(s.city)} (${shortDate(s.date)})`).join(', '),
    });
  }

  const suspect = shows.filter(
    (s) => (s.perHeadUsd ?? 0) > 0 && (s.perHeadUsd ?? 0) < PER_HEAD_SUSPECT_BELOW,
  );
  for (const show of suspect) {
    issues.push({
      kind: 'perHeadSuspect',
      title: `${titleCase(show.city)} spend per head is $${(show.perHeadUsd ?? 0).toFixed(2)}`,
      detail: `Implies a crowd of ${Math.round(show.grossUsd / (show.perHeadUsd || 1)).toLocaleString('en-US')}, which looks like an attendance entry error in the tracker.`,
    });
  }

  const spelling = [...citySuggestions(shows), ...nameSuggestions(rows)];
  if (spelling.length) {
    issues.push({
      kind: 'spelling',
      title: `${spelling.length} possible spelling fix${spelling.length === 1 ? '' : 'es'}`,
      detail: spelling.map((s) => `${s.from} → ${s.to}`).join(' · '),
      action: 'Apply',
    });
  }

  return issues;
}
