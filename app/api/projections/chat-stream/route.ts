import { NextRequest } from 'next/server';
import { streamChat } from '@/lib/ai/streaming-projection-agent';
import { MAX_MESSAGE_CHARS, validateHistory } from '@/lib/ai/chat-tools';
import { loadChatContext } from '@/lib/projections/load-context';
import { createServiceClient } from '@/lib/supabase/client';

export const maxDuration = 300;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const positive = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);

/**
 * POST /api/projections/chat-stream
 * Stream chat responses using SSE. Body: { tourId, scenarioId?, message,
 * history?, expectedAttendance?, expectedPerHead? }.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const { tourId, scenarioId, message } = body ?? {};

    if (typeof tourId !== 'string' || !tourId || typeof message !== 'string' || !message.trim()) {
      return json({ error: 'tourId and message are required' }, 400);
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return json({ error: 'message is too long' }, 400);
    }
    const history = validateHistory(body.history);
    if (!history.ok) {
      return json({ error: history.error }, 400);
    }

    const loaded = await loadChatContext(createServiceClient(), tourId, {
      scenarioId: typeof scenarioId === 'string' ? scenarioId : null,
      expectedAttendance: positive(body.expectedAttendance),
      expectedPerHead: positive(body.expectedPerHead),
    });
    if (!loaded) {
      return json({ error: 'Tour not found' }, 404);
    }

    const messages = [...history.messages, { role: 'user' as const, content: message }];
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamChat(messages, loaded.context, loaded.currentValues)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        } catch (error: any) {
          console.error('[chat-stream] Error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: 'Chat failed' })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    console.error('[chat-stream] Setup error:', error);
    return json({ error: 'Failed to start chat' }, 500);
  }
}
