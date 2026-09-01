-- Optional, account-scoped consent for future manual Stamio communications.
-- This migration does not send email and does not expose recipient lists.
alter table public.profiles
  add column communications_email_opt_in boolean not null default false,
  add column communications_email_opted_in_at timestamptz,
  add column communications_email_consent_version text,
  add column communications_email_preference_updated_at timestamptz;

alter table public.profiles
  add constraint profiles_communications_email_opt_in_timestamp_check
  check (
    not communications_email_opt_in
    or (
      communications_email_opted_in_at is not null
      and communications_email_consent_version is not null
    )
  );

comment on column public.profiles.communications_email_opt_in is
  'Current optional preference for receiving Stamio editorial communications by email. False by default and unrelated to voting choices.';
comment on column public.profiles.communications_email_opted_in_at is
  'Server timestamp of the most recent positive communications email consent; retained after withdrawal as consent evidence.';
comment on column public.profiles.communications_email_consent_version is
  'Server-defined version of the wording accepted with the most recent positive communications email consent; retained after withdrawal.';
comment on column public.profiles.communications_email_preference_updated_at is
  'Server timestamp of the most recent change to the communications email preference.';

create index profiles_communications_email_opt_in_idx
  on public.profiles (id)
  where communications_email_opt_in;

revoke update (
  communications_email_opt_in,
  communications_email_opted_in_at,
  communications_email_consent_version,
  communications_email_preference_updated_at
) on public.profiles from authenticated;

grant select (
  communications_email_opt_in,
  communications_email_opted_in_at,
  communications_email_consent_version,
  communications_email_preference_updated_at
) on public.profiles to authenticated;

-- Preserve the existing profile creation guarantees and add only the optional
-- preference sourced from signup metadata. Timestamps remain server-generated.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_age int;
  v_username text := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  v_username_normalized text := public.normalize_username(new.raw_user_meta_data->>'username');
  v_communications_email_opt_in boolean :=
    coalesce(new.raw_user_meta_data->>'communications_email_opt_in', 'false') = 'true';
  v_communications_email_consent_version constant text := '2026-08-31';
begin
  if coalesce(new.raw_user_meta_data->>'age', '') ~ '^[0-9]+$' then
    v_age := (new.raw_user_meta_data->>'age')::int;
  end if;
  if v_username_normalized = '' then
    v_username := null;
    v_username_normalized := null;
  elsif v_username_normalized !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid_username' using errcode = '23514';
  elsif exists (
    select 1 from public.profiles p
    where p.username_normalized = v_username_normalized and p.id <> new.id
  ) then
    raise exception 'username_taken' using errcode = '23505';
  end if;

  insert into public.profiles (
    id, email, username, username_normalized, sex, age, profession, region,
    passkey_required_at, communications_email_opt_in,
    communications_email_opted_in_at, communications_email_consent_version,
    communications_email_preference_updated_at
  )
  values (
    new.id, new.email, v_username, v_username_normalized,
    new.raw_user_meta_data->>'sex', v_age,
    nullif(new.raw_user_meta_data->>'profession', ''),
    nullif(new.raw_user_meta_data->>'region', ''),
    now(), v_communications_email_opt_in,
    case when v_communications_email_opt_in then statement_timestamp() end,
    case when v_communications_email_opt_in then v_communications_email_consent_version end,
    case when v_communications_email_opt_in then statement_timestamp() end
  )
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(public.profiles.username, excluded.username),
    username_normalized = coalesce(public.profiles.username_normalized, excluded.username_normalized),
    sex = excluded.sex,
    age = excluded.age,
    profession = excluded.profession,
    region = excluded.region,
    communications_email_opt_in = excluded.communications_email_opt_in,
    communications_email_opted_in_at = case
      when excluded.communications_email_opt_in then excluded.communications_email_opted_in_at
      else public.profiles.communications_email_opted_in_at
    end,
    communications_email_consent_version = case
      when excluded.communications_email_opt_in then excluded.communications_email_consent_version
      else public.profiles.communications_email_consent_version
    end,
    communications_email_preference_updated_at = case
      when excluded.communications_email_opt_in then excluded.communications_email_preference_updated_at
      else public.profiles.communications_email_preference_updated_at
    end,
    updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

-- Users can change only their own preference through this narrow RPC. No
-- recipient list or other profile is exposed, and no direct UPDATE is granted.
create or replace function public.update_my_communications_email_preference(
  p_opt_in boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_communications_email_consent_version constant text := '2026-08-31';
  v_profile jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_opt_in is null then
    raise exception 'invalid_communications_email_preference' using errcode = '23514';
  end if;

  update public.profiles
  set communications_email_opt_in = p_opt_in,
      communications_email_opted_in_at = case
        when p_opt_in then statement_timestamp()
        else communications_email_opted_in_at
      end,
      communications_email_consent_version = case
        when p_opt_in then v_communications_email_consent_version
        else communications_email_consent_version
      end,
      communications_email_preference_updated_at = statement_timestamp(),
      updated_at = statement_timestamp()
  where id = v_user_id
    and communications_email_opt_in is distinct from p_opt_in;

  if not found and not exists (
    select 1 from public.profiles where id = v_user_id
  ) then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  select to_jsonb(p)
  into v_profile
  from (
    select
      id, email, username, username_normalized, sex, age, profession, region,
      reputation_score, created_at, updated_at, passkey_required_at,
      passkey_enrolled_at, communications_email_opt_in,
      communications_email_opted_in_at,
      communications_email_consent_version,
      communications_email_preference_updated_at
    from public.profiles
    where id = v_user_id
  ) p;

  return v_profile;
end;
$$;

revoke all on function public.update_my_communications_email_preference(boolean)
  from public, anon, authenticated;
grant execute on function public.update_my_communications_email_preference(boolean)
  to authenticated;

-- Keep signup legal-version enforcement aligned with the legal copy presented
-- on 31 August 2026. Existing acceptance records remain immutable and intact.
create or replace function public.handle_new_user_legal_acceptance()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_expected_terms_version constant text := '2026-08-31';
  v_expected_privacy_version constant text := '2026-08-31';
  v_terms_version text := nullif(new.raw_user_meta_data->>'legal_terms_version', '');
  v_privacy_version text := nullif(new.raw_user_meta_data->>'legal_privacy_version', '');
begin
  if coalesce(new.raw_user_meta_data->>'legal_terms_accepted', 'false') <> 'true' then
    raise exception 'legal_terms_acceptance_required' using errcode = '23514';
  end if;

  if v_terms_version is distinct from v_expected_terms_version
    or v_privacy_version is distinct from v_expected_privacy_version then
    raise exception 'legal_acceptance_version_mismatch' using errcode = '23514';
  end if;

  insert into public.user_legal_acceptances (user_id, terms_version, privacy_version)
  values (new.id, v_expected_terms_version, v_expected_privacy_version)
  on conflict (user_id, terms_version) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user_legal_acceptance()
  from public, anon, authenticated;
