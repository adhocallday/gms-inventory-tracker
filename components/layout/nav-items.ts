import {
  LineChart,
  FileText,
  Settings,
  LayoutGrid,
  BarChart3,
  Tablet,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { AppId } from '@/lib/apps';

/** Shared by the desktop sidebar (NavBar) and the phone bottom bar and menu (MobileNav). */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** data-tour anchor for the guided tour. */
  tour?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Tours', icon: LineChart, tour: 'nav-tours' },
  { href: '/dashboard/parsed-documents', label: 'Documents', icon: FileText, tour: 'documents' },
  { href: '/admin', label: 'Admin', icon: Settings },
];

export const APP_ICONS: Record<AppId, LucideIcon> = {
  tracker: LayoutGrid,
  charts: BarChart3,
  pos: Tablet,
  flow: Workflow,
};

/** Tour pages (/tours/...) belong under Tours; the review page under Documents. */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/tours') || pathname.startsWith('/products');
  return pathname.startsWith(href) || (href === '/dashboard/parsed-documents' && pathname.startsWith('/review'));
}

export const appTourAnchor = (id: AppId) => (id === 'pos' ? 'pos-link' : id === 'charts' ? 'charts-app' : undefined);
