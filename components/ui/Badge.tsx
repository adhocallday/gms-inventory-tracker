import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border whitespace-nowrap',
  {
    variants: {
      variant: {
        // Tour statuses
        active: 'bg-success-bg text-success border-success-border',
        completed: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-bg-border)]',
        upcoming: 'bg-info-bg text-info border-info-border',
        cancelled: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-bg-border)]',

        // Document statuses
        draft: 'bg-warn-bg text-warn border-warn-border',
        approved: 'bg-info-bg text-info border-info-border',
        posted: 'bg-success-bg text-success border-success-border',
        rejected: 'bg-danger-bg text-danger border-danger-border',
        error: 'bg-danger-bg text-danger border-danger-border',

        // PO statuses
        open: 'bg-warn-bg text-warn border-warn-border',
        received: 'bg-success-bg text-success border-success-border',
        closed: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-bg-border)]',

        // Inventory statuses
        'in-stock': 'bg-success-bg text-success border-success-border',
        'low-stock': 'bg-warn-bg text-warn border-warn-border',
        'out-of-stock': 'bg-danger-bg text-danger border-danger-border',

        // Generic statuses
        success: 'bg-success-bg text-success border-success-border',
        warning: 'bg-warn-bg text-warn border-warn-border',
        danger: 'bg-danger-bg text-danger border-danger-border',
        info: 'bg-info-bg text-info border-info-border',
        default: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-bg-border)]',
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
