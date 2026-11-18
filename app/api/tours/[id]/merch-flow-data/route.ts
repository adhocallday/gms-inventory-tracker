import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { loadTourData } from '@/lib/reporting/merch-flow/from-db';
import { LINK_SECRET_HEADER, isValidLinkSecret } from '@/lib/http/link-secret';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/tours/[id]/merch-flow-data
 *
 * The tour's TrackerData (the shape MerchFlow Charts' wizard takes, read by
 * Charts' lib/report/from-tracker-link.ts), built from the database by
 * lib/reporting/merch-flow/from-db.ts. Server-to-server only:
 * requires the `x-merchflow-link` header to equal MERCHFLOW_LINK_SECRET.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isValidLinkSecret(request.headers.get(LINK_SECRET_HEADER))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tourId = params.id;
  if (!UUID.test(tourId)) {
    return NextResponse.json({ error: 'Invalid tour id' }, { status: 400 });
  }

  try {
    const data = await loadTourData(createServiceClient(), tourId);
    if (!data) return NextResponse.json({ error: 'Tour not found' }, { status: 404 });

    return NextResponse.json(
      {
        tour: { id: data.tour.id, name: data.tour.name, artist: data.tour.artist },
        tracker: data.tracker,
        gaps: data.gaps,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[merch-flow-data] failed', error);
    return NextResponse.json({ error: 'Could not load the tour' }, { status: 500 });
  }
}
