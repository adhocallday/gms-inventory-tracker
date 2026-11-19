/**
 * Browser-side page preparation for the grab-sheet review screen.
 * PDFs are rendered here with pdf.js (no fragile server canvas); photos are
 * re-encoded to JPEG at most 2576 px on the long edge (the vision limit).
 */

export interface ClientPage {
  sourcePage: number;
  label: string;
  dataUrl: string;
  width: number;
  height: number;
}

const MAX_EDGE = 2576;

/** Vercel rejects request bodies over 4.5 MB; keep each page's data URL well under it. */
const MAX_DATA_URL_CHARS = 3_800_000;

function canvasToJpeg(canvas: HTMLCanvasElement): string {
  for (const quality of [0.88, 0.8, 0.7, 0.6]) {
    const url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= MAX_DATA_URL_CHARS) return url;
  }
  return canvas.toDataURL('image/jpeg', 0.5);
}

function fitCanvas(width: number, height: number): { canvas: HTMLCanvasElement; scale: number } {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  return { canvas, scale };
}

export async function renderPdfPages(file: File, maxPages = 20): Promise<ClientPage[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: ClientPage[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, maxPages); i += 1) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    // Aim for ~2400 px on the long edge so captions stay legible.
    const viewport = page.getViewport({ scale: Math.min(4, 2400 / Math.max(base.width, base.height)) });
    const { canvas } = fitCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvasContext: ctx,
      viewport: page.getViewport({ scale: viewport.scale * (canvas.width / viewport.width) }),
    }).promise;
    pages.push({ sourcePage: i, label: `Page ${i}`, dataUrl: canvasToJpeg(canvas), width: canvas.width, height: canvas.height });
  }
  return pages;
}

export async function photoToPage(file: File, sourcePage: number): Promise<ClientPage> {
  const bitmap = await createImageBitmap(file);
  const { canvas } = fitCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { sourcePage, label: file.name, dataUrl: canvasToJpeg(canvas), width: canvas.width, height: canvas.height };
}
