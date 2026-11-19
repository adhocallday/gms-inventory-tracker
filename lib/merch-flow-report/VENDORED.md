# Vendored from MerchFlow Charts

- **Source:** `merch-flow-charts`, branch `feature/merchflow-brand`
- **Commit:** `51c6323bddce033b06bf686c75613bcacda41fa2`
- **Copied:** 2026-11-19
- **Sync:** `node scripts/sync-merch-flow-report.mjs` (re-copy) or `--check` (fail if anything differs).
  `lib/merch-flow-report/sync.test.ts` runs the check whenever the sibling Charts repo is present.

Do not edit these files by hand. Fix the engine in Charts and re-sync; tracker-side
dashboard changes belong in the script's `PATCHES`.

## Engine (unchanged copies)

This folder mirrors Charts' `lib/` layout, so relative imports are unchanged.
`parse/tracker.ts` and `parse/pop.ts` keep only the `TrackerData` and `PopItem`
types: the parsers need xlsx libraries the tracker does not ship.

| Charts | Tracker |
| --- | --- |
| `lib/report/types.ts` | `lib/merch-flow-report/report/types.ts` |
| `lib/report/derive.ts` | `lib/merch-flow-report/report/derive.ts` |
| `lib/report/build.ts` | `lib/merch-flow-report/report/build.ts` |
| `lib/report/issues.ts` | `lib/merch-flow-report/report/issues.ts` |
| `lib/report/from-tracker-link.ts` | `lib/merch-flow-report/report/from-tracker-link.ts` |
| `lib/report/from-tracker-link.test.ts` | `lib/merch-flow-report/report/from-tracker-link.test.ts` |
| `lib/normalize/sku.ts` | `lib/merch-flow-report/normalize/sku.ts` |
| `lib/format.ts` | `lib/merch-flow-report/format.ts` |
| `lib/brand/tokens.ts` | `lib/merch-flow-report/brand/tokens.ts` |
| `lib/parse/tracker.ts` | `lib/merch-flow-report/parse/tracker.ts` |
| `lib/parse/pop.ts` | `lib/merch-flow-report/parse/pop.ts` |

## Web dashboard (adapted)

| Charts | Tracker |
| --- | --- |
| `components/web/ReportDashboard.tsx` | `components/merch-flow-report/ReportDashboard.tsx` |
| `components/web/SummarySection.tsx` | `components/merch-flow-report/SummarySection.tsx` |
| `components/web/ShowRows.tsx` | `components/merch-flow-report/ShowRows.tsx` |
| `components/web/ShowsChart.tsx` | `components/merch-flow-report/ShowsChart.tsx` |
| `components/web/Scorecard.tsx` | `components/merch-flow-report/Scorecard.tsx` |
| `components/web/CategoryMix.tsx` | `components/merch-flow-report/CategoryMix.tsx` |
| `components/web/ProductDrawer.tsx` | `components/merch-flow-report/ProductDrawer.tsx` |
| `components/web/ReportChrome.tsx` | `components/merch-flow-report/ReportChrome.tsx` |
| `components/web/useContainerWidth.ts` | `components/merch-flow-report/useContainerWidth.ts` |
| `components/ui/index.tsx` | `components/merch-flow-report/ui/index.tsx` |
| `public/gms-logo.png` | `public/gms-logo.png` |

Applied to every dashboard file:

- `@/lib/report|brand|format` and `@/components/ui` imports point at the vendored copies.
- Tailwind 4 → 3: `rounded-sm` → `rounded` (v4 shifted the radius scale), and opacity
  modifiers off the v3.4 scale would get brackets (none occur today).

Patches (see `PATCHES` in the script):

- `React.ReactNode` / `React.AnchorHTMLAttributes` become imported types (React 18 types).
- An optional `pdfLabel` prop on `ReportDashboard`, `ReportHeader` and `ReportBottomBar`;
  Charts' wording stays the default.
- Guided-tour anchors: `mf-kpis`, `mf-figures` (SummarySection), `mf-scorecard`,
  `mf-category` (panels), `mf-ratios` (CategoryMix reach list) and `charts-link` (the hero
  PDF button).
