import { describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/client', () => ({ createServiceClient: () => { throw new Error('no storage in tests'); } }));

import { readUploadedFile, UploadError } from './read-upload';

const pad = Buffer.alloc(32, 7);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), pad]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pad]);
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), pad]);

function post(form: FormData) {
  return new NextRequest('http://localhost/api/parse/settlement', { method: 'POST', body: form });
}
const file = (buf: Buffer, name: string, type = 'application/octet-stream') => new File([new Uint8Array(buf)], name, { type });

describe('readUploadedFile', () => {
  it('reads repeated pages[] fields as page images in order, with the multi-page hash', async () => {
    const form = new FormData();
    form.append('pages[]', file(JPEG, 'p1.jpg'));
    form.append('pages[]', file(PNG, 'p2.png'));
    form.append('tourId', 't1');
    const upload = await readUploadedFile(post(form), ['tourId', 'showId']);

    expect(upload.document).toEqual({
      kind: 'images',
      pages: [
        { data: JPEG.toString('base64'), mediaType: 'image/jpeg' },
        { data: PNG.toString('base64'), mediaType: 'image/png' },
      ],
    });
    expect(upload.sourceHash).toBe(crypto.createHash('sha256').update(Buffer.concat([JPEG, PNG])).digest('hex'));
    expect(upload.fileName).toBe('2 scanned pages');
    expect(upload.fields).toEqual({ tourId: 't1', showId: null });
  });

  it('accepts the plain `pages` field name too', async () => {
    const form = new FormData();
    form.append('pages', file(JPEG, 'scan.jpg'));
    const upload = await readUploadedFile(post(form));
    expect(upload.document.kind).toBe('images');
    expect(upload.fileName).toBe('scan.jpg');
  });

  it('trusts bytes, not the declared type: a PDF labelled as an image is read as a PDF', async () => {
    const form = new FormData();
    form.append('file', file(PDF, 'doc.pdf', 'image/jpeg'));
    const upload = await readUploadedFile(post(form));
    expect(upload.document).toEqual({ kind: 'pdf', data: PDF.toString('base64') });
  });

  it('rejects non-image pages, too many pages and oversized sets', async () => {
    const bad = new FormData();
    bad.append('pages[]', file(Buffer.concat([Buffer.from('GIF89a'), pad]), 'x.gif', 'image/jpeg'));
    await expect(readUploadedFile(post(bad))).rejects.toMatchObject({ status: 415 });

    const many = new FormData();
    for (let i = 0; i < 11; i++) many.append('pages[]', file(JPEG, `p${i}.jpg`));
    await expect(readUploadedFile(post(many))).rejects.toBeInstanceOf(UploadError);

    const big = new FormData();
    big.append('pages[]', file(Buffer.concat([JPEG, Buffer.alloc(4.5 * 1024 * 1024)]), 'big.jpg'));
    await expect(readUploadedFile(post(big))).rejects.toMatchObject({ status: 413 });
  });

  it('turns an undecodable HEIC page into a clear 415', async () => {
    const form = new FormData();
    form.append('pages[]', file(Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic'), pad]), 'IMG.HEIC'));
    await expect(readUploadedFile(post(form))).rejects.toMatchObject({ status: 415, message: expect.stringMatching(/HEIC/) });
  });

  it('reports a missing file', async () => {
    await expect(readUploadedFile(post(new FormData()))).rejects.toMatchObject({ status: 400 });
  });
});
