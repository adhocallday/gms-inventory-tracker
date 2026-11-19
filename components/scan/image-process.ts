// Browser-side page processing: orientation, rotation, scan enhancement and compression
// so photographed pages stay under the 4 MB upload limit. Plain canvas, no dependencies.
// Ported from gms-document-parser/lib/image/process.ts.

export interface PageImage {
  id: string;
  blob: Blob;
  url: string;
  rotation: 0 | 90 | 180 | 270;
  enhance: boolean;
}

export const MAX_UPLOAD_BYTES = 3.8 * 1024 * 1024;
const STORE_MAX_DIM = 2600;

let counter = 0;
const newId = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`;

async function loadBitmap(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('This image format cannot be read in this browser. Save it as JPG or PNG and try again.');
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image.'))), 'image/jpeg', quality),
  );
}

function draw(source: CanvasImageSource, width: number, height: number, maxDim: number, rotation: number) {
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const sideways = rotation === 90 || rotation === 270;
  const canvas = document.createElement('canvas');
  canvas.width = sideways ? h : w;
  canvas.height = sideways ? w : h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(source, -w / 2, -h / 2, w, h);
  return canvas;
}

/** Grayscale plus a 1st-99th percentile contrast stretch: flattens shadows on photographed paper. */
function enhanceCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = g;
    hist[g]++;
  }
  const pixels = d.length / 4;
  let lo = 0;
  let hi = 255;
  for (let acc = 0; lo < 255 && (acc += hist[lo]) < pixels * 0.01; lo++);
  for (let acc = 0; hi > 0 && (acc += hist[hi]) < pixels * 0.01; hi--);
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / range));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(image, 0, 0);
}

/** Normalizes an incoming photo or file into a stored page (oriented, capped size). */
export async function createPage(source: Blob, enhance = false): Promise<PageImage> {
  const bitmap = await loadBitmap(source);
  const canvas = draw(bitmap, bitmap.width, bitmap.height, STORE_MAX_DIM, 0);
  bitmap.close();
  const blob = await toBlob(canvas, 0.9);
  return { id: newId(), blob, url: URL.createObjectURL(blob), rotation: 0, enhance };
}

/** Captures the current video frame as a page. */
export async function pageFromVideo(video: HTMLVideoElement, enhance: boolean): Promise<PageImage> {
  const canvas = draw(video, video.videoWidth, video.videoHeight, STORE_MAX_DIM, 0);
  const blob = await toBlob(canvas, 0.9);
  return { id: newId(), blob, url: URL.createObjectURL(blob), rotation: 0, enhance };
}

async function renderPage(page: PageImage, maxDim: number, quality: number): Promise<Blob> {
  const bitmap = await loadBitmap(page.blob);
  const canvas = draw(bitmap, bitmap.width, bitmap.height, maxDim, page.rotation);
  bitmap.close();
  if (page.enhance) enhanceCanvas(canvas);
  return toBlob(canvas, quality);
}

/** Renders every page for upload, stepping quality down until the set fits the limit. */
export async function preparePagesForUpload(pages: PageImage[]): Promise<Blob[]> {
  const steps: [number, number][] = [
    [2000, 0.85],
    [1700, 0.8],
    [1400, 0.75],
    [1200, 0.7],
  ];
  let rendered: Blob[] = [];
  for (const [maxDim, quality] of steps) {
    rendered = await Promise.all(pages.map((p) => renderPage(p, maxDim, quality)));
    if (rendered.reduce((t, b) => t + b.size, 0) <= MAX_UPLOAD_BYTES) return rendered;
  }
  throw new Error('These pages are too large to send together. Remove a page and try again.');
}

export function releasePages(pages: PageImage[]) {
  for (const p of pages) URL.revokeObjectURL(p.url);
}
