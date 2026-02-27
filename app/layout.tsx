import type { Metadata } from 'next';
import { NavBar } from '@/components/layout/NavBar';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import './globals.css';

export const metadata: Metadata = {
  title: 'GMS Inventory Tracker',
  description: 'Multi-tour inventory management system for Global Merch Services',
};

// Script to set theme before hydration to prevent flash
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
        <ThemeProvider>
          <SidebarProvider>
            <div className="min-h-screen flex bg-[var(--color-bg-base)]">
              <NavBar />
              <main className="flex-1 flex flex-col min-w-0">
                {/* Top Bar with Theme Toggle */}
                <div className="flex justify-end items-center px-6 py-3 border-b border-[var(--color-bg-border)]">
                  <ThemeToggle />
                </div>
                <div className="flex-1 overflow-auto">
                  <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8">{children}</div>
                </div>
              </main>
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
