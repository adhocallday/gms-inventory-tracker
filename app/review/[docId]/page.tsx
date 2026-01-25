import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default async function ReviewDocumentPage({
  params
}: {
  params: { docId: string };
}) {
  const { data: doc } = await supabase
    .from('parsed_documents')
    .select('id')
    .eq('id', params.docId)
    .maybeSingle();

  if (!doc) {
    redirect('/');
  }

  redirect(`/upload?docId=${doc.id}`);
}
