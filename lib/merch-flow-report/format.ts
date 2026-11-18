export const usd = (n: number, decimals = 0) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const compactUsd = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
};

export const units = (n: number) => n.toLocaleString('en-US');

export const percent = (fraction: number, decimals = 2) =>
  `${(fraction * 100).toFixed(decimals)}%`;

export const showDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

export const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

/** "1 in 16" — the phrasing the existing GMS charts use. */
export const oneIn = (n: number) => `1 in ${Math.round(n).toLocaleString('en-US')}`;

/** Round a max up to a clean axis top so gridlines land on readable numbers. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}
