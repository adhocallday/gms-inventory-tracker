import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/dashboard/StatCard';

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

  const breadcrumbs = generateBreadcrumbs([
    { label: 'Admin' },
    { label: 'Dashboard' },
  ]);

  const stats = [
    {
      label: 'Total Tours',
      value: totalTours || 0,
      iconName: 'music' as const,
      color: 'purple' as const
    },
    {
      label: 'Active Tours',
      value: activeTours || 0,
      iconName: 'sparkles' as const,
      color: 'green' as const
    },
    {
      label: 'Total Shows',
      value: totalShows || 0,
      iconName: 'mic' as const,
      color: 'blue' as const
    },
    {
      label: 'Total Products',
      value: totalProducts || 0,
      iconName: 'package' as const,
      color: 'orange' as const
    }
  ];

  const quickActions = [
    {
      title: 'Create New Tour',
      description: 'Set up a new tour with AI-assisted data entry',
      icon: '➕',
      href: '/admin/tours/new',
      color: 'bg-[var(--g-accent)]',
      hoverColor: 'hover:bg-[var(--g-accent-2)]',
      textColor: 'text-white',
      descColor: 'text-white/80'
    },
    {
      title: 'Manage Tours',
      description: 'Edit existing tours, add shows, extend dates',
      icon: '📋',
      href: '/admin/tours',
      color: 'bg-slate-100',
      hoverColor: 'hover:bg-slate-200',
      textColor: 'text-[var(--g-text)]',
      descColor: 'text-[var(--g-text-muted)]'
    },
    {
      title: 'Upload Documents',
      description: 'Parse PDFs, CSVs, and sales reports',
      icon: '📄',
      href: '/upload',
      color: 'bg-slate-100',
      hoverColor: 'hover:bg-slate-200',
      textColor: 'text-[var(--g-text)]',
      descColor: 'text-[var(--g-text-muted)]'
    },
    {
      title: 'Product Catalog',
      description: 'Manage global products and SKUs',
      icon: '🏷️',
      href: '/admin/products',
      color: 'bg-slate-100',
      hoverColor: 'hover:bg-slate-200',
      textColor: 'text-[var(--g-text)]',
      descColor: 'text-[var(--g-text-muted)]'
    },
    {
      title: 'View Inventory',
      description: 'Check stock levels and warehouse allocation',
      icon: '📦',
      href: '/tours',
      color: 'bg-slate-100',
      hoverColor: 'hover:bg-slate-200',
      textColor: 'text-[var(--g-text)]',
      descColor: 'text-[var(--g-text-muted)]'
    }
  ];

  return (
    <div className="g-container py-12">
      <PageHeader
        title="Dashboard"
        subtitle="Central hub for managing tours, shows, products, and inventory. Use AI-powered tools to streamline data entry and tour management."
        kicker="Admin Portal"
        breadcrumbs={breadcrumbs}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            label={stat.label}
            value={stat.value}
            iconName={stat.iconName}
            color={stat.color}
          />
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
              className={`group p-6 rounded-xl border border-[var(--g-border-default)] ${action.color} ${action.hoverColor} transition-all duration-200 hover:scale-105`}
            >
              <div className="text-3xl mb-3">{action.icon}</div>
              <h3 className={`text-sm font-semibold mb-2 ${action.textColor}`}>
                {action.title}
              </h3>
              <p className={`text-xs leading-relaxed ${action.descColor}`}>
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
          <div className="g-card divide-y divide-slate-200">
            {recentTours.map((tour: any) => (
              <Link
                key={tour.id}
                href={`/admin/tours/${tour.id}/edit`}
                className="flex items-center justify-between p-6 hover:bg-slate-50 transition group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-[var(--g-text)] group-hover:text-[var(--g-accent)] transition">
                      {tour.name}
                    </h3>
                    <Badge variant={tour.status}>{tour.status}</Badge>
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
            <Link href="/admin/tours/new">
              <Button>+ Create New Tour</Button>
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
          <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 opacity-50">
            <div className="text-3xl mb-3">⚙️</div>
            <h3 className="text-sm font-semibold text-[var(--g-text)] mb-2">
              User Management
            </h3>
            <p className="text-xs text-[var(--g-text-muted)]">
              Coming soon
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 opacity-50">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-sm font-semibold text-[var(--g-text)] mb-2">
              Reports & Analytics
            </h3>
            <p className="text-xs text-[var(--g-text-muted)]">
              Coming soon
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 opacity-50">
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
