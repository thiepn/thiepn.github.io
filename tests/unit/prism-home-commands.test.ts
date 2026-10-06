import { describe, expect, it } from 'vitest';
import {
  moveBlock,
  orderedSectionPlacements,
  resizeBlock,
  setBlockHidden,
  setDensity,
} from '../../src/lib/prism/home-commands';
import { createDefaultHomeDocument, validateHomeDocument } from '../../src/lib/prism/home-document';

describe('Prism Home commands', () => {
  it('moves blocks within a desktop section and deterministically reflows them', () => {
    const doc = createDefaultHomeDocument();
    expect(moveBlock(doc, 'desktop', 'block-now', -1)).toBe(true);

    const order = orderedSectionPlacements(doc, 'desktop', 'section-start');
    expect(order.map((item) => item.blockId)).toEqual(['block-now', 'block-continue']);
    expect(order[0]).toMatchObject({ x: 0, y: 0, w: 4 });
    expect(order[1]).toMatchObject({ x: 4, y: 0, w: 8 });
    expect(validateHomeDocument(doc).valid).toBe(true);
  });

  it('preserves full-width mobile spatial order by reflowing rows', () => {
    const doc = createDefaultHomeDocument();
    expect(moveBlock(doc, 'mobile', 'block-now', -1)).toBe(true);

    const order = orderedSectionPlacements(doc, 'mobile', 'section-start');
    expect(order.map((item) => item.blockId)).toEqual(['block-now', 'block-continue']);
    expect(order[0]).toMatchObject({ x: 0, y: 0, w: 4 });
    expect(order[1]).toMatchObject({ x: 0, y: 1, w: 4 });
    expect(validateHomeDocument(doc).valid).toBe(true);
  });

  it('resizes using registered art-directed spans and reflows neighbors', () => {
    const doc = createDefaultHomeDocument();
    expect(resizeBlock(doc, 'desktop', 'block-continue', 'xl')).toBe(true);

    const continuation = doc.layouts.desktop.placements.find((item) => item.blockId === 'block-continue')!;
    const now = doc.layouts.desktop.placements.find((item) => item.blockId === 'block-now')!;
    expect(continuation).toMatchObject({ size: 'xl', x: 0, y: 0, w: 12, h: 1 });
    expect(now).toMatchObject({ x: 0, y: 1, w: 4, h: 1 });
    expect(validateHomeDocument(doc).valid).toBe(true);
  });

  it('rejects unsupported sizes without mutating the placement', () => {
    const doc = createDefaultHomeDocument();
    const before = structuredClone(doc.layouts.desktop.placements.find((item) => item.blockId === 'block-continue'));
    expect(() => resizeBlock(doc, 'desktop', 'block-continue', 's')).toThrow('Unsupported size s for block type continue');
    expect(doc.layouts.desktop.placements.find((item) => item.blockId === 'block-continue')).toEqual(before);
  });

  it('changes visibility and appearance without affecting layout validity', () => {
    const doc = createDefaultHomeDocument();
    expect(setBlockHidden(doc, 'block-recent', true)).toBe(true);
    expect(setDensity(doc, 'compact')).toBe(true);
    expect(doc.blocks['block-recent']?.hidden).toBe(true);
    expect(doc.appearance.density).toBe('compact');
    expect(validateHomeDocument(doc).valid).toBe(true);
  });

  it('returns false for a move at the section boundary', () => {
    const doc = createDefaultHomeDocument();
    expect(moveBlock(doc, 'desktop', 'block-continue', -1)).toBe(false);
    expect(validateHomeDocument(doc).valid).toBe(true);
  });
});
