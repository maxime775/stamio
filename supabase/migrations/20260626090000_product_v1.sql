alter table public.polls
  add column if not exists theme text not null default 'societe',
  add column if not exists featured boolean not null default false,
  add column if not exists trend_label text;

do $$ begin
  alter table public.polls
    add constraint polls_theme_check
    check (theme in ('politique', 'economie', 'societe', 'sport'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  sex text not null check (sex in ('homme', 'femme')),
  phone_last4 text check (phone_last4 is null or phone_last4 ~ '^[0-9]{4}$'),
  phone_global_hash text,
  age int check (age is null or (age >= 13 and age <= 120)),
  profession text,
  region text not null check (region in (
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
    'Provence-Alpes-Côte d’Azur',
    'Guadeloupe',
    'Martinique',
    'Guyane',
    'La Réunion',
    'Mayotte'
  )),
  reputation_score int not null default 0 check (reputation_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_poll_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  poll_id uuid not null references public.polls(id) on delete cascade,
  choice_id uuid references public.choices(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, poll_id)
);

create table if not exists public.user_reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  poll_id uuid not null references public.polls(id) on delete cascade,
  event_type text not null,
  points int not null,
  created_at timestamptz not null default now(),
  unique (user_id, poll_id, event_type)
);

comment on column public.profiles.phone_global_hash is
  'Nullable in V1. Must be filled only by a future server-side phone verification flow; never compute or trust this value in the client.';

comment on table public.user_poll_answers is
  'User-facing answer history only. This table never replaces votes, vote_phone_locks, Twilio OTP approval, or the server anti-duplicate vote flow.';

comment on table public.user_reputation_events is
  'Server-written reputation audit trail. Clients have read-only access to their own events and cannot assign points.';

create index if not exists polls_theme_idx on public.polls(theme);
create index if not exists polls_featured_idx on public.polls(featured);
create index if not exists user_poll_answers_user_id_idx on public.user_poll_answers(user_id);
create index if not exists user_poll_answers_poll_id_idx on public.user_poll_answers(poll_id);
create index if not exists user_reputation_events_user_id_idx on public.user_reputation_events(user_id);
create index if not exists user_reputation_events_poll_id_idx on public.user_reputation_events(poll_id);

alter table public.profiles enable row level security;
alter table public.user_poll_answers enable row level security;
alter table public.user_reputation_events enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.user_poll_answers from anon, authenticated;
revoke all on public.user_reputation_events from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (sex, age, profession, region, updated_at) on public.profiles to authenticated;
grant select on public.user_poll_answers to authenticated;
grant select on public.user_reputation_events to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own poll answers" on public.user_poll_answers;
create policy "Users can read own poll answers"
on public.user_poll_answers
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own reputation events" on public.user_reputation_events;
create policy "Users can read own reputation events"
on public.user_reputation_events
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_age int;
begin
  if coalesce(new.raw_user_meta_data->>'age', '') ~ '^[0-9]+$' then
    v_age := (new.raw_user_meta_data->>'age')::int;
  end if;

  insert into public.profiles (
    id,
    email,
    sex,
    phone_last4,
    age,
    profession,
    region
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'sex',
    nullif(new.raw_user_meta_data->>'phone_last4', ''),
    v_age,
    nullif(new.raw_user_meta_data->>'profession', ''),
    nullif(new.raw_user_meta_data->>'region', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      sex = excluded.sex,
      phone_last4 = excluded.phone_last4,
      age = excluded.age,
      profession = excluded.profession,
      region = excluded.region,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email,
      updated_at = now()
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated_profile on auth.users;
create trigger on_auth_user_email_updated_profile
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.sync_profile_email_from_auth();

create or replace function public.record_verified_user_answer(
  p_user_id uuid,
  p_poll_id uuid,
  p_choice_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_count int := 0;
begin
  if p_user_id is null or p_poll_id is null or p_choice_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.choices c
    where c.id = p_choice_id
      and c.poll_id = p_poll_id
  ) then
    return;
  end if;

  insert into public.user_poll_answers (user_id, poll_id, choice_id)
  values (p_user_id, p_poll_id, p_choice_id)
  on conflict (user_id, poll_id) do nothing;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count > 0 then
    insert into public.user_reputation_events (user_id, poll_id, event_type, points)
    values (p_user_id, p_poll_id, 'verified_answer', 1)
    on conflict (user_id, poll_id, event_type) do nothing;
  end if;

  update public.profiles p
  set reputation_score = (
        select count(*)::int
        from public.user_poll_answers a
        where a.user_id = p_user_id
      ),
      updated_at = now()
  where p.id = p_user_id;
end;
$$;

revoke all on function public.record_verified_user_answer(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_verified_user_answer(uuid, uuid, uuid) to service_role;
