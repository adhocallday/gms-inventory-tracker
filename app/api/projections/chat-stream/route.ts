import { NextRequest } from 'next/server';
import { streamChat } from '@/lib/ai/streaming-projection-agent';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * POST /api/projections/chat-stream
 * Stream chat responses token by token using SSE
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tourId, scenarioId, message, history = [] } = body;

    if (!tourId || !message) {
      return new Response(
        JSON.stringify({ error: 'tourId and message are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch context data
    const supabase = createServiceClient();

    const [tourRes, productSummaryRes, showSummaryRes, inventoryRes] = await Promise.all([
      supabase.from('tours').select('id, name, artist').eq('id', tourId).single(),
      supabase.from('product_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('show_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('inventory_balances').select('*').eq('tour_id', tourId)
    ]);

    if (tourRes.error || !tourRes.data) {
      return new Response(
        JSON.stringify({ error: 'Tour not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expected values from show data
    const showSummary = showSummaryRes.data || [];
    const totalAttendance = showSummary.reduce((sum: number, s: any) => sum + (s.attendance || 0), 0);
    const totalGross = showSummary.reduce((sum: number, s: any) => sum + (s.total_gross || 0), 0);
    const expectedPerHead = totalAttendance > 0 ? totalGross / totalAttendance : 15;

    const context = {
      tourId,
      tourName: tourRes.data.name,
      productSummary: productSummaryRes.data || [],
      showSummary,
      inventoryBalances: inventoryRes.data || [],
      poOpenQuantities: [],
      expectedAttendance: totalAttendance || 10000,
      expectedPerHead: expectedPerHead || 15
    };

    // Build conversation history
    const conversationHistory = [
      ...history,
      { role: 'user', content: message }
    ];

    // Create SSE stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamChat(conversationHistory, context)) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.close();
        } catch (error: any) {
          console.error('[chat-stream] Error:', error);
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            content: error.message || 'Chat failed'
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
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (error: any) {
    console.error('[chat-stream] Setup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to start chat' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
