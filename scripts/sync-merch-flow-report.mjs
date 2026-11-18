#!/usr/bin/env node
/**
 * Vendors MerchFlow Charts' report engine and web dashboard into the tracker.
 *
 *   node scripts/sync-merch-flow-report.mjs          copy, then rewrite VENDORED.md
 *   node scripts/sync-merch-flow-report.mjs --check  exit 1 if any vendored file differs
 *
 * The Charts repo is read from $MERCHFLOW_CHARTS_DIR, else the sibling folder
 * ../merch-flow-charts next to this checkout (or next to the main checkout,
 * when this is a git worktree). Charts is never written to.
 *
 * Engine files (lib/merch-flow-report/) are copied unchanged: the folder
 * mirrors Charts' lib/ layout, so their relative imports need no rewriting.
 * The two lib/parse modules are reduced to the types the engine imports
 * (TrackerData, PopItem), because the parsers pull in xlsx dependencies the
 * tracker does not have.
 *
 * Dashboard files (components/merch-flow-report/) get their `@/` imports
 * rewritten, a Tailwind 4 → 3 pass, and the small PATCHES below. Every patch
 * must match exactly once, so an upstream change that moves its anchor fails
 * loudly instead of being skipped.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

export function findChartsDir() {
  if (process.env.MERCHFLOW_CHARTS_DIR) return path.resolve(process.env.MERCHFLOW_CHARTS_DIR);
  const candidates = [path.resolve(ROOT, '..', 'merch-flow-charts')];
  try {
    // In a worktree, --git-common-dir points into the main checkout's .git.
    const common = execFileSync('git', ['-C', ROOT, 'rev-parse', '--path-format=absolute', '--git-common-dir'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    candidates.push(path.resolve(path.dirname(common), '..', 'merch-flow-charts'));
  } catch {
    // Not a git checkout; the sibling candidate is all there is.
  }
  return candidates.find((dir) => existsSync(path.join(dir, 'lib', 'report', 'build.ts')));
}

// ---------------------------------------------------------------- file lists

const ENGINE = [
  ['lib/report/types.ts', 'lib/merch-flow-report/report/types.ts'],
  ['lib/report/derive.ts', 'lib/merch-flow-report/report/derive.ts'],
  ['lib/report/build.ts', 'lib/merch-flow-report/report/build.ts'],
  ['lib/report/issues.ts', 'lib/merch-flow-report/report/issues.ts'],
  ['lib/report/from-tracker-link.ts', 'lib/merch-flow-report/report/from-tracker-link.ts'],
  ['lib/report/from-tracker-link.test.ts', 'lib/merch-flow-report/report/from-tracker-link.test.ts'],
  ['lib/normalize/sku.ts', 'lib/merch-flow-report/normalize/sku.ts'],
  ['lib/format.ts', 'lib/merch-flow-report/format.ts'],
  ['lib/brand/tokens.ts', 'lib/merch-flow-report/brand/tokens.ts'],
];

/** Parser modules the engine imports types from; only those types are kept. */
const TYPE_EXTRACTS = [
  {
    from: 'lib/parse/tracker.ts',
    to: 'lib/merch-flow-report/parse/tracker.ts',
    types: ['TrackerData'],
    header: "import type { Product, Show } from '../report/types';",
  },
  { from: 'lib/parse/pop.ts', to: 'lib/merch-flow-report/parse/pop.ts', types: ['PopItem'] },
];

const DASHBOARD = [
  ['components/web/ReportDashboard.tsx', 'components/merch-flow-report/ReportDashboard.tsx'],
  ['components/web/SummarySection.tsx', 'components/merch-flow-report/SummarySection.tsx'],
  ['components/web/ShowRows.tsx', 'components/merch-flow-report/ShowRows.tsx'],
  ['components/web/ShowsChart.tsx', 'components/merch-flow-report/ShowsChart.tsx'],
  ['components/web/Scorecard.tsx', 'components/merch-flow-report/Scorecard.tsx'],
  ['components/web/CategoryMix.tsx', 'components/merch-flow-report/CategoryMix.tsx'],
  ['components/web/ProductDrawer.tsx', 'components/merch-flow-report/ProductDrawer.tsx'],
  ['components/web/ReportChrome.tsx', 'components/merch-flow-report/ReportChrome.tsx'],
  ['components/web/useContainerWidth.ts', 'components/merch-flow-report/useContainerWidth.ts'],
  ['components/ui/index.tsx', 'components/merch-flow-report/ui/index.tsx'],
];

/** Static assets the dashboard references by URL. */
const ASSETS = [['public/gms-logo.png', 'public/gms-logo.png']];

// ---------------------------------------------------------------- transforms

const IMPORT_REWRITES = [
  ['@/lib/report/', '@/lib/merch-flow-report/report/'],
  ['@/lib/brand/', '@/lib/merch-flow-report/brand/'],
  ['@/lib/normalize/', '@/lib/merch-flow-report/normalize/'],
  ["@/lib/format'", "@/lib/merch-flow-report/format'"],
  ["@/components/ui'", "@/components/merch-flow-report/ui'"],
];

function rewriteImports(source, file) {
  let out = source;
  for (const [from, to] of IMPORT_REWRITES) out = out.split(from).join(to);
  const stray = out.match(/from '@\/(?!lib\/merch-flow-report\/|components\/merch-flow-report\/)[^']+'/);
  if (stray) throw new Error(`${file}: no rewrite rule for ${stray[0]}`);
  return out;
}

/** Tailwind 3.4's opacity scale; any other `/NN` modifier needs brackets. */
const TW3_OPACITY = new Set([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]);

function tailwind4to3(source) {
  return (
    source
      // v4 shifted the radius scale: v4 `rounded-sm` (0.25rem) is v3 `rounded`.
      .replace(/(?<![\w-])rounded-sm(?![\w-])/g, 'rounded')
      // Opacity modifiers off the v3.4 scale.
      .replace(/\b((?:bg|text|border|ring|fill|stroke)-[a-z]+(?:-\d+)?)\/(\d{1,3})\b/g, (m, cls, n) =>
        TW3_OPACITY.has(Number(n)) ? m : `${cls}/[${Number(n) / 100}]`,
      )
  );
}

/**
 * Tracker-side changes to the dashboard. Each is [file, find, replace]; the
 * find text must occur exactly once in the transformed source.
 */
const PATCHES = [
  // React 19's types expose a global React namespace; React 18's do not in modules.
  [
    'components/merch-flow-report/ReportDashboard.tsx',
    "import { useState } from 'react';",
    "import { useState, type ReactNode } from 'react';",
  ],
  ['components/merch-flow-report/ReportDashboard.tsx', '  children: React.ReactNode;', '  children: ReactNode;'],
  [
    'components/merch-flow-report/ui/index.tsx',
    "import { useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';",
    "import { useState, type ReactNode, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';",
  ],
  [
    'components/merch-flow-report/ui/index.tsx',
    '}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {',
    '}: AnchorHTMLAttributes<HTMLAnchorElement> & {',
  ],

  // The tracker has no PDF renderer: the PDF is built in Charts, so the link
  // and its label are the caller's.
  [
    'components/merch-flow-report/ReportDashboard.tsx',
    '  pdfHref: string;\n}) {\n  const [selected',
    '  pdfHref: string;\n  /** Tracker: label for the PDF links (Charts says "Download PDF"). */\n  pdfLabel?: string;\n}) {\n  const [selected',
  ],
  ['components/merch-flow-report/ReportDashboard.tsx', '  pdfHref,\n}: {', '  pdfHref,\n  pdfLabel,\n}: {'],
  [
    'components/merch-flow-report/ReportDashboard.tsx',
    '<ReportHeader artist={report.artist} tourName={report.tourName} pdfHref={pdfHref} />',
    '<ReportHeader artist={report.artist} tourName={report.tourName} pdfHref={pdfHref} pdfLabel={pdfLabel} />',
  ],
  [
    'components/merch-flow-report/ReportDashboard.tsx',
    '<ReportBottomBar pdfHref={pdfHref} />',
    '<ReportBottomBar pdfHref={pdfHref} pdfLabel={pdfLabel} />',
  ],
  [
    'components/merch-flow-report/ReportDashboard.tsx',
    '            href={pdfHref}\n            className="mt-6 !bg-white !text-[#111214] hover:!bg-[#E7E9EC]"\n          >\n            Download A3 PDF',
    '            href={pdfHref}\n            data-tour="charts-link"\n            className="mt-6 !bg-white !text-[#111214] hover:!bg-[#E7E9EC]"\n          >\n            {pdfLabel ?? \'Download A3 PDF\'}',
  ],
  [
    'components/merch-flow-report/ReportDashboard.tsx',
    '<a href={pdfHref} className="underline">\n            Download A3 PDF',
    '<a href={pdfHref} className="underline">\n            {pdfLabel ?? \'Download A3 PDF\'}',
  ],
  [
    'components/merch-flow-report/ReportChrome.tsx',
    '  pdfHref,\n}: {\n  artist: string;\n  tourName: string;\n  pdfHref: string;\n}) {',
    '  pdfHref,\n  pdfLabel = \'Download PDF\',\n}: {\n  artist: string;\n  tourName: string;\n  pdfHref: string;\n  pdfLabel?: string;\n}) {',
  ],
  [
    'components/merch-flow-report/ReportChrome.tsx',
    '            <LinkButton href={pdfHref} size="sm">\n              Download PDF',
    '            <LinkButton href={pdfHref} size="sm">\n              {pdfLabel}',
  ],
  [
    'components/merch-flow-report/ReportChrome.tsx',
    'export function ReportBottomBar({ pdfHref }: { pdfHref: string }) {',
    "export function ReportBottomBar({\n  pdfHref,\n  pdfLabel = 'Download PDF',\n}: {\n  pdfHref: string;\n  pdfLabel?: string;\n}) {",
  ],
  [
    'components/merch-flow-report/ReportChrome.tsx',
    '        <LinkButton href={pdfHref} className="flex-1">\n          Download PDF',
    '        <LinkButton href={pdfHref} className="flex-1">\n          {pdfLabel}',
  ],

  // Guided-tour anchors (components/onboarding/tour-chapters.ts).
  [
    'components/merch-flow-report/ReportDashboard.tsx',
    '<section id={id} className=',
    '<section id={id} data-tour={TOUR_ANCHORS[id]} className=',
  ],
  [
    'components/merch-flow-report/ReportDashboard.tsx',
    'function Panel({',
    "/** Tracker: guided-tour anchors on the panels. */\nconst TOUR_ANCHORS: Record<string, string> = { products: 'mf-scorecard', mix: 'mf-category' };\n\nfunction Panel({",
  ],
  [
    'components/merch-flow-report/SummarySection.tsx',
    '<dl className="grid grid-cols-2',
    '<dl data-tour="mf-kpis" className="grid grid-cols-2',
  ],
  [
    'components/merch-flow-report/SummarySection.tsx',
    '{figures.length > 0 && (\n          <section>',
    '{figures.length > 0 && (\n          <section data-tour="mf-figures">',
  ],
  [
    'components/merch-flow-report/CategoryMix.tsx',
    '{attendance > 0 && (\n        <div className="mt-7">',
    '{attendance > 0 && (\n        <div className="mt-7" data-tour="mf-ratios">',
  ],
];

function applyPatches(file, source) {
  let out = source;
  for (const [target, find, replace] of PATCHES) {
    if (target !== file) continue;
    const count = out.split(find).length - 1;
    if (count !== 1) {
      throw new Error(`${file}: patch anchor found ${count} times (expected 1):\n${find}`);
    }
    out = out.replace(find, () => replace);
  }
  return out;
}

const BANNER = (src) =>
  `// Vendored from MerchFlow Charts ${src} (commit in lib/merch-flow-report/VENDORED.md).\n` +
  '// Generated by scripts/sync-merch-flow-report.mjs; edit the PATCHES there, not this file.\n\n';

/** Pulls `export type Name = { ... };` blocks out of a module. */
function extractTypes(source, names, file) {
  const blocks = names.map((name) => {
    const start = source.indexOf(`export type ${name} = {`);
    if (start < 0) throw new Error(`${file}: export type ${name} not found`);
    // Keep the doc comment directly above, if any.
    const before = source.slice(0, start);
    const doc = before.match(/\/\*\*[\s\S]*?\*\/\n$/);
    const end = source.indexOf('\n};\n', start);
    if (end < 0) throw new Error(`${file}: end of ${name} not found`);
    return (doc ? doc[0] : '') + source.slice(start, end + 4);
  });
  return blocks.join('\n');
}

// ---------------------------------------------------------------- run

function git(dir, args) {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
}

export function generate(chartsDir) {
  const commit = git(chartsDir, ['rev-parse', 'HEAD']);
  const read = (rel) => readFileSync(path.join(chartsDir, rel), 'utf8');
  /** @type {{ to: string; from: string; content: string | Buffer }[]} */
  const files = [];

  for (const [from, to] of ENGINE) files.push({ from, to, content: read(from) });

  for (const { from, to, types, header } of TYPE_EXTRACTS) {
    const body = extractTypes(read(from), types, from);
    files.push({
      from,
      to,
      content:
        `// Types only, from MerchFlow Charts ${from}: the parser itself\n` +
        '// needs xlsx libraries the tracker does not ship. Generated by\n' +
        '// scripts/sync-merch-flow-report.mjs.\n' +
        (header ? `${header}\n` : '') +
        '\n' +
        body,
    });
  }

  for (const [from, to] of DASHBOARD) {
    const source = applyPatches(to, tailwind4to3(rewriteImports(read(from), from)));
    // Keep 'use client' as the first statement.
    const banner = BANNER(from);
    const content = source.startsWith("'use client';\n")
      ? `'use client';\n\n${banner}${source.slice("'use client';\n".length).replace(/^\n/, '')}`
      : banner + source;
    files.push({ from, to, content });
  }

  for (const [from, to] of ASSETS) {
    files.push({ from, to, content: readFileSync(path.join(chartsDir, from)) });
  }

  const dirty = git(chartsDir, ['status', '--porcelain', '--', ...files.map((f) => f.from)]);
  return { commit, dirty, files };
}

function vendoredMd({ commit, dirty, files }, chartsDir) {
  const branch = git(chartsDir, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const date = new Date().toISOString().slice(0, 10);
  const row = (f) => `| \`${f.from}\` | \`${f.to}\` |`;
  const engine = files.filter((f) => f.to.startsWith('lib/'));
  const ui = files.filter((f) => !f.to.startsWith('lib/'));
  return `# Vendored from MerchFlow Charts

- **Source:** \`merch-flow-charts\`, branch \`${branch}\`
- **Commit:** \`${commit}\`${dirty ? ' (with uncommitted changes in the copied files)' : ''}
- **Copied:** ${date}
- **Sync:** \`node scripts/sync-merch-flow-report.mjs\` (re-copy) or \`--check\` (fail if anything differs).
  \`lib/merch-flow-report/sync.test.ts\` runs the check whenever the sibling Charts repo is present.

Do not edit these files by hand. Fix the engine in Charts and re-sync; tracker-side
dashboard changes belong in the script's \`PATCHES\`.

## Engine (unchanged copies)

This folder mirrors Charts' \`lib/\` layout, so relative imports are unchanged.
\`parse/tracker.ts\` and \`parse/pop.ts\` keep only the \`TrackerData\` and \`PopItem\`
types: the parsers need xlsx libraries the tracker does not ship.

| Charts | Tracker |
| --- | --- |
${engine.map(row).join('\n')}

## Web dashboard (adapted)

| Charts | Tracker |
| --- | --- |
${ui.map(row).join('\n')}

Applied to every dashboard file:

- \`@/lib/report|brand|format\` and \`@/components/ui\` imports point at the vendored copies.
- Tailwind 4 → 3: \`rounded-sm\` → \`rounded\` (v4 shifted the radius scale), and opacity
  modifiers off the v3.4 scale would get brackets (none occur today).

Patches (see \`PATCHES\` in the script):

- \`React.ReactNode\` / \`React.AnchorHTMLAttributes\` become imported types (React 18 types).
- An optional \`pdfLabel\` prop on \`ReportDashboard\`, \`ReportHeader\` and \`ReportBottomBar\`;
  Charts' wording stays the default.
- Guided-tour anchors: \`mf-kpis\`, \`mf-figures\` (SummarySection), \`mf-scorecard\`,
  \`mf-category\` (panels), \`mf-ratios\` (CategoryMix reach list) and \`charts-link\` (the hero
  PDF button).
`;
}

function main() {
  const chartsDir = findChartsDir();
  if (!chartsDir) {
    console.error('MerchFlow Charts not found. Set MERCHFLOW_CHARTS_DIR or check it out at ../merch-flow-charts.');
    process.exit(2);
  }

  const result = generate(chartsDir);

  if (CHECK) {
    const stale = result.files.filter((f) => {
      const dest = path.join(ROOT, f.to);
      if (!existsSync(dest)) return true;
      const current = readFileSync(dest);
      return !current.equals(Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content));
    });
    if (stale.length) {
      console.error(`Vendored MerchFlow report is out of date with ${chartsDir} @ ${result.commit.slice(0, 7)}:`);
      for (const f of stale) console.error(`  ${f.to}  (from ${f.from})`);
      console.error('Run: node scripts/sync-merch-flow-report.mjs');
      process.exit(1);
    }
    console.log(`Vendored MerchFlow report matches Charts @ ${result.commit.slice(0, 7)} (${result.files.length} files).`);
    return;
  }

  for (const f of result.files) {
    const dest = path.join(ROOT, f.to);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, f.content);
  }
  writeFileSync(path.join(ROOT, 'lib/merch-flow-report/VENDORED.md'), vendoredMd(result, chartsDir));
  console.log(`Copied ${result.files.length} files from Charts @ ${result.commit.slice(0, 7)}${result.dirty ? ' (dirty)' : ''}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
