import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDefaultHomeDocument, validateHomeDocument } from '../../src/lib/prism/home-document';

// Regression evidence: the original H18 SQL accepted any object that had six
// top-level keys, regardless of the types, references or deeper shape. These
// are SOURCE-LEVEL guards; they cannot replace real disposable Postgres tests.
const sql = readFileSync('docs/h18-disposable/core-home-document-contract.sql','utf8');
const originalH18Guard = (input:Record<string,unknown>):boolean=>
  input.schemaVersion === 2 &&
  ['pages','sections','blocks','layouts','appearance','preferences']
    .every(key=>Object.hasOwn(input,key));
const baseline = () => structuredClone(createDefaultHomeDocument());
describe('H19 demonstrated H18 server-validation bypass', () => {
  it('shows old minimum admits null pages while actual HomeDocumentV2 does not', () => {
    const doc = {...baseline(),pages:null};
    expect(originalH18Guard(doc)).toBe(true);
    expect(validateHomeDocument(doc).valid).toBe(false);
  });
  it('shows old minimum admits null blocks, invalid appearance and missing mobile placements', () => {
    for (const bad of [
      {...baseline(),blocks:null},
      {...baseline(),appearance:{theme:'prism',mode:'evil'}},
      {...baseline(),layouts:{desktop:baseline().layouts.desktop}},
      {...baseline(),preferences:{customizeMobileSeparately:'true'}},
    ]) {
      expect(originalH18Guard(bad)).toBe(true);
      expect(validateHomeDocument(bad).valid).toBe(false);
    }
  });
  it('shows old minimum admits forged references and duplicate memberships', () => {
    const bad=baseline();
    bad.sections['section-start']!.blockIds.push('block-does-not-exist');
    expect(originalH18Guard(bad)).toBe(true);
    expect(validateHomeDocument(bad).valid).toBe(false);
  });
});
describe('H19 SQL contract hardening, static source preflight ONLY', () => {
  it('server helper is declared immutable, INVOKER and in private schema',()=>{
    expect(sql).toMatch(/create or replace function hub_h18_private\.h19_home_structure_valid\(p_doc jsonb\)/);
    expect(sql).toMatch(/returns boolean language plpgsql immutable security invoker/i);
    expect(sql).toContain('set search_path = pg_catalog');
    expect(sql).not.toMatch(/security definer/i);
  });
  it('both direct table inserts and CAS RPC reject if the helper returns false',()=>{
    expect(sql).toMatch(/constraint home_doc_v2_minimum check \(\s*hub_h18_private\.h19_home_structure_valid\(raw::jsonb\)/);
    expect(sql).toContain('if not hub_h18_private.h19_home_structure_valid(v_document) then');
    expect(sql).not.toMatch(/raw::jsonb\s*\?&\s*array\['pages'/);
  });
  it('requires typed and nonempty pages, objects and boolean preferences',()=>{
    expect(sql).toContain("jsonb_typeof(p_doc->'pages') is distinct from 'array'");
    expect(sql).toContain("jsonb_array_length(p_doc->'pages') < 1");
    expect(sql).toContain("jsonb_typeof(p_doc->'blocks') is distinct from 'object'");
    expect(sql).toContain("jsonb_typeof(p_doc->'sections') is distinct from 'object'");
    expect(sql).toContain("jsonb_typeof(p_doc #> '{preferences,customizeMobileSeparately}') is distinct from 'boolean'");
    expect(sql).toContain("p_doc->'schemaVersion' is distinct from '2'::jsonb");
  });
  it('rejects nonregistered block types, invalid appOrder and duplicate block memberships',()=>{
    expect(sql).toContain("not in ('continue','now','apps','study','recent')");
    expect(sql).toContain("jsonb_array_length(v #> '{settings,appOrder}') > 128");
    expect(sql).toContain('count(distinct x.value)');
    expect(sql).toContain('array_append(seen_blocks');
    expect(sql).toContain('or (item #>> \'{}\') = any(seen_blocks)');
  });
  it('checks all breakpoints, section and placement refs and integer bounded coordinates',()=>{
    expect(sql).toContain("array['desktop','tablet','mobile']");
    expect(sql).toContain("jsonb_typeof(layout_obj->'placements') is distinct from 'array'");
    expect(sql).toContain("or not (p_doc->'blocks' ? block_id)");
    expect(sql).toContain("or block_id = any(seen_places)");
    expect(sql).toContain("jsonb_typeof(entry->'x') is distinct from 'number'");
    expect(sql).toContain("(entry->>'x')::numeric % 1 <> 0");
    expect(sql).toContain("then 12 when 'tablet' then 8 else 4 end");
  });
  it('does not reject a schema-valid empty page solely because arrays are empty',()=>{
    const empty=baseline();
    empty.blocks={};
    empty.sections={};
    empty.pages=[{id:'home',sectionIds:[]}];
    for(const bp of ['desktop','tablet','mobile'] as const)
      empty.layouts[bp]={sectionOrder:[],placements:[]};
    expect(validateHomeDocument(empty).valid).toBe(true);
    expect(sql).toContain('coalesce(array_length(seen_blocks,1),0)');
    expect(sql).toContain('coalesce(array_length(seen_places,1),0)');
  });
  it('unexpected JSON/cast errors fail closed rather than permitting writes',()=>{
    expect(sql).toMatch(/exception when others then\s*-- Unexpected JSON shape \/ numeric cast must deny, never allow\.\s*return false;/);
  });
  it('retains RLS and original private-schema/owner CAS protections',()=>{
    expect(sql).toContain('home_documents force row level security');
    expect(sql).toContain('home_receipts force row level security');
    expect(sql).toContain('auth.uid()');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('v_receipt.payload_hash <> v_payload_hash');
    expect(sql).toContain('security invoker');
  });
});
