'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export type Orientation = 'landscape' | 'portrait';

/** Logical screen size in points (iPad Air 11"). */
export const SCREEN = { landscape: { w: 1180, h: 820 }, portrait: { w: 820, h: 1180 } } as const;
const BEZEL = 22;
/** Below this the text is too small to read; the frame scrolls sideways instead. */
const MIN_SCALE = 0.28;

/**
 * A CSS iPad at a fixed aspect ratio. The app inside is laid out at the real
 * logical size and scaled to the container width with a transform.
 */
export function IpadFrame({ orientation, children }: { orientation: Orientation; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const measure = () => setAvailable({ w: el.clientWidth, h: window.innerHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const screen = SCREEN[orientation];
  const deviceW = screen.w + BEZEL * 2;
  const deviceH = screen.h + BEZEL * 2;
  let scale = 1;
  if (available) {
    const byWidth = available.w / deviceW;
    // Keep portrait on screen on desktops, but never shrink below half for height alone.
    const byHeight = Math.max((available.h - 120) / deviceH, 0.5);
    scale = Math.max(Math.min(1, byWidth, byHeight), MIN_SCALE);
  }

  return (
    <div ref={outer} className="w-full overflow-x-auto">
      <div
        className="mx-auto overflow-clip shadow-[0_24px_48px_rgba(17,18,20,0.22)]"
        style={{
          width: deviceW * scale,
          height: deviceH * scale,
          borderRadius: 46 * scale,
          visibility: available ? 'visible' : 'hidden',
        }}
      >
        <div
          className="origin-top-left rounded-[46px] bg-[#1b1c1f]"
          style={{ width: deviceW, height: deviceH, padding: BEZEL, transform: `scale(${scale})` }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-[26px]" style={{ width: screen.w, height: screen.h }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
