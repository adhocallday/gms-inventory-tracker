import type { Metadata } from 'next';
import { NavBar } from '@/components/layout/NavBar';
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
    <html lang="en">
      <body className="bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
        <div className="min-h-screen flex bg-[var(--color-bg-base)]">
          <NavBar />
          <main className="flex-1">
            <div className="g-container">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
