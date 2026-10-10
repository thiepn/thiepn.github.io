import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDefaultHomeDocument, validateHomeDocument } from '../../src/lib/prism/home-document';
import { PRISM_BLOCK_REGISTRY, PRISM_BREAKPOINTS } from '../../src/lib/prism/block-registry';

const sql = readFileSync('docs/h18-disposable/core-home-document-contract.sql','utf8');
const baseline = () => structuredClone(createDefaultHomeDocument());

// These examples are proven actual-client-validator rejects. They demonstrate
// exact omissions from H19 reference SQL; do not call them executed PG tests.
describe('H20 demonstrated server SQL contract mismatches', () => {
  it('rejects missing dollar delimiter in H19 SQL function source', () => {
    const helper = sql.split('create or replace function hub_h18_private.h19_home_structure_valid(p_doc jsonb)')[1]!.split('revoke all on function hub_h18_private.h19_home_structure_valid')[0]!;
    expect(helper).toMatch(/set search_path = pg_catalog\s+as \$h20\$\s+declare/);
    expect(helper).toMatch(/end \$h20\$;/);
    expect(helper).not.toMatch(/\bas \$\s*declare\b/);
    expect(helper).not.toMatch(/\bend \$;/);
  });
  it('previous bounds-only validator missed a forged supported size span', () => {
    const doc = baseline();
    const placement = doc.layouts.desktop.placements.find(p => p.blockId === 'block-continue')!;
    placement.size = 'm'; // m requires 4 columns; retained 8 columns appears grid-bounded
    expect(placement.w).toBe(8);
    expect(placement.x + placement.w).toBeLessThanOrEqual(12);
    expect(validateHomeDocument(doc).valid).toBe(false);
    expect(validateHomeDocument(doc).errors.some(s => s.includes('Span mismatch'))).toBe(true);
  });
  it('previous bounds-only validator missed intersections inside the same section', () => {
    const doc = baseline();
    const target = doc.layouts.desktop.placements.find(p => p.blockId === 'block-now')!;
    target.x = 7; // overlaps continue at [0,8), but stays inside 12-column grid
    expect(target.x + target.w).toBeLessThanOrEqual(12);
    expect(validateHomeDocument(doc).valid).toBe(false);
    expect(validateHomeDocument(doc).errors.some(s => s.includes('Overlapping desktop placements'))).toBe(true);
  });
  it('rejects unsupported type/size pairs despite a grid-valid w/h', () => {
    const doc = baseline();
    const now = doc.layouts.mobile.placements.find(p => p.blockId === 'block-now')!;
    now.size = 'xl';
    expect(now.w).toBe(4);
    expect(validateHomeDocument(doc).valid).toBe(false);
    expect(validateHomeDocument(doc).errors.some(s => s.includes('Unsupported mobile size'))).toBe(true);
  });
});

describe('H20 locked Prism span matrix and rectangle preflight (source-only)',()=>{
  it('includes each and only registered block/type/size/breakpoint expected pair',()=>{
    const rows = [...sql.matchAll(/\('([a-z]+)','(s|m|l|xl)','(desktop|tablet|mobile)',(\d+),(\d+)\)/g)]
      .map(m=>[m[1]!,m[2]!,m[3]!,Number(m[4]),Number(m[5])].join(':'));
    const expected:string[]=[];
    for(const [type,definition] of Object.entries(PRISM_BLOCK_REGISTRY)) {
      for(const size of definition.supportedSizes) {
        for(const bp of PRISM_BREAKPOINTS) {
          const span = definition.sizeSpans[size]?.[bp];
          expect(span).toBeDefined();
          expected.push([type,size,bp,span!.w,span!.h].join(':'));
        }
      }
    }
    expect(rows.length).toBe(33);
    expect(rows.sort()).toEqual(expected.sort());
    expect(new Set(rows).size).toBe(33);
  });
  it('requires successful type/size/breakpoint lookup and exact selected dimensions',()=>{
    expect(sql).toContain('candidate.block_type = p_doc->\'blocks\'->block_id->>\'type\'');
    expect(sql).toContain('candidate.block_size = entry->>\'size\'');
    expect(sql).toContain('candidate.breakpoint = bp');
    expect(sql).toContain('if not found or expected_width is null or expected_height is null');
    expect(sql).toContain("(entry->>'w')::integer <> expected_width");
    expect(sql).toContain("(entry->>'h')::integer <> expected_height");
  });
  it('checks all four strict inequalities for overlaps within the same section',()=>{
    expect(sql).toContain('foreach prior_rect in array previous_placements loop');
    expect(sql).toContain("prior_rect->>'sectionId' = section_id");
    for(const check of [
      "(prior_rect->>'x')::numeric < (entry->>'x')::numeric + (entry->>'w')::numeric",
      "(entry->>'x')::numeric < (prior_rect->>'x')::numeric + (prior_rect->>'w')::numeric",
      "(prior_rect->>'y')::numeric < (entry->>'y')::numeric + (entry->>'h')::numeric",
      "(entry->>'y')::numeric < (prior_rect->>'y')::numeric + (prior_rect->>'h')::numeric",
    ])expect(sql).toContain(check);
    expect(sql).toContain('previous_placements := array_append(previous_placements,entry)');
  });
  it('retains fail-closed private owner RLS, server CAS, idempotency and nondeploying path',()=>{
    expect(sql).toContain('alter table hub_h18_private.home_documents force row level security');
    expect(sql).toContain('alter table hub_h18_private.home_receipts force row level security');
    expect(sql).toContain('auth.uid()');
    expect(sql).toContain('security invoker');
    expect(sql).not.toMatch(/security definer/i);
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('v_receipt.payload_hash <> v_payload_hash');
    expect(sql).toContain('if not hub_h18_private.h19_home_structure_valid(v_document) then');
  });
});
