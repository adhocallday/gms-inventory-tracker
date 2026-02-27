import { NextRequest } from 'next/server';
import { streamAnalysis, streamComprehensiveProjections } from '@/lib/ai/streaming-projection-agent';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * POST /api/projections/analyze-stream
 * Stream AI analysis with Server-Sent Events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tourId, expectedAttendance, expectedPerHead, mode = 'analysis' } = body;

    if (!tourId) {
      return new Response(
        JSON.stringify({ error: 'tourId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch tour data
    const supabase = createServiceClient();

    const [tourRes, productSummaryRes, showSummaryRes, inventoryRes, poRes, warehouseRes] = await Promise.all([
      supabase.from('tours').select('id, name, artist').eq('id', tourId).single(),
      supabase.from('product_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('show_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('inventory_balances').select('*').eq('tour_id', tourId),
      supabase.from('po_open_qty_view').select('*').eq('tour_id', tourId),
      supabase.from('warehouse_locations').select('*').eq('tour_id', tourId).order('display_order')
    ]);

    if (tourRes.error || !tourRes.data) {
      return new Response(
        JSON.stringify({ error: 'Tour not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const context = {
      tourId,
      tourName: tourRes.data.name,
      productSummary: productSummaryRes.data || [],
      showSummary: showSummaryRes.data || [],
      inventoryBalances: inventoryRes.data || [],
      poOpenQuantities: poRes.data || [],
      expectedAttendance: expectedAttendance || 10000,
      expectedPerHead: expectedPerHead || 15,
      warehouseLocations: warehouseRes.data || []
    };

    // Create SSE stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = mode === 'projections'
            ? streamComprehensiveProjections(context)
            : streamAnalysis(context);

          for await (const event of generator) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          controller.close();
        } catch (error: any) {
          console.error('[analyze-stream] Error:', error);
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            content: error.message || 'Stream failed'
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
      }
    });
  } catch (error: any) {
    console.error('[analyze-stream] Setup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to start stream' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
