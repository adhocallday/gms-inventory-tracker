import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { loadTourContext } from '@/lib/onboarding-context';

export const dynamic = 'force-dynamic';

/**
 * The guided tour's one context call: the tour, show and document its dynamic
 * pages open, and the overview's live figures. Fetched in the background when
 * a tour starts; the first chapter needs none of it.
 */
export async function GET() {
  try {
    return NextResponse.json({ data: await loadTourContext(createServiceClient()) });
  } catch (err) {
    console.error('[onboarding/context] failed', err);
    return NextResponse.json({ error: 'Failed to load the tour context' }, { status: 500 });
  }
}
