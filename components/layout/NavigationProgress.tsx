'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * A slim red bar across the top of the window while a page is loading.
 *
 * It starts on a click on any internal link (one delegated listener, so every
 * <a> and next/link counts) and on navigations made through useNavigate().
 * It finishes when the pathname or search params change, or after 10s as a
 * safety net. No dependency.
 */

const START_EVENT = 'mf:nav-start';
const SAFETY_MS = 10_000;

function currentUrl() {
  return window.location.pathname + window.location.search;
}

/** True when `href` is a same-origin page other than the one showing now. */
function isNewPage(href: string) {
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    return url.pathname + url.search !== currentUrl();
  } catch {
    return false;
  }
}

/** Shows the bar for a navigation to `href` (ignored for the current page). */
export function startNavigationProgress(href: string) {
  if (typeof window === 'undefined' || !isNewPage(href)) return;
  window.dispatchEvent(new Event(START_EVENT));
}

/**
 * router.push with the progress bar and a pending flag for the button that
 * started it: `isPending` stays true until the new page has rendered.
 */
export function useNavigate() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const navigate = useCallback(
    (href: string, options?: { replace?: boolean }) => {
      startNavigationProgress(href);
      startTransition(() => {
        if (options?.replace) router.replace(href);
        else router.push(href);
      });
    },
    [router]
  );
  return { navigate, isPending };
}

type Phase = 'idle' | 'start' | 'loading' | 'done';

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>('idle');
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const finish = useCallback(() => {
    clearTimers();
    setPhase((p) => (p === 'idle' ? 'idle' : 'done'));
    timers.current.push(window.setTimeout(() => setPhase('idle'), 450));
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setPhase('start');
    // Next frame: let the bar render at 0 before it grows.
    timers.current.push(window.setTimeout(() => setPhase('loading'), 20));
    timers.current.push(window.setTimeout(finish, SAFETY_MS));
  }, [finish]);

  // Delegated click listener (capture phase, so next/link's preventDefault
  // does not hide the click from us).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const target = a.getAttribute('target');
      if ((target && target !== '_self') || a.hasAttribute('download')) return;
      if (isNewPage(a.href)) start();
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener(START_EVENT, start);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener(START_EVENT, start);
    };
  }, [start]);

  // The route changed: the new page is rendering.
  const search = searchParams?.toString() ?? '';
  useEffect(() => {
    finish();
  }, [pathname, search, finish]);

  useEffect(() => clearTimers, []);

  if (phase === 'idle') return null;

  const width = phase === 'start' ? '0%' : phase === 'loading' ? '85%' : '100%';
  const transition =
    phase === 'loading'
      ? 'width 8s cubic-bezier(0.1, 0.7, 0.2, 1)'
      : phase === 'done'
        ? 'width 150ms ease-out, opacity 250ms ease 150ms'
        : 'none';

  return (
    <div
      aria-hidden="true"
      className="mf-nav-progress pointer-events-none fixed inset-x-0 top-0 z-[2147483000] h-[2px]"
    >
      <div
        className="h-full bg-[var(--color-red-primary)]"
        style={{ width, transition, opacity: phase === 'done' ? 0 : 1 }}
      />
    </div>
  );
}
