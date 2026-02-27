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
      <div className="p-2 w-8 h-8 rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-elevated)]" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-border)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)]"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-[var(--color-text-secondary)]" />
      ) : (
        <Moon className="w-4 h-4 text-[var(--color-text-secondary)]" />
      )}
    </button>
  );
}
