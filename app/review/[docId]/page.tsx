import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const docTypeToRoute: Record<string, string> = {
  po: '/upload/po',
  'packing-list': '/upload/packing-list',
  'sales-report': '/upload/sales-report',
  settlement: '/upload/settlement'
};

export default async function ReviewDocumentPage({
  params
}: {
  params: { docId: string };
}) {
  const { data: doc } = await supabase
    .from('parsed_documents')
    .select('id, doc_type')
    .eq('id', params.docId)
    .maybeSingle();

  if (!doc) {
    redirect('/');
  }

  const target = docTypeToRoute[doc.doc_type] ?? '/';
  redirect(`${target}?docId=${doc.id}`);
}
