/**
 * Benchmark script for testing document agent caching effectiveness.
 *
 * Run with: npx tsx scripts/benchmark-agents.ts
 *
 * Expected results with Haiku:
 * - Parse time: ~3-8s per document
 * - Much faster than Sonnet (~50s)
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { parseSalesReport } from '../lib/ai/parsers/sales-report-parser';

interface BenchmarkResult {
  iteration: number;
  file: string;
  totalMs: number;
  cacheStatus: string;
  lineItems: number;
}

async function runBenchmark() {
  const pdfDir = path.join(__dirname, '..', 'ghosttrackers');

  // Find sales report PDFs
  const files = fs.readdirSync(pdfDir)
    .filter(f => f.toLowerCase().includes('salesreport') && f.endsWith('.pdf'));

  if (files.length === 0) {
    console.error('No sales report PDFs found in ghosttrackers/');
    process.exit(1);
  }

  console.log('='.repeat(70));
  console.log('DOCUMENT AGENT BENCHMARK - Prompt Caching Test');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Found ${files.length} sales report(s)`);
  console.log('Testing cache effectiveness by parsing multiple times...');
  console.log('');

  const results: BenchmarkResult[] = [];

  // Parse the same document 3 times to test caching
  const testFile = files[0];
  const pdfPath = path.join(pdfDir, testFile);
  const buffer = fs.readFileSync(pdfPath);
  const base64 = buffer.toString('base64');

  console.log(`Using: ${testFile}`);
  console.log(`Size: ${(buffer.length / 1024).toFixed(1)} KB`);
  console.log('');
  console.log('-'.repeat(70));

  for (let i = 1; i <= 3; i++) {
    console.log(`\n[Iteration ${i}] Starting parse...`);

    const start = Date.now();
    try {
      const result = await parseSalesReport(base64);
      const totalMs = Date.now() - start;

      results.push({
        iteration: i,
        file: testFile,
        totalMs,
        cacheStatus: i === 1 ? 'MISS (expected)' : 'HIT (expected)',
        lineItems: result.lineItems?.length ?? 0
      });

      console.log(`[Iteration ${i}] Complete: ${totalMs}ms, ${result.lineItems?.length ?? 0} items`);
    } catch (error) {
      console.error(`[Iteration ${i}] Error:`, error);
    }

    // Small delay between requests
    if (i < 3) {
      console.log('Waiting 2s before next iteration...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(70));
  console.log('');

  console.log('| Iteration | Time (ms) | Cache | Items |');
  console.log('|-----------|-----------|-------|-------|');
  for (const r of results) {
    console.log(`| ${r.iteration}         | ${r.totalMs.toString().padStart(9)} | ${r.cacheStatus.padEnd(5)} | ${r.lineItems.toString().padStart(5)} |`);
  }

  console.log('');

  if (results.length >= 2) {
    const first = results[0].totalMs;
    const second = results[1].totalMs;
    const improvement = ((first - second) / first * 100).toFixed(1);

    console.log(`First parse:  ${first}ms`);
    console.log(`Second parse: ${second}ms`);
    console.log(`Improvement:  ${improvement}% faster`);

    if (second < first * 0.7) {
      console.log('\n✓ Caching is working! Subsequent parses are significantly faster.');
    } else {
      console.log('\n⚠ Cache may not be effective - times are similar.');
      console.log('  This could mean:');
      console.log('  - Cache TTL expired (5 min)');
      console.log('  - API doesn\'t support caching for this request');
    }
  }
}

runBenchmark().catch(console.error);
