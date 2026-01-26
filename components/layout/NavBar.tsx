'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LineChart, FileText, Settings, Upload, User, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NavBar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="bg-gradient-to-r from-[#0f172a] via-[#111a38] to-[#0f172a] shadow-lg">
      <div className="g-container">
        <div className="flex justify-between h-16 md:h-20 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="group" onClick={closeMobileMenu}>
              <h1 className="text-lg font-semibold g-title tracking-wide text-white group-hover:text-white/90 transition">
                <span className="hidden md:inline">Global Merch Services</span>
                <span className="md:hidden">GMS</span>
              </h1>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
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

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                    active
                      ? 'text-white bg-white/15'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}

            {/* Upload Button in Mobile Menu */}
            <Link
              href="/upload"
              onClick={closeMobileMenu}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all mt-2',
                isActive('/upload')
                  ? 'bg-[var(--g-accent-2)] text-white'
                  : 'bg-[var(--g-accent)] text-white'
              )}
            >
              <Upload className="w-5 h-5" />
              <span>Upload Document</span>
            </Link>

            {/* User Menu in Mobile */}
            <button
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition mt-2"
              aria-label="User menu"
            >
              <User className="w-5 h-5" />
              <span className="font-medium">Account</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
