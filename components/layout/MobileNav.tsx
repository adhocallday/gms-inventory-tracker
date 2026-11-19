'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, HelpCircle, LineChart, FileText, Menu, Tablet, Upload, X, type LucideIcon } from 'lucide-react';
import { MerchFlowWordmark } from '@/components/brand/MerchFlowLogo';
import { MERCHFLOW_APPS } from '@/lib/apps';
import { openTourMenu } from '@/components/onboarding/tour-control';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';
import { APP_ICONS, NAV_ITEMS, isNavActive } from './nav-items';

/**
 * Phone navigation (under 768px): a fixed bottom bar with Tours, Documents,
 * Upload, POS and Menu. Menu opens every destination in a bottom sheet (a
 * modal <dialog>: focus stays inside, Escape and the backdrop close it) that
 * also closes on navigation. The desktop sidebar (NavBar) is hidden here.
 */

/** Height of the bar without the safe area; the layout pads <main> by the same amount. */
export const MOBILE_NAV_HEIGHT = 60;

interface BarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  tour?: string;
  active: (pathname: string) => boolean;
}

const BAR_ITEMS: BarItem[] = [
  { href: '/', label: 'Tours', icon: LineChart, tour: 'nav-tours', active: (p) => isNavActive(p, '/') },
  {
    href: '/dashboard/parsed-documents',
    label: 'Documents',
    icon: FileText,
    tour: 'documents',
    active: (p) => isNavActive(p, '/dashboard/parsed-documents'),
  },
  { href: '/upload', label: 'Upload', icon: Upload, tour: 'upload', active: (p) => p.startsWith('/upload') },
  { href: '/pos', label: 'POS', icon: Tablet, tour: 'pos-link', active: (p) => p.startsWith('/pos') },
];

const itemClass = (active: boolean) =>
  cn(
    'flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md text-[11px] font-medium transition-colors',
    'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-red-primary)]',
    active ? 'text-[var(--color-red-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
  );

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the menu on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <nav
        aria-label="Main"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-stretch gap-1 px-2" style={{ height: MOBILE_NAV_HEIGHT }}>
          {BAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.active(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tour}
                aria-current={active ? 'page' : undefined}
                className={itemClass(active)}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls="mf-mobile-menu"
            data-tour="nav-menu"
            className={itemClass(open)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span>Menu</span>
          </button>
        </div>
      </nav>
      <MobileMenu open={open} onClose={() => setOpen(false)} pathname={pathname} />
    </>
  );
}

function MobileMenu({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-3 text-[15px] font-medium transition-colors',
      'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-red-primary)]',
      active
        ? 'text-[var(--color-text-primary)] bg-[var(--color-bg-elevated)] shadow-[inset_2px_0_0_var(--color-red-primary)]'
        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]'
    );

  return (
    <dialog
      ref={ref}
      id="mf-mobile-menu"
      aria-modal="true"
      aria-labelledby="mf-mobile-menu-title"
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) onClose();
      }}
      className="mf-sheet md:hidden m-0 mt-auto w-full max-w-none max-h-[85vh] rounded-t-2xl border border-b-0 border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] p-0 shadow-xl"
    >
      <div className="px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="mf-mobile-menu-title" className="sr-only">
            Menu
          </h2>
          <MerchFlowWordmark className="h-8 w-auto text-[var(--color-text-primary)]" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-[var(--color-bg-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? 'page' : undefined} className={linkClass(active)} onClick={onClose}>
                  <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/upload"
              aria-current={pathname.startsWith('/upload') ? 'page' : undefined}
              className={linkClass(pathname.startsWith('/upload'))}
              onClick={onClose}
            >
              <Upload className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              Upload document
            </Link>
          </li>
        </ul>

        <section aria-labelledby="mf-mobile-apps">
          <h3 id="mf-mobile-apps" className="px-3 mb-1 text-xs font-medium text-[var(--color-text-secondary)]">
            MerchFlow apps
          </h3>
          <ul className="space-y-1">
            {MERCHFLOW_APPS.map((app) => {
              const Icon = APP_ICONS[app.id];
              const current = app.id === 'tracker';
              return (
                <li key={app.id}>
                  <a
                    href={current ? '/' : app.href}
                    aria-current={current ? 'page' : undefined}
                    className={linkClass(false)}
                    onClick={onClose}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1 flex items-center justify-between gap-2">
                      <span>
                        {app.label}
                        <span className="block text-xs font-normal text-[var(--color-text-muted)]">{app.note}</span>
                      </span>
                      {current && <span className="text-xs text-[var(--color-text-secondary)]">Current</span>}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="mf-mobile-help">
          <h3 id="mf-mobile-help" className="px-3 mb-1 text-xs font-medium text-[var(--color-text-secondary)]">
            Help
          </h3>
          <ul className="space-y-1">
            <li>
              <Link
                href="/welcome"
                aria-current={pathname === '/welcome' ? 'page' : undefined}
                className={linkClass(pathname === '/welcome')}
                onClick={onClose}
              >
                <BookOpen className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                How MerchFlow works
              </Link>
            </li>
            <li>
              <button
                type="button"
                aria-haspopup="dialog"
                className={cn(linkClass(false), 'w-full text-left')}
                onClick={() => {
                  onClose();
                  openTourMenu();
                }}
              >
                <HelpCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                Replay tour
              </button>
            </li>
          </ul>
        </section>

        <div className="flex items-center justify-between gap-3 px-3 pt-1 border-t border-[var(--color-bg-border)]">
          <span className="pt-3 text-sm text-[var(--color-text-secondary)]">Theme</span>
          <div className="pt-3">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </dialog>
  );
}
