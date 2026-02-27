'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LineChart, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NavBar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Tours', icon: LineChart, section: 'Tours' },
    { href: '/dashboard/parsed-documents', label: 'Documents', icon: FileText, section: 'Documents' },
    { href: '/admin', label: 'Admin', icon: Settings, section: 'Admin' },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className="w-56 min-h-screen bg-[var(--color-bg-surface)] border-r border-[var(--color-bg-border)] flex flex-col">
      <div className="flex flex-col justify-between flex-1">
        <div className="px-6 py-6 space-y-10">
          <div>
            <Link href="/" className="group block">
              <p className="text-white text-2xl font-semibold tracking-wide">GLOBAL</p>
              <p className="text-[13px] text-[var(--color-text-muted)] mt-1">Merchandising Services</p>
            </Link>
          </div>

          <div className="space-y-8">
            {['Tours', 'Documents', 'Admin'].map((section) => (
              <div key={section}>
                <p className="text-[11px] uppercase tracking-[0.4em] text-[var(--color-text-muted)]">
                  {section}
                </p>
                <div className="mt-3 space-y-2">
                  {navItems
                    .filter((item) => item.section === section)
                    .map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-red-primary)]',
                            active
                              ? 'text-white border-l-3 border-[var(--color-red-primary)] bg-[var(--color-bg-elevated)]'
                              : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-bg-elevated)]'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          <Link
            href="/upload"
            className="block text-center text-sm font-semibold py-3 rounded-md bg-[var(--color-red-primary)] text-white hover:bg-[var(--color-red-hover)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-red-primary)]"
          >
            Upload
          </Link>
        </div>
      </div>
    </nav>
  );
}
