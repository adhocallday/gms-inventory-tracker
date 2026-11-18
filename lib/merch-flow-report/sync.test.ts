import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findChartsDir } from '../../scripts/sync-merch-flow-report.mjs';

const ROOT = path.resolve(__dirname, '..', '..');
const chartsDir: string | undefined = findChartsDir();

describe('vendored MerchFlow report', () => {
  it.skipIf(!chartsDir)('matches the sibling MerchFlow Charts repo', () => {
    let output = '';
    let status = 0;
    try {
      output = execFileSync(process.execPath, ['scripts/sync-merch-flow-report.mjs', '--check'], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      const e = error as { status?: number; stdout?: string; stderr?: string };
      status = e.status ?? 1;
      output = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    }
    expect(status, output).toBe(0);
  });
});
