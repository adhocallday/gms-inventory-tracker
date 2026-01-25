import type { Metadata } from 'next';
import Link from 'next/link';
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
                  <Link href="/dashboard/parsed-documents" className="g-link">
                    Parsed Documents
                  </Link>
                  <Link href="/upload" className="g-link">
                    Upload document
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
