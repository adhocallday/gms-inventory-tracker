import {
  ParsedDocumentsList,
  type ParsedDocument,
  type Tour,
} from '@/components/documents/ParsedDocumentsList';
import { listParsedDocuments } from '@/lib/data/parsed-documents';
import { listTours } from '@/lib/data/tours';

// Uploads and posts change this list at any time; always read it fresh.
export const dynamic = 'force-dynamic';

// Fetched per page; client-side search and sorting work within it.
const PAGE_SIZE = 50;

export default async function ParsedDocumentsPage() {
  // The first page of documents and the tour filter load in parallel, on the
  // server; filters and paging then fetch from the client.
  const [docs, tours] = await Promise.all([
    listParsedDocuments({ limit: PAGE_SIZE, offset: 0 }).catch((err) => {
      console.error('[Documents page] Load failed:', err);
      return { data: [], count: 0 };
    }),
    listTours().catch(() => []),
  ]);

  return (
    <ParsedDocumentsList
      initialDocuments={docs.data as ParsedDocument[]}
      initialCount={docs.count}
      tours={tours as Tour[]}
      pageSize={PAGE_SIZE}
    />
  );
}
