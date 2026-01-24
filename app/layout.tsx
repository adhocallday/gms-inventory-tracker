import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={inter.className}>
        <div className="min-h-screen">
          <nav className="border-b border-white/10 bg-black/40 backdrop-blur">
            <div className="g-container">
              <div className="flex justify-between h-16 items-center">
                <div className="flex items-center">
                  <h1 className="text-lg font-semibold g-title tracking-wide">
                    Global Merch Services
                  </h1>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <Link href="/" className="g-link">
                    Dashboard
                  </Link>
                  <Link href="/upload/po" className="g-link">
                    Uploads
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
