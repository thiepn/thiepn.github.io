-- H18 DESIGN-ONLY DISPOSABLE SQL. NOT A MIGRATION. NOT EXECUTED.
-- Operator authorization and an independently isolated disposable Supabase project
-- are prerequisites. Never run this against THIEPN Core or Account production.
-- The hub_h18_private schema MUST remain outside the Data API exposed schemas.
-- Only two public SECURITY INVOKER functions are RPC-exposed.
create schema if not exists hub_h18_private;
revoke all on schema hub_h18_private from public, anon;
grant usage on schema hub_h18_private to authenticated;

create table if not exists hub_h18_private.home_documents (
  owner_id uuid primary key,
  revision text not null check (revision ~ '^[a-f0-9]{64}$'),
  raw text not null check (octet_length(raw) <= 131072),
  updated_at timestamptz not null default now(),
  constraint home_doc_v2_minimum check (
    jsonb_typeof(raw::jsonb) = 'object' and
    raw::jsonb->>'schemaVersion' = '2' and
    raw::jsonb ?& array['pages','sections','blocks','layouts','appearance','preferences']
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
  if jsonb_typeof(v_document) <> 'object' or v_document->>'schemaVersion' <> '2'
    or not (v_document ?& array['pages','sections','blocks','layouts','appearance','preferences']) then
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
