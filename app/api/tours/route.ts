import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('tours')
      .select('id, name, artist, start_date, end_date, status')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching tours:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tours' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
