import { cn } from '@/lib/utils';
import { Breadcrumb } from './Breadcrumb';
import type { Breadcrumb as BreadcrumbType } from '@/lib/breadcrumbs';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  /** @deprecated Not rendered: the heading carries the page name on its own. */
  kicker?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbType[];
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} />
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] lg:text-[28px] lg:leading-9">
            {title}
          </h1>

          {subtitle && (
            <p className="max-w-[70ch] text-sm text-[var(--color-text-secondary)]">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
