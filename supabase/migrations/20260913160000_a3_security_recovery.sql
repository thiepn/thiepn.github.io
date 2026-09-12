-- A3 — Security & Recovery
-- Additive account-session visibility plus MFA-aware destructive action guards.

create or replace function public.list_thiepn_account_sessions()
returns table (
  session_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  refreshed_at timestamp,
  not_after timestamptz,
  user_agent text,
  aal text,
  is_current boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id as session_id,
    s.created_at,
    s.updated_at,
    s.refreshed_at,
    s.not_after,
    s.user_agent,
    s.aal::text,
    s.id::text = coalesce((select auth.jwt()->>'session_id'), '') as is_current
  from auth.sessions s
  where s.user_id = (select auth.uid())
  order by s.updated_at desc nulls last, s.created_at desc nulls last
  limit 50;
$$;

revoke all on function public.list_thiepn_account_sessions() from public;
revoke all on function public.list_thiepn_account_sessions() from anon;
grant execute on function public.list_thiepn_account_sessions() to authenticated;

comment on function public.list_thiepn_account_sessions() is
  'Returns only the authenticated THIEPN Account user sessions. A3 account security UI uses this for device/session visibility.';

create or replace function public.delete_thiepn_account(p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_storage_count bigint := 0;
  v_had_notes boolean := false;
  v_has_verified_mfa boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('deleted', false, 'reason', 'not_authenticated');
  end if;

  if p_confirmation <> 'DELETE MY ACCOUNT' then
    return jsonb_build_object('deleted', false, 'reason', 'confirmation_mismatch');
  end if;

  select exists (
    select 1
    from auth.mfa_factors f
    where f.user_id = v_uid
      and f.status::text = 'verified'
  ) into v_has_verified_mfa;

  if v_has_verified_mfa and coalesce((select auth.jwt()->>'aal'), 'aal1') <> 'aal2' then
    return jsonb_build_object('deleted', false, 'reason', 'mfa_required');
  end if;

  select count(*) into v_storage_count
  from storage.objects o
  where o.bucket_id = 'notes-attachments'
    and (storage.foldername(o.name))[1] = v_uid::text;

  if v_storage_count > 0 then
    return jsonb_build_object(
      'deleted', false,
      'reason', 'storage_objects_remaining',
      'storage_objects', v_storage_count
    );
  end if;

  select exists (
    select 1
    from notes_private.notes_sync_access a
    where a.user_id = v_uid
      and a.disabled_at is null
  ) into v_had_notes;

  if v_had_notes then
    update notes_private.notes_sync_workspace_state
      set locked = true,
          locked_at = timezone('utc'::text, now()),
          former_user_id = v_uid
    where singleton = true;
  end if;

  delete from auth.users where id = v_uid;
  return jsonb_build_object('deleted', true, 'reason', null);
end;
$$;

revoke all on function public.delete_thiepn_account(text) from public;
revoke all on function public.delete_thiepn_account(text) from anon;
grant execute on function public.delete_thiepn_account(text) to authenticated;

comment on function public.delete_thiepn_account(text) is
  'Deletes only auth.uid(). Exact confirmation is required; accounts with a verified MFA factor additionally require an aal2 session.';

create or replace function public.delete_notes_auth_identity()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  delete_status text;
  has_verified_mfa boolean := false;
begin
  if current_user_id is null then
    return jsonb_build_object('deleted', false, 'reason', 'not_authenticated');
  end if;

  select exists (
    select 1
    from auth.mfa_factors f
    where f.user_id = current_user_id
      and f.status::text = 'verified'
  ) into has_verified_mfa;

  if has_verified_mfa and coalesce((select auth.jwt()->>'aal'), 'aal1') <> 'aal2' then
    return jsonb_build_object('deleted', false, 'reason', 'mfa_required');
  end if;

  delete_status := public.notes_auth_identity_delete_status();
  if delete_status <> 'ready' then
    return jsonb_build_object('deleted', false, 'reason', delete_status);
  end if;

  update notes_private.notes_sync_workspace_state
    set locked = true,
        locked_at = timezone('utc'::text, now()),
        former_user_id = current_user_id
    where singleton = true;

  delete from public.notes_sync_records where user_id = current_user_id;
  delete from notes_private.notes_sync_access where user_id = current_user_id;
  delete from auth.users where id = current_user_id;

  return jsonb_build_object('deleted', true, 'reason', null);
end;
$$;

revoke all on function public.delete_notes_auth_identity() from public;
revoke all on function public.delete_notes_auth_identity() from anon;
grant execute on function public.delete_notes_auth_identity() to authenticated;

comment on function public.delete_notes_auth_identity() is
  'Legacy Notes identity deletion path. A3 mirrors the THIEPN Account MFA deletion guard to prevent a weaker bypass.';
