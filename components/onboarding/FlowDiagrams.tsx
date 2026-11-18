'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { VIEWS, type StageId, type ViewId } from './flow-data';
import { FlowPanelBody, StageLegend } from './FlowFigures';

/**
 * Current process vs Option A vs Option B vs a comparison table, as tabs.
 * Same data and styles (mfd-*) as the Data Flow site.
 */

const COUNT_TONE: Record<number, StageId> = { 10: 'manual', 1: 'review', 0: 'outputs' };

export function FlowDiagrams() {
  const [active, setActive] = useState<ViewId>('current');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const view = VIEWS.find((v) => v.id === active)!;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = VIEWS.findIndex((v) => v.id === active);
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % VIEWS.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + VIEWS.length) % VIEWS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? VIEWS.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    setActive(VIEWS[next].id);
    tabs.current[next]?.focus();
  }

  return (
    <div className="space-y-4">
      <StageLegend />
      <div>
        <div role="tablist" aria-label="Data flow views" className="mfd-tabs" onKeyDown={onKeyDown}>
          {VIEWS.map((v, i) => {
            const selected = v.id === active;
            return (
              <button
                key={v.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`mfd-tab-${v.id}`}
                aria-selected={selected}
                aria-controls={`mfd-panel-${v.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(v.id)}
                className="mfd-tab"
              >
                {v.tab}
                {v.count !== undefined && (
                  <span className={`mfd-count mfd-s-${COUNT_TONE[v.count]}`} aria-label={`${v.count} manual steps`}>
                    {v.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          key={view.id}
          role="tabpanel"
          id={`mfd-panel-${view.id}`}
          aria-labelledby={`mfd-tab-${view.id}`}
          tabIndex={0}
          className="mfd-panel"
        >
          <FlowPanelBody view={view} />
        </div>
      </div>
    </div>
  );
}
