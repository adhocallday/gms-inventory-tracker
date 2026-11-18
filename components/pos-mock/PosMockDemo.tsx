'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { IpadFrame, type Orientation } from './IpadFrame';
import { SAMPLE_CATALOG, lineKey, seededOpeningCount, type Catalog } from './catalog';
import type { Counts } from './math';
import { EXPLAINERS, HONESTY_NOTE } from './explainer';
import {
  CHECKOUT_SCREENS,
  initialState,
  ONBOARDING_STEPS,
  parseStored,
  reducer,
  STORAGE_KEY,
  type Action,
  type PosState,
} from './state';
import { AppHeader, cx, StatusBar } from './ui';
import { AtVenuCompareScreen, AtVenuMappingScreen, ModeScreen, WelcomeScreen } from './screens/Onboarding';
import { Register, RegisterTopBar } from './screens/Register';
import { CardScreen, CashScreen, PaymentMethodScreen, ReceiptScreen, SplitCardScreen, SplitCashScreen, TipScreen } from './screens/Checkout';
import { CountOutScreen, SettlementScreen } from './screens/Settlement';
import styles from './pos-mock.module.css';

type CatalogStatus = 'loading' | 'tracker' | 'fallback';

function useCatalog(): { catalog: Catalog; status: CatalogStatus } {
  const [catalog, setCatalog] = useState<Catalog>(SAMPLE_CATALOG);
  const [status, setStatus] = useState<CatalogStatus>('loading');
  useEffect(() => {
    let cancelled = false;
    fetch('/api/pos-mock/catalog')
      .then((r) => (r.ok ? (r.json() as Promise<Catalog>) : Promise.reject(new Error(String(r.status)))))
      .then((c) => {
        if (cancelled) return;
        if (!Array.isArray(c.items) || c.items.length === 0) throw new Error('empty');
        setCatalog(c);
        setStatus('tracker');
      })
      .catch(() => !cancelled && setStatus('fallback'));
    return () => {
      cancelled = true;
    };
  }, []);
  return { catalog, status };
}

function PosApp({
  state,
  dispatch,
  catalog,
  catalogStatus,
  opening,
  orientation,
}: {
  state: PosState;
  dispatch: React.Dispatch<Action>;
  catalog: Catalog;
  catalogStatus: CatalogStatus;
  opening: Counts;
  orientation: Orientation;
}) {
  const root = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Move keyboard focus to the new screen's title so Tab continues from there.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    root.current?.querySelector<HTMLElement>('[data-screen-title]')?.focus({ preventScroll: true });
  }, [state.screen]);

  const onboardingIndex = ONBOARDING_STEPS.findIndex((s) => s.screen === state.screen);
  const inCheckout = CHECKOUT_SCREENS.includes(state.screen);
  const closing = state.screen === 'countout' || state.screen === 'settlement';

  let header: React.ReactNode;
  if (onboardingIndex >= 0) {
    header = (
      <AppHeader
        title="MerchFlow POS setup"
        detail={`Step ${onboardingIndex + 1} of ${ONBOARDING_STEPS.length} · ${ONBOARDING_STEPS[onboardingIndex].title}`}
        progress={(onboardingIndex + 1) / ONBOARDING_STEPS.length}
        demo={onboardingIndex > 0}
      />
    );
  } else if (closing) {
    const step = state.screen === 'countout' ? 1 : 2;
    header = (
      <AppHeader
        title="Close show"
        detail={`Step ${step} of 2 · ${step === 1 ? 'Count-out' : 'Settlement'}`}
        progress={step / 2}
        demo
      />
    );
  } else if (!inCheckout) {
    header = <RegisterTopBar catalog={catalog} state={state} dispatch={dispatch} />;
  }

  const props = { state, dispatch };
  let body: React.ReactNode;
  switch (state.screen) {
    case 'welcome':
      body = <WelcomeScreen dispatch={dispatch} />;
      break;
    case 'mode':
      body = <ModeScreen dispatch={dispatch} />;
      break;
    case 'atvenu-compare':
      body = <AtVenuCompareScreen dispatch={dispatch} />;
      break;
    case 'atvenu-mapping':
      body = <AtVenuMappingScreen dispatch={dispatch} />;
      break;
    case 'register':
      body =
        catalogStatus === 'loading' ? (
          <p className="p-10 text-[var(--text2)]" role="status">
            Loading the tour catalog…
          </p>
        ) : (
          <Register catalog={catalog} {...props} />
        );
      break;
    case 'method':
      body = <PaymentMethodScreen {...props} />;
      break;
    case 'tip':
      body = <TipScreen {...props} />;
      break;
    case 'cash':
      body = <CashScreen {...props} />;
      break;
    case 'card':
      body = <CardScreen {...props} />;
      break;
    case 'split-cash':
      body = <SplitCashScreen {...props} />;
      break;
    case 'split-card':
      body = <SplitCardScreen {...props} />;
      break;
    case 'receipt':
      body = <ReceiptScreen {...props} />;
      break;
    case 'countout':
      body = <CountOutScreen {...props} catalog={catalog} opening={opening} />;
      break;
    case 'settlement':
      body = <SettlementScreen {...props} catalog={catalog} opening={opening} />;
      break;
  }

  return (
    <div
      ref={root}
      data-o={orientation}
      className={cx(styles.app, 'group flex h-full w-full flex-col', inCheckout && '!bg-[var(--card)]')}
      role="region"
      aria-label="MerchFlow POS, iPad mock"
    >
      <StatusBar />
      {header}
      <div key={state.screen} className={cx('min-h-0 flex-1', styles.screenIn)}>
        {body}
      </div>
    </div>
  );
}

export function PosMockDemo() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [restored, setRestored] = useState(false);
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [notesOpen, setNotesOpen] = useState(true);
  const { catalog, status } = useCatalog();

  // Restore the session after hydration; sessionStorage may be unavailable.
  useEffect(() => {
    try {
      const saved = parseStored(window.sessionStorage.getItem(STORAGE_KEY));
      if (saved) dispatch({ type: 'restore', state: saved });
    } catch {
      /* private mode or blocked storage: start fresh */
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, restored]);

  const opening = useMemo(() => {
    const counts: Counts = {};
    for (const item of catalog.items) for (const s of item.sizes) counts[lineKey(item.id, s.size)] = seededOpeningCount(s.size);
    return counts;
  }, [catalog]);

  const explainer = EXPLAINERS[state.screen];

  const reset = () => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    dispatch({ type: 'reset' });
  };

  const toolbarButton =
    'rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mf-red)]';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Demo controls">
        <div className="flex overflow-hidden rounded-lg border border-[var(--color-bg-border)]" role="group" aria-label="Orientation">
          {(['landscape', 'portrait'] as const).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={orientation === o}
              onClick={() => setOrientation(o)}
              className={cx(
                'px-3 py-1.5 text-sm font-medium capitalize focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--mf-red)]',
                orientation === o
                  ? 'bg-[var(--mf-ink)] text-white'
                  : 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]'
              )}
            >
              {o}
            </button>
          ))}
        </div>
        <button type="button" className={toolbarButton} aria-pressed={notesOpen} aria-controls="pos-mock-notes" onClick={() => setNotesOpen((v) => !v)}>
          {notesOpen ? 'Hide notes' : 'Show notes'}
        </button>
        <button type="button" className={toolbarButton} onClick={reset}>
          Reset demo
        </button>
        <span className="text-sm text-[var(--color-text-secondary)]" role="status">
          {status === 'loading'
            ? 'Loading catalog…'
            : status === 'tracker'
              ? `Catalog: ${catalog.tourName} (${catalog.items.length} items, read-only from the tracker)`
              : 'Catalog: built-in sample (the tracker catalog could not be loaded)'}
        </span>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <IpadFrame orientation={orientation}>
            <PosApp
              state={state}
              dispatch={dispatch}
              catalog={catalog}
              catalogStatus={status}
              opening={opening}
              orientation={orientation}
            />
          </IpadFrame>
        </div>

        {notesOpen && (
          <aside
            id="pos-mock-notes"
            aria-label="What this screen replaces"
            className="w-full shrink-0 space-y-3 rounded-xl border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] p-4 shadow-[0_15px_30px_var(--color-card-shadow)] xl:sticky xl:top-4 xl:w-[300px]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">On this screen</p>
            <div aria-live="polite" className="space-y-1">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{explainer.title}</h2>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{explainer.replaces}</p>
            </div>
            <p className="border-t border-[var(--color-bg-border)] pt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{HONESTY_NOTE}</p>
          </aside>
        )}
      </div>
    </div>
  );
}
