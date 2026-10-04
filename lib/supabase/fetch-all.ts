/**
 * Supabase (PostgREST) caps each response at 1000 rows, so a plain select on a
 * large table silently truncates. Page through with .range() until a short page.
 * The query must have a deterministic order for pages to be stable.
 */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}
