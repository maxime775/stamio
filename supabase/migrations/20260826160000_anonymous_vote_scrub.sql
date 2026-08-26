-- DESTRUCTIVE SCRUB: remove the legacy identity-to-choice vote paths.
-- Apply only after the dissociated ballot flow has been validated and switched.
-- This migration deliberately preserves every ballot and every editorial row.

-- 1. Validate the expanded model before any destructive statement.
create temporary table anonymous_vote_scrub_guard (
  vote_count bigint not null,
  poll_count bigint not null,
  series_count bigint not null,
  choice_count bigint not null,
  resource_count bigint not null
) on commit drop;

insert into anonymous_vote_scrub_guard (
  vote_count, poll_count, series_count, choice_count, resource_count
)
select
  (select count(*) from public.votes),
  (select count(*) from public.polls),
  (select count(*) from public.poll_series),
  (select count(*) from public.choices),
  (select count(*) from public.poll_resources);

do $$
declare
  v_legacy_participations bigint;
  v_preserved_participations bigint;
begin
  if to_regclass('public.user_poll_answers') is null
     or to_regclass('public.user_poll_participations') is null
     or to_regclass('public.ballot_permits') is null
     or to_regclass('public.vote_authorization_bindings') is null then
    raise exception 'anonymous_vote_scrub_precondition_missing_table';
  end if;

  if to_regprocedure('public.issue_ballot_authorization(uuid,uuid,text,timestamp with time zone)') is null
     or to_regprocedure('public.redeem_ballot_permit(text,uuid,uuid)') is null
     or to_regprocedure('public.finalize_ballot_participation(uuid,uuid,text)') is null
     or to_regprocedure('public.reconcile_my_ballot_participations()') is null
     or to_regprocedure('public.reconcile_consumed_ballot_participations(integer)') is null then
    raise exception 'anonymous_vote_scrub_precondition_missing_new_vote_function';
  end if;

  if not exists (
    select 1
    from cron.job
    where jobname = 'stamio-reconcile-consumed-ballot-participations'
  ) then
    raise exception 'anonymous_vote_scrub_precondition_missing_reconciliation_cron';
  end if;

  select count(*)
  into v_legacy_participations
  from (
    select distinct user_id, poll_id
    from public.user_poll_answers
  ) legacy;

  select count(*)
  into v_preserved_participations
  from (
    select distinct legacy.user_id, legacy.poll_id
    from public.user_poll_answers legacy
    join public.user_poll_participations participation
      on participation.user_id = legacy.user_id
     and participation.poll_id = legacy.poll_id
  ) preserved;

  if v_preserved_participations <> v_legacy_participations then
    raise exception
      'anonymous_vote_scrub_participation_mismatch: legacy %, preserved %',
      v_legacy_participations,
      v_preserved_participations;
  end if;
end;
$$;

-- 2. Detach every preserved ballot from legacy account/phone locks and receipts.
alter table public.votes drop constraint if exists votes_at_most_one_lock_check;
alter table public.votes drop constraint if exists votes_exactly_one_lock_check;
alter table public.votes drop constraint if exists votes_user_lock_id_fkey;
alter table public.votes drop constraint if exists votes_lock_id_fkey;
alter table public.votes drop constraint if exists votes_user_lock_id_key;
alter table public.votes drop constraint if exists votes_lock_id_key;
alter table public.votes drop constraint if exists votes_receipt_hash_key;
drop index if exists public.votes_user_lock_id_unique_idx;

alter table public.votes
  drop column if exists user_lock_id,
  drop column if exists lock_id,
  drop column if exists receipt_hash;

-- 3. Remove RPCs and triggers able to combine an identity/hash with a choice.
drop trigger if exists user_poll_answers_sync_participation
  on public.user_poll_answers;
drop function if exists public.sync_poll_participation_from_legacy_answer();
drop function if exists public.record_verified_user_answer(uuid, uuid, uuid);
drop function if exists public.submit_verified_vote(uuid, uuid, text, text);
drop function if exists public.submit_verified_vote(uuid, uuid, text, text, text);
drop function if exists public.submit_authenticated_vote(uuid, uuid, uuid, text, text);
drop function if exists public.prepare_legacy_account_vote(uuid, uuid);
drop function if exists public.log_vote_attempt(uuid, uuid, text, text);

-- Keep poll administration working after user_poll_answers is removed. A
-- participation, like a ballot or comment, makes a poll archival-only.
create or replace function public.admin_delete_or_archive_poll(p_poll_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vote_count bigint;
  v_comment_count bigint;
  v_participation_count bigint;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;

  if not exists (select 1 from public.polls where id = p_poll_id) then
    raise exception 'poll_not_found' using errcode = '22023';
  end if;

  select count(*) into v_vote_count from public.votes where poll_id = p_poll_id;
  select count(*) into v_comment_count from public.poll_comments where poll_id = p_poll_id;
  select count(*) into v_participation_count
  from public.user_poll_participations
  where poll_id = p_poll_id;

  if v_vote_count = 0 and v_comment_count = 0 and v_participation_count = 0 then
    delete from public.polls where id = p_poll_id;
    return 'deleted';
  end if;

  update public.polls
  set archived = true,
      featured = false,
      show_in_results = false,
      status = 'closed'::public.poll_status,
      closes_at = least(coalesce(closes_at, now()), now())
  where id = p_poll_id;

  return 'archived';
end;
$$;

revoke all on function public.admin_delete_or_archive_poll(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_delete_or_archive_poll(uuid)
  to authenticated, service_role;

-- Preserve the existing profile update contract without returning deleted
-- telephone fields.
create or replace function public.update_my_profile_field(
  p_field text,
  p_value text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_value text := trim(coalesce(p_value, ''));
  v_age int;
  v_profile jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_field = 'username' then
    v_value := public.normalize_username(v_value);
    if v_value !~ '^[a-z0-9_]{3,20}$' then
      raise exception 'invalid_username' using errcode = '23514';
    end if;
    if exists (
      select 1
      from public.profiles p
      where p.username_normalized = v_value
        and p.id <> v_user_id
    ) then
      raise exception 'username_taken' using errcode = '23505';
    end if;

    update public.profiles
    set username = v_value,
        username_normalized = v_value,
        updated_at = now()
    where id = v_user_id;
  elsif p_field = 'sex' then
    if v_value not in ('homme', 'femme') then
      raise exception 'invalid_sex' using errcode = '23514';
    end if;

    update public.profiles
    set sex = v_value,
        updated_at = now()
    where id = v_user_id;
  elsif p_field = 'age' then
    if v_value !~ '^[0-9]{1,3}$' then
      raise exception 'invalid_age' using errcode = '23514';
    end if;
    v_age := v_value::int;
    if v_age < 13 or v_age > 120 then
      raise exception 'invalid_age' using errcode = '23514';
    end if;

    update public.profiles
    set age = v_age,
        updated_at = now()
    where id = v_user_id;
  elsif p_field = 'profession' then
    if v_value not in (
      'Agriculteurs exploitants',
      'Artisans, commerçants, chefs d''entreprise',
      'Cadres et professions intellectuelles supérieures',
      'Professions intermédiaires',
      'Employés',
      'Ouvriers',
      'Retraités',
      'Autres personnes sans activité professionnelle'
    ) then
      raise exception 'invalid_profession' using errcode = '23514';
    end if;

    update public.profiles
    set profession = v_value,
        updated_at = now()
    where id = v_user_id;
  elsif p_field = 'region' then
    if v_value not in (
      'Auvergne-Rhône-Alpes',
      'Bourgogne-Franche-Comté',
      'Bretagne',
      'Centre-Val de Loire',
      'Corse',
      'Grand Est',
      'Hauts-de-France',
      'Île-de-France',
      'Normandie',
      'Nouvelle-Aquitaine',
      'Occitanie',
      'Pays de la Loire',
      'Provence-Alpes-Côte d''Azur',
      'Guadeloupe',
      'Martinique',
      'Guyane',
      'La Réunion',
      'Mayotte'
    ) then
      raise exception 'invalid_region' using errcode = '23514';
    end if;

    update public.profiles
    set region = v_value,
        updated_at = now()
    where id = v_user_id;
  else
    raise exception 'invalid_field' using errcode = '23514';
  end if;

  select to_jsonb(p)
  into v_profile
  from (
    select
      id, email, username, username_normalized, sex, age, profession, region,
      reputation_score, created_at, updated_at, passkey_required_at,
      passkey_enrolled_at
    from public.profiles
    where id = v_user_id
  ) p;

  return v_profile;
end;
$$;

revoke all on function public.update_my_profile_field(text, text)
  from public, anon, authenticated;
grant execute on function public.update_my_profile_field(text, text)
  to authenticated;

-- 4. Remove legacy account-choice, phone-lock and audit storage. No CASCADE is
-- used: any unhandled dependency aborts the migration instead of being hidden.
drop table public.user_poll_answers;
drop table public.vote_attempts;
drop table public.vote_user_locks;
drop table public.vote_phone_locks;
drop table public.visitor_phone_participations;
drop table public.signup_phone_verifications;

-- The passkey profile trigger no longer reads these fields. Remove encrypted
-- phone remnants and the last-four display value together.
alter table public.profiles
  drop constraint if exists profiles_phone_encryption_version_check;
drop index if exists public.profiles_phone_global_hash_unique_idx;
alter table public.profiles
  drop column if exists phone_global_hash,
  drop column if exists phone_ciphertext,
  drop column if exists phone_iv,
  drop column if exists phone_encryption_version,
  drop column if exists phone_last4,
  drop column if exists phone_verified_at,
  drop column if exists phone_last_changed_at;

-- Remove only the known legacy phone metadata keys. Passkey and profile
-- metadata are intentionally untouched.
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
  - 'phone_last4'
  - 'phone_verification_token'
where coalesce(raw_user_meta_data, '{}'::jsonb)
  ?| array['phone_last4', 'phone_verification_token'];

-- 5. Final structural and content-preservation assertions.
do $$
declare
  v_guard anonymous_vote_scrub_guard%rowtype;
begin
  select * into strict v_guard from anonymous_vote_scrub_guard;

  if (select count(*) from public.votes) <> v_guard.vote_count then
    raise exception 'anonymous_vote_scrub_changed_vote_count';
  end if;
  if (select count(*) from public.polls) <> v_guard.poll_count
     or (select count(*) from public.poll_series) <> v_guard.series_count
     or (select count(*) from public.choices) <> v_guard.choice_count
     or (select count(*) from public.poll_resources) <> v_guard.resource_count then
    raise exception 'anonymous_vote_scrub_changed_editorial_cardinality';
  end if;

  if to_regclass('public.user_poll_answers') is not null
     or to_regclass('public.vote_user_locks') is not null
     or to_regclass('public.vote_phone_locks') is not null
     or to_regclass('public.vote_attempts') is not null
     or to_regclass('public.visitor_phone_participations') is not null
     or to_regclass('public.signup_phone_verifications') is not null then
    raise exception 'anonymous_vote_scrub_legacy_table_remains';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'votes'
      and column_name in (
        'user_id', 'user_lock_id', 'lock_id', 'permit_id', 'permit_digest',
        'participation_id', 'receipt', 'receipt_hash', 'voter_hash', 'phone_poll_hash'
      )
  ) then
    raise exception 'anonymous_vote_scrub_identity_column_remains_on_votes';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_poll_participations'
      and column_name in (
        'choice_id', 'vote_id', 'ballot_id', 'permit', 'permit_digest',
        'receipt', 'receipt_hash', 'lock_id', 'user_lock_id'
      )
  ) then
    raise exception 'anonymous_vote_scrub_choice_link_remains_on_participation';
  end if;

  if to_regprocedure('public.record_verified_user_answer(uuid,uuid,uuid)') is not null
     or to_regprocedure('public.submit_verified_vote(uuid,uuid,text,text)') is not null
     or to_regprocedure('public.submit_verified_vote(uuid,uuid,text,text,text)') is not null
     or to_regprocedure('public.submit_authenticated_vote(uuid,uuid,uuid,text,text)') is not null
     or to_regprocedure('public.prepare_legacy_account_vote(uuid,uuid)') is not null
     or to_regprocedure('public.log_vote_attempt(uuid,uuid,text,text)') is not null then
    raise exception 'anonymous_vote_scrub_legacy_function_remains';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and coalesce(p.proargnames, '{}'::text[])
        && array['p_choice_id', 'choice_id']::text[]
      and coalesce(p.proargnames, '{}'::text[])
        && array[
          'p_user_id', 'user_id', 'p_account_id', 'account_id',
          'p_voter_hash', 'voter_hash', 'p_phone_poll_hash', 'phone_poll_hash',
          'p_phone_hash', 'phone_hash'
        ]::text[]
  ) then
    raise exception 'anonymous_vote_scrub_identity_and_choice_function_remains';
  end if;

  if to_regclass('public.user_poll_participations') is null
     or to_regclass('public.ballot_permits') is null
     or to_regclass('public.vote_authorization_bindings') is null
     or to_regprocedure('public.issue_ballot_authorization(uuid,uuid,text,timestamp with time zone)') is null
     or to_regprocedure('public.redeem_ballot_permit(text,uuid,uuid)') is null
     or to_regprocedure('public.finalize_ballot_participation(uuid,uuid,text)') is null
     or to_regprocedure('public.reconcile_consumed_ballot_participations(integer)') is null then
    raise exception 'anonymous_vote_scrub_new_path_missing_after_scrub';
  end if;
end;
$$;
