import { redirect } from 'next/navigation';

export default function UploadPackingListRedirect({
  searchParams
}: {
  searchParams: { tourId?: string; showId?: string };
}) {
  const query = new URLSearchParams();
  query.set('docType', 'packing-list');
  if (searchParams.tourId) query.set('tourId', searchParams.tourId);
  if (searchParams.showId) query.set('showId', searchParams.showId);
  redirect(`/upload?${query.toString()}`);
}
