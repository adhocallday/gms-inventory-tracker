import { describe, expect, it } from 'vitest';
import crypto from 'crypto';
import { asDocumentInput, firstPages, hashPages, sniffMediaType } from './document-input';
import { buildDocumentBlocks } from './claude-client';

const bytes = (...parts: (number[] | string | Uint8Array)[]) =>
  Buffer.concat(parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'latin1') : Buffer.from(p))));
const pad = Buffer.alloc(16);

const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0], pad);
const PNG = bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a], pad);
const WEBP = bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 ', pad);
const HEIC = bytes([0, 0, 0, 0x18], 'ftypheic', pad);
const HEIF_MIF1 = bytes([0, 0, 0, 0x18], 'ftypmif1', pad);
const AVIF = bytes([0, 0, 0, 0x18], 'ftypavif', pad);
const PDF = bytes('%PDF-1.7\n', pad);

describe('sniffMediaType', () => {
  it('reads the type from magic bytes', () => {
    expect(sniffMediaType(JPEG)).toBe('image/jpeg');
    expect(sniffMediaType(PNG)).toBe('image/png');
    expect(sniffMediaType(WEBP)).toBe('image/webp');
    expect(sniffMediaType(HEIC)).toBe('image/heic');
    expect(sniffMediaType(HEIF_MIF1)).toBe('image/heic');
    expect(sniffMediaType(PDF)).toBe('application/pdf');
  });

  it('rejects unknown, short and AVIF input', () => {
    expect(sniffMediaType(bytes('GIF89a', pad))).toBeNull();
    expect(sniffMediaType(bytes([0xff, 0xd8]))).toBeNull();
    expect(sniffMediaType(AVIF)).toBeNull();
  });
});

describe('hashPages', () => {
  it('hashes one file exactly like sha256 of its bytes', () => {
    expect(hashPages([PDF])).toBe(crypto.createHash('sha256').update(PDF).digest('hex'));
  });

  it('hashes the concatenated page bytes, in order', () => {
    const concat = crypto.createHash('sha256').update(Buffer.concat([JPEG, PNG])).digest('hex');
    expect(hashPages([JPEG, PNG])).toBe(concat);
    expect(hashPages([PNG, JPEG])).not.toBe(concat);
  });
});

describe('buildDocumentBlocks', () => {
  it('sends a PDF as one document block', () => {
    expect(buildDocumentBlocks({ kind: 'pdf', data: 'QUJD' })).toEqual([
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'QUJD' } },
    ]);
  });

  it('interleaves "Page N" labels with image blocks in order', () => {
    const blocks = buildDocumentBlocks({
      kind: 'images',
      pages: [
        { data: 'AAA', mediaType: 'image/jpeg' },
        { data: 'BBB', mediaType: 'image/png' },
      ],
    });
    expect(blocks).toEqual([
      { type: 'text', text: 'Page 1' },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAA' } },
      { type: 'text', text: 'Page 2' },
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'BBB' } },
    ]);
  });
});

describe('input helpers', () => {
  it('wraps a base64 string as a PDF and keeps the first pages for classification', () => {
    expect(asDocumentInput('QUJD')).toEqual({ kind: 'pdf', data: 'QUJD' });
    const pages = [1, 2, 3].map((n) => ({ data: String(n), mediaType: 'image/jpeg' as const }));
    expect(firstPages({ kind: 'images', pages }, 2)).toEqual({ kind: 'images', pages: pages.slice(0, 2) });
  });
});
