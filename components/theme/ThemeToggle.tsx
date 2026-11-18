'use client';

import { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show placeholder during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="p-2 w-8 h-8 rounded-md border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)]" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className="p-2 rounded-md border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-colors"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
      )}
    </button>
  );
}
