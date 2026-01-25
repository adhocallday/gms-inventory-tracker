import { createServiceClient } from '@/lib/supabase/client';
import { ScenarioComparisonView } from '@/components/projections/ScenarioComparisonView';
import { notFound } from 'next/navigation';

interface ComparisonPageProps {
  params: {
    id: string;
  };
}

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const tourId = params.id;
  const supabase = createServiceClient();

  // Fetch tour information
  const { data: tour, error } = await supabase
    .from('tours')
    .select('*')
    .eq('id', tourId)
    .single();

  if (error || !tour) {
    notFound();
  }

  return (
    <main className="g-container py-8">
      <ScenarioComparisonView tourId={tourId} tourName={tour.name} />
    </main>
  );
}

export async function generateMetadata({ params }: ComparisonPageProps) {
  const tourId = params.id;
  const supabase = createServiceClient();

  const { data: tour } = await supabase
    .from('tours')
    .select('name')
    .eq('id', tourId)
    .single();

  return {
    title: tour ? `Compare Scenarios - ${tour.name}` : 'Compare Scenarios',
    description: 'Compare multiple forecast scenarios side-by-side with gap analysis'
  };
}
