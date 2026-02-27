import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border',
  {
    variants: {
      variant: {
        // Tour statuses
        active: 'bg-green-500/10 text-green-600 border-green-500/20',
        completed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        upcoming: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
        cancelled: 'bg-[var(--color-bg-border)] text-[var(--color-text-secondary)] border-[var(--color-bg-border)]',

        // Document statuses
        draft: 'bg-[var(--color-bg-border)] text-[var(--color-text-secondary)] border-[var(--color-bg-border)]',
        approved: 'bg-green-500/10 text-green-600 border-green-500/20',
        posted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
        error: 'bg-red-500/10 text-red-600 border-red-500/20',

        // PO statuses
        open: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
        received: 'bg-green-500/10 text-green-600 border-green-500/20',
        closed: 'bg-[var(--color-bg-border)] text-[var(--color-text-secondary)] border-[var(--color-bg-border)]',

        // Inventory statuses
        'in-stock': 'bg-green-500/10 text-green-600 border-green-500/20',
        'low-stock': 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
        'out-of-stock': 'bg-red-500/10 text-red-600 border-red-500/20',

        // Generic statuses
        success: 'bg-green-500/10 text-green-600 border-green-500/20',
        warning: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
        danger: 'bg-red-500/10 text-red-600 border-red-500/20',
        info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        default: 'bg-[var(--color-bg-border)] text-[var(--color-text-secondary)] border-[var(--color-bg-border)]',
      },
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-0.5',
        lg: 'text-sm px-3 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

export function Badge({
  className,
  variant,
  size,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <span className="inline-flex items-center">{icon}</span>}
      {children}
    </span>
  );
}
