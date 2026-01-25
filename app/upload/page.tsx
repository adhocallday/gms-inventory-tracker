import UploadPortal from '@/components/upload/UploadPortal';

export default function UploadPage({
  searchParams
}: {
  searchParams: { docType?: string; tourId?: string; showId?: string; docId?: string };
}) {
  return <UploadPortal searchParams={searchParams} />;
}

export const dynamic = 'force-dynamic';
