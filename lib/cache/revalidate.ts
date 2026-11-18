import { revalidatePath } from 'next/cache';

/** Refresh the cached dashboards after a write that changes tours, shows, sales or inventory. */
export function revalidateDashboards(tourId?: string | null) {
  revalidatePath('/');
  revalidatePath('/admin');
  // 'layout' also refreshes every page under the tour: shows, inventory, reports.
  if (tourId) revalidatePath(`/tours/${tourId}`, 'layout');
  revalidatePath('/products/[id]', 'page');
}
