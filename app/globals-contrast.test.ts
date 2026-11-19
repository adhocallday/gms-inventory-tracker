import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Light-theme text tokens in app/globals.css must pass WCAG AA (4.5:1) on
 * every light surface they sit on: cards (white), the page (#F7F7F8) and
 * elevated panels and striped rows (#F1F2F4).
 */

const css = readFileSync(path.join(__dirname, 'globals.css'), 'utf8');

/** The first `:root { … }` block holds the --mf-* brand tokens. */
function lightTokens(): Record<string, string> {
  const block = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!block) throw new Error('No :root block in globals.css');
  const tokens: Record<string, string> = {};
  for (const [, name, value] of block[1].matchAll(/(--mf-[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[name] = value;
  }
  return tokens;
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const tokens = lightTokens();
const TEXT = ['--mf-text', '--mf-text2', '--mf-muted'];
const SURFACES = ['--mf-card', '--mf-surface', '--mf-surface2'];

describe('light theme text contrast (globals.css)', () => {
  it('defines the text and surface tokens', () => {
    for (const name of [...TEXT, ...SURFACES]) expect(tokens[name], name).toMatch(/^#/);
    expect(tokens['--mf-card'].toUpperCase()).toBe('#FFFFFF');
    expect(tokens['--mf-surface'].toUpperCase()).toBe('#F7F7F8');
    expect(tokens['--mf-surface2'].toUpperCase()).toBe('#F1F2F4');
  });

  for (const text of TEXT) {
    for (const surface of SURFACES) {
      it(`${text} on ${surface} is at least 4.5:1`, () => {
        const ratio = contrast(tokens[text], tokens[surface]);
        expect(ratio, `${tokens[text]} on ${tokens[surface]} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('secondary and muted text are the darker values from the legibility pass', () => {
    // #374151 and #4B5563; the old #6B7280 muted failed AA on #F1F2F4 (4.32:1).
    expect(contrast(tokens['--mf-text2'], '#FFFFFF')).toBeGreaterThanOrEqual(10);
    expect(contrast(tokens['--mf-muted'], '#FFFFFF')).toBeGreaterThanOrEqual(7);
  });
});
