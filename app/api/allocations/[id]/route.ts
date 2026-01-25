import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * DELETE /api/allocations/[id]
 * Delete a warehouse allocation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const allocationId = params.id;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('product_warehouse_allocations')
      .delete()
      .eq('id', allocationId);

    if (error) {
      console.error('[DELETE allocation] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Allocation deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE allocation] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete allocation' },
      { status: 500 }
    );
  }
}
