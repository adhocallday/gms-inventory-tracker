import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * GET /api/tours/[id]/reports
 * Fetch all reports for a tour
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = params.id;
    const supabase = createServiceClient();

    const { data: reports, error } = await supabase
      .from('tour_reports_summary')
      .select('*')
      .eq('tour_id', tourId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET reports] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error: any) {
    console.error('[GET reports] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tours/[id]/reports
 * Generate a new tour report
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = params.id;
    const body = await request.json();
    const {
      reportType,
      title,
      description,
      config,
      startDate,
      endDate
    } = body;

    if (!reportType || !title) {
      return NextResponse.json(
        { error: 'Report type and title are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Create report record (status = completed since report is viewable immediately in UI)
    const { data: report, error: createError } = await supabase
      .from('tour_reports')
      .insert({
        tour_id: tourId,
        report_type: reportType,
        title,
        description: description || null,
        config: config || {},
        report_start_date: startDate || null,
        report_end_date: endDate || null,
        status: 'completed',
        generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('[POST reports] Error creating report:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Report is immediately viewable in UI
    // PDF export can be added later as a separate feature
    console.log(`Report ${report.id} created and ready to view`);

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error('[POST reports] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create report' },
      { status: 500 }
    );
  }
}
