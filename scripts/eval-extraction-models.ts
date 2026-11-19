/**
 * Extraction model eval (plan §2): which model and effort should extract each
 * document type?
 *
 *   npx tsx scripts/eval-extraction-models.ts            # dry run (default): planned calls + estimated cost
 *   npx tsx scripts/eval-extraction-models.ts --run      # PAID: runs every case × candidate, writes the report
 *
 * Options:
 *   --only sales-report,settlement,po          limit doc types
 *   --candidates sonnet-medium,opus-low        limit candidates
 *   --no-photos                                skip the phone-photo cases
 *   --packing-list <file.pdf>                  add a packing list (schema validity only; no ground truth)
 *
 * The dry run makes only free calls (messages.countTokens). It builds the exact
 * request each real parser sends (lib/ai/parsers/*) by capturing it from a stub
 * client, counts its input tokens, and estimates output tokens per effort.
 *
 * Inputs (ghosttrackers/, from GHOST_DIR or the tracker checkout):
 *   - 01 SalesReport-...cfg-bank-arena.pdf  (Baltimore 2025-07-09, 6 pages)
 *   - 01 Settlement-...cfg-bank-arena.pdf
 *   - 85655 FARSTAR BATWING & SHORTS FOR 2026.pdf (vendor PO)
 *   - two "phone photos" rendered from page 1 of the settlement and the sales
 *     report (JPEG, slightly rotated) to exercise the image path
 *
 * Ground truth:
 *   - Workbook "01 GHOST 2025 TOUR.xlsx": Baltimore gross from "Tour Gross
 *     Sales" ($310,452.80) and per-SKU Baltimore units from the item sheets
 *     (column "Sales", SKU from the sheet's Code cell).
 *   - Sales report lines (SKU, size, sold, gross): the PDF's own text layer
 *     (pdf-parse, deterministic), cross-checked against the workbook units.
 *   - Settlement totals and PO lines: read from the PDFs' text layers (below).
 *
 * Decision rule per doc type: the cheapest candidate with 100% totals and at
 * least 99% line accuracy wins; ties go to lower cost. With --run, results go
 * to docs/ai-model-eval.md and docs/ai-model-eval.json.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
process.env.AI_USAGE_LOG ??= 'off'; // eval calls are not app usage

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { MODELS, MODEL_PRICING, type Effort } from '../lib/ai/models';
import { calculateCostUsd } from '../lib/ai/usage';
import {
  __setAnthropicClient,
  getAnthropicClient,
  type CallResult,
  type MediaType,
  type ParseOptions,
} from '../lib/ai/claude-client';
import { parseSalesReport } from '../lib/ai/parsers/sales-report-parser';
import { parseSettlementReport } from '../lib/ai/parsers/settlement-parser';
import { parsePurchaseOrder } from '../lib/ai/parsers/po-parser';
import { parsePackingList } from '../lib/ai/parsers/packing-list-parser';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const value = (name: string) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const RUN = flag('--run');
const ONLY = value('--only')?.split(',');
const ONLY_CANDIDATES = value('--candidates')?.split(',');
const PHOTOS = !flag('--no-photos');
const PACKING_LIST = value('--packing-list');

const GHOST_DIR =
  process.env.GHOST_DIR ??
  [path.join(process.cwd(), 'ghosttrackers'), path.join(process.cwd(), '..', 'gms-inventory-tracker', 'ghosttrackers')].find(
    d => fs.existsSync(d)
  )!;

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

interface Candidate {
  id: string;
  model: string;
  effort: Effort;
}

const CANDIDATES: Candidate[] = [
  { id: 'sonnet-medium', model: MODELS.SONNET, effort: 'medium' },
  { id: 'opus-low', model: MODELS.OPUS, effort: 'low' },
  { id: 'opus-medium', model: MODELS.OPUS, effort: 'medium' },
].filter(c => !ONLY_CANDIDATES || ONLY_CANDIDATES.includes(c.id));

// ---------------------------------------------------------------------------
// Ground truth
// ---------------------------------------------------------------------------

type DocType = 'sales-report' | 'settlement' | 'po' | 'packing-list';

interface Line {
  sku: string;
  size: string;
  qty: number;
  amount: number;
}

interface Truth {
  /** Exact-match fields (numbers within $0.01) */
  totals: Record<string, string | number>;
  lines: Line[] | null;
}

const SIZE_MAP: Record<string, string> = {
  SM: 'S', S: 'S', SMALL: 'S',
  MD: 'M', MED: 'M', M: 'M', MEDIUM: 'M',
  LG: 'L', L: 'L', LARGE: 'L',
  XL: 'XL', XLARGE: 'XL',
  '2X': '2XL', '2XL': '2XL', XXL: '2XL',
  '3X': '3XL', '3XL': '3XL', XXXL: '3XL',
  '4X': '4XL', '4XL': '4XL',
  OS: 'OS', 'ONE-SIZE': 'OS', 'ONE SIZE': 'OS', ONESIZE: 'OS', '': 'OS',
};
const normSize = (s: unknown) => {
  const k = String(s ?? '').trim().toUpperCase();
  return SIZE_MAP[k] ?? k;
};
const SIZE_SUFFIX = /_(SM|MD|LG|XL|2X|2XL|3X|3XL|4X|4XL|S|M|L)$/i;
const normSku = (s: unknown) => String(s ?? '').trim().toUpperCase().replace(SIZE_SUFFIX, '');
const money = (s: string) => Number(s.replace(/[$,]/g, ''));

async function pdfText(file: string): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse(new Uint8Array(fs.readFileSync(file)));
  try {
    await parser.load();
    const result = await parser.getText();
    return result.pages.map((p: { text: string }) => p.text);
  } finally {
    parser.destroy();
  }
}

/** Sales report lines from the PDF text layer: "SKU[_SIZE] name … [size] sold pct% comp $avg $gross pct%". */
function salesLinesFromText(pages: string[]): Line[][] {
  const re = /^(GHOS\S+) .*? (\d+) \d+% \d+ \$([\d,.]+) \$([\d,.]+) \d+%$/;
  return pages.map(page =>
    page
      .split('\n')
      .map(l => l.trim().match(re))
      .filter((m): m is RegExpMatchArray => !!m)
      .map(m => {
        const suffix = m[1].match(SIZE_SUFFIX)?.[1] ?? '';
        return { sku: normSku(m[1]), size: normSize(suffix), qty: Number(m[2]), amount: money(m[4]) };
      })
  );
}

interface WorkbookTruth {
  baltimoreGross: number;
  unitsBySku: Record<string, number>;
}

function readWorkbook(): WorkbookTruth {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(path.join(GHOST_DIR, '01 GHOST 2025 TOUR.xlsx'));
  const rows = (name: string): unknown[][] =>
    XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });

  const gross = rows('Tour Gross Sales').find(r => r[1] === 'Baltimore')?.[2];
  const unitsBySku: Record<string, number> = {};
  for (const name of wb.SheetNames as string[]) {
    const r = rows(name);
    if (r[0]?.[17] !== 'Code' || !r[0]?.[18]) continue;
    const units = r.find(row => row[1] === 'Baltimore')?.[2];
    if (typeof units === 'number') unitsBySku[String(r[0][18]).trim().toUpperCase()] = units;
  }
  return { baltimoreGross: Number(gross), unitsBySku };
}

// Settlement: values on the PDF's text layer ("Gross Sales $310,452.80",
// "Sales Tax … (17,572.80)", "CC … (15,522.64)", "… - 07/09/2025").
const SETTLEMENT_TRUTH: Truth = {
  totals: { showDate: '2025-07-09', grossSales: 310452.8, salesTax: 17572.8, ccFees: 15522.64 },
  lines: null, // no comps listed on this settlement
};

// PO 085655 (Farstar): 11 lines on page 1, "Total: 197100.00" on page 2.
const PO_TRUTH: Truth = {
  totals: { totalAmount: 197100 },
  lines: [
    ...(
      [['S', 500], ['M', 1200], ['L', 1800], ['XL', 1300], ['2XL', 800], ['3XL', 400]] as const
    ).map(([size, qty]) => ({ sku: 'GHOSNS903311BK', size, qty, amount: Math.round(qty * 28.5 * 100) / 100 })),
    ...(
      [['S', 650], ['M', 1000], ['L', 1200], ['XL', 1000], ['2XL', 650]] as const
    ).map(([size, qty]) => ({ sku: 'GHOSRX203275BK', size, qty, amount: Math.round(qty * 5.8 * 100) / 100 })),
  ],
};

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

interface Case {
  id: string;
  docType: DocType;
  input: 'pdf' | 'photo';
  file: string;
  base64: string;
  mediaType: MediaType;
  truth: Truth | null;
  /** Expected answer size in output tokens (for the dry-run estimate) */
  answerTokens: number;
  parse: (b64: string, o: ParseOptions) => Promise<any>;
}

const findFile = (pattern: RegExp) => {
  const f = fs.readdirSync(GHOST_DIR).find(n => pattern.test(n));
  if (!f) throw new Error(`No file matching ${pattern} in ${GHOST_DIR}`);
  return path.join(GHOST_DIR, f);
};

/** Render a PDF page to a slightly rotated JPEG, like a phone photo of a printout. */
async function renderPhoto(file: string, page = 1): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require('pdf-parse');
  const { createCanvas, loadImage } = await import('canvas');
  const parser = new PDFParse(new Uint8Array(fs.readFileSync(file)));
  let png: Buffer;
  try {
    await parser.load();
    const shot = await parser.getScreenshot({ partial: [page], desiredWidth: 1600, imageBuffer: true, imageDataUrl: false });
    png = Buffer.from(shot.pages[0].data);
  } finally {
    parser.destroy();
  }
  const img = await loadImage(png);

  // Rotate 1.5 degrees on a warm grey background, long edge about 1600 px.
  const angle = (1.5 * Math.PI) / 180;
  const out = createCanvas(img.width + 60, img.height + 60);
  const o = out.getContext('2d');
  o.fillStyle = '#d9d4cc';
  o.fillRect(0, 0, out.width, out.height);
  o.translate(out.width / 2, out.height / 2);
  o.rotate(angle);
  o.drawImage(img, -img.width / 2, -img.height / 2);
  return out.toBuffer('image/jpeg', { quality: 0.8 }).toString('base64');
}

const approxTokens = (v: unknown) => Math.ceil(JSON.stringify(v).length / 3);

async function buildCases(): Promise<{ cases: Case[]; notes: string[] }> {
  const notes: string[] = [];
  const cases: Case[] = [];
  const wb = readWorkbook();

  // Sales report
  const salesFile = findFile(/^01 SalesReport.*\.pdf$/i);
  const salesPages = salesLinesFromText(await pdfText(salesFile));
  const salesLines = salesPages.flat();
  const textGross = Math.round(salesLines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  notes.push(
    `Sales report text layer: ${salesLines.length} lines, gross $${textGross.toFixed(2)}; workbook Baltimore gross $${wb.baltimoreGross.toFixed(2)}.`
  );
  const unitsBySku = new Map<string, number>();
  salesLines.forEach(l => unitsBySku.set(l.sku, (unitsBySku.get(l.sku) ?? 0) + l.qty));
  const agree: string[] = [];
  const differ: string[] = [];
  for (const [sku, units] of unitsBySku) {
    const wbUnits = wb.unitsBySku[sku];
    if (wbUnits === undefined) differ.push(`${sku} (not in workbook)`);
    else if (wbUnits === units) agree.push(sku);
    else differ.push(`${sku} (report ${units}, workbook ${wbUnits})`);
  }
  notes.push(`Per-SKU units, report text vs workbook item sheets: ${agree.length} agree; differ: ${differ.join(', ') || 'none'}.`);

  const salesTruth: Truth = { totals: { showDate: '2025-07-09', totalGross: wb.baltimoreGross }, lines: salesLines };
  const salesAnswer = approxTokens({ lineItems: salesLines.map(l => ({ ...l, description: 'X'.repeat(24), unitPrice: 53 })) });
  cases.push({
    id: 'sales-report/pdf', docType: 'sales-report', input: 'pdf', file: salesFile,
    base64: fs.readFileSync(salesFile).toString('base64'), mediaType: 'application/pdf',
    truth: salesTruth, answerTokens: salesAnswer, parse: parseSalesReport,
  });

  // Settlement
  const settlementFile = findFile(/^01 Settlement.*\.pdf$/i);
  cases.push({
    id: 'settlement/pdf', docType: 'settlement', input: 'pdf', file: settlementFile,
    base64: fs.readFileSync(settlementFile).toString('base64'), mediaType: 'application/pdf',
    truth: SETTLEMENT_TRUTH, answerTokens: 120, parse: parseSettlementReport,
  });

  // PO
  const poFile = findFile(/^85655 .*\.pdf$/i);
  cases.push({
    id: 'po/pdf', docType: 'po', input: 'pdf', file: poFile,
    base64: fs.readFileSync(poFile).toString('base64'), mediaType: 'application/pdf',
    truth: PO_TRUTH, answerTokens: approxTokens(PO_TRUTH.lines) + 200, parse: parsePurchaseOrder,
  });

  if (PACKING_LIST) {
    cases.push({
      id: 'packing-list/pdf', docType: 'packing-list', input: 'pdf', file: PACKING_LIST,
      base64: fs.readFileSync(PACKING_LIST).toString('base64'), mediaType: 'application/pdf',
      truth: null, answerTokens: 1500, parse: parsePackingList,
    });
  } else {
    notes.push('No packing list: none in ghosttrackers/ or parsed_documents storage (pass --packing-list <file.pdf> to add one).');
  }

  if (PHOTOS) {
    try {
      cases.push({
        id: 'settlement/photo', docType: 'settlement', input: 'photo', file: settlementFile,
        base64: await renderPhoto(settlementFile), mediaType: 'image/jpeg',
        truth: SETTLEMENT_TRUTH, answerTokens: 120, parse: parseSettlementReport,
      });
      // Page 1 only: score its lines; the grand total is on page 6, so no totals.
      cases.push({
        id: 'sales-report/photo-p1', docType: 'sales-report', input: 'photo', file: salesFile,
        base64: await renderPhoto(salesFile, 1), mediaType: 'image/jpeg',
        truth: { totals: { showDate: '2025-07-09' }, lines: salesPages[0] },
        answerTokens: approxTokens(salesPages[0]) + 300, parse: parseSalesReport,
      });
    } catch (e) {
      notes.push(`Photo cases skipped: could not render (${(e as Error).message}).`);
    }
  }

  return { cases: cases.filter(c => !ONLY || ONLY.includes(c.docType)), notes };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

interface Score {
  schemaValid: boolean;
  totalsCorrect: number;
  totalsChecked: number;
  totalsDetail: string[];
  lineAccuracy: number | null;
  linesMatched: number;
  linesExpected: number;
  extraLines: number;
}

const close = (a: unknown, b: number) => typeof a === 'number' && Math.abs(a - b) < 0.011;

function modelLines(docType: DocType, out: any): Line[] {
  if (docType === 'sales-report') {
    return (out.lineItems ?? []).map((l: any) => ({ sku: normSku(l.sku), size: normSize(l.size), qty: l.sold, amount: l.gross }));
  }
  if (docType === 'po') {
    return (out.lineItems ?? []).map((l: any) => ({ sku: normSku(l.sku), size: normSize(l.size), qty: l.quantity, amount: l.total }));
  }
  return [];
}

function score(c: Case, out: any): Score {
  const s: Score = {
    schemaValid: !!out && typeof out === 'object',
    totalsCorrect: 0, totalsChecked: 0, totalsDetail: [],
    lineAccuracy: null, linesMatched: 0, linesExpected: 0, extraLines: 0,
  };
  if (!c.truth || !s.schemaValid) return s;

  for (const [field, expected] of Object.entries(c.truth.totals)) {
    s.totalsChecked++;
    const got = out[field];
    const ok = typeof expected === 'number' ? close(got, expected) : String(got ?? '').trim() === expected;
    if (ok) s.totalsCorrect++;
    else s.totalsDetail.push(`${field}: got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
  }

  if (c.truth.lines) {
    const got = modelLines(c.docType, out);
    const remaining = [...got];
    s.linesExpected = c.truth.lines.length;
    for (const t of c.truth.lines) {
      const i = remaining.findIndex(g => g.sku === t.sku && g.size === t.size);
      if (i === -1) continue;
      const g = remaining.splice(i, 1)[0];
      if (g.qty === t.qty && close(g.amount, t.amount)) s.linesMatched++;
    }
    s.extraLines = remaining.length;
    s.lineAccuracy = s.linesExpected ? s.linesMatched / s.linesExpected : 1;
  } else if (c.truth) {
    s.lineAccuracy = 1;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Dry run: capture each parser's request, count tokens, estimate cost
// ---------------------------------------------------------------------------

class Captured extends Error {
  constructor(public params: any) {
    super('captured');
  }
}

/** A stub client whose stream() hands back the request instead of calling the API. */
function captureClient(): Anthropic {
  const stub = {
    beta: {
      messages: {
        stream: (params: any) => ({
          finalMessage: async () => {
            throw new Captured(params);
          },
        }),
      },
    },
  };
  return stub as unknown as Anthropic;
}

async function captureRequest(c: Case, cand: Candidate): Promise<any> {
  const real = getAnthropicClient();
  __setAnthropicClient(captureClient());
  try {
    await c.parse(c.base64, { model: cand.model, effort: cand.effort, mediaType: c.mediaType });
  } catch (e) {
    if (e instanceof Captured) return e.params;
    throw e;
  } finally {
    __setAnthropicClient(real);
  }
  throw new Error('request was not captured');
}

/** Rough thinking + answer allowance by effort (structured extraction). */
function estimateOutput(answer: number, cand: Candidate): { typical: number; high: number } {
  const thinking: Record<string, number> = { low: 0.3, medium: 1.0, high: 2.0 };
  const base = Math.round(answer * (1 + (thinking[cand.effort] ?? 1)) + (cand.effort === 'low' ? 300 : 1500));
  return { typical: base, high: base * 2 };
}

async function dryRun(cases: Case[], notes: string[]) {
  const client = getAnthropicClient();
  console.log('DRY RUN - no paid calls. Pass --run to execute.\n');
  notes.forEach(n => console.log(`- ${n}`));
  console.log('');
  console.log('case                     candidate       input tok  est. out (typ/high)  est. cost (typ/high)');
  let typ = 0;
  let high = 0;
  for (const c of cases) {
    for (const cand of CANDIDATES) {
      const params = await captureRequest(c, cand);
      const counted = await client.beta.messages.countTokens({
        model: params.model,
        messages: params.messages,
        output_config: params.output_config,
      });
      const out = estimateOutput(c.answerTokens, cand);
      const costTyp = calculateCostUsd(cand.model, { input_tokens: counted.input_tokens, output_tokens: out.typical });
      const costHigh = calculateCostUsd(cand.model, { input_tokens: counted.input_tokens, output_tokens: out.high });
      typ += costTyp;
      high += costHigh;
      console.log(
        `${c.id.padEnd(24)} ${cand.id.padEnd(15)} ${String(counted.input_tokens).padStart(9)}  ` +
          `${`${out.typical}/${out.high}`.padStart(19)}  ${`$${costTyp.toFixed(3)}/$${costHigh.toFixed(3)}`.padStart(20)}`
      );
    }
  }
  console.log('');
  console.log(`Planned calls: ${cases.length * CANDIDATES.length} (${cases.length} cases x ${CANDIDATES.length} candidates)`);
  console.log(`Estimated cost: $${typ.toFixed(2)} typical, $${high.toFixed(2)} high`);
  console.log(
    `Pricing per MTok (in/out): ${CANDIDATES.map(c => `${c.model} $${MODEL_PRICING[c.model].input}/$${MODEL_PRICING[c.model].output}`).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`
  );
}

// ---------------------------------------------------------------------------
// Run (paid)
// ---------------------------------------------------------------------------

interface Result {
  case: string;
  docType: DocType;
  input: string;
  candidate: string;
  model: string;
  servedBy: string | null;
  ok: boolean;
  error?: string;
  score?: Score;
  usage?: CallResult['usage'];
  costUsd: number;
  latencyMs: number;
}

async function run(cases: Case[], notes: string[]) {
  const results: Result[] = [];
  let spent = 0;
  for (const c of cases) {
    for (const cand of CANDIDATES) {
      let meta: CallResult | undefined;
      const started = Date.now();
      const r: Result = {
        case: c.id, docType: c.docType, input: c.input, candidate: cand.id, model: cand.model,
        servedBy: null, ok: false, costUsd: 0, latencyMs: 0,
      };
      try {
        const out = await c.parse(c.base64, {
          model: cand.model, effort: cand.effort, mediaType: c.mediaType, onResult: m => (meta = m),
        });
        r.ok = true;
        r.score = score(c, out);
      } catch (e) {
        r.error = (e as Error).message + ((e as { details?: string }).details ? `: ${(e as { details?: string }).details}` : '');
      }
      if (meta) {
        r.servedBy = meta.model;
        r.usage = meta.usage;
        r.costUsd = calculateCostUsd(meta.model, meta.usage);
        r.latencyMs = meta.latencyMs;
      } else {
        r.latencyMs = Date.now() - started;
      }
      spent += r.costUsd;
      results.push(r);
      const sc = r.score;
      console.log(
        `${c.id.padEnd(24)} ${cand.id.padEnd(14)} ${r.ok ? 'ok ' : 'ERR'} ` +
          (sc ? `totals ${sc.totalsCorrect}/${sc.totalsChecked} lines ${sc.lineAccuracy === null ? '-' : (sc.lineAccuracy * 100).toFixed(1) + '%'} ` : `${r.error} `) +
          `in=${r.usage?.input_tokens ?? 0} out=${r.usage?.output_tokens ?? 0} $${r.costUsd.toFixed(4)} ${(r.latencyMs / 1000).toFixed(1)}s (total $${spent.toFixed(2)})`
      );
    }
  }
  writeReport(results, notes, spent);
}

function decide(results: Result[]) {
  const byType = new Map<DocType, Map<string, Result[]>>();
  for (const r of results) {
    const t = byType.get(r.docType) ?? new Map<string, Result[]>();
    t.set(r.candidate, [...(t.get(r.candidate) ?? []), r]);
    byType.set(r.docType, t);
  }
  const decisions: { docType: DocType; winner: string | null; why: string }[] = [];
  for (const [docType, byCand] of byType) {
    const rows = Array.from(byCand.entries()).map(([cand, rs]) => {
      const scored = rs.filter(r => r.score);
      const totals = scored.reduce((s, r) => s + r.score!.totalsCorrect, 0);
      const totalsChecked = scored.reduce((s, r) => s + r.score!.totalsChecked, 0);
      const lineScores = scored.filter(r => r.score!.lineAccuracy !== null).map(r => r.score!.lineAccuracy!);
      return {
        cand,
        allOk: rs.every(r => r.ok),
        totalsOk: totals === totalsChecked,
        lines: lineScores.length ? Math.min(...lineScores) : 1,
        cost: rs.reduce((s, r) => s + r.costUsd, 0) / rs.length,
        hasTruth: scored.length > 0 && totalsChecked > 0,
      };
    });
    const passing = rows.filter(r => r.allOk && r.hasTruth && r.totalsOk && r.lines >= 0.99).sort((a, b) => a.cost - b.cost);
    decisions.push(
      passing.length
        ? { docType, winner: passing[0].cand, why: `cheapest passing ($${passing[0].cost.toFixed(4)}/doc)` }
        : { docType, winner: null, why: rows.some(r => r.hasTruth) ? 'no candidate met 100% totals and 99% lines' : 'no ground truth' }
    );
  }
  return decisions;
}

function writeReport(results: Result[], notes: string[], spent: number) {
  const decisions = decide(results);
  const lines = [
    '# Extraction model eval',
    '',
    `Run ${new Date().toISOString().slice(0, 10)} with \`scripts/eval-extraction-models.ts --run\`. Total cost $${spent.toFixed(2)}.`,
    '',
    'Decision rule: the cheapest candidate with 100% totals and at least 99% line accuracy wins; ties go to lower cost.',
    '',
    '## Decision',
    '',
    '| Doc type | Winner | Why |',
    '|---|---|---|',
    ...decisions.map(d => `| ${d.docType} | ${d.winner ?? '-'} | ${d.why} |`),
    '',
    '## Results',
    '',
    '| Case | Candidate | Served by | Totals | Line accuracy | Extra lines | Input tok | Output tok | Cost | Latency | Error |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...results.map(r =>
      `| ${r.case} | ${r.candidate} | ${r.servedBy ?? '-'} | ${r.score ? `${r.score.totalsCorrect}/${r.score.totalsChecked}` : '-'} | ` +
        `${r.score?.lineAccuracy == null ? '-' : `${(r.score.lineAccuracy * 100).toFixed(1)}% (${r.score.linesMatched}/${r.score.linesExpected})`} | ` +
        `${r.score?.extraLines ?? '-'} | ${r.usage?.input_tokens ?? '-'} | ${r.usage?.output_tokens ?? '-'} | $${r.costUsd.toFixed(4)} | ` +
        `${(r.latencyMs / 1000).toFixed(1)}s | ${r.error ? r.error.replace(/\|/g, '/') : (r.score?.totalsDetail.join('; ') ?? '')} |`
    ),
    '',
    '## Ground truth notes',
    '',
    ...notes.map(n => `- ${n}`),
    '',
  ];
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/ai-model-eval.md', lines.join('\n'));
  fs.writeFileSync('docs/ai-model-eval.json', JSON.stringify({ decisions, results, notes, spent }, null, 2));
  console.log('\nDecisions:');
  decisions.forEach(d => console.log(`  ${d.docType}: ${d.winner ?? 'none'} (${d.why})`));
  console.log('Wrote docs/ai-model-eval.md and docs/ai-model-eval.json');
}

async function main() {
  if (!GHOST_DIR) throw new Error('ghosttrackers/ not found; set GHOST_DIR');
  const { cases, notes } = await buildCases();
  console.log(`Inputs from ${GHOST_DIR}`);
  if (RUN) await run(cases, notes);
  else await dryRun(cases, notes);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
