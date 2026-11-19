import { describe, expect, it } from 'vitest';
import { boxToPixels, isDegenerate, normaliseBox, unionBox } from './geometry';

describe('normaliseBox', () => {
  it('maps pixels to 0–1 and clamps to the page', () => {
    const a = normaliseBox({ x: 100, y: 50, w: 200, h: 100 }, 1000, 500);
    expect(a.x).toBeCloseTo(0.1);
    expect(a.y).toBeCloseTo(0.1);
    expect(a.w).toBeCloseTo(0.2);
    expect(a.h).toBeCloseTo(0.2);
    const b = normaliseBox({ x: -10, y: 450, w: 100, h: 100 }, 1000, 500);
    expect(b.x).toBe(0);
    expect(b.w).toBeCloseTo(0.09);
    expect(b.y + b.h).toBe(1);
  });
});

describe('boxToPixels', () => {
  it('converts without padding', () => {
    expect(boxToPixels({ x: 0.1, y: 0.2, w: 0.5, h: 0.25 }, 1000, 800, 0)).toEqual({ left: 100, top: 160, width: 500, height: 200 });
  });
  it('pads by a fraction of the box and stays inside the image', () => {
    expect(boxToPixels({ x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, 1000, 1000, 0.1)).toEqual({ left: 50, top: 50, width: 600, height: 600 });
    const edge = boxToPixels({ x: 0.9, y: 0.9, w: 0.2, h: 0.2 }, 1000, 1000, 0.1);
    expect(edge.left + edge.width).toBeLessThanOrEqual(1000);
    expect(edge.top + edge.height).toBeLessThanOrEqual(1000);
  });
  it('never returns an empty rectangle', () => {
    const r = boxToPixels({ x: 1, y: 1, w: 0, h: 0 }, 640, 480, 0);
    expect(r.width).toBeGreaterThanOrEqual(1);
    expect(r.height).toBeGreaterThanOrEqual(1);
    expect(r.left).toBe(639);
  });
});

describe('unionBox / isDegenerate', () => {
  it('covers both boxes', () => {
    const u = unionBox({ x: 0.1, y: 0.1, w: 0.2, h: 0.3 }, { x: 0.12, y: 0.42, w: 0.15, h: 0.05 });
    expect(u.x).toBeCloseTo(0.1);
    expect(u.y).toBeCloseTo(0.1);
    expect(u.w).toBeCloseTo(0.2);
    expect(u.h).toBeCloseTo(0.37);
  });
  it('flags slivers', () => {
    expect(isDegenerate({ x: 0, y: 0, w: 0.005, h: 0.5 })).toBe(true);
    expect(isDegenerate({ x: 0, y: 0, w: 0.1, h: 0.1 })).toBe(false);
  });
});
