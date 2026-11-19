/**
 * Sales report parse benchmark: latency, tokens, cache reads and cost per call,
 * read from the API's `usage` (not inferred from timing).
 *
 * Paid API calls. Dry run by default; pass --run to call the API.
 *   npx tsx scripts/benchmark-agents.ts [--run] [--iterations 3]
 *
 * The parser sends no cache_control, so cache_read is expected to be 0; the
 * numbers show what each parse actually costs.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
process.env.AI_USAGE_LOG ??= 'off'; // benchmark runs don't write usage rows

import * as fs from 'fs';
import * as path from 'path';
import { parseSalesReport } from '../lib/ai/parsers/sales-report-parser';
import { calculateCostUsd } from '../lib/ai/usage';
import { getModelProfile } from '../lib/ai/models';
import type { CallResult } from '../lib/ai/claude-client';

const args = process.argv.slice(2);
const run = args.includes('--run');
const iterations = Number(args[args.indexOf('--iterations') + 1]) || 3;

async function main() {
  const pdfDir = path.join(process.cwd(), 'ghosttrackers');
  const file = fs
    .readdirSync(pdfDir)
    .find(f => f.toLowerCase().includes('salesreport') && f.endsWith('.pdf'));
  if (!file) throw new Error('No sales report PDF found in ghosttrackers/');
  const base64 = fs.readFileSync(path.join(pdfDir, file)).toString('base64');
  const profile = getModelProfile('document-parsing');

  console.log(`File: ${file}`);
  console.log(`Profile: ${profile.model} effort=${profile.effort} max_tokens=${profile.maxTokens}`);
  if (!run) {
    console.log(`Dry run: would parse it ${iterations} times. Pass --run to call the API.`);
    return;
  }

  let total = 0;
  for (let i = 1; i <= iterations; i++) {
    let meta: CallResult | undefined;
    const result = await parseSalesReport(base64, { onResult: r => (meta = r) });
    if (!meta) continue;
    const cost = calculateCostUsd(meta.model, meta.usage);
    total += cost;
    const u = meta.usage;
    console.log(
      `#${i} ${meta.latencyMs}ms model=${meta.model} in=${u.input_tokens} out=${u.output_tokens} ` +
        `cache_write=${u.cache_creation_input_tokens ?? 0} cache_read=${u.cache_read_input_tokens ?? 0} ` +
        `cost=$${cost.toFixed(4)} items=${result.lineItems?.length ?? 0}`
    );
  }
  console.log(`Total: $${total.toFixed(4)}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
