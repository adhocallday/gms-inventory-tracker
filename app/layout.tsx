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
      <body>
        <div className="min-h-screen">
          <NavBar />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
