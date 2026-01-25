'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 300,
  className,
  autoFocus = false,
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  // Call onSearch when debounced value changes
  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  const handleClear = useCallback(() => {
    setValue('');
    setDebouncedValue('');
  }, []);

  // Keyboard shortcut: Cmd+K or Ctrl+K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--g-text-muted)]" />
        <input
          id="search-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'w-full pl-10 pr-10 py-2.5 rounded-lg',
            'border border-[var(--g-border)]',
            'bg-[var(--g-surface)]',
            'text-[var(--g-text)]',
            'placeholder:text-[var(--g-text-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--g-accent)] focus:ring-opacity-50',
            'transition-all duration-200'
          )}
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--g-text-muted)] hover:text-[var(--g-text)] transition"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {!value && (
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-[var(--g-text-muted)] bg-[var(--g-surface-2)] rounded border border-[var(--g-border)]">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </div>
    </div>
  );
}

// Compact variant for smaller spaces
export function SearchBarCompact({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 300,
  className,
}: SearchBarProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs, onSearch]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--g-text-muted)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-8 pr-8 py-1.5 text-sm rounded-md',
          'border border-[var(--g-border)]',
          'bg-[var(--g-surface)]',
          'text-[var(--g-text)]',
          'placeholder:text-[var(--g-text-muted)]',
          'focus:outline-none focus:ring-1 focus:ring-[var(--g-accent)]',
          'transition-all'
        )}
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--g-text-muted)] hover:text-[var(--g-text)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
