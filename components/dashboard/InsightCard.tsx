'use client';

import Link from 'next/link';
import { LucideIcon, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
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
  info: {
    border: 'border-blue-200',
    bg: 'bg-gradient-to-br from-blue-50/80 to-white',
    icon: Info,
    iconColor: 'text-blue-600',
    textColor: 'text-blue-800',
    iconBg: 'bg-[var(--color-bg-surface)] shadow-inner',
  },
  success: {
    border: 'border-emerald-200',
    bg: 'bg-gradient-to-br from-emerald-50/80 to-white',
    icon: CheckCircle,
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-800',
    iconBg: 'bg-[var(--color-bg-surface)] shadow-inner',
  },
  warning: {
    border: 'border-amber-200',
    bg: 'bg-gradient-to-br from-amber-50/80 to-white',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    textColor: 'text-amber-800',
    iconBg: 'bg-[var(--color-bg-surface)] shadow-inner',
  },
  error: {
    border: 'border-red-200',
    bg: 'bg-gradient-to-br from-red-50/80 to-white',
    icon: AlertCircle,
    iconColor: 'text-red-600',
    textColor: 'text-red-800',
    iconBg: 'bg-[var(--color-bg-surface)] shadow-inner',
  },
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
    <div
      className={cn(
        'g-card border-2 p-5 rounded-2xl space-y-3 shadow-sm',
        config.bg,
        config.border,
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-xl', config.iconBg)}>
          <Icon className={cn('w-5 h-5', config.iconColor)} />
        </div>
        <h3 className={cn('text-lg font-semibold tracking-tight', config.textColor)}>
          {title}
        </h3>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-semibold text-[var(--color-red-primary)] underline-offset-2 hover:underline transition"
        >
          {action.label} →
        </button>
      )}
      {linkText && linkHref && (
        <Link
          href={linkHref}
          className="text-sm font-semibold text-[var(--color-red-primary)] underline-offset-2 hover:underline transition"
        >
          {linkText} →
        </Link>
      )}
    </div>
  );
}
