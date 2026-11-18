'use client';

import Link from 'next/link';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle, Info, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  title: string;
  description: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Link text for navigation (alternative to action) */
  linkText?: string;
  /** Link href for navigation (alternative to action) */
  linkHref?: string;
  className?: string;
}

const typeConfig = {
  info: { box: 'border-info-border bg-info-bg', icon: Info, iconColor: 'text-info' },
  success: { box: 'border-success-border bg-success-bg', icon: CheckCircle, iconColor: 'text-success' },
  warning: { box: 'border-warn-border bg-warn-bg', icon: AlertTriangle, iconColor: 'text-warn' },
  error: { box: 'border-danger-border bg-danger-bg', icon: AlertCircle, iconColor: 'text-danger' },
};

export function InsightCard({
  title,
  description,
  type = 'info',
  icon: CustomIcon,
  action,
  linkText,
  linkHref,
  className,
}: InsightCardProps) {
  const config = typeConfig[type];
  const Icon = CustomIcon || config.icon;

  return (
    <div className={cn('rounded-lg border p-4 space-y-2', config.box, className)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4 flex-shrink-0', config.iconColor)} aria-hidden="true" />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-semibold text-[var(--color-red-text)] underline-offset-2 hover:underline"
        >
          {action.label} <ArrowRight className="inline-block h-4 w-4 align-[-0.125em] ml-1" aria-hidden="true" />
        </button>
      )}
      {linkText && linkHref && (
        <Link
          href={linkHref}
          className="inline-block text-sm font-semibold text-[var(--color-red-text)] underline-offset-2 hover:underline"
        >
          {linkText} <ArrowRight className="inline-block h-4 w-4 align-[-0.125em] ml-1" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
