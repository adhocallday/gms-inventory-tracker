/**
 * Display formatting shared across pages.
 *
 * Date-only values ("2025-07-09", show and tour dates) parse as UTC midnight
 * in JavaScript, so formatting them in the local zone shows the previous day
 * anywhere west of Greenwich. formatDate formats date-only strings in UTC and
 * timestamps in the viewer's zone.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && DATE_ONLY.test(value);
}

export function formatDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
  fallback = '—'
): string {
  if (!value) return fallback;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-US', {
    ...options,
    ...(isDateOnly(value) ? { timeZone: 'UTC' } : {}),
  });
}

export function formatCurrency(value: number | null | undefined, fractionDigits = 0, fallback = '—'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatNumber(value: number | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return value.toLocaleString('en-US');
}
