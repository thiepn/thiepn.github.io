import { describe, expect, it } from 'vitest';
import { PRISM_BLOCK_REGISTRY } from '../../src/lib/prism/block-registry';
import { createDefaultHomeDocument, validateHomeDocument } from '../../src/lib/prism/home-document';

describe('Prism HomeDocument v2', () => {
  it('creates a deterministic valid canonical Home', () => {
    const first = createDefaultHomeDocument();
    const second = createDefaultHomeDocument();
    expect(first).toEqual(second);
    expect(validateHomeDocument(first)).toEqual({ valid: true, errors: [] });
    expect(first.schemaVersion).toBe(2);
    expect(first.pages[0]?.sectionIds).toEqual(['section-start', 'section-apps', 'section-activity']);
  });

  it('locks the canonical 12/8/4 responsive spans', () => {
    const doc = createDefaultHomeDocument();
    const find = (breakpoint: 'desktop' | 'tablet' | 'mobile', blockId: string) =>
      doc.layouts[breakpoint].placements.find((placement) => placement.blockId === blockId);

    expect(find('desktop', 'block-continue')).toMatchObject({ x: 0, w: 8 });
    expect(find('desktop', 'block-now')).toMatchObject({ x: 8, w: 4 });
    expect(find('desktop', 'block-apps')).toMatchObject({ x: 0, w: 12 });
    expect(find('desktop', 'block-study')).toMatchObject({ x: 0, w: 7 });
    expect(find('desktop', 'block-recent')).toMatchObject({ x: 7, w: 5 });

    expect(find('tablet', 'block-continue')).toMatchObject({ x: 0, w: 5 });
    expect(find('tablet', 'block-now')).toMatchObject({ x: 5, w: 3 });
    expect(find('tablet', 'block-apps')).toMatchObject({ x: 0, w: 8 });

    expect(find('mobile', 'block-continue')).toMatchObject({ x: 0, w: 4, y: 0 });
    expect(find('mobile', 'block-now')).toMatchObject({ x: 0, w: 4, y: 1 });
    expect(find('mobile', 'block-apps')).toMatchObject({ x: 0, w: 4 });
    expect(find('mobile', 'block-study')).toMatchObject({ x: 0, w: 4, y: 0 });
    expect(find('mobile', 'block-recent')).toMatchObject({ x: 0, w: 4, y: 1 });
  });

  it('keeps registered defaults compatible with each block supported-size contract', () => {
    for (const definition of Object.values(PRISM_BLOCK_REGISTRY)) {
      expect(definition.supportedSizes).toContain(definition.defaultSize);
    }
  });

  it('rejects an unsupported responsive block size', () => {
    const doc = createDefaultHomeDocument();
    const placement = doc.layouts.desktop.placements.find((item) => item.blockId === 'block-continue')!;
    placement.size = 's';
    const result = validateHomeDocument(doc);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Unsupported desktop size s for block type continue.');
  });

  it('rejects a span that does not match its art-directed size', () => {
    const doc = createDefaultHomeDocument();
    const placement = doc.layouts.desktop.placements.find((item) => item.blockId === 'block-continue')!;
    placement.w = 7;
    const result = validateHomeDocument(doc);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Span mismatch for block-continue at desktop: l expects 8x1.');
  });

  it('rejects layout collisions instead of silently repacking spatial memory', () => {
    const doc = createDefaultHomeDocument();
    const recent = doc.layouts.desktop.placements.find((placement) => placement.blockId === 'block-recent')!;
    recent.x = 0;
    const result = validateHomeDocument(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('Overlapping desktop placements'))).toBe(true);
  });

  it('rejects missing block and section references', () => {
    const doc = createDefaultHomeDocument();
    doc.sections['section-start']!.blockIds.push('block-missing');
    doc.layouts.mobile.placements[0]!.sectionId = 'section-missing';
    const result = validateHomeDocument(doc);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Section section-start references missing block block-missing.');
    expect(result.errors).toContain('mobile layout references missing section section-missing.');
  });

  it('rejects out-of-bounds placements', () => {
    const doc = createDefaultHomeDocument();
    const now = doc.layouts.mobile.placements.find((placement) => placement.blockId === 'block-now')!;
    now.x = 2;
    now.w = 4;
    const result = validateHomeDocument(doc);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Out-of-bounds mobile placement for block-now.');
  });
});


describe('Prism persisted-state validation', () => {
  it('rejects invalid appearance and preference values', () => {
    const doc = createDefaultHomeDocument();
    (doc.appearance as any).density = 'giant';
    (doc.preferences as any).customizeMobileSeparately = 'yes';
    const result = validateHomeDocument(doc);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid Home density.');
    expect(result.errors).toContain('Invalid Home preferences.');
  });

  it('rejects malformed Apps ordering state', () => {
    const doc = createDefaultHomeDocument();
    doc.blocks['block-apps']!.settings.appOrder = ['notes', 'notes'];
    const result = validateHomeDocument(doc);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Apps appOrder must be a unique string array of at most 128 items.');
  });

  it('rejects non-boolean hidden state', () => {
    const doc = createDefaultHomeDocument();
    (doc.blocks['block-recent'] as any).hidden = 'true';
    const result = validateHomeDocument(doc);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Block block-recent hidden must be boolean.');
  });
});
