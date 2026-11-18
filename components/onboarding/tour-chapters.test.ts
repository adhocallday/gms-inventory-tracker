import { describe, expect, it } from 'vitest';
import {
  CHAPTERS,
  chapterLabel,
  gapPath,
  isAtPath,
  isValidPosition,
  nextChapter,
  nextPosition,
  pickDocument,
  pickShow,
  previousPosition,
  resolvePath,
} from './tour-chapters';

const ids = { tourId: 't1', showId: 's1', docId: 'd1' };
const none = { tourId: null, showId: null, docId: null };

describe('tour chapters', () => {
  it('has the twelve chapters of the story, each with several steps', () => {
    expect(CHAPTERS).toHaveLength(12);
    for (const chapter of CHAPTERS) expect(chapter.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('labels chapters from 0', () => {
    expect(chapterLabel(3)).toBe('3 of 11 · A show');
  });

  it('gives every step that needs an id a gap explanation or a static page', () => {
    for (const chapter of CHAPTERS) {
      for (const step of chapter.steps) {
        if (resolvePath(step.page, none) === null) expect(step.gap, step.title).toBeTruthy();
      }
    }
  });
});

describe('resolvePath', () => {
  it('builds dynamic paths from the resolved ids', () => {
    expect(resolvePath('show', ids)).toBe('/tours/t1/shows/s1');
    expect(resolvePath('merchFlow', ids)).toBe('/tours/t1/reports/merch-flow');
    expect(resolvePath('review', ids)).toBe('/dashboard/parsed-documents/d1');
  });

  it('returns null when an id is missing', () => {
    expect(resolvePath('tour', none)).toBeNull();
    expect(resolvePath('show', { ...ids, showId: null })).toBeNull();
    expect(resolvePath('review', none)).toBeNull();
    expect(resolvePath('upload', none)).toBe('/upload');
  });

  it('explains review gaps on the documents list and the rest on /', () => {
    expect(gapPath('review')).toBe('/dashboard/parsed-documents');
    expect(gapPath('show')).toBe('/');
  });
});

describe('positions', () => {
  const lastChapter = CHAPTERS.length - 1;
  const lastStep = CHAPTERS[lastChapter].steps.length - 1;

  it('moves through a chapter and into the next', () => {
    expect(nextPosition({ chapter: 0, step: 0 })).toEqual({ chapter: 0, step: 1 });
    expect(nextPosition({ chapter: 0, step: CHAPTERS[0].steps.length - 1 })).toEqual({ chapter: 1, step: 0 });
    expect(nextPosition({ chapter: lastChapter, step: lastStep })).toBeNull();
  });

  it('moves back into the previous chapter at its last step', () => {
    expect(previousPosition({ chapter: 1, step: 0 })).toEqual({ chapter: 0, step: CHAPTERS[0].steps.length - 1 });
    expect(previousPosition({ chapter: 0, step: 0 })).toBeNull();
  });

  it('skips to the next chapter', () => {
    expect(nextChapter({ chapter: 2, step: 3 })).toEqual({ chapter: 3, step: 0 });
    expect(nextChapter({ chapter: lastChapter, step: 0 })).toBeNull();
  });

  it('rejects positions outside the tour', () => {
    expect(isValidPosition({ chapter: 0, step: 0 })).toBe(true);
    expect(isValidPosition({ chapter: CHAPTERS.length, step: 0 })).toBe(false);
    expect(isValidPosition({ chapter: 0, step: 99 })).toBe(false);
    expect(isValidPosition({ chapter: 0.5, step: 0 })).toBe(false);
  });
});

describe('isAtPath', () => {
  it('compares the pathname, and the query only when the target has one', () => {
    expect(isAtPath('/upload', '/upload', '?docId=1')).toBe(true);
    expect(isAtPath('/upload?docId=1', '/upload', '?docId=1')).toBe(true);
    expect(isAtPath('/upload?docId=1', '/upload', '')).toBe(false);
    expect(isAtPath('/tours/1', '/tours/1/inventory', '')).toBe(false);
  });
});

describe('pickers', () => {
  it('prefers a reconciled show, then one with attendance', () => {
    expect(pickShow([{ id: 'a' }, { id: 'b', settlement_status: 'reconciled' }])).toBe('b');
    expect(pickShow([{ id: 'a', attendance: 0 }, { id: 'b', attendance: 900 }])).toBe('b');
    expect(pickShow([{ id: 'a' }])).toBe('a');
    expect(pickShow([])).toBeNull();
  });

  it('prefers a draft matched to a tour', () => {
    expect(
      pickDocument([
        { id: 'posted', status: 'posted', tour_id: 't' },
        { id: 'loose', status: 'draft' },
        { id: 'matched', status: 'draft', tour_id: 't' },
      ]),
    ).toBe('matched');
    expect(pickDocument([{ id: 'posted', status: 'posted' }])).toBe('posted');
    expect(pickDocument([])).toBeNull();
  });
});
