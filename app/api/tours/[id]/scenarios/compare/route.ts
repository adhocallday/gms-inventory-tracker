import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * POST /api/tours/[id]/scenarios/compare
 * Fetch multiple scenarios in parallel for comparison view
 * Body: { scenarioIds: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = params.id;
    const { scenarioIds } = await request.json();

    if (!scenarioIds || !Array.isArray(scenarioIds) || scenarioIds.length < 2) {
      return NextResponse.json(
        { error: 'Please select at least 2 scenarios to compare' },
        { status: 400 }
      );
    }

    if (scenarioIds.length > 4) {
      return NextResponse.json(
        { error: 'Maximum 4 scenarios can be compared at once' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch all scenarios in parallel
    const scenarioPromises = scenarioIds.map(async (scenarioId: string) => {
      const [scenario, overrides] = await Promise.all([
        supabase
          .from('forecast_scenarios')
          .select('*')
          .eq('id', scenarioId)
          .single(),
        supabase
          .from('forecast_overrides')
          .select('*')
          .eq('scenario_id', scenarioId)
      ]);

      if (scenario.error) {
        console.error(`Error fetching scenario ${scenarioId}:`, scenario.error);
        return null;
      }

      return {
        scenario: scenario.data,
        overrides: overrides.data || []
      };
    });

    // Fetch shared data once (inventory, POs, products, historical)
    const [scenarioData, inventory, poOpen, products, productSummary] = await Promise.all([
      Promise.all(scenarioPromises),
      supabase
        .from('inventory_balances')
        .select('*')
        .eq('tour_id', tourId),
      supabase
        .from('po_open_qty_view')
        .select('*')
        .eq('tour_id', tourId),
      supabase
        .from('products')
        .select('*'),
      supabase
        .from('product_summary_view')
        .select('*')
        .eq('tour_id', tourId)
    ]);

    // Filter out null scenarios (failed fetches)
    const validScenarios = scenarioData.filter(s => s !== null);

    if (validScenarios.length !== scenarioIds.length) {
      return NextResponse.json(
        { error: 'Some scenarios could not be loaded' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      scenarios: validScenarios,
      inventory: inventory.data || [],
      poOpen: poOpen.data || [],
      products: products.data || [],
      productSummary: productSummary.data || []
    });
  } catch (error: any) {
    console.error('Scenario comparison error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scenario data' },
      { status: 500 }
    );
  }
}
