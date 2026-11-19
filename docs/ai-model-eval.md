# Extraction model eval

Run 2026-11-19 with `scripts/eval-extraction-models.ts --run`. Total cost $0.79.

Decision rule: the cheapest candidate with 100% totals and at least 99% line accuracy wins; ties go to lower cost.

## Decision

| Doc type | Winner | Why |
|---|---|---|
| sales-report | - | no candidate met 100% totals and 99% lines |
| settlement | sonnet-medium | cheapest passing ($0.0102/doc) |
| po | sonnet-medium | cheapest passing ($0.0205/doc) |

## Results

| Case | Candidate | Served by | Totals | Line accuracy | Extra lines | Input tok | Output tok | Cost | Latency | Error |
|---|---|---|---|---|---|---|---|---|---|---|
| sales-report/pdf | sonnet-medium | claude-sonnet-5-5 | 2/2 | 97.7% (85/87) | 0 | 17024 | 5489 | $0.0889 | 26.4s |  |
| sales-report/pdf | opus-low | claude-opus-5-5 | 2/2 | 97.7% (85/87) | 0 | 17024 | 5489 | $0.1779 | 36.1s |  |
| sales-report/pdf | opus-medium | claude-opus-5-5 | 2/2 | 97.7% (85/87) | 0 | 17024 | 5824 | $0.1846 | 39.3s |  |
| settlement/pdf | sonnet-medium | claude-sonnet-5-5 | 4/4 | 100.0% (0/0) | 0 | 3949 | 70 | $0.0086 | 2.0s |  |
| settlement/pdf | opus-low | claude-opus-5-5 | 4/4 | 100.0% (0/0) | 0 | 3949 | 70 | $0.0172 | 2.4s |  |
| settlement/pdf | opus-medium | claude-opus-5-5 | 4/4 | 100.0% (0/0) | 0 | 3949 | 70 | $0.0172 | 2.3s |  |
| po/pdf | sonnet-medium | claude-sonnet-5-5 | 1/1 | 100.0% (11/11) | 0 | 5548 | 939 | $0.0205 | 6.5s |  |
| po/pdf | opus-low | claude-opus-5-5 | 1/1 | 100.0% (11/11) | 0 | 5548 | 968 | $0.0416 | 8.2s |  |
| po/pdf | opus-medium | claude-opus-5-5 | 1/1 | 100.0% (11/11) | 0 | 5548 | 1182 | $0.0458 | 9.7s |  |
| settlement/photo | sonnet-medium | claude-sonnet-5-5 | 4/4 | 100.0% (0/0) | 0 | 5580 | 70 | $0.0119 | 2.2s |  |
| settlement/photo | opus-low | claude-opus-5-5 | 4/4 | 100.0% (0/0) | 0 | 5580 | 70 | $0.0237 | 2.4s |  |
| settlement/photo | opus-medium | claude-opus-5-5 | 4/4 | 100.0% (0/0) | 0 | 5580 | 70 | $0.0237 | 2.3s |  |
| sales-report/photo-p1 | sonnet-medium | claude-sonnet-5-5 | 1/1 | 95.8% (23/24) | 0 | 4007 | 1494 | $0.0230 | 8.7s |  |
| sales-report/photo-p1 | opus-low | claude-opus-5-5 | 1/1 | 95.8% (23/24) | 0 | 4007 | 1495 | $0.0459 | 11.3s |  |
| sales-report/photo-p1 | opus-medium | claude-opus-5-5 | 1/1 | 95.8% (23/24) | 0 | 4007 | 2028 | $0.0566 | 15.5s |  |

## Ground truth notes

- Sales report text layer: 87 lines, gross $310452.80; workbook Baltimore gross $310452.80.
- Per-SKU units, report text vs workbook item sheets: 23 agree; differ: GHOSNS503396BK (not in workbook), GHOSRX203275B (not in workbook), GHOSNS103298BK (not in workbook), GHOSNS103619OT (not in workbook), GHOSNS103622OT (not in workbook), GHOSRX103748PU (not in workbook).
- No packing list: none in ghosttrackers/ or parsed_documents storage (pass --packing-list <file.pdf> to add one).

## Decision (2026-11-19)

**Document extraction stays on Sonnet 5.5 at effort medium for all four document types.**

- Settlement (PDF and photo) and PO: every candidate scored 100%; Sonnet 5.5 was the cheapest.
- Sales report: every candidate got both totals exact and the same 85 of 87 lines (97.7%; photo of page 1: 23 of 24).
  The 85 extracted lines sum to the report's full totals ($310,452.80 gross, 5,971 units), so the 2 unmatched
  ground-truth lines add up to zero units and $0 (rows listed with no sales). No model omitted a sale, and the
  stricter models gave no improvement, so Sonnet 5.5 wins on cost.
- Cost per document (Sonnet 5.5): settlement about $0.01, PO about $0.02, a 6-page sales report about $0.09.
- Eval spend: $0.79.
