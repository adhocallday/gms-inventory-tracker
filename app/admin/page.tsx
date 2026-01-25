import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = createServiceClient();

  // Fetch stats
  const [
    { count: totalTours },
    { count: activeTours },
    { count: totalShows },
    { count: totalProducts },
    { data: recentTours }
  ] = await Promise.all([
    supabase.from('tours').select('*', { count: 'exact', head: true }),
    supabase.from('tours').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('shows').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase
      .from('tours')
      .select('id, name, artist, status, created_at, start_date, end_date')
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  const stats = [
    {
      label: 'Total Tours',
      value: totalTours || 0,
      icon: '🎸',
      color: 'from-purple-500/20 to-pink-500/20',
      textColor: 'text-purple-400'
    },
    {
      label: 'Active Tours',
      value: activeTours || 0,
      icon: '✨',
      color: 'from-green-500/20 to-emerald-500/20',
      textColor: 'text-green-400'
    },
    {
      label: 'Total Shows',
      value: totalShows || 0,
      icon: '🎤',
      color: 'from-blue-500/20 to-cyan-500/20',
      textColor: 'text-blue-400'
    },
    {
      label: 'Total Products',
      value: totalProducts || 0,
      icon: '👕',
      color: 'from-orange-500/20 to-red-500/20',
      textColor: 'text-orange-400'
    }
  ];

  const quickActions = [
    {
      title: 'Create New Tour',
      description: 'Set up a new tour with AI-assisted data entry',
      icon: '➕',
      href: '/admin/tours/new',
      color: 'bg-[var(--g-accent)]',
      hoverColor: 'hover:bg-[var(--g-accent-2)]'
    },
    {
      title: 'Manage Tours',
      description: 'Edit existing tours, add shows, extend dates',
      icon: '📋',
      href: '/admin/tours',
      color: 'bg-white/10',
      hoverColor: 'hover:bg-white/20'
    },
    {
      title: 'Upload Documents',
      description: 'Parse PDFs, CSVs, and sales reports',
      icon: '📄',
      href: '/upload',
      color: 'bg-white/10',
      hoverColor: 'hover:bg-white/20'
    },
    {
      title: 'View Inventory',
      description: 'Check stock levels and warehouse allocation',
      icon: '📦',
      href: '/tours',
      color: 'bg-white/10',
      hoverColor: 'hover:bg-white/20'
    }
  ];

  return (
    <div className="g-container py-12">
      <header className="mb-12">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--g-text-muted)]">
          Admin Portal
        </p>
        <h1 className="text-4xl font-bold g-title mt-2">Dashboard</h1>
        <p className="text-sm text-[var(--g-text-dim)] mt-3 max-w-3xl">
          Central hub for managing tours, shows, products, and inventory. Use AI-powered tools to streamline data entry and tour management.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`relative overflow-hidden rounded-xl border border-white/10 p-6 bg-gradient-to-br ${stat.color}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{stat.icon}</div>
              <div className={`text-3xl font-bold ${stat.textColor}`}>
                {stat.value}
              </div>
            </div>
            <div className="text-sm font-medium text-[var(--g-text)]">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-[var(--g-text)] mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className={`group p-6 rounded-xl border border-white/10 ${action.color} ${action.hoverColor} transition-all duration-200 hover:scale-105`}
            >
              <div className="text-3xl mb-3">{action.icon}</div>
              <h3 className="text-sm font-semibold text-[var(--g-text)] mb-2">
                {action.title}
              </h3>
              <p className="text-xs text-[var(--g-text-muted)] leading-relaxed">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Tours */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[var(--g-text)]">
            Recent Tours
          </h2>
          <Link
            href="/admin/tours"
            className="text-sm text-[var(--g-accent)] hover:underline font-medium"
          >
            View all →
          </Link>
        </div>

        {recentTours && recentTours.length > 0 ? (
          <div className="g-card divide-y divide-white/10">
            {recentTours.map((tour: any) => (
              <Link
                key={tour.id}
                href={`/admin/tours/${tour.id}/edit`}
                className="flex items-center justify-between p-6 hover:bg-white/5 transition group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-[var(--g-text)] group-hover:text-[var(--g-accent)] transition">
                      {tour.name}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      tour.status === 'active'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {tour.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--g-text-muted)]">
                    <span>🎸 {tour.artist}</span>
                    {tour.start_date && tour.end_date && (
                      <span>
                        📅 {new Date(tour.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' - '}
                        {new Date(tour.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[var(--g-text-muted)] group-hover:text-[var(--g-text)] transition">
                  →
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="g-card p-12 text-center">
            <p className="text-[var(--g-text-dim)] mb-4">
              No tours yet. Create your first tour to get started.
            </p>
            <Link
              href="/admin/tours/new"
              className="inline-flex px-6 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition font-semibold"
            >
              + Create New Tour
            </Link>
          </div>
        )}
      </section>

      {/* Admin Tools (Placeholder for future expansion) */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-[var(--g-text)] mb-6">
          Admin Tools
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-xl border border-white/10 bg-white/5 opacity-50">
            <div className="text-3xl mb-3">⚙️</div>
            <h3 className="text-sm font-semibold text-[var(--g-text)] mb-2">
              User Management
            </h3>
            <p className="text-xs text-[var(--g-text-muted)]">
              Coming soon
            </p>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-white/5 opacity-50">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-sm font-semibold text-[var(--g-text)] mb-2">
              Reports & Analytics
            </h3>
            <p className="text-xs text-[var(--g-text-muted)]">
              Coming soon
            </p>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-white/5 opacity-50">
            <div className="text-3xl mb-3">🔧</div>
            <h3 className="text-sm font-semibold text-[var(--g-text)] mb-2">
              System Settings
            </h3>
            <p className="text-xs text-[var(--g-text-muted)]">
              Coming soon
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
