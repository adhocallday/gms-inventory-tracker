/**
 * The MerchFlow apps and where each one lives.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so each is read by its full
 * name (a dynamic process.env[key] lookup would be undefined in the browser).
 */

const trim = (url: string) => url.replace(/\/+$/, '');

export const TRACKER_URL = trim(
  process.env.NEXT_PUBLIC_TRACKER_URL || 'https://gms-inventory-tracker.vercel.app',
);
export const CHARTS_URL = trim(
  process.env.NEXT_PUBLIC_CHARTS_URL || 'https://merch-flow-charts.vercel.app',
);
export const FLOW_URL = trim(
  process.env.NEXT_PUBLIC_FLOW_URL || 'https://gms-merch-flow-intelligence.vercel.app',
);
/** The TestFlight link once the iOS app is distributed; the tracker's /pos page until then. */
export const POS_URL = trim(process.env.NEXT_PUBLIC_POS_URL || `${TRACKER_URL}/pos`);

/** URL scheme registered by the MerchFlow POS iPad app. */
export const POS_APP_SCHEME = 'merchflow://';

export type AppId = 'tracker' | 'charts' | 'pos' | 'flow';

export const MERCHFLOW_APPS: { id: AppId; label: string; note: string; href: string }[] = [
  { id: 'tracker', label: 'Tracker', note: 'Tours, documents, inventory', href: TRACKER_URL },
  { id: 'charts', label: 'Charts', note: 'Sales chart reports', href: CHARTS_URL },
  { id: 'pos', label: 'POS', note: 'iPad point of sale', href: POS_URL },
  { id: 'flow', label: 'Data Flow', note: 'How the data moves', href: FLOW_URL },
];

/** Deep link into the Charts wizard, pre-filled from a tracker tour. */
export function chartsNewReportUrl(tourId: string) {
  return `${CHARTS_URL}/new?tourId=${encodeURIComponent(tourId)}&from=tracker`;
}
