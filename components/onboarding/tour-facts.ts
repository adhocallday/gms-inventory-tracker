/**
 * Live figures for the overview tour. The API route
 * (/api/tours/[id]/overview-facts) sums them from posted records; step text
 * refers to them with {tokens} that are filled in when the step is shown.
 */

export interface TourFacts {
  tourName: string;
  artist: string;
  /** Sum of show gross, to the cent. */
  gross: number;
  showsWithSales: number;
  showsTotal: number;
  /** Units on posted sales lines. */
  units: number;
  /** Attendance at the shows with sales. */
  attendance: number;
  /** gross ÷ attendance at the shows with sales and attendance; null without attendance. */
  perHead: number | null;
}

type ShowRow = { total_gross: number | string | null; attendance: number | null };
type SaleRow = { qty_sold: number | null };

const num = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function summarizeTour(
  shows: ShowRow[],
  sales: SaleRow[],
): Omit<TourFacts, 'tourName' | 'artist'> {
  // Sum in cents so the total is exact to the cent.
  let grossCents = 0;
  let showsWithSales = 0;
  let attendance = 0;
  let grossWithAttendance = 0;
  for (const show of shows) {
    const g = num(show.total_gross);
    grossCents += Math.round(g * 100);
    if (g > 0) {
      showsWithSales += 1;
      const a = num(show.attendance);
      if (a > 0) {
        attendance += a;
        grossWithAttendance += g;
      }
    }
  }
  return {
    gross: grossCents / 100,
    showsWithSales,
    showsTotal: shows.length,
    units: sales.reduce((sum, s) => sum + num(s.qty_sold), 0),
    attendance,
    perHead: attendance > 0 ? grossWithAttendance / attendance : null,
  };
}

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = (n: number) => n.toLocaleString('en-US');

/** The tokens step text may use. */
export const FACT_TOKENS = ['tour', 'artist', 'gross', 'shows', 'showsTotal', 'units', 'attendance', 'perHead'] as const;

function factValues(facts: TourFacts): Record<(typeof FACT_TOKENS)[number], string | null> {
  return {
    tour: facts.tourName,
    artist: facts.artist,
    gross: facts.gross > 0 ? usd(facts.gross) : null,
    shows: facts.showsWithSales > 0 ? int(facts.showsWithSales) : null,
    showsTotal: int(facts.showsTotal),
    units: facts.units > 0 ? int(facts.units) : null,
    attendance: facts.attendance > 0 ? int(facts.attendance) : null,
    perHead: facts.perHead === null ? null : usd(facts.perHead),
  };
}

/**
 * Fills {tokens} in `text` from the facts. Returns null when a token has no
 * value (no facts, or a zero figure), so the caller can show fallback text.
 */
export function fillFacts(text: string, facts: TourFacts | null | undefined): string | null {
  if (!/\{\w+\}/.test(text)) return text;
  if (!facts) return null;
  const values = factValues(facts) as Record<string, string | null>;
  let missing = false;
  const filled = text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    if (value === null || value === undefined) {
      missing = true;
      return '';
    }
    return value;
  });
  return missing ? null : filled;
}
