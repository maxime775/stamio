-- Minimal, server-timestamped proof of the legal versions accepted at signup.
-- Existing users are intentionally not backfilled.
create table public.user_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null check (terms_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  privacy_version text not null check (privacy_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  accepted_at timestamptz not null default statement_timestamp(),
  unique (user_id, terms_version)
);

comment on table public.user_legal_acceptances is
  'Immutable server-side record of terms acceptance and the privacy notice version presented to a user.';
comment on column public.user_legal_acceptances.accepted_at is
  'Server-generated timestamp; clients cannot insert or update acceptance records.';

alter table public.user_legal_acceptances enable row level security;

revoke all on public.user_legal_acceptances from public, anon, authenticated;
grant select on public.user_legal_acceptances to service_role;

create or replace function public.handle_new_user_legal_acceptance()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_expected_terms_version constant text := '2026-08-27';
  v_expected_privacy_version constant text := '2026-08-27';
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

revoke all on function public.handle_new_user_legal_acceptance() from public, anon, authenticated;

create trigger on_auth_user_created_legal_acceptance
after insert on auth.users
for each row execute function public.handle_new_user_legal_acceptance();
