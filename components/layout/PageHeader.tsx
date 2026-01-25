import { cn } from '@/lib/utils';
import { Breadcrumb } from './Breadcrumb';
import type { Breadcrumb as BreadcrumbType } from '@/lib/breadcrumbs';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbType[];
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  kicker,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} />
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          {kicker && (
            <p className="g-kicker text-[var(--g-text-muted)]">{kicker}</p>
          )}

          <h1 className="text-3xl font-bold g-title lg:text-4xl">
            {title}
          </h1>

          {subtitle && (
            <p className="text-sm text-[var(--g-text-muted)] lg:text-base">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
