import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { chatWithAgent } from '@/lib/ai/projection-agent';
import { AIParseError } from '@/lib/ai/claude-client';
import { MAX_MESSAGE_CHARS, validateHistory } from '@/lib/ai/chat-tools';
import { loadChatContext } from '@/lib/projections/load-context';

export const maxDuration = 300;

/**
 * POST /api/projections/chat (non-streaming)
 * Body: { tourId, scenarioId, message, expectedAttendance?, expectedPerHead? }.
 * History is kept server-side in ai_chat_context.
 * Returns { response, overrides }.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const { tourId, scenarioId, message } = body ?? {};
    if (typeof tourId !== 'string' || !tourId || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'tourId and message are required' }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json({ error: 'message is too long' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const positive = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);

    const loaded = await loadChatContext(supabase, tourId, {
      scenarioId: typeof scenarioId === 'string' ? scenarioId : null,
      expectedAttendance: positive(body.expectedAttendance),
      expectedPerHead: positive(body.expectedPerHead),
    });
    if (!loaded) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    // Load stored conversation (validated: stored rows are user-influenced too)
    let contextQuery = supabase.from('ai_chat_context').select('*').eq('tour_id', tourId);
    contextQuery = loaded.scenarioId ? contextQuery.eq('scenario_id', loaded.scenarioId) : contextQuery.is('scenario_id', null);
    const { data: chatContext } = await contextQuery.maybeSingle();
    const stored = validateHistory(chatContext?.conversation_history ?? []);
    const history = stored.ok ? stored.messages : [];

    const messages = [...history, { role: 'user' as const, content: message }];
    const reply = await chatWithAgent(messages, loaded.context, loaded.currentValues);
    const response = reply.text || (reply.overrides.length ? 'Here are the suggested changes.' : '');

    await supabase.from('ai_chat_context').upsert({
      id: chatContext?.id,
      tour_id: tourId,
      scenario_id: loaded.scenarioId,
      conversation_history: [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'assistant', content: response },
      ],
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ response, overrides: reply.overrides });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error instanceof AIParseError ? error.message : 'Chat failed' },
      { status: 500 }
    );
  }
}
