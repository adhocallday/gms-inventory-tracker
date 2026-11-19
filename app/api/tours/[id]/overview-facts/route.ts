import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { loadOverviewFacts } from '@/lib/onboarding-context';

/**
 * Headline figures for the guided tour's overview: gross, shows with sales,
 * units, attendance and per head, summed from the same posted records the
 * tour page and reports read (show_summary_view and sales). The tour itself
 * reads them through /api/onboarding/context.
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const facts = await loadOverviewFacts(createServiceClient(), params.id);
    if (!facts) return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    return NextResponse.json({ data: facts });
  } catch (err) {
    console.error('[overview-facts] failed', err);
    return NextResponse.json({ error: 'Failed to load tour figures' }, { status: 500 });
  }
}
