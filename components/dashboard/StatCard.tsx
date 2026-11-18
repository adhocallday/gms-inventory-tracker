'use client';

import { LucideIcon, TrendingUp, TrendingDown, Music, Sparkles, Mic, Package, DollarSign, ShoppingCart, Users, Calendar, FileText, AlertTriangle, CheckCircle, Clock, Truck, Gift, BarChart3, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon name mapping for server component compatibility
const iconMap: Record<string, LucideIcon> = {
  music: Music,
  sparkles: Sparkles,
  mic: Mic,
  package: Package,
  'dollar-sign': DollarSign,
  'shopping-cart': ShoppingCart,
  users: Users,
  calendar: Calendar,
  'file-text': FileText,
  'alert-triangle': AlertTriangle,
  'check-circle': CheckCircle,
  clock: Clock,
  truck: Truck,
  gift: Gift,
  'bar-chart': BarChart3,
  'trending-up': TrendingUpIcon,
};

interface StatCardProps {
  label: string;
  value: string | number;
  /** @deprecated Use iconName instead for server component compatibility */
  icon?: LucideIcon;
  /** Icon name string - use this when calling from server components */
  iconName?: keyof typeof iconMap;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  color?: 'purple' | 'green' | 'blue' | 'orange' | 'red' | 'default';
  className?: string;
}

// Counts are not states, so the decorative purple/green/blue/orange fills
// all render as the neutral card. Only `red` (a problem) keeps colour.
const neutral = {
  bg: 'bg-[var(--color-bg-surface)]',
  iconColor: 'text-[var(--color-text-secondary)]',
  valueColor: 'text-[var(--color-text-primary)]',
  borderColor: 'border-[var(--color-bg-border)]',
};
const colorVariants = {
  purple: neutral,
  green: neutral,
  blue: neutral,
  orange: neutral,
  red: {
    bg: 'bg-danger-bg',
    iconColor: 'text-danger',
    valueColor: 'text-danger',
    borderColor: 'border-danger-border',
  },
  default: neutral,
};

export function StatCard({ label, value, icon: IconProp, iconName, trend, color = 'default', className }: StatCardProps) {
  const colors = colorVariants[color];
  // Resolve icon: prefer iconName (server-safe) over direct icon prop
  const Icon = iconName ? iconMap[iconName] : IconProp;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border p-4',
        colors.bg,
        colors.borderColor,
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] font-medium text-[var(--color-text-secondary)]">{label}</div>
        {Icon && <Icon className={cn('w-4 h-4', colors.iconColor)} aria-hidden="true" />}
      </div>
      <div className={cn('mt-1 text-xl sm:text-2xl font-semibold tabular-nums', colors.valueColor)}>{value}</div>

      {trend && (
        <div className="flex items-center gap-1 text-xs">
          {trend.isPositive !== false ? (
            <TrendingUp className="w-3 h-3 text-success" aria-hidden="true" />
          ) : (
            <TrendingDown className="w-3 h-3 text-danger" aria-hidden="true" />
          )}
          <span className={trend.isPositive !== false ? 'text-success' : 'text-danger'}>
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-[var(--color-text-secondary)]">
            {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}
