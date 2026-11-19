import { createServiceClient } from '@/lib/supabase/client';

/**
 * One page of parsed documents, newest first, with their tour and show.
 * Shared by /dashboard/parsed-documents (first page, server-rendered) and
 * GET /api/parsed-documents (filters and later pages).
 */

export interface ParsedDocumentFilters {
  docType?: string | null;
  status?: string | null;
  tourId?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}

export async function listParsedDocuments({
  docType,
  status,
  tourId,
  search,
  limit = 20,
  offset = 0,
}: ParsedDocumentFilters = {}): Promise<{ data: any[]; count: number }> {
  let query = createServiceClient()
    .from('parsed_documents')
    .select(
      `
      *,
      tours:tour_id (
        id,
        name,
        artist
      ),
      shows:show_id (
        id,
        show_date,
        venue_name,
        city,
        state
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (docType) query = query.eq('doc_type', docType);
  if (status) query = query.eq('status', status);
  if (tourId) query = query.eq('tour_id', tourId);
  if (search) {
    query = query.or(`source_filename.ilike.%${search}%,source_hash.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}
