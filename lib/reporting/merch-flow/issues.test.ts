import { describe, it, expect } from 'vitest';
import { buildMatchRows } from './build';
import { findIssues, citySuggestions, nameSuggestions } from './issues';
import { inferTourStart } from './derive';
import { syntheticTracker as tracker } from './__fixtures__/synthetic-tour';

describe('review issues over a synthetic tour', () => {
  // No photos: every product is missing one.
  const rows = buildMatchRows(tracker.products, []);
  const tourStart = inferTourStart(tracker.shows);

  it('flags the top sellers that have no photo', () => {
    const photo = findIssues({ rows, shows: tracker.shows, tourStart }).find(
      (i) => i.kind === 'missingPhoto',
    );
    expect(photo).toBeDefined();
    expect(photo!.title).toBe('10 top-10 products have no photo');
    expect(photo!.detail).toContain('2026 America Itinerary Tee (#1)');
    expect(photo!.action).toBe('Add photos');
  });

  it('stops flagging products once they have a photo', () => {
    const withPhotos = buildMatchRows(
      tracker.products,
      tracker.products.map((p) => ({ sku: p.sku, itemName: p.name, imageKey: `${p.sku}.webp` })),
    );
    const kinds = findIssues({ rows: withPhotos, shows: tracker.shows, tourStart }).map(
      (i) => i.kind,
    );
    expect(kinds).not.toContain('missingPhoto');
  });

  it('flags the two pre-leg shows and the implausible per head separately', () => {
    const issues = findIssues({ rows, shows: tracker.shows, tourStart });

    const outside = issues.find((i) => i.kind === 'outsideRange')!;
    expect(outside.title).toContain('2 shows');
    expect(outside.detail).toContain('Daytona');
    expect(outside.detail).toContain('Mescalero');
    expect(outside.action).toBeUndefined();

    const perHead = issues.find((i) => i.kind === 'perHeadSuspect')!;
    expect(perHead.title).toContain('$1.11');
    expect(perHead.detail).toContain('44,806');
  });

  it('suggests spelling fixes without changing the source', () => {
    expect(citySuggestions(tracker.shows)).toEqual(
      expect.arrayContaining([
        { from: 'HUNTSVILE', to: 'Huntsville' },
        { from: 'VIRGINA BEACH', to: 'Virginia Beach' },
      ]),
    );
    expect(nameSuggestions(rows)).toEqual([{ from: 'CAPTIANS', to: 'Captains' }]);

    expect(tracker.shows.some((s) => s.city === 'HUNTSVILE')).toBe(true);
    expect(tracker.products.some((p) => p.name.includes('CAPTIANS'))).toBe(true);
  });

  it('takes typo lists from options', () => {
    expect(citySuggestions(tracker.shows, { cityTypos: {} })).toEqual([]);
    expect(nameSuggestions(rows, { nameTypos: { ENAMEL: 'Enamelled' } })).toEqual([
      { from: 'ENAMEL', to: 'Enamelled' },
    ]);
  });

  it('finds exactly the four things a human should look at', () => {
    const issues = findIssues({ rows, shows: tracker.shows, tourStart });
    expect(issues.map((i) => i.kind)).toEqual([
      'missingPhoto',
      'outsideRange',
      'perHeadSuspect',
      'spelling',
    ]);
  });

  it('reports shows with no attendance', () => {
    const shows = [
      ...tracker.shows,
      { date: '2026-09-10', city: 'SEATTLE', grossUsd: 90_000 },
    ];
    const missing = findIssues({ rows, shows, tourStart }).find(
      (i) => i.kind === 'missingAttendance',
    )!;
    expect(missing.title).toBe('1 of 13 shows has no attendance');
    expect(missing.detail).toContain('Seattle (Sep 10)');
  });
});
