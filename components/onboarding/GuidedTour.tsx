'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  CHAPTERS,
  chapterLabel,
  gapPath,
  isAtPath,
  isValidPosition,
  nextChapter,
  nextPosition,
  pickDocument,
  pickShow,
  previousPosition,
  resolvePath,
  type DocumentOption,
  type ShowOption,
  type TourIds,
  type TourPosition,
  type TourStep,
} from './tour-chapters';
import {
  TOUR_EVENT,
  TOUR_MENU_EVENT,
  readTourState,
  requestTour,
  writeTourState,
  type TourState,
} from './tour-control';

/**
 * The guided tour: chapters of steps (./tour-chapters) spread over many pages.
 *
 * Only one page is mounted at a time, so each step is shown with its own
 * driver.js instance. The position lives in sessionStorage; moving to a step on
 * another page tears the popover down, router.push()es there, and the pathname
 * effect picks the tour up again once the page has changed. Each step then
 * waits up to 5 s for its data-tour anchor. A missing anchor shows the step's
 * data-gap text (or is skipped if it has none), so the tour never stalls.
 *
 * Closing the popover (×, Escape, End tour, overlay click) clears the state.
 * Start it with requestTour(chapter) or open the chapter menu with
 * openTourMenu(), both from ./tour-control.
 */

const ANCHOR_TIMEOUT_MS = 5000;
/** How long to keep waiting for a step's own anchor once its fallback is on screen. */
const FALLBACK_GRACE_MS = 1500;
const NAVIGATION_TIMEOUT_MS = 10000;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** The tour, show and document the tour's dynamic pages open. */
async function resolveIds(): Promise<TourIds> {
  const ids: TourIds = { tourId: null, showId: null, docId: null };

  const tours = (await getJson<{ data?: { id: string }[] }>('/api/tours'))?.data ?? [];
  // The first tour that has shows, so the show chapter has something to open.
  for (const tour of tours.slice(0, 5)) {
    const shows = await getJson<ShowOption[]>(`/api/tours/${tour.id}/shows`);
    if (Array.isArray(shows) && shows.length > 0) {
      ids.tourId = tour.id;
      ids.showId = pickShow(shows);
      break;
    }
  }
  if (!ids.tourId && tours[0]) ids.tourId = tours[0].id;

  const docs = await getJson<{ data?: DocumentOption[] }>('/api/parsed-documents?limit=20');
  ids.docId = pickDocument(docs?.data ?? []);
  return ids;
}

function findAnchor(name: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
  return el && el.getClientRects().length > 0 ? el : null;
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
        if (Date.now() - fallbackSince > FALLBACK_GRACE_MS) return resolve({ element: backup, isFallback: true });
      }
      if (Date.now() - started > ANCHOR_TIMEOUT_MS) {
        return resolve(backup ? { element: backup, isFallback: true } : null);
      }
      window.setTimeout(tick, 150);
    };
    tick();
  });
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function describe(step: TourStep, showGap: boolean): string {
  const text = showGap && step.gap ? step.gap : step.body;
  let html = `<p>${escapeHtml(text)}</p>`;
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

function currentTarget(state: TourState): string | null {
  if (!state.ids || !isValidPosition(state)) return null;
  const step = CHAPTERS[state.chapter].steps[state.step];
  return resolvePath(step.page, state.ids) ?? gapPath(step.page);
}

export function GuidedTour() {
  const pathname = usePathname();
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);
  /** True while the tour destroys its own popover (between steps), so the state is kept. */
  const internalDestroyRef = useRef(false);
  /** Incremented on every run; an older run stops at its next await. */
  const runIdRef = useRef(0);
  /** The path the tour navigated to and is waiting for. */
  const navigatingToRef = useRef<{ path: string; at: number } | null>(null);
  const shownKeyRef = useRef<string | null>(null);
  /** +1 moving forward, -1 moving back: the way to skip a step that cannot be shown. */
  const directionRef = useRef<1 | -1>(1);
  const [menuOpen, setMenuOpen] = useState(false);

  const teardown = useCallback(() => {
    internalDestroyRef.current = true;
    driverRef.current?.destroy();
    driverRef.current = null;
    internalDestroyRef.current = false;
    shownKeyRef.current = null;
  }, []);

  const endTour = useCallback(() => {
    writeTourState(null);
    navigatingToRef.current = null;
    runIdRef.current += 1;
    teardown();
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

  const show = useCallback(
    (state: TourState, element: HTMLElement | null, showGap: boolean) => {
      teardown();
      const chapter = CHAPTERS[state.chapter];
      const step = chapter.steps[state.step];
      const pos: TourPosition = { chapter: state.chapter, step: state.step };
      const isFirst = previousPosition(pos) === null;
      const isLast = nextPosition(pos) === null;

      const instance = driver({
        allowClose: true,
        allowKeyboardControl: true,
        overlayOpacity: 0.45,
        stagePadding: 6,
        stageRadius: 8,
        popoverClass: 'mf-tour',
        onDestroyed: () => {
          if (!internalDestroyRef.current) {
            writeTourState(null);
            shownKeyRef.current = null;
            driverRef.current = null;
          }
        },
        steps: [
          {
            element: element ?? undefined,
            popover: {
              title: step.title,
              description: describe(step, showGap),
              showButtons: ['next', 'previous', 'close'],
              disableButtons: isFirst ? ['previous'] : [],
              showProgress: true,
              progressText: `Step ${state.step + 1} of ${chapter.steps.length}`,
              nextBtnText: isLast ? 'Finish' : 'Next',
              prevBtnText: 'Back',
              onNextClick: () => moveTo(nextPosition(pos), 1),
              // ArrowLeft also lands here, even when Back is disabled.
              onPrevClick: () => {
                if (!isFirst) moveTo(previousPosition(pos), -1);
              },
              onCloseClick: () => endTour(),
              onPopoverRender: (popover) => {
                const label = document.createElement('p');
                label.className = 'mf-tour-chapter';
                label.textContent = chapterLabel(state.chapter);
                popover.wrapper.insertBefore(label, popover.title);

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
                const menu = () => {
                  endTour();
                  setMenuOpen(true);
                };
                button('Chapters', menu);
                if (!isLast) button('Skip chapter', () => moveTo(nextChapter(pos), 1));
                button('End tour', endTour);
                popover.wrapper.appendChild(extra);
              },
            },
          },
        ],
      });
      driverRef.current = instance;
      shownKeyRef.current = `${state.chapter}:${state.step}`;
      instance.drive(0);
    },
    [endTour, moveTo, teardown],
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
    if (!state.ids) {
      const ids = await resolveIds();
      if (cancelled()) return;
      state = { ...(readTourState() ?? state), ids };
      writeTourState(state);
    }

    const step = CHAPTERS[state.chapter].steps[state.step];
    const path = resolvePath(step.page, state.ids!);
    const target = path ?? gapPath(step.page);
    const key = `${state.chapter}:${state.step}`;
    const here = isAtPath(target, window.location.pathname, window.location.search);

    if (here && shownKeyRef.current === key && driverRef.current?.isActive()) return;

    if (!here) {
      teardown();
      navigatingToRef.current = { path: target, at: Date.now() };
      router.push(target);
      return; // the pathname effect resumes the tour on arrival
    }
    navigatingToRef.current = null;

    // The page needs an id the tour could not resolve: explain instead.
    if (!path) {
      teardown();
      show(state, null, true);
      return;
    }

    if (!step.anchor) {
      show(state, null, false);
      return;
    }

    teardown();
    const found = await waitForAnchor(step.anchor, step.fallbackAnchor, cancelled);
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
    const pos = { chapter: state.chapter, step: state.step };
    moveTo(directionRef.current === 1 ? nextPosition(pos) : previousPosition(pos), directionRef.current);
  }, [endTour, moveTo, router, show, teardown]);

  runRef.current = run;

  // Resume after each page change (and on first load, after a reload mid-tour).
  useEffect(() => {
    const state = readTourState();
    if (!state) return;
    const pending = navigatingToRef.current;
    if (pending) {
      if (isAtPath(pending.path, window.location.pathname, window.location.search)) {
        navigatingToRef.current = null;
        runRef.current();
      } else if (Date.now() - pending.at > NAVIGATION_TIMEOUT_MS) {
        endTour();
      }
      return;
    }
    const target = currentTarget(state);
    if (target && !isAtPath(target, window.location.pathname, window.location.search)) {
      // The visitor went somewhere else (a link, the back button): stop the tour.
      endTour();
      return;
    }
    runRef.current();
  }, [pathname, endTour]);

  useEffect(() => {
    const onStart = () => {
      navigatingToRef.current = null;
      directionRef.current = 1;
      setMenuOpen(false);
      teardown();
      runRef.current();
    };
    const onMenu = () => {
      endTour();
      setMenuOpen(true);
    };
    window.addEventListener(TOUR_EVENT, onStart);
    window.addEventListener(TOUR_MENU_EVENT, onMenu);
    return () => {
      window.removeEventListener(TOUR_EVENT, onStart);
      window.removeEventListener(TOUR_MENU_EVENT, onMenu);
    };
  }, [endTour, teardown]);

  useEffect(
    () => () => {
      internalDestroyRef.current = true;
      driverRef.current?.destroy();
    },
    [],
  );

  return <TourChapterMenu open={menuOpen} onClose={() => setMenuOpen(false)} />;
}

/** The chapter menu: a modal list of chapters, opened from the NavBar's "Replay tour". */
function TourChapterMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="mf-tour-menu-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="mf-tour-menu w-[min(560px,calc(100vw-32px))] max-h-[85vh] rounded-xl border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] p-0 shadow-xl"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="mf-tour-menu-title" className="text-lg font-semibold">
              Guided tour
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {CHAPTERS.length} chapters. Start from the beginning or pick a chapter.
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
        <button
          type="button"
          onClick={() => {
            onClose();
            requestTour(0);
          }}
          className="inline-flex items-center h-10 px-5 rounded-md text-sm font-semibold bg-[var(--color-red-primary)] text-white hover:bg-[var(--color-red-hover)] active:bg-[var(--color-red-active)] transition"
        >
          Start from the beginning
        </button>
        <ol className="space-y-1">
          {CHAPTERS.map((chapter, index) => (
            <li key={chapter.id}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  requestTour(index);
                }}
                className="w-full text-left rounded-md px-3 py-2 hover:bg-[var(--color-bg-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-red-primary)]"
              >
                <span className="text-sm font-semibold">
                  <span className="tabular-nums text-[var(--color-text-muted)] mr-2">{index}</span>
                  {chapter.title}
                </span>
                <span className="block text-xs text-[var(--color-text-secondary)] ml-6">
                  {chapter.summary} {chapter.steps.length} steps.
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </dialog>
  );
}
