'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { driver, type Config, type DriveStep, type Driver, type PopoverDOM } from 'driver.js';
import 'driver.js/dist/driver.css';
import './guided-tour.css';
import {
  PAGE_LABELS,
  TOURS,
  chapterLabel,
  isAtPath,
  isValidPosition,
  needsFacts,
  needsIds,
  nextChapter,
  nextPosition,
  previousPosition,
  resolvePath,
  stepAt,
  stepTarget,
  type TourIds,
  type TourPosition,
  type TourStep,
} from './tour-chapters';
import { fillFacts, type TourFacts } from './tour-facts';
import { TourChoices } from './TourChapterList';
import {
  TOUR_EVENT,
  TOUR_MENU_EVENT,
  announceTourShown,
  loadTourContext,
  readTourState,
  takePendingRequest,
  writeTourState,
  type TourState,
} from './tour-control';

/**
 * The guided tour: chapters of steps (./tour-chapters) spread over many pages.
 * Loaded lazily by ./GuidedTourLoader once a tour is started or the menu opened.
 *
 * One driver.js instance (animate: false) is reused for every step on a page:
 * the next element is highlighted in place. Moving to a step on another page
 * keeps the popover up with a "Loading Inventory…" line while router.push()
 * runs, and the pathname effect shows the step once the page has changed.
 * The next step's page is prefetched while the current one is read.
 *
 * Step 1 needs no ids, so it is shown at once; the tour context (ids and
 * live figures, /api/onboarding/context) loads in the background and only a
 * step that needs it waits. Each step waits up to 3 s for its data-tour
 * anchor (300 ms more once its fallback is on screen); a missing anchor shows
 * the step's gap text, or is skipped if it has none, so the tour never stalls.
 *
 * "Where to click" steps (`via`) highlight a sidebar item or a tour tab; the
 * visitor can click it, and the tour follows to the next step.
 *
 * ← and → move back and forward; closing the popover (×, Escape, End tour,
 * overlay click) clears the state. Start a tour with requestTour(tour,
 * chapter) or open the tour menu with openTourMenu(), both from ./tour-control.
 */

const ANCHOR_TIMEOUT_MS = 3000;
/** How long to keep waiting for a step's own anchor once its fallback is on screen. */
const FALLBACK_GRACE_MS = 300;
const NAVIGATION_TIMEOUT_MS = 10000;
const NO_IDS: TourIds = { tourId: null, showId: null, docId: null };

/** The first visible element with this anchor (the sidebar and the phone bottom bar share some). */
function findAnchor(name: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  return Array.from(all).find((el) => el.getClientRects().length > 0) ?? null;
}

/** Polls for the step's anchor; settles for the fallback anchor, or null after the timeout. */
function waitForAnchor(
  anchor: string,
  fallback: string | undefined,
  isCancelled: () => boolean,
): Promise<{ element: HTMLElement; isFallback: boolean } | null> {
  return new Promise((resolve) => {
    const started = Date.now();
    let fallbackSince: number | null = null;
    const tick = () => {
      if (isCancelled()) return resolve(null);
      const element = findAnchor(anchor);
      if (element) return resolve({ element, isFallback: false });
      const backup = fallback ? findAnchor(fallback) : null;
      if (backup) {
        fallbackSince ??= Date.now();
        if (Date.now() - fallbackSince >= FALLBACK_GRACE_MS) return resolve({ element: backup, isFallback: true });
      }
      if (Date.now() - started > ANCHOR_TIMEOUT_MS) {
        return resolve(backup ? { element: backup, isFallback: true } : null);
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

/** The `before` hook: opens the tab (by element id) that holds the step's anchor. */
function runBefore(step: TourStep) {
  const id = step.before?.openTab;
  if (!id) return;
  const tab = document.getElementById(id);
  if (tab && tab.getAttribute('aria-selected') !== 'true') tab.click();
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The step's text: its gap text when data is missing, else the body with live figures filled in. */
export function stepText(step: TourStep, showGap: boolean, facts: TourFacts | null | undefined): string {
  if (showGap && step.gap) return step.gap;
  return fillFacts(step.body, facts) ?? step.bodyWithoutFigures ?? step.gap ?? step.body.replace(/\{\w+\}/g, '');
}

/** The step's title with figures filled in, or without the {token} part. */
export function stepTitle(step: TourStep, facts: TourFacts | null | undefined): string {
  return fillFacts(step.title, facts) ?? step.title.replace(/:?\s*\{\w+\}/g, '');
}

function describe(step: TourStep, showGap: boolean, facts: TourFacts | null | undefined): string {
  let html = `<p>${escapeHtml(stepText(step, showGap, facts))}</p>`;
  if (step.links?.length) {
    html += `<ul class="mf-tour-links">${step.links
      .map(
        (l) =>
          `<li><a href="${escapeHtml(l.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a></li>`,
      )
      .join('')}</ul>`;
  }
  return html;
}

const loadingHtml = (label: string) =>
  `<p class="mf-tour-status" role="status"><span class="mf-tour-spinner" aria-hidden="true"></span>Loading ${escapeHtml(label)}…</p>`;

const positionOf = (state: TourState): TourPosition => ({ tour: state.tour, chapter: state.chapter, step: state.step });

const here = (path: string) => isAtPath(path, window.location.pathname, window.location.search);

/** The step's URL with what is known now; null when it needs ids that are not loaded yet. */
function knownTarget(step: TourStep, ids: TourIds | undefined): string | null {
  if (ids) return stepTarget(step, ids);
  return needsIds(step) ? null : stepTarget(step, NO_IDS);
}

export function GuidedTour() {
  const pathname = usePathname();
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);
  /** True while the tour destroys its own popover, so the state is kept. */
  const internalDestroyRef = useRef(false);
  /** Incremented on every run; an older run stops at its next await. */
  const runIdRef = useRef(0);
  /** The path the tour navigated to and is waiting for. */
  const navigatingToRef = useRef<{ path: string; at: number } | null>(null);
  /** The step on screen ("tour:chapter:step"), or null. */
  const shownKeyRef = useRef<string | null>(null);
  /** True while the popover shows "Loading …": Next does nothing until the page is ready. */
  const loadingRef = useRef(false);
  /** +1 moving forward, -1 moving back: the way to skip a step that cannot be shown. */
  const directionRef = useRef<1 | -1>(1);
  /** Set when a start was handled on mount, so the first pathname effect does not run it again. */
  const skipPathEffectRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const teardown = useCallback(() => {
    internalDestroyRef.current = true;
    driverRef.current?.destroy();
    driverRef.current = null;
    internalDestroyRef.current = false;
    shownKeyRef.current = null;
    loadingRef.current = false;
  }, []);

  const endTour = useCallback(() => {
    writeTourState(null);
    navigatingToRef.current = null;
    runIdRef.current += 1;
    teardown();
    announceTourShown();
  }, [teardown]);

  const runRef = useRef<() => void>(() => {});

  const moveTo = useCallback(
    (pos: TourPosition | null, direction: 1 | -1) => {
      const state = readTourState();
      if (!pos || !state) {
        endTour();
        return;
      }
      directionRef.current = direction;
      writeTourState({ ...state, ...pos });
      runRef.current();
    },
    [endTour],
  );

  /** The position on screen now, read at click time so a handler never acts on a stale step. */
  const currentPosition = () => {
    const state = readTourState();
    return state && isValidPosition(state) ? positionOf(state) : null;
  };

  const onNext = useCallback(() => {
    if (loadingRef.current) return;
    const pos = currentPosition();
    if (pos) moveTo(nextPosition(pos), 1);
  }, [moveTo]);

  const onPrev = useCallback(() => {
    const pos = currentPosition();
    const previous = pos && previousPosition(pos);
    // ArrowLeft also lands here on the first step, where Back is disabled.
    if (previous) moveTo(previous, -1);
  }, [moveTo]);

  /** Renders one popover through the shared driver.js instance, creating it if needed. */
  const render = useCallback(
    (state: TourState, element: HTMLElement | null, popover: DriveStep['popover'], extras: { isLast: boolean }) => {
      const config: Config = {
        animate: false,
        allowClose: true,
        allowKeyboardControl: true,
        overlayOpacity: 0.45,
        stagePadding: 6,
        stageRadius: 8,
        popoverClass: 'mf-tour',
        onDestroyed: () => {
          if (internalDestroyRef.current) return;
          writeTourState(null);
          shownKeyRef.current = null;
          loadingRef.current = false;
          driverRef.current = null;
          runIdRef.current += 1;
          navigatingToRef.current = null;
          announceTourShown();
        },
      };
      const step: DriveStep = {
        element: element ?? undefined,
        popover: {
          showButtons: ['next', 'previous', 'close'],
          prevBtnText: 'Back',
          onNextClick: () => onNext(),
          onPrevClick: () => onPrev(),
          onCloseClick: () => endTour(),
          ...popover,
          onPopoverRender: (dom: PopoverDOM, opts) => {
            const label = document.createElement('p');
            label.className = 'mf-tour-chapter';
            label.textContent = chapterLabel(state.tour, state.chapter);
            dom.wrapper.insertBefore(label, dom.title);

            const keys = document.createElement('p');
            keys.className = 'mf-tour-keys';
            keys.textContent = '← → to move · Esc to end';
            dom.description.after(keys);

            const extra = document.createElement('div');
            extra.className = 'mf-tour-extra';
            const button = (text: string, onClick: () => void) => {
              const b = document.createElement('button');
              b.type = 'button';
              b.className = 'mf-tour-btn';
              b.textContent = text;
              b.addEventListener('click', onClick);
              extra.appendChild(b);
            };
            button('Chapters', () => {
              endTour();
              setMenuOpen(true);
            });
            if (!extras.isLast)
              button('Skip chapter', () => {
                const pos = currentPosition();
                if (pos) moveTo(nextChapter(pos), 1);
              });
            button('End tour', endTour);
            dom.wrapper.appendChild(extra);
            popover?.onPopoverRender?.(dom, opts);
          },
        },
      };

      // Reuse the instance on screen: the next element is highlighted in place.
      let instance = driverRef.current;
      if (!instance || !instance.isActive()) {
        instance = driver(config);
        driverRef.current = instance;
      }
      instance.setConfig({ ...config, steps: [step] });
      instance.drive(0);
    },
    [endTour, moveTo, onNext, onPrev],
  );

  /** Prefetches the next step's page, so moving on does not wait for the server. */
  const prefetchNext = useCallback(
    (state: TourState) => {
      const next = nextPosition(positionOf(state));
      if (!next) return;
      const target = knownTarget(stepAt(next), state.ids);
      if (target && !here(target)) router.prefetch(target);
    },
    [router],
  );

  const show = useCallback(
    (state: TourState, element: HTMLElement | null, showGap: boolean) => {
      const chapter = TOURS[state.tour].chapters[state.chapter];
      const step = chapter.steps[state.step];
      const pos = positionOf(state);
      const isFirst = previousPosition(pos) === null;
      const isLast = nextPosition(pos) === null;
      loadingRef.current = false;
      render(
        state,
        element,
        {
          title: escapeHtml(stepTitle(step, state.facts)),
          description: describe(step, showGap, state.facts),
          disableButtons: isFirst ? ['previous'] : [],
          showProgress: true,
          progressText: `Step ${state.step + 1} of ${chapter.steps.length}`,
          nextBtnText: isLast ? 'Finish' : 'Next',
        },
        { isLast },
      );
      shownKeyRef.current = `${state.tour}:${state.chapter}:${state.step}`;
      announceTourShown();
      prefetchNext(state);
    },
    [prefetchNext, render],
  );

  /**
   * Keeps the popover up while the next page loads: the current popover turns
   * into "Loading Inventory…" with Back and End, or (when nothing is on screen
   * yet) a centred one appears. Never a blank screen.
   */
  const showLoading = useCallback(
    (state: TourState, label: string) => {
      loadingRef.current = true;
      const popover = driverRef.current?.isActive()
        ? (driverRef.current.getState('popover') as PopoverDOM | undefined)
        : undefined;
      if (popover?.wrapper.isConnected) {
        popover.wrapper.classList.add('mf-tour-loading');
        popover.wrapper.setAttribute('aria-busy', 'true');
        popover.description.innerHTML = loadingHtml(label);
        popover.nextButton.disabled = true;
        popover.nextButton.classList.add('driver-popover-btn-disabled');
        popover.progress.style.visibility = 'hidden';
        return;
      }
      const chapter = TOURS[state.tour].chapters[state.chapter];
      render(
        state,
        null,
        {
          title: escapeHtml(chapter.title),
          description: loadingHtml(label),
          disableButtons: previousPosition(positionOf(state)) ? ['next'] : ['next', 'previous'],
          onPopoverRender: (dom) => {
            dom.wrapper.classList.add('mf-tour-loading');
            dom.wrapper.setAttribute('aria-busy', 'true');
          },
        },
        { isLast: nextPosition(positionOf(state)) === null },
      );
      shownKeyRef.current = null;
      announceTourShown();
    },
    [render],
  );

  const run = useCallback(async () => {
    const runId = ++runIdRef.current;
    const cancelled = () => runId !== runIdRef.current;

    let state = readTourState();
    if (!state) {
      teardown();
      return;
    }
    if (!isValidPosition(state)) {
      endTour();
      return;
    }
    let step = stepAt(state);

    // The context (ids and figures) loads in the background; only a step that needs it waits.
    if (!state.ids || state.facts === undefined) {
      const context = loadTourContext().then((ctx) => {
        const latest = readTourState();
        if (latest && (!latest.ids || latest.facts === undefined)) {
          const merged = { ...latest, ids: latest.ids ?? ctx.ids, facts: latest.facts === undefined ? ctx.facts : latest.facts };
          writeTourState(merged);
          if (shownKeyRef.current) prefetchNext(merged);
        }
      });
      if (needsIds(step) || needsFacts(step)) {
        showLoading(state, PAGE_LABELS[step.page]);
        await context;
        if (cancelled()) return;
        state = readTourState();
        if (!state || !isValidPosition(state)) return;
        step = stepAt(state);
      }
    }

    const key = `${state.tour}:${state.chapter}:${state.step}`;
    // A "where to click" sidebar step is shown on whatever page is open.
    const target = step.via === 'nav' ? null : knownTarget(step, state.ids);
    const isHere = target === null || here(target);
    const active = driverRef.current?.isActive() ?? false;

    if (isHere && shownKeyRef.current === key && active && driverRef.current?.getActiveElement()?.isConnected !== false) {
      return;
    }

    if (!isHere && target) {
      showLoading(state, PAGE_LABELS[step.page]);
      navigatingToRef.current = { path: target, at: Date.now() };
      router.push(target);
      return; // the pathname effect resumes the tour on arrival
    }
    if (navigatingToRef.current && target && navigatingToRef.current.path !== target) {
      // Moved back while another page was loading: return here once that navigation lands.
      navigatingToRef.current = { path: target, at: Date.now() };
      router.push(target);
    } else if (step.via !== 'nav') {
      navigatingToRef.current = null;
    }

    // The page needs an id the tour could not resolve: explain instead.
    if (target !== null && state.ids && resolvePath(step.page, state.ids) === null) {
      show(state, null, true);
      return;
    }

    if (!step.anchor) {
      show(state, null, false);
      return;
    }

    runBefore(step);
    const immediate = findAnchor(step.anchor);
    const found = immediate
      ? { element: immediate, isFallback: false }
      : await (async () => {
          // Keep the previous popover up (as "Loading …") while the page renders its anchor.
          if (active && shownKeyRef.current !== key) showLoading(state, PAGE_LABELS[step.page]);
          return waitForAnchor(step.anchor!, step.fallbackAnchor, cancelled);
        })();
    if (cancelled()) return;
    if (found) {
      show(state, found.element, found.isFallback);
      return;
    }
    if (step.gap) {
      show(state, null, true);
      return;
    }
    // Nothing to highlight and nothing to say: skip it in the direction of travel.
    const pos = positionOf(state);
    moveTo(directionRef.current === 1 ? nextPosition(pos) : previousPosition(pos), directionRef.current);
  }, [endTour, moveTo, prefetchNext, router, show, showLoading, teardown]);

  runRef.current = run;

  // Start requests and the menu. Declared before the pathname effect so a start
  // made before this component was loaded is handled first.
  useEffect(() => {
    const onStart = () => {
      takePendingRequest();
      navigatingToRef.current = null;
      directionRef.current = 1;
      shownKeyRef.current = null;
      setMenuOpen(false);
      runRef.current();
    };
    const onMenu = () => {
      takePendingRequest();
      endTour();
      setMenuOpen(true);
    };
    const pending = takePendingRequest();
    if (pending === 'start') {
      skipPathEffectRef.current = true;
      onStart();
    } else if (pending === 'menu') {
      onMenu();
    }
    window.addEventListener(TOUR_EVENT, onStart);
    window.addEventListener(TOUR_MENU_EVENT, onMenu);
    return () => {
      window.removeEventListener(TOUR_EVENT, onStart);
      window.removeEventListener(TOUR_MENU_EVENT, onMenu);
    };
  }, [endTour]);

  // Resume after each page change (and on first load, after a reload mid-tour).
  useEffect(() => {
    if (skipPathEffectRef.current) {
      skipPathEffectRef.current = false;
      return;
    }
    const state = readTourState();
    if (!state) return;
    const pending = navigatingToRef.current;
    if (pending) {
      if (here(pending.path)) {
        navigatingToRef.current = null;
        runRef.current();
      } else if (Date.now() - pending.at > NAVIGATION_TIMEOUT_MS) {
        endTour();
      }
      return;
    }
    if (!isValidPosition(state)) {
      endTour();
      return;
    }
    const step = stepAt(state);
    const key = `${state.tour}:${state.chapter}:${state.step}`;
    if (shownKeyRef.current !== key) {
      // Nothing of this step on screen yet (first load, or a reload mid-tour): show it.
      runRef.current();
      return;
    }
    const target = step.via === 'nav' ? null : knownTarget(step, state.ids);
    if (target !== null && here(target)) {
      runRef.current();
      return;
    }
    // The visitor navigated while a step was shown. Clicking the highlighted
    // item (or anything that opens the next step's page) moves the tour on.
    const next = nextPosition(positionOf(state));
    const nextTarget = next ? knownTarget(stepAt(next), state.ids) : null;
    if (next && nextTarget && here(nextTarget)) {
      moveTo(next, 1);
      return;
    }
    // A sidebar step stays useful on any page; anything else means the visitor left the tour.
    if (step.via === 'nav') {
      runRef.current();
      return;
    }
    endTour();
  }, [pathname, endTour, moveTo]);

  useEffect(
    () => () => {
      internalDestroyRef.current = true;
      driverRef.current?.destroy();
    },
    [],
  );

  return <TourChapterMenu open={menuOpen} onClose={() => setMenuOpen(false)} />;
}

/** The tour menu: both tours and their chapters in a modal, opened from the NavBar's "Replay tour". */
function TourChapterMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (open) announceTourShown();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="mf-tour-menu-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="mf-tour-menu w-[min(860px,calc(100vw-32px))] max-h-[85vh] rounded-xl border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] p-0 shadow-xl"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="mf-tour-menu-title" className="text-lg font-semibold">
              Guided tours
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Start a tour from the beginning or pick a chapter. Use ← and → to move, Esc to end.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]"
          >
            ×
          </button>
        </div>
        <TourChoices compact onStart={onClose} />
      </div>
    </dialog>
  );
}
