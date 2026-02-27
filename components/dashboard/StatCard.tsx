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

const colorVariants = {
  purple: {
    bg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    valueColor: 'text-purple-400',
    borderColor: 'border-purple-500/20',
  },
  green: {
    bg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    valueColor: 'text-green-400',
    borderColor: 'border-green-500/20',
  },
  blue: {
    bg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    valueColor: 'text-blue-400',
    borderColor: 'border-blue-500/20',
  },
  orange: {
    bg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    valueColor: 'text-orange-400',
    borderColor: 'border-orange-500/20',
  },
  red: {
    bg: 'bg-[var(--color-red-muted)]',
    iconColor: 'text-[var(--color-red-primary)]',
    valueColor: 'text-[var(--color-red-primary)]',
    borderColor: 'border-[var(--color-red-primary)]/20',
  },
  default: {
    bg: 'bg-[var(--color-bg-elevated)]',
    iconColor: 'text-[var(--color-text-secondary)]',
    valueColor: 'text-[var(--color-text-primary)]',
    borderColor: 'border-[var(--color-bg-border)]',
  },
};

export function StatCard({ label, value, icon: IconProp, iconName, trend, color = 'default', className }: StatCardProps) {
  const colors = colorVariants[color];
  // Resolve icon: prefer iconName (server-safe) over direct icon prop
  const Icon = iconName ? iconMap[iconName] : IconProp;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-6',
        colors.bg,
        colors.borderColor,
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        {Icon && <Icon className={cn('w-8 h-8', colors.iconColor)} />}
        <div className={cn('text-3xl font-bold', colors.valueColor)}>
          {value}
        </div>
      </div>

      <div className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
        {label}
      </div>

      {trend && (
        <div className="flex items-center gap-1 text-xs">
          {trend.isPositive !== false ? (
            <TrendingUp className="w-3 h-3 text-green-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-400" />
          )}
          <span className={trend.isPositive !== false ? 'text-green-400' : 'text-red-400'}>
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-[var(--color-text-muted)]">
            {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}
