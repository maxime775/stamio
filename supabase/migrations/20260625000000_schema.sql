create extension if not exists pgcrypto;

do $$ begin
  create type public.poll_status as enum ('open', 'closed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  status public.poll_status not null default 'open',
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.choices (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  unique (poll_id, position)
);

create table if not exists public.vote_phone_locks (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  phone_poll_hash text not null,
  created_at timestamptz not null default now(),
  unique (poll_id, phone_poll_hash)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  choice_id uuid not null references public.choices(id) on delete restrict,
  lock_id uuid not null references public.vote_phone_locks(id) on delete restrict,
  receipt_hash text not null unique,
  created_at timestamptz not null default now(),
  unique (lock_id)
);

create table if not exists public.vote_attempts (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.polls(id) on delete cascade,
  choice_id uuid references public.choices(id) on delete set null,
  phone_poll_hash text,
  event text not null check (event in (
    'otp_started',
    'otp_start_failed',
    'otp_rejected',
    'vote_accepted',
    'vote_duplicate',
    'vote_error'
  )),
  created_at timestamptz not null default now()
);

create index if not exists choices_poll_id_idx on public.choices(poll_id);
create index if not exists votes_poll_id_idx on public.votes(poll_id);
create index if not exists votes_choice_id_idx on public.votes(choice_id);
create index if not exists vote_attempts_poll_id_idx on public.vote_attempts(poll_id);

alter table public.polls enable row level security;
alter table public.choices enable row level security;
alter table public.vote_phone_locks enable row level security;
alter table public.votes enable row level security;
alter table public.vote_attempts enable row level security;

drop policy if exists "Public can read open polls" on public.polls;
create policy "Public can read open polls"
on public.polls
for select
to anon, authenticated
using (status = 'open' and (closes_at is null or closes_at > now()));

drop policy if exists "Public can read choices for open polls" on public.choices;
create policy "Public can read choices for open polls"
on public.choices
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls p
    where p.id = choices.poll_id
      and p.status = 'open'
      and (p.closes_at is null or p.closes_at > now())
  )
);

revoke insert, update, delete on public.polls from anon, authenticated;
revoke insert, update, delete on public.choices from anon, authenticated;
revoke all on public.vote_phone_locks from anon, authenticated;
revoke all on public.votes from anon, authenticated;
revoke all on public.vote_attempts from anon, authenticated;

grant select on public.polls to anon, authenticated;
grant select on public.choices to anon, authenticated;

create or replace function public.submit_verified_vote(
  p_poll_id uuid,
  p_choice_id uuid,
  p_phone_poll_hash text,
  p_receipt_hash text
)
returns table(status text, receipt_hash text, vote_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_id uuid;
  v_vote_id uuid;
begin
  if p_phone_poll_hash is null or length(p_phone_poll_hash) <> 64 then
    return query select 'error'::text, null::text, null::uuid;
    return;
  end if;

  if not exists (
    select 1
    from public.polls p
    where p.id = p_poll_id
      and p.status = 'open'
      and (p.closes_at is null or p.closes_at > now())
  ) then
    return query select 'poll_closed'::text, null::text, null::uuid;
    return;
  end if;

  if not exists (
    select 1
    from public.choices c
    where c.id = p_choice_id
      and c.poll_id = p_poll_id
  ) then
    return query select 'error'::text, null::text, null::uuid;
    return;
  end if;

  begin
    insert into public.vote_phone_locks (poll_id, phone_poll_hash)
    values (p_poll_id, p_phone_poll_hash)
    returning id into v_lock_id;
  exception
    when unique_violation then
      return query select 'duplicate'::text, null::text, null::uuid;
      return;
  end;

  insert into public.votes (poll_id, choice_id, lock_id, receipt_hash)
  values (p_poll_id, p_choice_id, v_lock_id, p_receipt_hash)
  returning id into v_vote_id;

  return query select 'accepted'::text, p_receipt_hash, v_vote_id;
end;
$$;

revoke all on function public.submit_verified_vote(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_verified_vote(uuid, uuid, text, text) to service_role;

create or replace function public.get_poll_results(p_poll_id uuid)
returns table(choice_id uuid, label text, votes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as choice_id,
    c.label,
    count(v.id) as votes
  from public.choices c
  join public.polls p on p.id = c.poll_id
  left join public.votes v on v.choice_id = c.id
  where c.poll_id = p_poll_id
    and p.status = 'open'
    and (p.closes_at is null or p.closes_at > now())
  group by c.id, c.label, c.position
  order by c.position;
$$;

grant execute on function public.get_poll_results(uuid) to anon, authenticated, service_role;
