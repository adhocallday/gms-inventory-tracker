import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { extractXlsxPageImages, resolveTarget } from './xlsx-media';

const GHOST = '/Users/andrew/Desktop/GMS Tour Data/gms-inventory-tracker/ghosttrackers/GHOST SUMMER 2025 SALES CHART.xlsx';

describe('resolveTarget', () => {
  it('resolves relative and absolute rel targets', () => {
    expect(resolveTarget('xl/worksheets/sheet1.xml', '../drawings/drawing1.xml')).toBe('xl/drawings/drawing1.xml');
    expect(resolveTarget('xl/workbook.xml', 'worksheets/sheet2.xml')).toBe('xl/worksheets/sheet2.xml');
    expect(resolveTarget('xl/drawings/drawing1.xml', '/xl/media/image1.png')).toBe('xl/media/image1.png');
  });
});

describe('extractXlsxPageImages', () => {
  it('follows rels order, not media file names', async () => {
    // Sheet order B then A; drawing anchors reference image2 before image1.
    const zip = new JSZip();
    zip.file('xl/workbook.xml', '<workbook><sheets><sheet name="B" sheetId="2" r:id="rId2"/><sheet name="A" sheetId="1" r:id="rId1"/></sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Type="x/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="x/worksheet" Target="worksheets/sheet2.xml"/></Relationships>');
    zip.file('xl/worksheets/sheet1.xml', '<worksheet><drawing r:id="rId1"/></worksheet>');
    zip.file('xl/worksheets/_rels/sheet1.xml.rels', '<Relationships><Relationship Id="rId1" Type="x/drawing" Target="../drawings/drawing1.xml"/></Relationships>');
    zip.file('xl/worksheets/sheet2.xml', '<worksheet><drawing r:id="rId9"/></worksheet>');
    zip.file('xl/worksheets/_rels/sheet2.xml.rels', '<Relationships><Relationship Id="rId9" Type="x/drawing" Target="../drawings/drawing2.xml"/></Relationships>');
    const anchor = (embed: string, col: number) =>
      `<xdr:twoCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:pic><xdr:blipFill><a:blip r:embed="${embed}"/></xdr:blipFill></xdr:pic></xdr:twoCellAnchor>`;
    zip.file('xl/drawings/drawing1.xml', `<xdr:wsDr>${anchor('rId2', 0)}${anchor('rId1', 5)}</xdr:wsDr>`);
    zip.file('xl/drawings/_rels/drawing1.xml.rels', '<Relationships><Relationship Id="rId1" Type="x/image" Target="../media/image1.png"/><Relationship Id="rId2" Type="x/image" Target="../media/image2.png"/></Relationships>');
    zip.file('xl/drawings/drawing2.xml', `<xdr:wsDr>${anchor('rId1', 0)}</xdr:wsDr>`);
    zip.file('xl/drawings/_rels/drawing2.xml.rels', '<Relationships><Relationship Id="rId1" Type="x/image" Target="../media/image3.png"/></Relationships>');
    for (const n of [1, 2, 3]) zip.file(`xl/media/image${n}.png`, `png${n}`);
    const buf = await zip.generateAsync({ type: 'uint8array' });

    const all = await extractXlsxPageImages(buf);
    expect(all.map((p) => `${p.sheet}:${p.index}:${p.path}`)).toEqual([
      'B:1:xl/media/image3.png',
      'A:1:xl/media/image2.png',
      'A:2:xl/media/image1.png',
    ]);
    expect(all[1].anchor).toEqual({ col: 0, row: 0 });
    const onlyA = await extractXlsxPageImages(buf, { sheets: ['a'] });
    expect(onlyA.map((p) => p.path)).toEqual(['xl/media/image2.png', 'xl/media/image1.png']);
  });

  it.skipIf(!existsSync(GHOST))('reads the Ghost sales chart grab sheets in order', async () => {
    const pages = await extractXlsxPageImages(readFileSync(GHOST), { sheets: ['GRAB', 'GRAB 2'] });
    expect(pages.map((p) => `${p.sheet}#${p.index} ${p.path}`)).toEqual([
      'GRAB#1 xl/media/image1.png',
      'GRAB#2 xl/media/image2.png',
      'GRAB#3 xl/media/image3.png',
      'GRAB 2#1 xl/media/image4.png',
      'GRAB 2#2 xl/media/image5.png',
      'GRAB 2#3 xl/media/image6.png',
    ]);
    expect(pages.every((p) => p.mime === 'image/png' && p.bytes.byteLength > 500_000)).toBe(true);
    // Distinct pictures, not one repeated.
    expect(new Set(pages.map((p) => createHash('sha1').update(p.bytes).digest('hex'))).size).toBe(6);
  });
});
