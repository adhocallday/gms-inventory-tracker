import { revalidatePath } from 'next/cache';

/** Refresh the cached dashboards after a write that changes tours, shows, sales or inventory. */
export function revalidateDashboards(tourId?: string | null) {
  revalidatePath('/');
  revalidatePath('/admin');
  if (tourId) revalidatePath(`/tours/${tourId}`);
}
