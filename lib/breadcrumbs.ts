export interface Breadcrumb {
  label: string;
  href?: string;
}

/**
 * Generate breadcrumbs from pathname
 * Example: /tours/123/projections → [Home, Tours, Ghost 2025, Projections]
 */
export function generateBreadcrumbs(pathname: string, tourName?: string): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: Breadcrumb[] = [{ label: 'Home', href: '/' }];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const href = '/' + segments.slice(0, i + 1).join('/');

    // Skip UUIDs in breadcrumbs
    if (isUUID(segment)) {
      if (segments[i - 1] === 'tours' && tourName) {
        breadcrumbs.push({ label: tourName, href });
      }
      continue;
    }

    // Format segment label
    const label = formatSegmentLabel(segment);
    breadcrumbs.push({ label, href });
  }

  return breadcrumbs;
}

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function formatSegmentLabel(segment: string): string {
  // Handle special cases
  const specialCases: Record<string, string> = {
    'parsed-documents': 'Parsed Documents',
    'cogs': 'COGS',
    'admin': 'Admin',
  };

  if (specialCases[segment]) {
    return specialCases[segment];
  }

  // Default: capitalize first letter of each word
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
