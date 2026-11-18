'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen, Upload, HelpCircle, BookOpen } from 'lucide-react';
import { MerchFlowMark, MerchFlowWordmark } from '@/components/brand/MerchFlowLogo';
import { MERCHFLOW_APPS } from '@/lib/apps';
import { openTourMenu } from '@/components/onboarding/tour-control';
import { cn } from '@/lib/utils';
import { useSidebar } from './SidebarContext';
import { APP_ICONS, NAV_ITEMS, appTourAnchor, isNavActive } from './nav-items';

/**
 * The desktop and tablet sidebar (768px and up): wordmark and labels, or the
 * mark and an icon rail when collapsed. The choice persists in
 * `sidebar-collapsed` (SidebarContext). Phones get MobileNav instead.
 */
export function NavBar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render consistent placeholder during SSR to avoid hydration mismatch
  const collapsed = mounted ? isCollapsed : false;

  const navItems = NAV_ITEMS;
  const appIcons = APP_ICONS;
  const isActive = (href: string) => isNavActive(pathname, href);
  const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return (
    <nav
      id="mf-sidebar"
      aria-label="Main"
      className={cn(
        // Phones use the bottom bar (MobileNav) instead.
        'hidden md:flex',
        // Sticky to the viewport, scrolling on its own when taller than it,
        // so the Upload button stays reachable on long pages.
        'sticky top-0 h-screen overflow-y-auto bg-[var(--color-bg-surface)] border-r border-[var(--color-bg-border)] flex-col transition-[width] duration-200 flex-shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex flex-col justify-between flex-1">
        <div className={cn('py-5 space-y-6', collapsed ? 'px-2' : 'px-4')}>
          {/* Logo and collapse toggle */}
          <div className={cn('flex items-center gap-2', collapsed ? 'flex-col' : 'justify-between')}>
            {!collapsed && (
              <Link
                href="/"
                aria-label="MerchFlow Tracker home"
                className="group block text-[var(--color-text-primary)] flex-1 min-w-0"
              >
                <MerchFlowWordmark className="w-full max-w-[168px] h-auto" />
              </Link>
            )}

            {/* Collapsed logo: the MerchFlow mark */}
            {collapsed && (
              <Link href="/" aria-label="MerchFlow Tracker home" className="block text-[var(--color-text-primary)]">
                <MerchFlowMark className="w-10 h-10" />
              </Link>
            )}

            {/* Collapse toggle button */}
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={toggleLabel}
              aria-expanded={!collapsed}
              aria-controls="mf-sidebar-links"
              title={toggleLabel}
              className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-red-primary)] transition flex-shrink-0"
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" aria-hidden="true" /> : <PanelLeftClose className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>

          <div id="mf-sidebar-links" className="space-y-6">
            {/* Each former section (Tours, Documents, Admin) held one item whose
                label repeated the heading, so they form one unlabelled group. */}
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour={item.tour}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md text-sm font-medium transition-colors',
                      collapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2',
                      active
                        ? 'text-[var(--color-text-primary)] bg-[var(--color-bg-elevated)] shadow-[inset_2px_0_0_var(--color-red-primary)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>

            {/* MerchFlow app switcher */}
            <div data-tour="app-switcher">
              {!collapsed && (
                <p className="px-3 text-xs font-medium text-[var(--color-text-secondary)] mb-2">
                  MerchFlow apps
                </p>
              )}
              <div className="space-y-1">
                {MERCHFLOW_APPS.map((app) => {
                  const Icon = appIcons[app.id];
                  const current = app.id === 'tracker';
                  return (
                    <a
                      key={app.id}
                      href={current ? '/' : app.href}
                      data-tour={appTourAnchor(app.id)}
                      aria-label={collapsed ? app.label : undefined}
                      aria-current={current ? 'page' : undefined}
                      title={collapsed ? `${app.label}: ${app.note}` : app.note}
                      className={cn(
                        'flex items-center gap-3 rounded-md text-sm font-medium transition',
                        collapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2',
                        current
                          ? 'text-[var(--color-text-primary)]'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between gap-2">
                          {app.label}
                          {current && (
                            <span className="text-xs text-[var(--color-text-secondary)]">
                              Current
                            </span>
                          )}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Help */}
            <div>
              {!collapsed && (
                <p className="px-3 text-xs font-medium text-[var(--color-text-secondary)] mb-2">
                  Help
                </p>
              )}
              <div className="space-y-1">
                <Link
                  href="/welcome"
                  title={collapsed ? 'How MerchFlow works' : undefined}
                  aria-label={collapsed ? 'How MerchFlow works' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md text-sm font-medium transition text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]',
                    collapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2'
                  )}
                >
                  <BookOpen className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  {!collapsed && 'How MerchFlow works'}
                </Link>
                <button
                  type="button"
                  onClick={openTourMenu}
                  aria-haspopup="dialog"
                  title={collapsed ? 'Replay tour' : undefined}
                  aria-label={collapsed ? 'Replay tour' : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-md text-sm font-medium transition text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]',
                    collapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2'
                  )}
                >
                  <HelpCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  {!collapsed && 'Replay tour'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={cn('pb-5', collapsed ? 'px-2' : 'px-4')}>
          <Link
            href="/upload"
            data-tour="upload"
            title={collapsed ? 'Upload document' : undefined}
            aria-label={collapsed ? 'Upload document' : undefined}
            className={cn(
              'flex items-center justify-center text-sm font-semibold py-3 rounded-md bg-[var(--color-red-primary)] text-white hover:bg-[var(--color-red-hover)] active:bg-[var(--color-red-active)] transition',
              collapsed ? 'px-3' : 'px-4'
            )}
          >
            {collapsed ? <Upload className="w-4 h-4" aria-hidden="true" /> : 'Upload document'}
          </Link>
        </div>
      </div>
    </nav>
  );
}
