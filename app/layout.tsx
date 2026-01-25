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
          <nav className="bg-gradient-to-r from-[#0f172a] via-[#111a38] to-[#0f172a] shadow-lg">
            <div className="g-container">
              <div className="flex justify-between h-16 items-center">
                <div className="flex items-center">
                  <h1 className="text-lg font-semibold g-title tracking-wide text-white">
                    Global Merch Services
                  </h1>
                </div>
                <div className="flex items-center space-x-1 text-sm">
                  <Link
                    href="/"
                    className="px-4 py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition"
                  >
                    Tours
                  </Link>
                  <Link
                    href="/dashboard/parsed-documents"
                    className="px-4 py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition"
                  >
                    Documents
                  </Link>
                  <Link
                    href="/upload"
                    className="ml-2 px-4 py-2 rounded-lg bg-[var(--g-accent)] text-white hover:bg-[var(--g-accent-2)] transition font-medium"
                  >
                    Upload
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
