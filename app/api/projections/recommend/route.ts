import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { generateRecommendations } from '@/lib/ai/projection-agent';

export async function POST(request: NextRequest) {
  try {
    const { tourId, scenarioId, expectedAttendance, expectedPerHead, constraints } = await request.json();

    const supabase = createServiceClient();

    // Fetch context
    const [tour, productSummary, showSummary, inventoryBalances, poOpenQuantities] = await Promise.all([
      supabase.from('tours').select('*').eq('id', tourId).single(),
      supabase.from('product_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('show_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('inventory_balances').select('*').eq('tour_id', tourId),
      supabase.from('po_open_qty_view').select('*').eq('tour_id', tourId)
    ]);

    // Generate recommendations
    const recommendations = await generateRecommendations(
      {
        tourId,
        tourName: tour.data?.name || 'Tour',
        productSummary: productSummary.data || [],
        showSummary: showSummary.data || [],
        inventoryBalances: inventoryBalances.data || [],
        poOpenQuantities: poOpenQuantities.data || [],
        expectedAttendance,
        expectedPerHead
      },
      constraints
    );

    // Store recommendations
    const { data } = await supabase
      .from('ai_projection_recommendations')
      .insert(
        recommendations.map(r => ({
          scenario_id: scenarioId,
          tour_id: tourId,
          recommendation_type: r.type,
          target_sku: r.sku,
          target_size: r.size || null,
          target_bucket: r.bucket || null,
          recommended_units: r.recommendedUnits,
          confidence_score: r.confidence,
          reasoning: r.reasoning,
          supporting_data: r.supportingData || null,
          status: 'pending'
        }))
      )
      .select();

    return NextResponse.json({ recommendations: data });
  } catch (error: any) {
    console.error('Recommendation error:', error);
    return NextResponse.json(
      { error: error.message || 'Recommendation generation failed' },
      { status: 500 }
    );
  }
}
