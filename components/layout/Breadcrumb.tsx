'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Breadcrumb as BreadcrumbType } from '@/lib/breadcrumbs';

interface BreadcrumbProps {
  items: BreadcrumbType[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className={cn(
        'flex items-center gap-2 text-sm text-[var(--g-text-muted)]',
        className
      )}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-[var(--g-accent)] transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-[var(--g-text)] font-medium' : ''}>
                  {item.label}
                </span>
              )}

              {!isLast && (
                <ChevronRight className="h-4 w-4 text-[var(--g-text-muted)] opacity-50" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
