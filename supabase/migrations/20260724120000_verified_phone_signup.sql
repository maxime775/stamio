create table if not exists public.signup_phone_verifications (
  token_hash text primary key,
  phone_global_hash text not null,
  phone_last4 text not null check (phone_last4 ~ '^[0-9]{4}$'),
  phone_ciphertext text not null,
  phone_iv text not null,
  phone_encryption_version smallint not null check (phone_encryption_version = 1),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.signup_phone_verifications is
  'Short-lived, single-use server-issued proofs for phone-verified signups. Contains no clear-text phone number.';

create index if not exists signup_phone_verifications_expires_at_idx
  on public.signup_phone_verifications (expires_at);

alter table public.signup_phone_verifications enable row level security;
revoke all on public.signup_phone_verifications from public, anon, authenticated;

alter table public.profiles
  add column if not exists phone_ciphertext text,
  add column if not exists phone_iv text,
  add column if not exists phone_encryption_version smallint;

alter table public.profiles
  drop constraint if exists profiles_phone_encryption_version_check;
alter table public.profiles
  add constraint profiles_phone_encryption_version_check
  check (phone_encryption_version is null or phone_encryption_version = 1);

revoke select on public.profiles from authenticated;
grant select (
  id,
  email,
  username,
  username_normalized,
  sex,
  phone_last4,
  phone_verified_at,
  phone_last_changed_at,
  age,
  profession,
  region,
  reputation_score,
  created_at,
  updated_at
) on public.profiles to authenticated;

-- Production preflight before applying this migration:
-- select phone_global_hash, count(*) from public.profiles
-- where phone_global_hash is not null group by phone_global_hash having count(*) > 1;
create unique index if not exists profiles_phone_global_hash_unique_idx
  on public.profiles (phone_global_hash)
  where phone_global_hash is not null;

-- Account phone identity is stored only as the server HMAC and last four digits in profiles.
-- Remove clear-text values left by the previous account-phone implementation.
update auth.users
set phone = null,
    phone_confirmed_at = null,
    phone_change = '',
    phone_change_token = '',
    phone_change_sent_at = null
where phone is not null
   or nullif(phone_change, '') is not null;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_age int;
  v_username text := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  v_username_normalized text := public.normalize_username(new.raw_user_meta_data->>'username');
  v_verification_token text := nullif(new.raw_user_meta_data->>'phone_verification_token', '');
  v_phone_verification public.signup_phone_verifications%rowtype;
begin
  if v_verification_token is null then
    raise exception 'phone_verification_required' using errcode = '23514';
  end if;

  delete from public.signup_phone_verifications
  where token_hash = encode(digest(v_verification_token, 'sha256'), 'hex')
    and expires_at > now()
  returning * into v_phone_verification;

  if v_phone_verification.token_hash is null then
    raise exception 'phone_verification_invalid_or_expired' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.phone_global_hash = v_phone_verification.phone_global_hash
      and p.id <> new.id
  ) then
    raise exception 'phone_already_linked' using errcode = '23505';
  end if;

  if coalesce(new.raw_user_meta_data->>'age', '') ~ '^[0-9]+$' then
    v_age := (new.raw_user_meta_data->>'age')::int;
  end if;

  if v_username_normalized = '' then
    v_username := null;
    v_username_normalized := null;
  elsif v_username_normalized !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid_username' using errcode = '23514';
  elsif exists (
    select 1
    from public.profiles p
    where p.username_normalized = v_username_normalized
      and p.id <> new.id
  ) then
    raise exception 'username_taken' using errcode = '23505';
  end if;

  insert into public.profiles (
    id,
    email,
    username,
    username_normalized,
    sex,
    phone_last4,
    phone_global_hash,
    phone_ciphertext,
    phone_iv,
    phone_encryption_version,
    phone_verified_at,
    phone_last_changed_at,
    age,
    profession,
    region
  )
  values (
    new.id,
    new.email,
    v_username,
    v_username_normalized,
    new.raw_user_meta_data->>'sex',
    v_phone_verification.phone_last4,
    v_phone_verification.phone_global_hash,
    v_phone_verification.phone_ciphertext,
    v_phone_verification.phone_iv,
    v_phone_verification.phone_encryption_version,
    now(),
    now(),
    v_age,
    nullif(new.raw_user_meta_data->>'profession', ''),
    nullif(new.raw_user_meta_data->>'region', '')
  );

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    - 'phone_verification_token'
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_consume_phone_verification on auth.users;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();
