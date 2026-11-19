import { PageHeader } from '@/components/layout/PageHeader';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { GrabSheetReview } from '@/components/admin/grab-sheet/GrabSheetReview';

export const metadata = { title: 'Import grab sheet' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function GrabSheetPage({ searchParams }: { searchParams: { tourId?: string } }) {
  const tourId = searchParams.tourId && UUID.test(searchParams.tourId) ? searchParams.tourId : undefined;
  return (
    <div className="g-container py-12 space-y-6">
      <PageHeader
        title="Import grab sheet"
        subtitle="Find each product picture on a grab sheet, check its SKU twice, and attach it to the right product after you approve it."
        breadcrumbs={generateBreadcrumbs([
          { label: 'Admin', href: '/admin' },
          { label: 'Products', href: '/admin/products' },
          { label: 'Import grab sheet' },
        ])}
      />
      <GrabSheetReview initialTourId={tourId} />
    </div>
  );
}
