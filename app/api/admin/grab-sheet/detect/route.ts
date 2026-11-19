import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { AIParseError } from '@/lib/ai/claude-client';
import { SpendGuard } from '@/lib/ai/parsers/grab-sheet-parser';
import { loadCatalog, primaryHashLoader } from '@/lib/grab-sheet/catalog';
import { dataUrlToBuffer } from '@/lib/grab-sheet/image';
import { runGrabSheetPage } from '@/lib/grab-sheet/pipeline';

export const maxDuration = 300;

/** One page costs about $0.03–0.05; refuse anything that would run away. */
const PAGE_CAP_USD = 1;
const MAX_PAGE_BYTES = 3 * 1024 * 1024;

/**
 * POST /api/admin/grab-sheet/detect
 * Body: { image: data URL (jpeg/png/webp), sourceFile, sourcePage, label }
 * → one GrabSheetPageResult plus per-call usage. Reads the catalog, writes nothing.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const image = typeof body?.image === 'string' ? body.image : '';
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(image)) {
    return NextResponse.json({ error: 'Send the page as a JPEG, PNG or WebP data URL' }, { status: 400 });
  }
  const bytes = dataUrlToBuffer(image);
  if (!bytes || bytes.byteLength > MAX_PAGE_BYTES) {
    return NextResponse.json({ error: 'Page image is missing or larger than 3 MB' }, { status: 400 });
  }
  const sourcePage = Number(body?.sourcePage);
  if (!Number.isInteger(sourcePage) || sourcePage < 1) {
    return NextResponse.json({ error: 'Bad sourcePage' }, { status: 400 });
  }
  const sourceFile = String(body?.sourceFile ?? 'grab sheet').slice(0, 200);
  const label = String(body?.label ?? `Page ${sourcePage}`).slice(0, 100);

  try {
    const supabase = createServiceClient();
    const catalog = await loadCatalog(supabase);
    const guard = new SpendGuard(PAGE_CAP_USD);
    const page = await runGrabSheetPage(
      { bytes, sourceFile, sourcePage, label },
      { catalog, primaryHash: primaryHashLoader(supabase), guard }
    );
    return NextResponse.json({ page, usage: guard.calls });
  } catch (error) {
    if (error instanceof AIParseError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 502 });
    }
    console.error('[grab-sheet/detect]', error);
    return NextResponse.json({ error: 'Could not read this page' }, { status: 500 });
  }
}
