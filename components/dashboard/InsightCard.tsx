'use client';

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
  className?: string;
}

const typeConfig = {
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: Info,
    iconColor: 'text-blue-400',
    textColor: 'text-blue-400',
  },
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    icon: CheckCircle,
    iconColor: 'text-green-400',
    textColor: 'text-green-400',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    icon: AlertTriangle,
    iconColor: 'text-yellow-400',
    textColor: 'text-yellow-400',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: AlertCircle,
    iconColor: 'text-red-400',
    textColor: 'text-red-400',
  },
};

export function InsightCard({
  title,
  description,
  type = 'info',
  icon: CustomIcon,
  action,
  className,
}: InsightCardProps) {
  const config = typeConfig[type];
  const Icon = CustomIcon || config.icon;

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        config.bg,
        config.border,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.iconColor)} />
        <div className="flex-1 min-w-0">
          <h3 className={cn('text-sm font-semibold mb-1', config.textColor)}>
            {title}
          </h3>
          <p className="text-xs text-[var(--g-text-muted)] leading-relaxed">
            {description}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                'mt-2 text-xs font-semibold underline-offset-2 hover:underline',
                config.textColor
              )}
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
