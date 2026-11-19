import { NextResponse } from 'next/server';
import { loadAnalytics } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics
 * Aggregated analytics across all tours (lib/analytics.ts, shared with /admin/analytics).
 */
export async function GET() {
  try {
    return NextResponse.json(await loadAnalytics());
  } catch (error: any) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
