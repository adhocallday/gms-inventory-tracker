import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { chatWithAgent } from '@/lib/ai/projection-agent';

export async function POST(request: NextRequest) {
  try {
    const { tourId, scenarioId, message } = await request.json();

    const supabase = createServiceClient();

    // Load or create conversation
    let { data: chatContext } = await supabase
      .from('ai_chat_context')
      .select('*')
      .eq('tour_id', tourId)
      .eq('scenario_id', scenarioId)
      .maybeSingle();

    const conversationHistory = chatContext?.conversation_history || [];
    conversationHistory.push({ role: 'user', content: message });

    // Fetch projection context
    const [tour, productSummary, showSummary, inventoryBalances, poOpenQuantities] = await Promise.all([
      supabase.from('tours').select('*').eq('id', tourId).single(),
      supabase.from('product_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('show_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('inventory_balances').select('*').eq('tour_id', tourId),
      supabase.from('po_open_qty_view').select('*').eq('tour_id', tourId)
    ]);

    // Get expected values from scenario
    const { data: scenario } = await supabase
      .from('forecast_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .single();

    // Call AI chat
    const response = await chatWithAgent(conversationHistory, {
      tourId,
      tourName: tour.data?.name || 'Tour',
      productSummary: productSummary.data || [],
      showSummary: showSummary.data || [],
      inventoryBalances: inventoryBalances.data || [],
      poOpenQuantities: poOpenQuantities.data || [],
      expectedAttendance: 0, // Could extract from scenario context
      expectedPerHead: 0
    });

    conversationHistory.push({ role: 'assistant', content: response });

    // Update chat context
    await supabase.from('ai_chat_context').upsert({
      id: chatContext?.id,
      tour_id: tourId,
      scenario_id: scenarioId,
      conversation_history: conversationHistory,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Chat failed' },
      { status: 500 }
    );
  }
}
