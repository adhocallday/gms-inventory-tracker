import { PDFDocument } from 'pdf-lib';

/**
 * Return a PDF containing only the first `count` pages, base64 encoded.
 * Classification only needs the first pages; sending the whole document
 * costs tokens and time. Falls back to the original on any PDF error
 * (encrypted or malformed files), so classification still runs.
 */
export async function firstPdfPages(base64: string, count = 2): Promise<{ data: string; pages: number; total: number }> {
  try {
    const src = await PDFDocument.load(Buffer.from(base64, 'base64'), { ignoreEncryption: true });
    const total = src.getPageCount();
    if (total <= count) return { data: base64, pages: total, total };
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, Array.from({ length: count }, (_, i) => i));
    copied.forEach(p => out.addPage(p));
    const bytes = await out.save();
    return { data: Buffer.from(bytes).toString('base64'), pages: count, total };
  } catch (e) {
    console.warn('[pdf-pages] Could not trim PDF; sending it whole:', (e as Error).message);
    return { data: base64, pages: -1, total: -1 };
  }
}
