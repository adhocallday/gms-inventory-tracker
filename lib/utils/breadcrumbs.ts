export interface Breadcrumb {
  label: string;
  href?: string;
}

/**
 * Generate breadcrumbs array from segments
 * @example
 * generateBreadcrumbs([
 *   { label: 'Tours', href: '/' },
 *   { label: 'Ghost 2025', href: '/tours/123' },
 *   { label: 'Inventory' }
 * ])
 */
export function generateBreadcrumbs(segments: Breadcrumb[]): Breadcrumb[] {
  return segments;
}
