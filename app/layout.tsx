import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Inconsolata, Inter } from 'next/font/google';
import { NavBar } from '@/components/layout/NavBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { NavigationProgress } from '@/components/layout/NavigationProgress';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import './globals.css';

// Self-hosted by next/font (no render-blocking Google Fonts request, and a
// metric-matched fallback so text does not shift when the font loads). Both
// are variable fonts: one file each covers every weight the app uses.
// globals.css maps --font-sans / --font-mono onto these variables.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const inconsolata = Inconsolata({ subsets: ['latin'], display: 'swap', variable: '--font-inconsolata' });

export const metadata: Metadata = {
  title: 'MerchFlow Tracker',
  description:
    'MerchFlow Tracker: tour inventory, documents and sales for Global Merchandising Services.',
  manifest: '/site.webmanifest',
  applicationName: 'MerchFlow Tracker',
  appleWebApp: { title: 'Tracker' },
};

// viewport-fit=cover so env(safe-area-inset-bottom) is set for the phone bottom bar.
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

// Light is the default. Dark is opt-in through the toggle, stored as
// localStorage mf.theme=dark (a new key, so a 'dark' saved by the old dark-first
// app is ignored). Runs before hydration to prevent a flash.
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('mf.theme') === 'dark' ? 'dark' : 'light';
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
    <html lang="en" className={`${inter.variable} ${inconsolata.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
        {/* useSearchParams needs a Suspense boundary so static pages still prerender. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <ThemeProvider>
          <SidebarProvider>
            <div className="min-h-screen flex bg-[var(--color-bg-base)]">
              <NavBar />
              {/* Under 768px the bottom bar (MobileNav) replaces the sidebar; pad so it never covers content. */}
              <main className="flex-1 flex flex-col min-w-0 pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
                {/* Top Bar with Theme Toggle */}
                <div className="flex justify-end items-center px-4 md:px-6 lg:px-8 py-2 border-b border-[var(--color-bg-border)]">
                  <ThemeToggle />
                </div>
                {/*
                  The window scrolls, not this wrapper: a scroll container here
                  would stop every sticky header below it from sticking.
                  overflow-x: clip keeps wide content from widening the page
                  without creating a scroll container.
                */}
                <div className="flex-1 min-w-0 overflow-x-clip">
                  <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8">{children}</div>
                </div>
              </main>
            </div>
            <MobileNav />
            <GuidedTour />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
