import { ScanPortal } from '@/components/scan/ScanPortal';

/** Mobile document scanner. Deep links: /scan?docType=packing-list&tourId=… */
export default function ScanPage({
  searchParams,
}: {
  searchParams: { docType?: string; tourId?: string; showId?: string };
}) {
  return <ScanPortal searchParams={searchParams} />;
}

export const dynamic = 'force-dynamic';
