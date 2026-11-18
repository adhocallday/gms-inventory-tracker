import type { Metadata } from 'next';
import { NavBar } from '@/components/layout/NavBar';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import './globals.css';

export const metadata: Metadata = {
  title: 'MerchFlow Tracker',
  description:
    'MerchFlow Tracker: tour inventory, documents and sales for Global Merchandising Services.',
  manifest: '/site.webmanifest',
  applicationName: 'MerchFlow Tracker',
  appleWebApp: { title: 'Tracker' },
};

// Light is the default. Dark is opt-in through the toggle, stored as
// localStorage theme=dark. Runs before hydration to prevent a flash.
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
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
            <GuidedTour />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
