'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const progressVariants = cva('h-2 w-full overflow-hidden rounded-full bg-[var(--g-bg-muted)]', {
  variants: {
    variant: {
      default: '[&>div]:bg-[var(--g-accent)]',
      success: '[&>div]:bg-green-600',
      warning: '[&>div]:bg-yellow-600',
      danger: '[&>div]:bg-red-600',
      info: '[&>div]:bg-blue-600',
    },
    size: {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  label?: string;
  showValue?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant, size, label, showValue, ...props }, ref) => (
  <div className="w-full space-y-1">
    {(label || showValue) && (
      <div className="flex items-center justify-between text-sm text-[var(--g-text-muted)]">
        {label && <span>{label}</span>}
        {showValue && <span>{value}%</span>}
      </div>
    )}
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(progressVariants({ variant, size }), className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 transition-all duration-300 ease-in-out"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  </div>
));

Progress.displayName = 'Progress';

export { Progress };
