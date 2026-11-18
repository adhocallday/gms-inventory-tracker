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
    redirect('/dashboard/parsed-documents');
  }

  // The review form lives on the document's own page.
  redirect(`/dashboard/parsed-documents/${doc.id}`);
}
