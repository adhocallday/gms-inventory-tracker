/**
 * Brand tokens. Red is the MerchFlow red (#E8003D, merchflow-brand/out/
 * tokens.json); the other accents come from the Global Merchandising Services
 * site (globalmerchservices.com), as their own declared CSS custom properties.
 */

export const gms = {
  red: '#E8003D',
  black: '#1D1C1D',
  gold: '#FFE135',
  sky: '#00C6FF',
  spring: '#14F2A8',
  orchid: '#C677BB',

  paper: '#FFFFFF',
  surface: '#FAFAFA',
  border: '#C8C8C8',
  slate: '#5D6C7B',
  mist: '#A0A0A0',
} as const;

/**
 * Categorical series palette, led by GMS red.
 *
 * The site's raw gold and spring green are far too light to carry marks on
 * white, so these are re-stepped. Order is fixed and never cycled: a sixth
 * series folds into "Other" or becomes small multiples.
 *
 * Validated with the dataviz palette checker (validate_palette.py) in both
 * light (surface #FFFFFF) and dark (surface #1D1C1D) — all checks pass
 * (lightness band, chroma floor, CVD separation, normal-vision floor,
 * contrast). Re-run 2026-11 after the switch to MerchFlow red #E8003D: still
 * all pass; #E8003D is 4.67:1 on white and 3.64:1 on #1D1C1D (marks need 3:1).
 * Re-run the validator before changing any value here.
 */
export const chartSeries = [
  '#E8003D',
  '#0082F3',
  '#C77400',
  '#00A36F',
  '#9B5FC0',
] as const;

/** Single-series magnitude charts encode by length, so they use one hue. */
export const chartPrimary = gms.red;

export const chartInk = {
  axis: '#5D6C7B',
  grid: '#E6E6E6',
  gridDark: '#2F2F2E',
  label: '#1D1C1D',
  muted: '#7A7A7A',
} as const;

export const fonts = {
  display: "'MADE TOMMY', 'Inter', system-ui, sans-serif",
  body: "'Inter', system-ui, -apple-system, sans-serif",
  mono: "'Inconsolata', ui-monospace, 'SF Mono', monospace",
} as const;

/**
 * Page geometry of the existing GMS sales chart deck, matched exactly so output
 * drops into current workflows.
 *
 * 1190.52 × 841.92pt is 420 × 297mm — **A3 landscape**, not A4. Puppeteer
 * rejects `pt`, so the millimetre values are what the renderer passes.
 */
export const page = {
  widthPt: 1190.52,
  heightPt: 841.92,
  widthMm: 420,
  heightMm: 297,
  marginPt: 36,
} as const;
