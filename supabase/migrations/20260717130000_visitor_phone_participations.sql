create table if not exists public.visitor_phone_participations (
  id uuid primary key default gen_random_uuid(),
  visitor_phone_hash text not null,
  poll_id uuid not null references public.polls(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (visitor_phone_hash, poll_id)
);

comment on table public.visitor_phone_participations is
  'Server-written count of accepted visitor participations by global HMAC phone hash. Never stores clear phone numbers.';

comment on column public.visitor_phone_participations.visitor_phone_hash is
  'Global HMAC of the normalized visitor phone, not poll-scoped and never exposed to clients.';

create index if not exists visitor_phone_participations_phone_hash_idx
  on public.visitor_phone_participations (visitor_phone_hash);

create index if not exists visitor_phone_participations_poll_id_idx
  on public.visitor_phone_participations (poll_id);

alter table public.visitor_phone_participations enable row level security;

revoke all on public.visitor_phone_participations from anon, authenticated;

drop function if exists public.submit_verified_vote(uuid, uuid, text, text);

create or replace function public.submit_verified_vote(
  p_poll_id uuid,
  p_choice_id uuid,
  p_phone_poll_hash text,
  p_receipt_hash text,
  p_visitor_phone_hash text default null
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

  if p_visitor_phone_hash is not null and length(p_visitor_phone_hash) <> 64 then
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

  if p_visitor_phone_hash is not null then
    insert into public.visitor_phone_participations (visitor_phone_hash, poll_id)
    values (p_visitor_phone_hash, p_poll_id)
    on conflict (visitor_phone_hash, poll_id) do nothing;
  end if;

  return query select 'accepted'::text, p_receipt_hash, v_vote_id;
end;
$$;

revoke all on function public.submit_verified_vote(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_verified_vote(uuid, uuid, text, text, text) to service_role;
