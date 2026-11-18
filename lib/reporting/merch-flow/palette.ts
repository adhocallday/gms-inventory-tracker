/**
 * Local chart palette, replacing the Charts app's GMS brand tokens.
 *
 * Fixed categorical order, never cycled. Checked with the dataviz palette
 * validator against both the tracker's dark (#111111) and light surfaces: all
 * checks pass (lightness band, chroma floor, CVD separation, contrast).
 */
export const chartSeries = ['#FF0025', '#0082F3', '#C77400', '#00A36F', '#9B5FC0'] as const;

/** Default accent when a report has no artist colour. */
export const defaultAccent = '#E8003D';
