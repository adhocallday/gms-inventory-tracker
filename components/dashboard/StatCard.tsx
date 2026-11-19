import { LucideIcon, TrendingUp, TrendingDown, Music, Sparkles, Mic, Package, DollarSign, ShoppingCart, Users, Calendar, FileText, AlertTriangle, CheckCircle, Clock, Truck, Gift, BarChart3, TrendingUp as TrendingUpIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
export { STAT_GRID } from './stat-grid';

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
  value: ReactNode;
  /** Optional line under the value (12px). */
  sub?: ReactNode;
  /** `warn` colours the sub-line, for a count that needs attention. */
  subTone?: 'default' | 'warn';
  /** Colour of the value: `warn` or `danger` for a count that needs attention. */
  valueTone?: 'default' | 'warn' | 'danger';
  /** Makes the whole tile a link. */
  href?: string;
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

const valueTones = { default: '', warn: 'text-warn', danger: 'text-danger' };

/**
 * The one stat tile: compact (px-3 py-2.5, 12.5px label, text-lg/xl value),
 * used in a STAT_GRID row on every page. Works in server and client
 * components (no hooks).
 */
export function StatCard({
  label,
  value,
  sub,
  subTone = 'default',
  valueTone = 'default',
  href,
  icon: IconProp,
  iconName,
  trend,
  color = 'default',
  className,
}: StatCardProps) {
  const colors = colorVariants[color];
  // Resolve icon: prefer iconName (server-safe) over direct icon prop
  const Icon = iconName ? iconMap[iconName] : IconProp;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12.5px] font-medium leading-4 text-[var(--color-text-secondary)]">{label}</div>
        {Icon && <Icon className={cn('w-3.5 h-3.5 shrink-0', colors.iconColor)} aria-hidden="true" />}
      </div>
      <div
        className={cn(
          'mt-1 text-lg md:text-xl font-semibold leading-tight tabular-nums',
          colors.valueColor,
          valueTones[valueTone]
        )}
      >
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            'mt-0.5 text-[12px] leading-4',
            subTone === 'warn' ? 'font-medium text-warn' : 'text-[var(--color-text-secondary)]'
          )}
        >
          {sub}
        </div>
      )}

      {trend && (
        <div className="mt-0.5 flex items-center gap-1 text-[12px]">
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
    </>
  );

  const tileClass = cn(
    'relative min-w-0 overflow-hidden rounded-lg border px-3 py-2.5',
    colors.bg,
    colors.borderColor,
    href && 'block transition-colors hover:border-[var(--color-text-muted)]',
    className
  );

  return href ? (
    <Link href={href} className={tileClass}>
      {body}
    </Link>
  ) : (
    <div className={tileClass}>{body}</div>
  );
}
