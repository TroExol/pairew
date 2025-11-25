'use client';

import type { ButtonHTMLAttributes } from 'react';

import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, selected, children, ...props }, ref) => {
    return (
      <button
        type="button"
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors',
          'border border-border hover:border-primary/50',
          selected
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-secondary text-secondary-foreground',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Chip.displayName = 'Chip';

export { Chip };

