import { beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { syntheticDb } from '@/lib/reporting/merch-flow/__fixtures__/synthetic-db';
import {
  assembleReport,
  mapTourData,
  type AssembledReport,
  type Photo,
} from '@/lib/reporting/merch-flow/from-db';
import type { TrackerData } from './parse/tracker';
import {
  DEFAULT_OPTIONS,
  FULL_SECTIONS,
  productRatios,
  totalGross,
  totalUnits,
  type TourReport,
} from './report/types';
import { buildMatchRows, buildReport, type MatchRow } from './report/build';
import { toTrackerData } from './report/from-tracker-link';
import { findIssues, type Issue } from './report/issues';
import {
  categoryTotals,
  decorate,
  deriveAttendance,
  flagShows,
  inferTourStart,
  keyFigures,
  monthTotals,
  perHeadValue,
  rollUpTail,
  scorecard,
} from './report/derive';

/**
 * The tracker's report must equal what MerchFlow Charts builds for the same tour.
 *
 * Path 1 (tracker): synthetic DB rows → from-db mapTourData → TrackerData →
 * assembleReport (vendored buildReport).
 *
 * Path 2 (Charts): the same tour served by GET /api/tours/[id]/merch-flow-data,
 * over JSON, then through the steps copied from Charts' wizard: tracker-link.ts
 * loadTrackerTour → Wizard.tsx (link effect, runParse, publish) → /api/publish
 * (photos moved to imageUrls) → stored as JSON → loadReport.
 */

const SECRET = 'parity-test-secret';
const raw = syntheticDb();

vi.mock('@/lib/supabase/client', () => ({ createServiceClient: () => ({}) }));
vi.mock('@/lib/reporting/merch-flow/from-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/reporting/merch-flow/from-db')>();
  return {
    ...actual,
    loadTourData: async (_client: unknown, tourId: string) =>
      tourId === raw.tour.id ? { ...actual.mapTourData(raw), tour: raw.tour } : null,
  };
});

/** What a JSON column or HTTP body keeps: undefined keys dropped. */
const json = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// ---------------------------------------------------------------- Charts' flow, copied

type LinkedTour = { ok: true; tourId: string; tourName: string; tracker: TrackerData } | { ok: false; error: string };

/** app/new/tracker-link.ts loadTrackerTour, after the fetch. */
function chartsLoadTrackerTour(tourId: string, body: unknown): LinkedTour {
  const parsed = body as { tour?: { name?: unknown }; tracker?: unknown };
  const tracker = toTrackerData(parsed.tracker);
  if (!tracker) return { ok: false, error: 'MerchFlow Tracker returned data in an unexpected shape.' };
  return {
    ok: true,
    tourId,
    tourName: (typeof parsed.tour?.name === 'string' && parsed.tour.name) || tracker.artist,
    tracker,
  };
}

/** app/new/Wizard.tsx with app/new/wizard-state.ts initialState, nothing changed by the operator. */
function chartsWizard(result: LinkedTour, pops: Photo[]) {
  if (!result.ok) throw new Error(result.error);
  let state = {
    artist: '',
    tourName: '',
    dateRange: '',
    attendance: '',
    artistAccent: '#E8003D',
    sections: [...FULL_SECTIONS],
    options: { ...DEFAULT_OPTIONS },
    cityOverrides: {} as Record<string, string>,
    rows: [] as MatchRow[],
    parsed: undefined as undefined | { tracker: TrackerData; rows: MatchRow[] },
  };

  // useEffect: loadTrackerTour(tourId).then(...)
  const linkedTracker = result.tracker;
  state = {
    ...state,
    artist: state.artist || result.tracker.artist,
    tourName: state.tourName || result.tourName,
    dateRange: state.dateRange || result.tracker.tourDates,
    attendance: state.attendance || (result.tracker.attendance ? String(result.tracker.attendance) : ''),
  };

  // runParse(): no tracker file uploaded, so the linked tracker is used.
  const tracker = linkedTracker;
  const rows = buildMatchRows(tracker.products, pops);
  state = {
    ...state,
    parsed: { tracker, rows },
    rows,
    artist: state.artist || tracker.artist,
    tourName: state.tourName || tracker.tourDates || 'Tour',
    dateRange: state.dateRange || tracker.tourDates,
    attendance: state.attendance || (tracker.attendance || '').toString(),
  };
  const parsed = state.parsed!;

  // ReviewStep
  const issues = findIssues({ rows: state.rows, shows: parsed.tracker.shows, tourStart: inferTourStart(parsed.tracker.shows) });

  // publish()
  const report = buildReport({
    tracker: {
      artist: parsed.tracker.artist,
      tourDates: parsed.tracker.tourDates,
      products: parsed.tracker.products,
      shows: parsed.tracker.shows,
      attendance: Number(state.attendance) || 0,
    },
    rows: state.rows,
    artist: state.artist,
    tourName: state.tourName,
    dateRange: state.dateRange,
    attendance: Number(state.attendance) || 0,
    artistAccent: state.artistAccent,
    sections: state.sections,
    options: state.options,
    cityOverrides: state.cityOverrides,
  });
  // Charts only uploads data: URLs (POP photos read in the browser); the
  // tracker's photos are already URLs, so all of them travel here.
  const images = Object.fromEntries(state.rows.filter((r) => r.imageKey).map((r) => [r.sku, r.imageKey!]));

  // lib/db/reports.ts publishReport stores the report without image keys;
  // loadReport returns it from JSON with imageUrls keyed by SKU.
  const stored = json({ ...report, products: report.products.map((p) => ({ ...p, imageKey: undefined })) });
  return { report: stored as TourReport, imageUrls: images, issues, rows: state.rows };
}

// ---------------------------------------------------------------- the two paths

let tracker: AssembledReport & { trackerData: TrackerData };
let charts: { report: TourReport; imageUrls: Record<string, string>; issues: Issue[]; apiBody: unknown };

beforeAll(async () => {
  // Path 1
  const input = mapTourData(raw);
  tracker = { ...assembleReport(raw.tour.name, input.tracker, input.photos), trackerData: input.tracker };

  // Path 2, through the real route handler.
  process.env.MERCHFLOW_LINK_SECRET = SECRET;
  const { GET } = await import('@/app/api/tours/[id]/merch-flow-data/route');
  const res = await GET(
    new NextRequest(`http://tracker.test/api/tours/${raw.tour.id}/merch-flow-data`, {
      headers: { 'x-merchflow-link': SECRET },
    }),
    { params: { id: raw.tour.id } },
  );
  expect(res.status).toBe(200);
  const apiBody = json(await res.json());
  const linked = chartsLoadTrackerTour(raw.tour.id, apiBody);
  // The operator uploads the same photos as POP files.
  charts = { ...chartsWizard(linked, input.photos), apiBody };
});

describe('fixture sanity', () => {
  it('exercises the interesting cases', () => {
    const r = tracker.report;
    expect(r.shows).toHaveLength(12); // the unposted future show is dropped
    expect(r.products).toHaveLength(11); // the unsold product is dropped
    expect(r.attendance).toBeGreaterThan(0);
    expect(r.shows.filter((s) => s.perHeadUsd === undefined)).toHaveLength(1);
    expect(new Set(tracker.issues.map((i) => i.kind))).toEqual(
      new Set(['missingPhoto', 'outsideRange', 'perHeadSuspect', 'spelling']),
    );
    expect(Object.keys(tracker.imageUrls).length).toBe(3);
  });
});

describe('API shape', () => {
  it('is what Charts lib/report/from-tracker-link.ts expects, and loses nothing', () => {
    const body = charts.apiBody as { tour: { id: string; name: string; artist: string }; tracker: unknown };
    expect(body.tour).toEqual({ id: raw.tour.id, name: raw.tour.name, artist: raw.tour.artist });
    // toTrackerData keeps every field the tracker sends.
    expect(toTrackerData(body.tracker)).toEqual(tracker.trackerData);
    expect(toTrackerData(json(tracker.trackerData))).toEqual(json(tracker.trackerData));
  });
});

describe('tracker report = Charts report', () => {
  const both = () => [tracker.report, charts.report] as const;

  it('is the same TourReport', () => {
    expect(json(tracker.report)).toEqual(charts.report);
    expect(tracker.imageUrls).toEqual(charts.imageUrls);
  });

  it('has the same shows', () => {
    const [a, b] = both();
    expect(a.shows).toEqual(b.shows);
    expect(flagShows(a.shows, inferTourStart(a.shows))).toEqual(flagShows(b.shows, inferTourStart(b.shows)));
    expect(monthTotals(a.shows, inferTourStart(a.shows))).toEqual(monthTotals(b.shows, inferTourStart(b.shows)));
    expect(deriveAttendance(a.shows)).toEqual(deriveAttendance(b.shows));
  });

  it('has the same gross and units', () => {
    const [a, b] = both();
    expect(totalGross(a.shows)).toBe(totalGross(b.shows));
    expect(totalUnits(a.products)).toBe(totalUnits(b.products));
    expect(a.attendance).toBe(b.attendance);
  });

  it('has the same per head by both methods', () => {
    const [a, b] = both();
    for (const perHead of ['meanOfShows', 'grossOverAttendance'] as const) {
      const withOption = (r: TourReport) => perHeadValue({ ...r, options: { ...r.options, perHead } });
      expect(withOption(a)).toBe(withOption(b));
      expect(withOption(a)).toBeGreaterThan(0);
    }
  });

  it('has the same ranks, scorecard and tail', () => {
    const [a, b] = both();
    const sa = scorecard(a.products.map(decorate));
    const sb = scorecard(b.products.map(decorate));
    expect(sa).toEqual(sb);
    expect(sa.map((r) => [r.sku, r.rankByUnits, r.rankByGross])).toEqual(sb.map((r) => [r.sku, r.rankByUnits, r.rankByGross]));
    expect(sa.some((r) => r.rankShift !== 0)).toBe(true);
    expect(rollUpTail(sa, a.options.tailThreshold)).toEqual(rollUpTail(sb, b.options.tailThreshold));
  });

  it('has the same category mix', () => {
    const [a, b] = both();
    expect(categoryTotals(a.products.map(decorate))).toEqual(categoryTotals(b.products.map(decorate)));
  });

  it('has the same 1-in-N ratios', () => {
    const [a, b] = both();
    expect(productRatios(a.products, a.attendance).map((p) => [p.sku, p.oneInN])).toEqual(
      productRatios(b.products, b.attendance).map((p) => [p.sku, p.oneInN]),
    );
  });

  it('has the same key figures', () => {
    const [a, b] = both();
    const decorated = (r: TourReport) => ({ ...r, products: r.products.map(decorate) });
    expect(keyFigures(decorated(a))).toEqual(keyFigures(decorated(b)));
  });

  it('has the same issues', () => {
    expect(tracker.issues).toEqual(charts.issues);
  });
});
