-- H18 DESIGN-ONLY DISPOSABLE SQL. NOT A MIGRATION. NOT EXECUTED.
-- Operator authorization and an independently isolated disposable Supabase project
-- are prerequisites. Never run this against THIEPN Core or Account production.
-- The hub_h18_private schema MUST remain outside the Data API exposed schemas.
-- Only two public SECURITY INVOKER functions are RPC-exposed.
create schema if not exists hub_h18_private;
revoke all on schema hub_h18_private from public, anon;
grant usage on schema hub_h18_private to authenticated;

-- H19: the H18 top-level ?& guard accepted e.g. pages:null and blocks:null.
-- Validate nested types and object references independently ON THE SERVER;
-- this is not a deployed approval nor a replacement for exact JS parity.
create or replace function hub_h18_private.h19_home_structure_valid(p_doc jsonb)
returns boolean language plpgsql immutable security invoker
set search_path = pg_catalog
as $
declare
  k text;
  v jsonb;
  item jsonb;
  section_item jsonb;
  bp text;
  layout_obj jsonb;
  entry jsonb;
  block_id text;
  section_id text;
  seen_blocks text[] := array[]::text[];
  seen_places text[];
  seen_sections text[];
  col_limit integer;
begin
  if jsonb_typeof(p_doc) is distinct from 'object'
    or p_doc->'schemaVersion' is distinct from '2'::jsonb
    or jsonb_typeof(p_doc->'pages') is distinct from 'array'
    or jsonb_typeof(p_doc->'sections') is distinct from 'object'
    or jsonb_typeof(p_doc->'blocks') is distinct from 'object'
    or jsonb_typeof(p_doc->'layouts') is distinct from 'object'
    or jsonb_typeof(p_doc->'appearance') is distinct from 'object'
    or jsonb_typeof(p_doc->'preferences') is distinct from 'object'
  then return false; end if;

  if jsonb_array_length(p_doc->'pages') < 1
    or jsonb_typeof(p_doc #> '{preferences,customizeMobileSeparately}') is distinct from 'boolean'
    or coalesce(p_doc #>> '{appearance,theme}', '') <> 'prism'
    or coalesce(p_doc #>> '{appearance,mode}', '') not in ('system','light','dark')
    or coalesce(p_doc #>> '{appearance,density}', '') not in ('compact','balanced','comfortable')
    or coalesce(p_doc #>> '{appearance,intensity}', '') not in ('quiet','balanced','rich')
    or coalesce(p_doc #>> '{appearance,motion}', '') not in ('reduced','balanced','expressive')
    or coalesce(p_doc #>> '{appearance,surface}', '') <> 'default'
    or coalesce(p_doc #>> '{appearance,cornerStyle}', '') <> 'default'
    or coalesce(p_doc #>> '{appearance,iconStyle}', '') not in ('rich','mono')
  then return false; end if;

  for k,v in select key,value from jsonb_each(p_doc->'blocks') loop
    if jsonb_typeof(v) is distinct from 'object'
      or coalesce(v->>'id','') <> k
      or coalesce(v->>'type','') not in ('continue','now','apps','study','recent')
      or jsonb_typeof(v->'settings') is distinct from 'object'
      or (v ? 'hidden' and jsonb_typeof(v->'hidden') is distinct from 'boolean')
    then return false; end if;
    if v->>'type' = 'apps' and v->'settings' ? 'appOrder' then
      if jsonb_typeof(v #> '{settings,appOrder}') is distinct from 'array'
        or jsonb_array_length(v #> '{settings,appOrder}') > 128
        or exists (select 1 from jsonb_array_elements(v #> '{settings,appOrder}') x
          where jsonb_typeof(x.value) <> 'string')
        or (select count(*) from jsonb_array_elements(v #> '{settings,appOrder}'))
          <> (select count(distinct x.value) from jsonb_array_elements(v #> '{settings,appOrder}') x)
      then return false; end if;
    end if;
  end loop;

  for k,v in select key,value from jsonb_each(p_doc->'sections') loop
    if jsonb_typeof(v) is distinct from 'object'
      or coalesce(v->>'id','') <> k
      or jsonb_typeof(v->'blockIds') is distinct from 'array'
    then return false; end if;
    for item in select value from jsonb_array_elements(v->'blockIds') loop
      if jsonb_typeof(item) <> 'string' or not (p_doc->'blocks' ? (item #>> '{}'))
        or (item #>> '{}') = any(seen_blocks)
      then return false; end if;
      seen_blocks := array_append(seen_blocks,item #>> '{}');
    end loop;
  end loop;
  if array_length(seen_blocks,1) is distinct from
     (select count(*)::integer from jsonb_each(p_doc->'blocks'))
  then return false; end if;

  for v in select value from jsonb_array_elements(p_doc->'pages') loop
    if jsonb_typeof(v) is distinct from 'object'
      or jsonb_typeof(v->'id') is distinct from 'string'
      or jsonb_typeof(v->'sectionIds') is distinct from 'array'
    then return false; end if;
    seen_sections := array[]::text[];
    for item in select value from jsonb_array_elements(v->'sectionIds') loop
      if jsonb_typeof(item) <> 'string' or not (p_doc->'sections' ? (item #>> '{}'))
        or (item #>> '{}') = any(seen_sections)
      then return false; end if;
      seen_sections := array_append(seen_sections,item #>> '{}');
    end loop;
  end loop;

  for bp in select unnest(array['desktop','tablet','mobile']) loop
    layout_obj := p_doc->'layouts'->bp;
    if jsonb_typeof(layout_obj) is distinct from 'object'
      or jsonb_typeof(layout_obj->'sectionOrder') is distinct from 'array'
      or jsonb_typeof(layout_obj->'placements') is distinct from 'array'
    then return false; end if;
    seen_sections := array[]::text[];
    for item in select value from jsonb_array_elements(layout_obj->'sectionOrder') loop
      if jsonb_typeof(item) <> 'string' or not (p_doc->'sections' ? (item #>> '{}'))
        or (item #>> '{}') = any(seen_sections)
      then return false; end if;
      seen_sections := array_append(seen_sections,item #>> '{}');
    end loop;
    col_limit := case bp when 'desktop' then 12 when 'tablet' then 8 else 4 end;
    seen_places := array[]::text[];
    for entry in select value from jsonb_array_elements(layout_obj->'placements') loop
      if jsonb_typeof(entry) is distinct from 'object'
        or jsonb_typeof(entry->'blockId') is distinct from 'string'
        or jsonb_typeof(entry->'sectionId') is distinct from 'string'
        or jsonb_typeof(entry->'size') is distinct from 'string'
        or coalesce(entry->>'size','') not in ('s','m','l','xl')
      then return false; end if;
      block_id := entry->>'blockId';
      section_id := entry->>'sectionId';
      section_item := p_doc->'sections'->section_id;
      if not (p_doc->'blocks' ? block_id) or not (p_doc->'sections' ? section_id)
        or block_id = any(seen_places)
        or not exists (select 1 from jsonb_array_elements_text(section_item->'blockIds') t
          where t.value = block_id)
      then return false; end if;
      seen_places := array_append(seen_places,block_id);
      if jsonb_typeof(entry->'x') is distinct from 'number'
        or jsonb_typeof(entry->'y') is distinct from 'number'
        or jsonb_typeof(entry->'w') is distinct from 'number'
        or jsonb_typeof(entry->'h') is distinct from 'number'
        or (entry->>'x')::numeric % 1 <> 0 or (entry->>'y')::numeric % 1 <> 0
        or (entry->>'w')::numeric % 1 <> 0 or (entry->>'h')::numeric % 1 <> 0
        or (entry->>'x')::numeric < 0 or (entry->>'y')::numeric < 0
        or (entry->>'w')::numeric < 1 or (entry->>'h')::numeric < 1
        or (entry->>'x')::numeric + (entry->>'w')::numeric > col_limit
      then return false; end if;
    end loop;
    if array_length(seen_places,1) is distinct from
       (select count(*)::integer from jsonb_each(p_doc->'blocks'))
    then return false; end if;
  end loop;
  return true;
exception when others then
  -- Unexpected JSON shape / numeric cast must deny, never allow.
  return false;
end $;
revoke all on function hub_h18_private.h19_home_structure_valid(jsonb) from public, anon;
grant execute on function hub_h18_private.h19_home_structure_valid(jsonb) to authenticated;

create table if not exists hub_h18_private.home_documents (
  owner_id uuid primary key,
  revision text not null check (revision ~ '^[a-f0-9]{64}$'),
  raw text not null check (octet_length(raw) <= 131072),
  updated_at timestamptz not null default now(),
  constraint home_doc_v2_minimum check (
    hub_h18_private.h19_home_structure_valid(raw::jsonb)
  )
);
create table if not exists hub_h18_private.home_receipts (
  owner_id uuid not null,
  request_key text not null check (request_key ~ '^[a-f0-9]{64}$'),
  expected_revision text,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  resulting_revision text not null check (resulting_revision ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  primary key (owner_id, request_key),
  foreign key (owner_id) references hub_h18_private.home_documents(owner_id)
);
alter table hub_h18_private.home_documents enable row level security;
alter table hub_h18_private.home_documents force row level security;
alter table hub_h18_private.home_receipts enable row level security;
alter table hub_h18_private.home_receipts force row level security;
revoke all on hub_h18_private.home_documents, hub_h18_private.home_receipts from public, anon;
grant select, insert, update on hub_h18_private.home_documents to authenticated;
grant select, insert on hub_h18_private.home_receipts to authenticated;

create policy h18_document_read on hub_h18_private.home_documents
  for select to authenticated
  using (owner_id = (select auth.uid())
    and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy h18_document_insert on hub_h18_private.home_documents
  for insert to authenticated
  with check (owner_id = (select auth.uid())
    and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy h18_document_update on hub_h18_private.home_documents
  for update to authenticated
  using (owner_id = (select auth.uid())
    and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false))
  with check (owner_id = (select auth.uid())
    and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy h18_receipt_read on hub_h18_private.home_receipts
  for select to authenticated
  using (owner_id = (select auth.uid())
    and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy h18_receipt_insert on hub_h18_private.home_receipts
  for insert to authenticated
  with check (owner_id = (select auth.uid())
    and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));

create or replace function public.h18_home_read(p_owner uuid)
returns jsonb language plpgsql security invoker
set search_path = pg_catalog, public, hub_h18_private
as $$
declare d hub_h18_private.home_documents%rowtype;
begin
  if auth.uid() is null or auth.uid() <> p_owner
     or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'home owner denied' using errcode = '42501';
  end if;
  select * into d from hub_h18_private.home_documents where owner_id = p_owner;
  if not found then return null; end if;
  return jsonb_build_object('ownerId', d.owner_id::text, 'revision', d.revision, 'raw', d.raw);
end $$;

create or replace function public.h18_home_cas(
  p_owner uuid,
  p_expected_revision text,
  p_idempotency_key text,
  p_raw text
) returns jsonb language plpgsql security invoker
set search_path = pg_catalog, public, hub_h18_private
as $$
declare
  v_current text;
  v_revision text;
  v_payload_hash text;
  v_receipt hub_h18_private.home_receipts%rowtype;
  v_document jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_owner
     or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'home owner denied' using errcode = '42501';
  end if;
  if p_raw is null or octet_length(p_raw) > 131072
     or p_idempotency_key !~ '^[a-f0-9]{64}$'
     or (p_expected_revision is not null and p_expected_revision !~ '^[a-f0-9]{64}$') then
    raise exception 'invalid home payload' using errcode = '22023';
  end if;
  v_document := p_raw::jsonb;
  if not hub_h18_private.h19_home_structure_valid(v_document) then
    raise exception 'invalid HomeDocumentV2' using errcode = '22023';
  end if;
  v_payload_hash := encode(sha256(convert_to(p_raw,'UTF8')),'hex');
  -- Serializes concurrent first-creation and updates for one owner. Not
  -- authorization: auth.uid + RLS remain authoritative independently.
  perform pg_advisory_xact_lock(hashtextextended('h18-home:' || p_owner::text, 0));
  select * into v_receipt from hub_h18_private.home_receipts
   where owner_id = p_owner and request_key = p_idempotency_key;
  if found then
    if v_receipt.payload_hash <> v_payload_hash
       or v_receipt.expected_revision is distinct from p_expected_revision then
      raise exception 'idempotency key reused with different content' using errcode = '22023';
    end if;
    return jsonb_build_object('outcome','applied','ownerId',p_owner::text,
      'revision',v_receipt.resulting_revision,'idempotencyKey',p_idempotency_key);
  end if;
  select revision into v_current from hub_h18_private.home_documents
   where owner_id = p_owner for update;
  if v_current is distinct from p_expected_revision then
    return jsonb_build_object('outcome','conflict','ownerId',p_owner::text,
      'revision',v_current,'idempotencyKey',p_idempotency_key);
  end if;
  v_revision := encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')),'hex');
  if v_current is null then
    insert into hub_h18_private.home_documents(owner_id,revision,raw)
      values(p_owner,v_revision,p_raw);
  else
    update hub_h18_private.home_documents set revision = v_revision,
      raw = p_raw, updated_at = now() where owner_id = p_owner;
  end if;
  insert into hub_h18_private.home_receipts(owner_id,request_key,expected_revision,payload_hash,resulting_revision)
    values(p_owner,p_idempotency_key,p_expected_revision,v_payload_hash,v_revision);
  return jsonb_build_object('outcome','applied','ownerId',p_owner::text,
    'revision',v_revision,'idempotencyKey',p_idempotency_key);
end $$;

revoke all on function public.h18_home_read(uuid) from public, anon;
revoke all on function public.h18_home_cas(uuid,text,text,text) from public, anon;
grant execute on function public.h18_home_read(uuid) to authenticated;
grant execute on function public.h18_home_cas(uuid,text,text,text) to authenticated;

-- Mandatory unperformed owner checks: authenticated A/B RLS, anon JWT denial,
-- arbitrary direct table access denial via unexposed schema, Data API exposure
-- settings, row-lock race, idem replay/mismatch, grants, db advisors, pg version,
-- full server-enforced HomeDocumentV2 schema and disposable encrypted restore.
-- NEVER mark these SQL checks as passed based on a static source audit.
