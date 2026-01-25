'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LineChart, FileText, Settings, Upload, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NavBar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const navItems = [
    { href: '/', label: 'Tours', icon: LineChart },
    { href: '/dashboard/parsed-documents', label: 'Documents', icon: FileText },
    { href: '/admin', label: 'Admin', icon: Settings },
  ];

  return (
    <nav className="bg-gradient-to-r from-[#0f172a] via-[#111a38] to-[#0f172a] shadow-lg">
      <div className="g-container">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="group">
              <h1 className="text-lg font-semibold g-title tracking-wide text-white group-hover:text-white/90 transition">
                Global Merch Services
              </h1>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                      active
                        ? 'text-white bg-white/15 shadow-sm'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Upload Button */}
            <Link
              href="/upload"
              className={cn(
                'flex items-center gap-2 ml-2 px-4 py-2 rounded-lg font-medium transition-all',
                isActive('/upload')
                  ? 'bg-[var(--g-accent-2)] text-white shadow-lg'
                  : 'bg-[var(--g-accent)] text-white hover:bg-[var(--g-accent-2)] hover:shadow-lg active:scale-[0.98]'
              )}
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </Link>

            {/* User Menu Placeholder */}
            <button
              className="ml-3 p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              aria-label="User menu"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
