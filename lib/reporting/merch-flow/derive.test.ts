import { describe, it, expect } from 'vitest';
import {
  cleanName,
  categoryOf,
  scorecard,
  rollUpTail,
  monthTotals,
  flagShows,
  inferTourStart,
  categoryTotals,
  keyFigures,
  perHeadValue,
  titleCase,
  deriveAttendance,
} from './derive';
import { DEFAULT_OPTIONS, totalGross, type TourReport } from './types';
import { syntheticTracker as tracker } from './__fixtures__/synthetic-tour';

describe('cleanName', () => {
  it('strips the colourway and expands trade shorthand', () => {
    expect(cleanName('BLACK 2026 AMERICA ITIN TEE')).toEqual({
      display: '2026 America Itinerary Tee',
      color: 'Black',
    });
    expect(cleanName('LEGIONS CAPTIANS HAT').display).toBe('Legions Captains Hat');
    expect(cleanName('BLACK EYE OF THE STORM WOMENS TEE').display).toBe(
      "Eye Of The Storm Women's Tee",
    );
    expect(cleanName('ALLOVER LEGIONS WT 2026 TEE').display).toBe(
      'Allover Legions World Tour 2026 Tee',
    );
  });

  it('keeps a colour that is part of the product name', () => {
    expect(cleanName('BLACK AND YELLOW BANDANA')).toEqual({
      display: 'Black And Yellow Bandana',
      color: undefined,
    });
  });

  it('takes the tour vocabulary from options', () => {
    const options = {
      artistPrefix: /^ACME\s+/i,
      colorPrefix: /^(NAVY)\s+/i,
      acronyms: ['ACME', 'EU'],
      shorthand: [[/\bXMAS\b/gi, 'Christmas']] as const,
    };
    expect(cleanName('NAVY ACME EU XMAS TEE', options)).toEqual({
      display: 'EU Christmas Tee',
      color: 'Navy',
    });
    // Defaults no longer apply once overridden.
    expect(cleanName('BLACK ITIN TEE', options).display).toBe('Black Itin Tee');
    expect(titleCase('FFDP USA TEE', { acronyms: [] })).toBe('Ffdp Usa Tee');
  });
});

describe('categoryOf', () => {
  it('assigns categories from the name, falling back to the SKU class', () => {
    expect(categoryOf({ name: 'BLACK SKELETON CREW TEE', sku: 'TSTARX203227BK' })).toBe('Tees');
    expect(categoryOf({ name: 'USA HOCKEY JERSEY', sku: 'TSTANS503207OT' })).toBe(
      'Hoodies & jerseys',
    );
    expect(categoryOf({ name: 'LEGIONS CAPTIANS HAT', sku: 'TSTARX303217BK' })).toBe('Headwear');
    expect(categoryOf({ name: 'KNUCKLEHEAD BANDANA', sku: 'TSTARX103218BK' })).toBe('Accessories');
    expect(categoryOf({ name: 'MYSTERY ITEM', sku: 'TSTARX403221BK' })).toBe('Tees');
  });
});

describe('derived model over a synthetic tour', () => {
  const report: TourReport = {
    artist: tracker.artist,
    tourName: 'Synthetic Tour',
    dateRange: tracker.tourDates,
    attendance: 250_000,
    products: tracker.products.filter((p) => p.unitsSold > 0),
    shows: tracker.shows,
    branding: { artistAccent: '#FF0025' },
    sections: [],
    options: DEFAULT_OPTIONS,
  };

  it('totals the fixture', () => {
    expect(report.shows).toHaveLength(12);
    expect(report.products).toHaveLength(11);
    expect(totalGross(report.shows)).toBe(1_511_585);
    const cad = report.shows.reduce((sum, s) => sum + (s.grossSecondCurrency ?? 0), 0);
    expect(cad).toBe(384_900);
  });

  it('leads with the mean of every show’s per head', () => {
    const mean =
      report.shows.reduce((sum, s) => sum + (s.perHeadUsd ?? 0), 0) / report.shows.length;
    expect(perHeadValue(report)).toBeCloseTo(mean, 6);
  });

  it('offers gross over attendance as a distinct definition', () => {
    const weighted = perHeadValue({
      ...report,
      options: { ...DEFAULT_OPTIONS, perHead: 'grossOverAttendance' },
    });
    expect(weighted).toBeCloseTo(1_511_585 / 250_000, 6);
  });

  it('ranks products and computes rank shift', () => {
    const rows = scorecard(report.products);
    expect(rows[0].displayName).toBe('2026 America Itinerary Tee');
    expect(rows[0].rankByUnits).toBe(1);

    const jersey = rows.find((r) => r.sku === 'TSTANS503207OT')!;
    expect(jersey.rankByUnits).toBe(9);
    expect(jersey.rankByGross).toBe(6);
    expect(jersey.rankShift).toBe(3);
  });

  it('rolls the long tail up under 1% of gross', () => {
    const { head, tail, tailUnits } = rollUpTail(scorecard(report.products), 0.01);
    expect(head.length + tail.length).toBe(11);
    expect(tail.map((r) => r.sku).sort()).toEqual(
      ['TSTARX003219BK', 'TSTARX003240OT', 'TSTARX103218BK', 'TSTARX103219OT'].sort(),
    );
    expect(tailUnits).toBe(850);
  });

  it('groups shows by month and keeps pre-leg one-offs separate', () => {
    const start = inferTourStart(report.shows);
    expect(start).toBe('2026-07-01');

    const months = monthTotals(report.shows, start);
    expect(months.map((m) => m.label)).toEqual([
      'Pre-tour one-offs',
      'July 2026',
      'August 2026',
      'September 2026',
    ]);
    expect(months[0].shows).toHaveLength(2);
    expect(months.reduce((sum, m) => sum + m.shows.length, 0)).toBe(12);
    expect(months.reduce((sum, m) => sum + m.gross, 0)).toBe(totalGross(report.shows));
  });

  it('flags source-data problems without changing the values', () => {
    const flagged = flagShows(report.shows, inferTourStart(report.shows));

    const daytona = flagged.find((s) => s.city === 'DAYTONA')!;
    expect(daytona.flag).toBe('outsideRange');
    expect(daytona.perHeadUsd).toBeCloseTo(1.11, 2);
    expect(flagged.filter((s) => s.flag === 'outsideRange')).toHaveLength(2);

    const huntsville = flagged.find((s) => s.city === 'HUNTSVILE')!;
    expect(huntsville.citySuggestion).toBe('Huntsville');
    expect(huntsville.city).toBe('HUNTSVILE');
    expect(huntsville.cityDisplay).toBe('Huntsvile');
  });

  it('does not treat a show with no per head as suspect', () => {
    const [flagged] = flagShows([{ date: '2026-07-01', city: 'X', grossUsd: 10 }]);
    expect(flagged.flag).toBeUndefined();
  });

  it('takes city typos from options', () => {
    const flagged = flagShows(report.shows, undefined, { cityTypos: { NASHVILLE: 'Music City' } });
    expect(flagged.find((s) => s.city === 'NASHVILLE')!.citySuggestion).toBe('Music City');
    expect(flagged.find((s) => s.city === 'HUNTSVILE')!.citySuggestion).toBeUndefined();
  });

  it('totals categories to the full unit count', () => {
    const totals = categoryTotals(report.products);
    const sum = totals.reduce((acc, c) => acc + c.units, 0);
    expect(sum).toBe(report.products.reduce((acc, p) => acc + p.unitsSold, 0));
    expect(totals.reduce((acc, c) => acc + c.share, 0)).toBeCloseTo(1, 5);
    expect(totals.map((c) => c.category)).toEqual([
      'Tees',
      'Hoodies & jerseys',
      'Headwear',
      'Accessories',
    ]);
  });

  it('produces factual key figures with no interpretive language', () => {
    const figures = keyFigures(report);
    expect(figures).toHaveLength(3);
    expect(figures[0]).toEqual({
      stat: '60%',
      text: 'of units sold were the 3 itinerary tees (8,000 units).',
    });
    expect(figures[2].stat).toBe('#6');

    const prose = figures.map((f) => `${f.stat} ${f.text}`).join(' ').toLowerCase();
    for (const banned of ['carried', 'punch above', 'drove', 'star', 'winner', 'should']) {
      expect(prose).not.toContain(banned);
    }
  });

  it('takes the key-figure product group from options', () => {
    const figures = keyFigures(report, {
      keyFigure: { pattern: /bandana/i, label: 'bandanas', topN: 2 },
    });
    expect(figures[0].text).toBe('of units sold were the 2 bandanas (750 units).');
  });

  it('derives attendance and flags the implausible per head', () => {
    const derived = deriveAttendance(report.shows);
    expect(derived.shows).toHaveLength(12);
    expect(derived.suspectCount).toBe(1);
    expect(derived.shows.find((s) => s.city === 'DAYTONA')!.attendance).toBe(44_806);
  });
});
