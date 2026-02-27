import type { Metadata } from 'next';
import { NavBar } from '@/components/layout/NavBar';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import './globals.css';

export const metadata: Metadata = {
  title: 'GMS Inventory Tracker',
  description: 'Multi-tour inventory management system for Global Merch Services',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
        <ThemeProvider>
          <div className="min-h-screen flex bg-[var(--color-bg-base)]">
            <NavBar />
            <main className="flex-1 flex flex-col">
              {/* Top Bar with Theme Toggle */}
              <div className="flex justify-end items-center px-6 py-3 border-b border-[var(--color-bg-border)]">
                <ThemeToggle />
              </div>
              <div className="flex-1">
                <div className="g-container">{children}</div>
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
