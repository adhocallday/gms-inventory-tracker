import JSZip from 'jszip';

/**
 * Pulls the page pictures out of a grab-sheet workbook.
 *
 * A grab sheet in Excel is a set of pasted pictures with no cell data: each
 * picture is a whole page of product tiles. The order the pictures appear in
 * matters (page 1, page 2, ...), and the media file names (image1.png, ...)
 * do not reliably carry it, so the order is rebuilt from the workbook itself:
 *
 *   workbook.xml sheet order → sheet rels → drawing → anchors in document
 *   order → drawing rels → xl/media/*
 *
 * Deterministic, no AI.
 */

export interface XlsxPageImage {
  /** Sheet name as shown in Excel, e.g. "GRAB 2". */
  sheet: string;
  /** 1-based position of the picture within its sheet. */
  index: number;
  /** Zip path of the media file, e.g. "xl/media/image4.png". */
  path: string;
  mime: string;
  bytes: Uint8Array;
  /** Top-left cell of the anchor (0-based), when the drawing gives one. */
  anchor?: { col: number; row: number };
}

const REL_ATTR = /<Relationship\b[^>]*>/g;

function attr(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m?.[1];
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Resolves a relationship target against the folder of the part that owns it. */
export function resolveTarget(ownerPath: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = ownerPath.split('/').slice(0, -1);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

function relsPathFor(partPath: string): string {
  const dir = partPath.split('/').slice(0, -1).join('/');
  const file = partPath.split('/').pop();
  return `${dir}/_rels/${file}.rels`;
}

async function readRels(zip: JSZip, partPath: string): Promise<Map<string, { type: string; target: string }>> {
  const out = new Map<string, { type: string; target: string }>();
  const xml = await zip.file(relsPathFor(partPath))?.async('string');
  if (!xml) return out;
  for (const tag of xml.match(REL_ATTR) ?? []) {
    const id = attr(tag, 'Id');
    const target = attr(tag, 'Target');
    if (!id || !target || attr(tag, 'TargetMode') === 'External') continue;
    out.set(id, { type: attr(tag, 'Type') ?? '', target: resolveTarget(partPath, decodeXml(target)) });
  }
  return out;
}

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  emf: 'image/emf',
  wmf: 'image/wmf',
};

/** Picture-bearing anchors in document order, each with its blip rel id. */
function anchorsInOrder(drawingXml: string): { embed: string; anchor?: { col: number; row: number } }[] {
  const out: { embed: string; anchor?: { col: number; row: number } }[] = [];
  const anchorRe = /<xdr:(twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[\s\S]*?<\/xdr:\1>/g;
  for (const m of drawingXml.matchAll(anchorRe)) {
    const block = m[0];
    // Grouped pictures carry several blips inside one anchor; keep each.
    const embeds = [...block.matchAll(/<a:blip\b[^>]*\br:embed="([^"]+)"/g)].map((e) => e[1]);
    const from = /<xdr:from>\s*<xdr:col>(\d+)<\/xdr:col>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/.exec(block);
    const anchor = from ? { col: Number(from[1]), row: Number(from[2]) } : undefined;
    for (const embed of embeds) out.push({ embed, anchor });
  }
  return out;
}

/**
 * Returns every picture in the workbook, page order preserved.
 * Pass `sheets` to limit to named sheets (case-insensitive); the result still
 * follows workbook order, not the order of the filter list.
 */
export async function extractXlsxPageImages(
  data: ArrayBuffer | Uint8Array | Buffer,
  { sheets }: { sheets?: string[] } = {}
): Promise<XlsxPageImage[]> {
  const zip = await JSZip.loadAsync(data);
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  if (!workbookXml) throw new Error('Not an Excel workbook (xl/workbook.xml is missing)');

  const wanted = sheets?.map((s) => s.trim().toUpperCase());
  const workbookRels = await readRels(zip, 'xl/workbook.xml');
  const out: XlsxPageImage[] = [];

  for (const tag of workbookXml.match(/<sheet\b[^>]*>/g) ?? []) {
    const name = decodeXml(attr(tag, 'name') ?? '');
    const rid = attr(tag, 'r:id');
    if (wanted && !wanted.includes(name.trim().toUpperCase())) continue;
    const sheetPath = rid ? workbookRels.get(rid)?.target : undefined;
    if (!sheetPath) continue;

    const sheetXml = (await zip.file(sheetPath)?.async('string')) ?? '';
    const sheetRels = await readRels(zip, sheetPath);
    // The sheet names its drawing; fall back to any drawing rel.
    const drawingIds = [...sheetXml.matchAll(/<drawing\b[^>]*\br:id="([^"]+)"/g)].map((m) => m[1]);
    const drawingPaths = (drawingIds.length
      ? drawingIds.map((id) => sheetRels.get(id)?.target)
      : [...sheetRels.values()].filter((r) => r.type.endsWith('/drawing')).map((r) => r.target)
    ).filter((p): p is string => !!p);

    let index = 0;
    for (const drawingPath of drawingPaths) {
      const drawingXml = await zip.file(drawingPath)?.async('string');
      if (!drawingXml) continue;
      const drawingRels = await readRels(zip, drawingPath);
      for (const { embed, anchor } of anchorsInOrder(drawingXml)) {
        const mediaPath = drawingRels.get(embed)?.target;
        const file = mediaPath ? zip.file(mediaPath) : null;
        if (!mediaPath || !file) continue;
        const ext = mediaPath.split('.').pop()?.toLowerCase() ?? '';
        index += 1;
        out.push({
          sheet: name,
          index,
          path: mediaPath,
          mime: MIME[ext] ?? 'application/octet-stream',
          bytes: await file.async('uint8array'),
          anchor,
        });
      }
    }
  }
  return out;
}
