# Product

<!-- impeccable:product-schema 1 -->

<!--
Written by an agent without a live interview: facts marked (inferred) come
from the repository and the Phase 6 brief, not from a confirmed answer.
Correct them in place.
-->

## Platform

web

## Users

- Merchandise managers and tour accountants at Global Merchandising Services (GMS) who track a touring artist's merchandise: what was ordered, what arrived, what sold each night, and what the venue settled. (inferred from the app's routes and data model)
- GMS staff evaluating the product in demos; the guided tour and `/welcome` exist for them.

## Product Purpose

MerchFlow Tracker turns tour paperwork (purchase orders, packing lists, nightly sales reports, venue settlements) into structured inventory, sales and cost data per tour and per show. Claude parses each uploaded PDF; a person reviews the parsed draft and posts it. Success is that a tour's stock position, gross, cost of goods and settlement figures are correct and traceable to their source documents.

## Positioning

The tracker is the system of record behind MerchFlow: documents in, reviewed figures out. MerchFlow Charts reads its data for the tour report; MerchFlow POS (iPad) sells against its catalogue.

## Operating Context

- Desktop browser, office or tour-office use, light theme by default. Dark theme is opt-in.
- Inputs are vendor PDFs and AtVenu-style sales exports; parsing uses Claude (`lib/ai/models.ts`).
- Work is document-centred: upload, review the parsed draft against the PDF, post or reject.
- Data lives in Supabase; the tour report page embeds MerchFlow Charts' dashboard, vendored under `components/merch-flow-report` and `lib/merch-flow-report`.

## Capabilities and Constraints

- Tours, shows, products and sizes; inventory balance and movements; COGS by product and show; projections; reports; admin pages for tours, products, documents and inventory; a POS demo page.
- Guided tour (driver.js) anchors on `data-tour` attributes across pages. They must be kept.
- Figures shown must come from posted data. Where a value is missing from the source document it is labelled as missing, never shown as zero.
- The vendored report is synced from MerchFlow Charts and checked by `scripts/sync-merch-flow-report.mjs --check`; it is not edited here.

## Brand Commitments

- Name: MerchFlow (product family), MerchFlow Tracker (this app), by Global Merchandising Services.
- Voice: plain and factual. No taglines, no marketing language. Labels name the thing; actions name the action.
- Binding visual constraints given by the owner (recorded, not expanded; tokens in `app/globals.css` as `--mf-*` and `--color-*`):
  - Light theme.
  - Red `#E8003D` is the accent and primary-button colour (white on red is 4.67:1).
  - Ink `#111214`, text `#1D1C1D`, muted `#6B7280`, surfaces `#F7F7F8` / `#F1F2F4`, border `#E5E7EB`.
  - Inter and Inconsolata; tabular figures for numbers.
- Logo: `components/brand/MerchFlowLogo.tsx`.

## Evidence on Hand

- Real tour data in Supabase (e.g. SKELETOUR 2025, Ghost 2025 seed). No testimonials, customers or benchmarks exist; none may be invented.

## Product Principles

1. Numbers are traceable: every figure can be followed back to the document it came from.
2. Missing is not zero: absent data is labelled, not rendered as $0 or 0.
3. Red means a problem or the primary action, nothing else.
4. Review before post: the person confirms what the parser read.
5. Plain copy: say what the screen shows and what the button does.

## Accessibility & Inclusion

WCAG 2.1 AA contrast and keyboard access as the working standard. (inferred)
