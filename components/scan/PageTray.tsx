'use client';

import { ChevronLeft, ChevronRight, Contrast, RotateCw, Trash2 } from 'lucide-react';
import type { PageImage } from './image-process';
import { cn } from '@/lib/utils';

interface PageTrayProps {
  pages: PageImage[];
  onChange: (pages: PageImage[]) => void;
  onRemove: (page: PageImage) => void;
}

const iconBtn =
  'flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-border)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-red-primary)]';

/** Page thumbnails with reorder, rotate, enhance and remove. Ported from gms-document-parser. */
export function PageTray({ pages, onChange, onRemove }: PageTrayProps) {
  const update = (id: string, patch: Partial<PageImage>) =>
    onChange(pages.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const move = (index: number, delta: number) => {
    const next = [...pages];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };

  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {pages.map((page, i) => (
        <li key={page.id} className="overflow-hidden rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-elevated)]">
          <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-[var(--color-bg-base)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.url}
              alt={`Page ${i + 1}`}
              className="max-h-full max-w-full object-contain transition-transform"
              style={{
                transform: `rotate(${page.rotation}deg)`,
                filter: page.enhance ? 'grayscale(1) contrast(1.35) brightness(1.05)' : undefined,
              }}
            />
            <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {i + 1}
            </span>
          </div>
          <div className="flex items-center justify-between px-1 py-1">
            <button type="button" className={iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move page earlier">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={iconBtn}
              onClick={() => update(page.id, { rotation: ((page.rotation + 90) % 360) as PageImage['rotation'] })}
              aria-label="Rotate page"
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(iconBtn, page.enhance && 'text-[var(--color-red-primary)]')}
              onClick={() => update(page.id, { enhance: !page.enhance })}
              aria-label={page.enhance ? 'Turn off scan enhancement' : 'Enhance as scanned document'}
              aria-pressed={page.enhance}
              title="Scan enhancement"
            >
              <Contrast className="h-4 w-4" />
            </button>
            <button type="button" className={iconBtn} onClick={() => onRemove(page)} aria-label="Remove page">
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={iconBtn}
              onClick={() => move(i, 1)}
              disabled={i === pages.length - 1}
              aria-label="Move page later"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
