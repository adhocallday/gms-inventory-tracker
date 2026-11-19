import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createServiceClient } from '@/lib/supabase/client';
import { DOCUMENTS_BUCKET } from '@/lib/ai/read-upload';
import { extractXlsxPageImages } from '@/lib/grab-sheet/xlsx-media';

export const maxDuration = 60;

const MAX_INLINE_BYTES = 4 * 1024 * 1024;

/**
 * POST /api/admin/grab-sheet/pages → the page pictures in a grab-sheet workbook,
 * in workbook order, as JPEG data URLs ready for /detect. No AI.
 *
 * Body: multipart `file` (small workbooks) or JSON `{ filePath, fileName }`
 * for a workbook staged through /api/admin/grab-sheet/sign. Optional `sheets`
 * (comma-separated) limits the sheets read.
 */
export async function POST(request: NextRequest) {
  try {
    let bytes: Buffer;
    let fileName: string;
    let sheets: string[] | undefined;

    if ((request.headers.get('content-type') ?? '').includes('application/json')) {
      const body = await request.json();
      if (typeof body?.filePath !== 'string' || !body.filePath.startsWith('grab-sheets/')) {
        return NextResponse.json({ error: 'Missing filePath' }, { status: 400 });
      }
      const { data, error } = await createServiceClient().storage.from(DOCUMENTS_BUCKET).download(body.filePath);
      if (error || !data) return NextResponse.json({ error: 'Uploaded workbook not found' }, { status: 404 });
      bytes = Buffer.from(await data.arrayBuffer());
      fileName = typeof body.fileName === 'string' ? body.fileName : 'grab-sheet.xlsx';
      sheets = typeof body.sheets === 'string' && body.sheets.trim() ? body.sheets.split(',') : undefined;
    } else {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
      if (!/\.xlsx$/i.test(file.name)) return NextResponse.json({ error: 'Upload an .xlsx workbook' }, { status: 400 });
      if (file.size > MAX_INLINE_BYTES) return NextResponse.json({ error: 'Workbook too large to send inline' }, { status: 413 });
      bytes = Buffer.from(await file.arrayBuffer());
      fileName = file.name;
      const s = form.get('sheets')?.toString();
      sheets = s?.trim() ? s.split(',') : undefined;
    }

    const media = await extractXlsxPageImages(bytes, { sheets });
    const pictures = media.filter((m) => /^image\/(png|jpeg|gif|webp)$/.test(m.mime));
    if (!pictures.length) {
      return NextResponse.json({ error: 'No pictures found in this workbook' }, { status: 422 });
    }

    const pages = await Promise.all(
      pictures.map(async (m, i) => {
        const jpeg = await sharp(Buffer.from(m.bytes))
          .flatten({ background: '#ffffff' })
          .resize(2576, 2576, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 88 })
          .toBuffer();
        const meta = await sharp(jpeg).metadata();
        return {
          sourcePage: i + 1,
          label: `${m.sheet} #${m.index}`,
          width: meta.width,
          height: meta.height,
          dataUrl: `data:image/jpeg;base64,${jpeg.toString('base64')}`,
        };
      })
    );
    return NextResponse.json({ fileName, pages });
  } catch (error) {
    console.error('[grab-sheet/pages]', error);
    return NextResponse.json({ error: 'Could not read the workbook', details: (error as Error).message }, { status: 500 });
  }
}
