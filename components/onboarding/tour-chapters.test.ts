import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FULL_CHAPTERS,
  OVERVIEW_CHAPTERS,
  TOURS,
  chapterLabel,
  gapPath,
  isAtPath,
  isValidPosition,
  nextChapter,
  nextPosition,
  pickDocument,
  pickShow,
  previousPosition,
  resolvePath,
  type TourId,
  type TourPage,
} from './tour-chapters';
import { FACT_TOKENS, fillFacts, summarizeTour, type TourFacts } from './tour-facts';

const ids = { tourId: 't1', showId: 's1', docId: 'd1' };
const none = { tourId: null, showId: null, docId: null };
const TOUR_IDS: TourId[] = ['overview', 'full'];
const allSteps = (tour: TourId) => TOURS[tour].chapters.flatMap((c) => c.steps);

const ROOT = path.resolve(__dirname, '../..');

/** The App Router page file each tour page renders. */
const PAGE_FILES: Record<TourPage, string> = {
  welcome: 'app/welcome/page.tsx',
  home: 'app/page.tsx',
  tour: 'app/tours/[id]/page.tsx',
  show: 'app/tours/[id]/shows/[showId]/page.tsx',
  upload: 'app/upload/page.tsx',
  documents: 'app/dashboard/parsed-documents/page.tsx',
  review: 'app/dashboard/parsed-documents/[id]/page.tsx',
  inventory: 'app/tours/[id]/inventory/page.tsx',
  cogs: 'app/tours/[id]/cogs/page.tsx',
  projections: 'app/tours/[id]/projections/page.tsx',
  reports: 'app/tours/[id]/reports/page.tsx',
  merchFlow: 'app/tours/[id]/reports/merch-flow/page.tsx',
  admin: 'app/admin/page.tsx',
  adminTours: 'app/admin/tours/page.tsx',
  adminNewTour: 'app/admin/tours/new/page.tsx',
  adminProducts: 'app/admin/products/page.tsx',
  adminInventory: 'app/admin/inventory/page.tsx',
  adminDocuments: 'app/admin/documents/page.tsx',
  adminAnalytics: 'app/admin/analytics/page.tsx',
  pos: 'app/pos/page.tsx',
  posDemo: 'app/pos/demo/page.tsx',
};

/** Every data-tour value written in app/ and components/ (literal, or built in a template). */
function anchorsInRepo(): string {
  return execFileSync('grep', ['-rhoE', '--include=*.tsx', 'data-tour[=:][^>]{0,200}|tour: .[a-z-]+.|TOUR_ANCHORS[^;]*', 'app', 'components'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

describe('tours', () => {
  it('has the overview (default, 10 chapters numbered from 1) and the full walkthrough (12, from 0)', () => {
    expect(OVERVIEW_CHAPTERS).toHaveLength(10);
    expect(FULL_CHAPTERS).toHaveLength(12);
    expect(TOURS.overview.firstNumber).toBe(1);
    expect(TOURS.full.firstNumber).toBe(0);
  });

  it('keeps the overview to about 35 steps', () => {
    const steps = allSteps('overview').length;
    expect(steps).toBeGreaterThanOrEqual(30);
    expect(steps).toBeLessThanOrEqual(42);
  });

  it('labels chapters with the tour name', () => {
    expect(chapterLabel('overview', 2)).toBe('Overview · 3 of 10 · AI reads, GMS rules decide');
    expect(chapterLabel('full', 3)).toBe('Full walkthrough · 3 of 11 · A show');
  });

  it.each(TOUR_IDS)('%s: every step points at a page that exists', (tour) => {
    for (const step of allSteps(tour)) {
      expect(existsSync(path.join(ROOT, PAGE_FILES[step.page])), `${step.title}: ${step.page}`).toBe(true);
    }
  });

  it.each(TOUR_IDS)('%s: every anchor a step uses is written somewhere in the repo', (tour) => {
    const source = anchorsInRepo();
    // Template anchors: flow-${view.id}-note-${index} in FlowFigures.
    const dynamic = [/^flow-(current|option-a|option-b|compare)-note-\d$/];
    for (const step of allSteps(tour)) {
      for (const anchor of [step.anchor, step.fallbackAnchor]) {
        if (!anchor) continue;
        const found = source.includes(`"${anchor}"`) || source.includes(`'${anchor}'`) || dynamic.some((re) => re.test(anchor));
        expect(found, `${step.title}: data-tour="${anchor}"`).toBe(true);
      }
    }
  });

  it.each(TOUR_IDS)('%s: every step that needs an id has a gap explanation', (tour) => {
    for (const step of allSteps(tour)) {
      if (resolvePath(step.page, none) === null) expect(step.gap, step.title).toBeTruthy();
    }
  });

  it('only uses known figure tokens, with text for when figures are missing', () => {
    for (const step of allSteps('overview')) {
      const tokens = Array.from(`${step.title} ${step.body}`.matchAll(/\{(\w+)\}/g), (m) => m[1]);
      for (const token of tokens) expect(FACT_TOKENS as readonly string[]).toContain(token);
      if (/\{\w+\}/.test(step.body)) expect(step.bodyWithoutFigures, step.title).toBeTruthy();
    }
  });
});

describe('tour facts', () => {
  const facts: TourFacts = {
    tourName: 'SKELETOUR',
    artist: 'Ghost',
    gross: 6804304.34,
    showsWithSales: 22,
    showsTotal: 27,
    units: 125605,
    attendance: 190245,
    perHead: 35.77,
  };

  it('sums gross to the cent and per head over shows with sales', () => {
    const summary = summarizeTour(
      [
        { total_gross: '0.10', attendance: 10 },
        { total_gross: 0.2, attendance: 0 },
        { total_gross: null, attendance: 500 },
      ],
      [{ qty_sold: 3 }, { qty_sold: null }],
    );
    expect(summary.gross).toBe(0.3);
    expect(summary.showsWithSales).toBe(2);
    expect(summary.showsTotal).toBe(3);
    expect(summary.units).toBe(3);
    expect(summary.attendance).toBe(10);
    expect(summary.perHead).toBeCloseTo(0.01);
  });

  it('fills tokens, or returns null when a figure is missing', () => {
    expect(fillFacts('{gross} from {shows} shows, {units} units', facts)).toBe('$6,804,304.34 from 22 shows, 125,605 units');
    expect(fillFacts('{gross}', null)).toBeNull();
    expect(fillFacts('{perHead}', { ...facts, perHead: null })).toBeNull();
    expect(fillFacts('No figures', null)).toBe('No figures');
  });
});

describe('resolvePath', () => {
  it('builds dynamic paths from the resolved ids', () => {
    expect(resolvePath('show', ids)).toBe('/tours/t1/shows/s1');
    expect(resolvePath('merchFlow', ids)).toBe('/tours/t1/reports/merch-flow');
    expect(resolvePath('review', ids)).toBe('/dashboard/parsed-documents/d1');
    expect(resolvePath('posDemo', none)).toBe('/pos/demo');
  });

  it('returns null when an id is missing', () => {
    expect(resolvePath('tour', none)).toBeNull();
    expect(resolvePath('show', { ...ids, showId: null })).toBeNull();
    expect(resolvePath('review', none)).toBeNull();
    expect(resolvePath('upload', none)).toBe('/upload');
  });

  it('explains review gaps on the documents list and the rest on /', () => {
    expect(gapPath('review')).toBe('/dashboard/parsed-documents');
    expect(gapPath('show')).toBe('/');
  });
});

describe.each(TOUR_IDS)('positions (%s)', (tour) => {
  const chapters = TOURS[tour].chapters;
  const lastChapter = chapters.length - 1;
  const lastStep = chapters[lastChapter].steps.length - 1;

  it('moves through a chapter and into the next', () => {
    expect(nextPosition({ tour, chapter: 0, step: 0 })).toEqual(
      chapters[0].steps.length > 1 ? { tour, chapter: 0, step: 1 } : { tour, chapter: 1, step: 0 },
    );
    expect(nextPosition({ tour, chapter: 0, step: chapters[0].steps.length - 1 })).toEqual({ tour, chapter: 1, step: 0 });
    expect(nextPosition({ tour, chapter: lastChapter, step: lastStep })).toBeNull();
  });

  it('moves back into the previous chapter at its last step', () => {
    expect(previousPosition({ tour, chapter: 1, step: 0 })).toEqual({ tour, chapter: 0, step: chapters[0].steps.length - 1 });
    expect(previousPosition({ tour, chapter: 0, step: 0 })).toBeNull();
  });

  it('skips to the next chapter', () => {
    expect(nextChapter({ tour, chapter: 2, step: 1 })).toEqual({ tour, chapter: 3, step: 0 });
    expect(nextChapter({ tour, chapter: lastChapter, step: 0 })).toBeNull();
  });

  it('rejects positions outside the tour', () => {
    expect(isValidPosition({ tour, chapter: 0, step: 0 })).toBe(true);
    expect(isValidPosition({ tour, chapter: chapters.length, step: 0 })).toBe(false);
    expect(isValidPosition({ tour, chapter: 0, step: 99 })).toBe(false);
    expect(isValidPosition({ tour, chapter: 0.5, step: 0 })).toBe(false);
    expect(isValidPosition({ tour: 'nope' as TourId, chapter: 0, step: 0 })).toBe(false);
  });
});

describe('isAtPath', () => {
  it('compares the pathname, and the query only when the target has one', () => {
    expect(isAtPath('/upload', '/upload', '?docId=1')).toBe(true);
    expect(isAtPath('/upload?docId=1', '/upload', '?docId=1')).toBe(true);
    expect(isAtPath('/upload?docId=1', '/upload', '')).toBe(false);
    expect(isAtPath('/tours/1', '/tours/1/inventory', '')).toBe(false);
  });
});

describe('pickers', () => {
  it('prefers a reconciled show, then one with attendance', () => {
    expect(pickShow([{ id: 'a' }, { id: 'b', settlement_status: 'reconciled' }])).toBe('b');
    expect(pickShow([{ id: 'a', attendance: 0 }, { id: 'b', attendance: 900 }])).toBe('b');
    expect(pickShow([{ id: 'a' }])).toBe('a');
    expect(pickShow([])).toBeNull();
  });

  it('prefers a draft matched to a tour', () => {
    expect(
      pickDocument([
        { id: 'posted', status: 'posted', tour_id: 't' },
        { id: 'loose', status: 'draft' },
        { id: 'matched', status: 'draft', tour_id: 't' },
      ]),
    ).toBe('matched');
    expect(pickDocument([{ id: 'posted', status: 'posted' }])).toBe('posted');
    expect(pickDocument([])).toBeNull();
  });
});
