import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/client';
import { generateBreadcrumbs } from '@/lib/breadcrumbs';
import { PageHeader } from '@/components/layout/PageHeader';
import { ToursTable } from '@/components/admin/ToursTable';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

export default async function AdminToursPage() {
  const supabase = createServiceClient();

  // Fetch all tours
  const { data: tours, error } = await supabase
    .from('tours')
    .select('*, shows(count)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch tours:', error);
  }

  const breadcrumbs = generateBreadcrumbs('/admin/tours');

  return (
    <div className="g-container py-12">
      <PageHeader
        title="Manage Tours"
        subtitle="Edit existing tours, add shows, manage products, and extend tour dates"
        kicker="Admin Panel"
        breadcrumbs={breadcrumbs}
        actions={
          <Link href="/admin/tours/new">
            <Button>+ Create New Tour</Button>
          </Link>
        }
      />

      <div className="mt-8">
        <ToursTable tours={tours || []} />
      </div>
    </div>
  );
}
