import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const spinnerVariants = cva('animate-spin rounded-full border-2 border-current border-t-transparent', {
  variants: {
    size: {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    },
    variant: {
      primary: 'text-[var(--g-accent)]',
      white: 'text-white',
      muted: 'text-[var(--g-text-muted)]',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'primary',
  },
});

interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

export function Spinner({ size, variant, label, className, ...props }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-2" {...props}>
      <div className={cn(spinnerVariants({ size, variant }), className)} />
      {label && (
        <p className="text-sm text-[var(--g-text-muted)]">{label}</p>
      )}
    </div>
  );
}
