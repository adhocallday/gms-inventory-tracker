import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { buttonVariants } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';
import { StatCard, STAT_GRID } from '@/components/dashboard/StatCard';
import { ArrowRight, BarChart3, Calendar, ClipboardList, FileText, Folder, Music, Package, Plus, Tag } from 'lucide-react';

// Stats can be up to 30s stale; mutation routes call revalidateDashboards()
export const revalidate = 30;

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
      label: 'Tours',
      value: totalTours || 0,
      iconName: 'music' as const,
      color: 'purple' as const
    },
    {
      label: 'Active tours',
      value: activeTours || 0,
      iconName: 'sparkles' as const,
      color: 'green' as const
    },
    {
      label: 'Shows',
      value: totalShows || 0,
      iconName: 'mic' as const,
      color: 'blue' as const
    },
    {
      label: 'Products',
      value: totalProducts || 0,
      iconName: 'package' as const,
      color: 'orange' as const
    }
  ];

  const quickActions = [
    {
      title: 'Create a tour',
      description: 'Dates, shows, products and opening stock, step by step',
      icon: Plus,
      href: '/admin/tours/new',
      color: 'bg-[var(--color-red-primary)]',
      hoverColor: 'hover:bg-[var(--color-red-hover)]',
      textColor: 'text-white',
      descColor: 'text-white'
    },
    {
      title: 'Tours',
      description: 'Edit tours, add shows, change dates',
      icon: ClipboardList,
      href: '/admin/tours',
      color: 'bg-[var(--color-bg-surface)]',
      hoverColor: 'hover:bg-[var(--color-bg-elevated)]',
      textColor: 'text-[var(--color-text-primary)]',
      descColor: 'text-[var(--color-text-secondary)]'
    },
    {
      title: 'Upload a document',
      description: 'POs, packing lists, sales reports and settlements',
      icon: FileText,
      href: '/upload',
      color: 'bg-[var(--color-bg-surface)]',
      hoverColor: 'hover:bg-[var(--color-bg-elevated)]',
      textColor: 'text-[var(--color-text-primary)]',
      descColor: 'text-[var(--color-text-secondary)]'
    },
    {
      title: 'Products',
      description: 'The product catalogue shared by all tours',
      icon: Tag,
      href: '/admin/products',
      color: 'bg-[var(--color-bg-surface)]',
      hoverColor: 'hover:bg-[var(--color-bg-elevated)]',
      textColor: 'text-[var(--color-text-primary)]',
      descColor: 'text-[var(--color-text-secondary)]'
    },
    {
      title: 'Inventory',
      description: 'Stock on hand across all tours',
      icon: Package,
      href: '/admin/inventory',
      color: 'bg-[var(--color-bg-surface)]',
      hoverColor: 'hover:bg-[var(--color-bg-elevated)]',
      textColor: 'text-[var(--color-text-primary)]',
      descColor: 'text-[var(--color-text-secondary)]'
    }
  ];

  return (
    <div className="g-container py-6">
      <PageHeader
        title="Admin"
        subtitle="Set up tours and products, and check documents, inventory and analytics across all tours."
      />

      {/* Stats Grid */}
      <div data-tour="admin-stats" className={`${STAT_GRID} mt-5 mb-6`}>
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
      <section className="mb-12" data-tour="admin-actions">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          Tasks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className={`group p-5 rounded-lg border border-[var(--color-bg-border)] ${action.color} ${action.hoverColor} transition-colors`}
            >
              <action.icon className={`block h-5 w-5 mb-3 ${action.textColor}`} aria-hidden="true" />
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Recently created tours
          </h2>
          <Link
            href="/admin/tours"
            className="text-sm text-[var(--color-red-text)] hover:underline font-medium"
          >
            View all <ArrowRight className="inline-block h-4 w-4 align-[-0.125em] ml-1" aria-hidden="true" />
          </Link>
        </div>

        {recentTours && recentTours.length > 0 ? (
          <div className="g-card divide-y divide-[var(--color-bg-border)]">
            {recentTours.map((tour: any) => (
              <Link
                key={tour.id}
                href={`/admin/tours/${tour.id}/edit`}
                className="flex items-center justify-between p-4 hover:bg-[var(--color-bg-elevated)] transition-colors group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {tour.name}
                    </h3>
                    <Badge variant={tour.status}>{tour.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                    <span><Music className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" /> {tour.artist}</span>
                    {tour.start_date && tour.end_date && (
                      <span>
                        <Calendar className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" /> {formatDate(tour.start_date, { month: 'short', day: 'numeric' })}
                        {' – '}
                        {formatDate(tour.end_date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="g-card p-12 text-center">
            <p className="text-[var(--color-text-secondary)] mb-4">
              No tours yet. A tour holds its shows, products and documents.
            </p>
            <Link href="/admin/tours/new" className={buttonVariants()}>
              Create a tour
            </Link>
          </div>
        )}
      </section>

      {/* Admin Tools */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Across all tours</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/admin/analytics"
            className="group p-5 rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-colors"
          >
            <BarChart3 className="block h-5 w-5 mb-3 text-[var(--color-text-secondary)]" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Analytics</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">Gross, per head and rankings across tours</p>
          </Link>

          <Link
            href="/admin/documents"
            className="group p-5 rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-colors"
          >
            <Folder className="block h-5 w-5 mb-3 text-[var(--color-text-secondary)]" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Documents</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">Every parsed document, by tour, type and status</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
