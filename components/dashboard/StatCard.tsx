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
    gradient: 'from-purple-500/20 to-pink-500/20',
    iconColor: 'text-purple-400',
  },
  green: {
    gradient: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-green-400',
  },
  blue: {
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-400',
  },
  orange: {
    gradient: 'from-orange-500/20 to-red-500/20',
    iconColor: 'text-orange-400',
  },
  red: {
    gradient: 'from-red-500/20 to-pink-500/20',
    iconColor: 'text-red-400',
  },
  default: {
    gradient: 'from-white/5 to-white/10',
    iconColor: 'text-[var(--g-text)]',
  },
};

export function StatCard({ label, value, icon: IconProp, iconName, trend, color = 'default', className }: StatCardProps) {
  const colors = colorVariants[color];
  // Resolve icon: prefer iconName (server-safe) over direct icon prop
  const Icon = iconName ? iconMap[iconName] : IconProp;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10 p-6 bg-gradient-to-br',
        colors.gradient,
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        {Icon && <Icon className={cn('w-10 h-10', colors.iconColor)} />}
        <div className={cn('text-3xl font-bold', colors.iconColor)}>
          {value}
        </div>
      </div>

      <div className="text-sm font-medium text-[var(--g-text)] mb-1">
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
          <span className="text-[var(--g-text-muted)]">
            {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}
