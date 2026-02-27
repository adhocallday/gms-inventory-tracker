'use client';

import { cn } from '@/lib/utils';

export type ProductTypeFilter = 'all' | 'apparel' | 'accessories' | 'media' | 'paper-items' | 'other';

interface FilterOption {
  value: ProductTypeFilter;
  label: string;
}

const filterOptions: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'media', label: 'Media' },
  { value: 'paper-items', label: 'Paper Items' },
  { value: 'other', label: 'Other' },
];

interface ProductFiltersProps {
  activeFilter: ProductTypeFilter;
  onFilterChange: (filter: ProductTypeFilter) => void;
  counts?: Record<ProductTypeFilter, number>;
}

export function ProductFilters({
  activeFilter,
  onFilterChange,
  counts,
}: ProductFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filterOptions.map((option) => {
        const isActive = activeFilter === option.value;
        const count = counts?.[option.value];

        return (
          <button
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-all border',
              isActive
                ? 'bg-[var(--color-red-primary)] text-white border-[var(--color-red-primary)]'
                : 'bg-[var(--color-bg-border)] text-[var(--color-text-muted)] border-[var(--color-bg-border)] hover:bg-[var(--color-bg-border)] hover:text-[var(--color-text-primary)]'
            )}
          >
            {option.label}
            {count !== undefined && (
              <span
                className={cn(
                  'ml-2 px-1.5 py-0.5 text-xs rounded',
                  isActive ? 'bg-[var(--color-bg-surface)]/20' : 'bg-[var(--color-bg-border)]'
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
