import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * DELETE /api/reports/[id]
 * Delete a tour report
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reportId = params.id;
    const supabase = createServiceClient();

    // Fetch report to check if PDF exists
    const { data: report, error: fetchError } = await supabase
      .from('tour_reports')
      .select('pdf_url')
      .eq('id', reportId)
      .single();

    if (fetchError) {
      console.error('[DELETE report] Fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // If PDF exists in storage, delete it
    if (report?.pdf_url) {
      try {
        // Extract file path from URL
        const url = new URL(report.pdf_url);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts.slice(-1)[0]; // Get last part of path
        const folder = pathParts.slice(-2, -1)[0]; // Get folder name

        await supabase.storage
          .from('tour-reports')
          .remove([`${folder}/${fileName}`]);
      } catch (storageError) {
        console.warn('[DELETE report] Failed to delete PDF from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete report from database (will cascade to report_sections)
    const { error: deleteError } = await supabase
      .from('tour_reports')
      .delete()
      .eq('id', reportId);

    if (deleteError) {
      console.error('[DELETE report] Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Report deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE report] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete report' },
      { status: 500 }
    );
  }
}
