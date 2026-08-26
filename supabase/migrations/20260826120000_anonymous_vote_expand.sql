-- EXPAND only: add the dissociated vote path while keeping every legacy path usable.

-- Supabase Cron provides the independent Phase A reconciliation worker.
create extension if not exists pg_cron;

create table public.user_poll_participations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  poll_id uuid not null references public.polls(id) on delete cascade,
  participated_on date not null default current_date,
  unique (user_id, poll_id)
);

comment on table public.user_poll_participations is
  'Account-facing participation history. It intentionally contains no answer, ballot, receipt, lock or permit identifier.';

create index user_poll_participations_user_id_idx
  on public.user_poll_participations(user_id);
create index user_poll_participations_poll_id_idx
  on public.user_poll_participations(poll_id);

alter table public.user_poll_participations enable row level security;
revoke all on public.user_poll_participations from public, anon, authenticated;
grant select on public.user_poll_participations to authenticated;
grant all on public.user_poll_participations to service_role;

create policy "Users can read own poll participations"
on public.user_poll_participations
for select
to authenticated
using (auth.uid() = user_id);

do $$
declare
  v_expected bigint;
  v_actual bigint;
begin
  select count(*)
  into v_expected
  from (
    select distinct user_id, poll_id
    from public.user_poll_answers
  ) expected;

  insert into public.user_poll_participations (user_id, poll_id, participated_on)
  select user_id, poll_id, min(created_at)::date
  from public.user_poll_answers
  group by user_id, poll_id
  on conflict (user_id, poll_id) do nothing;

  select count(*) into v_actual from public.user_poll_participations;
  if v_actual <> v_expected then
    raise exception 'anonymous_vote_participation_backfill_mismatch: expected %, got %', v_expected, v_actual;
  end if;
end;
$$;

-- Keep participation history complete while the legacy submit-vote path remains live.
create or replace function public.sync_poll_participation_from_legacy_answer()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_permit_digest text;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(new.user_id::text || ':' || new.poll_id::text, 0)
  );

  insert into public.user_poll_participations (user_id, poll_id, participated_on)
  values (new.user_id, new.poll_id, new.created_at::date)
  on conflict (user_id, poll_id) do nothing;

  select b.permit_digest
  into v_permit_digest
  from public.vote_authorization_bindings b
  where b.user_id = new.user_id and b.poll_id = new.poll_id
  for update;

  if found then
    update public.ballot_permits bp
    set status = 'revoked', revoked_at = now(), updated_at = now()
    where bp.permit_digest = v_permit_digest
      and bp.status = 'active';

    delete from public.vote_authorization_bindings b
    where b.user_id = new.user_id and b.poll_id = new.poll_id;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_poll_participation_from_legacy_answer()
  from public, anon, authenticated;

create trigger user_poll_answers_sync_participation
after insert on public.user_poll_answers
for each row execute function public.sync_poll_participation_from_legacy_answer();

-- Private Phase A binding. No Edge Function other than the authenticated
-- authorization/finalization path receives an RPC grant capable of reading it.
create table public.vote_authorization_bindings (
  user_id uuid not null references auth.users(id) on delete cascade,
  poll_id uuid not null references public.polls(id) on delete cascade,
  permit_digest text not null unique check (permit_digest ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, poll_id)
);

comment on table public.vote_authorization_bindings is
  'Short-lived Phase A recovery binding. Never contains a choice or ballot identifier and is deleted after reconciliation.';

alter table public.vote_authorization_bindings enable row level security;
revoke all on public.vote_authorization_bindings
  from public, anon, authenticated, service_role;

-- Anonymous Phase B permit status. It contains no account-facing identifier.
create table public.ballot_permits (
  permit_digest text primary key check (permit_digest ~ '^[0-9a-f]{64}$'),
  poll_id uuid not null references public.polls(id) on delete cascade,
  expires_at timestamptz not null,
  status text not null check (status in ('active', 'revoked', 'consumed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  consumed_at timestamptz
);

comment on table public.ballot_permits is
  'Anonymous one-time permit status for Phase B. It never contains an account, participation, choice or ballot identifier.';

create index ballot_permits_poll_id_idx on public.ballot_permits(poll_id);
create index ballot_permits_expires_at_idx on public.ballot_permits(expires_at);

alter table public.ballot_permits enable row level security;
revoke all on public.ballot_permits
  from public, anon, authenticated, service_role;

-- New ballots have no lock and no receipt. Legacy ballots may still use exactly
-- one of lock_id/user_lock_id during the EXPAND window.
alter table public.votes alter column receipt_hash drop not null;
alter table public.votes drop constraint if exists votes_exactly_one_lock_check;
alter table public.votes drop constraint if exists votes_at_most_one_lock_check;
alter table public.votes add constraint votes_at_most_one_lock_check check (
  not (lock_id is not null and user_lock_id is not null)
);

create or replace function public.complete_consumed_ballot_participation(
  p_user_id uuid,
  p_poll_id uuid,
  p_permit_digest text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status text;
begin
  perform 1
  from public.vote_authorization_bindings b
  where b.user_id = p_user_id
    and b.poll_id = p_poll_id
    and b.permit_digest = p_permit_digest
  for update;

  if not found then
    return false;
  end if;

  select bp.status
  into v_status
  from public.ballot_permits bp
  where bp.permit_digest = p_permit_digest
    and bp.poll_id = p_poll_id
  for update;

  if v_status is distinct from 'consumed' then
    return false;
  end if;

  insert into public.user_poll_participations (user_id, poll_id, participated_on)
  values (p_user_id, p_poll_id, current_date)
  on conflict (user_id, poll_id) do nothing;

  insert into public.user_reputation_events (user_id, poll_id, event_type, points)
  values (p_user_id, p_poll_id, 'verified_answer', 1)
  on conflict (user_id, poll_id, event_type) do nothing;

  update public.profiles p
  set reputation_score = (
        select count(*)::int
        from public.user_poll_participations up
        where up.user_id = p_user_id
      ),
      updated_at = now()
  where p.id = p_user_id;

  delete from public.vote_authorization_bindings b
  where b.user_id = p_user_id
    and b.poll_id = p_poll_id
    and b.permit_digest = p_permit_digest;

  return true;
end;
$$;

revoke all on function public.complete_consumed_ballot_participation(uuid, uuid, text)
  from public, anon, authenticated, service_role;

create or replace function public.issue_ballot_authorization(
  p_user_id uuid,
  p_poll_id uuid,
  p_permit_digest text,
  p_expires_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_binding public.vote_authorization_bindings%rowtype;
begin
  if p_user_id is null or p_poll_id is null
     or p_permit_digest is null or p_permit_digest !~ '^[0-9a-f]{64}$'
     or p_expires_at is null or p_expires_at <= clock_timestamp()
     or p_expires_at > clock_timestamp() + interval '15 minutes' then
    return 'error';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || p_poll_id::text, 0)
  );

  if exists (
    select 1 from public.user_poll_participations up
    where up.user_id = p_user_id and up.poll_id = p_poll_id
  ) then
    select *
    into v_binding
    from public.vote_authorization_bindings b
    where b.user_id = p_user_id and b.poll_id = p_poll_id
    for update;

    if found then
      update public.ballot_permits bp
      set status = 'revoked', revoked_at = now(), updated_at = now()
      where bp.permit_digest = v_binding.permit_digest
        and bp.status = 'active';

      delete from public.vote_authorization_bindings b
      where b.user_id = p_user_id and b.poll_id = p_poll_id;
    end if;

    return 'already_participated';
  end if;

  if not exists (
    select 1 from public.polls p
    where p.id = p_poll_id
      and p.status = 'open'
      and (p.closes_at is null or p.closes_at > now())
  ) then
    return 'poll_closed';
  end if;

  select *
  into v_binding
  from public.vote_authorization_bindings b
  where b.user_id = p_user_id and b.poll_id = p_poll_id
  for update;

  if found then
    if public.complete_consumed_ballot_participation(
      p_user_id, p_poll_id, v_binding.permit_digest
    ) then
      return 'already_participated';
    end if;

    update public.ballot_permits bp
    set status = 'revoked', revoked_at = now(), updated_at = now()
    where bp.permit_digest = v_binding.permit_digest
      and bp.status = 'active';
  end if;

  insert into public.ballot_permits (permit_digest, poll_id, expires_at, status)
  values (p_permit_digest, p_poll_id, p_expires_at, 'active');

  insert into public.vote_authorization_bindings (
    user_id, poll_id, permit_digest, expires_at
  ) values (
    p_user_id, p_poll_id, p_permit_digest, p_expires_at
  )
  on conflict (user_id, poll_id) do update
  set permit_digest = excluded.permit_digest,
      expires_at = excluded.expires_at,
      updated_at = now();

  return 'authorized';
end;
$$;

revoke all on function public.issue_ballot_authorization(uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.issue_ballot_authorization(uuid, uuid, text, timestamptz)
  to service_role;

create or replace function public.finalize_ballot_participation(
  p_user_id uuid,
  p_poll_id uuid,
  p_permit_digest text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_user_id is null or p_poll_id is null
     or p_permit_digest is null or p_permit_digest !~ '^[0-9a-f]{64}$' then
    return 'error';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || p_poll_id::text, 0)
  );

  if exists (
    select 1 from public.user_poll_participations up
    where up.user_id = p_user_id and up.poll_id = p_poll_id
  ) then
    update public.ballot_permits bp
    set status = 'revoked', revoked_at = now(), updated_at = now()
    where bp.status = 'active'
      and exists (
        select 1
        from public.vote_authorization_bindings b
        where b.user_id = p_user_id
          and b.poll_id = p_poll_id
          and b.permit_digest = bp.permit_digest
      );

    delete from public.vote_authorization_bindings b
    where b.user_id = p_user_id and b.poll_id = p_poll_id;

    return 'already_participated';
  end if;

  if public.complete_consumed_ballot_participation(
    p_user_id, p_poll_id, p_permit_digest
  ) then
    return 'finalized';
  end if;

  if exists (
    select 1
    from public.vote_authorization_bindings b
    where b.user_id = p_user_id
      and b.poll_id = p_poll_id
      and b.permit_digest = p_permit_digest
  ) then
    return 'pending';
  end if;

  return 'invalid_permit';
end;
$$;

revoke all on function public.finalize_ballot_participation(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.finalize_ballot_participation(uuid, uuid, text)
  to service_role;

create or replace function public.reconcile_my_ballot_participations()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_binding record;
  v_completed integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  for v_binding in
    select b.poll_id, b.permit_digest
    from public.vote_authorization_bindings b
    where b.user_id = v_user_id
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(v_user_id::text || ':' || v_binding.poll_id::text, 0)
    );
    if public.complete_consumed_ballot_participation(
      v_user_id, v_binding.poll_id, v_binding.permit_digest
    ) then
      v_completed := v_completed + 1;
    end if;
  end loop;

  return v_completed;
end;
$$;

revoke all on function public.reconcile_my_ballot_participations()
  from public, anon, authenticated;
grant execute on function public.reconcile_my_ballot_participations()
  to authenticated;

-- Independent Phase A reconciliation. This runs outside the Phase B request
-- and intentionally reads neither ballots nor choices.
create or replace function public.reconcile_consumed_ballot_participations(
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_binding record;
  v_completed integer := 0;
  v_status text;
  v_expires_at timestamptz;
  v_has_participation boolean;
begin
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'invalid_reconciliation_limit' using errcode = '22023';
  end if;

  for v_binding in
    select b.user_id, b.poll_id, b.permit_digest
    from public.vote_authorization_bindings b
    join public.ballot_permits bp
      on bp.permit_digest = b.permit_digest
     and bp.poll_id = b.poll_id
    where bp.status = 'consumed'
    order by bp.consumed_at nulls last, b.created_at
    limit p_limit
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(v_binding.user_id::text || ':' || v_binding.poll_id::text, 0)
    );

    if public.complete_consumed_ballot_participation(
      v_binding.user_id, v_binding.poll_id, v_binding.permit_digest
    ) then
      v_completed := v_completed + 1;
    end if;
  end loop;

  -- Remove account-to-permit links that no longer serve recovery. Active
  -- permits are revoked only after their expiry; consumed permits without a
  -- participation remain available to the reconciliation loop above.
  for v_binding in
    select b.user_id, b.poll_id, b.permit_digest
    from public.vote_authorization_bindings b
    join public.ballot_permits bp
      on bp.permit_digest = b.permit_digest
     and bp.poll_id = b.poll_id
    where bp.status = 'revoked'
       or (bp.status = 'active' and bp.expires_at <= clock_timestamp())
       or exists (
         select 1
         from public.user_poll_participations up
         where up.user_id = b.user_id and up.poll_id = b.poll_id
       )
    order by b.created_at
    limit p_limit
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(v_binding.user_id::text || ':' || v_binding.poll_id::text, 0)
    );

    select bp.status,
           bp.expires_at,
           exists (
             select 1
             from public.user_poll_participations up
             where up.user_id = b.user_id and up.poll_id = b.poll_id
           )
    into v_status, v_expires_at, v_has_participation
    from public.vote_authorization_bindings b
    join public.ballot_permits bp
      on bp.permit_digest = b.permit_digest
     and bp.poll_id = b.poll_id
    where b.user_id = v_binding.user_id
      and b.poll_id = v_binding.poll_id
      and b.permit_digest = v_binding.permit_digest
    for update of b, bp;

    if found and (
      v_has_participation
      or v_status = 'revoked'
      or (v_status = 'active' and v_expires_at <= clock_timestamp())
    ) then
      update public.ballot_permits bp
      set status = 'revoked', revoked_at = now(), updated_at = now()
      where bp.permit_digest = v_binding.permit_digest
        and bp.status = 'active';

      delete from public.vote_authorization_bindings b
      where b.user_id = v_binding.user_id
        and b.poll_id = v_binding.poll_id
        and b.permit_digest = v_binding.permit_digest;
    end if;
  end loop;

  return v_completed;
end;
$$;

revoke all on function public.reconcile_consumed_ballot_participations(integer)
  from public, anon, authenticated, service_role;

select cron.schedule(
  'stamio-reconcile-consumed-ballot-participations',
  '* * * * *',
  $cron$select public.reconcile_consumed_ballot_participations(500)$cron$
);

-- Coordinate the still-supported legacy RPC with anonymous permits. The helper
-- knows the account and poll but never receives a choice.
create or replace function public.prepare_legacy_account_vote(
  p_user_id uuid,
  p_poll_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_binding public.vote_authorization_bindings%rowtype;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || p_poll_id::text, 0)
  );

  select *
  into v_binding
  from public.vote_authorization_bindings b
  where b.user_id = p_user_id and b.poll_id = p_poll_id
  for update;

  if found then
    if public.complete_consumed_ballot_participation(
      p_user_id, p_poll_id, v_binding.permit_digest
    ) then
      return false;
    end if;

    update public.ballot_permits bp
    set status = 'revoked', revoked_at = now(), updated_at = now()
    where bp.permit_digest = v_binding.permit_digest
      and bp.status = 'active';

    delete from public.vote_authorization_bindings b
    where b.user_id = p_user_id and b.poll_id = p_poll_id;
  end if;

  return not exists (
    select 1 from public.user_poll_participations up
    where up.user_id = p_user_id and up.poll_id = p_poll_id
  );
end;
$$;

revoke all on function public.prepare_legacy_account_vote(uuid, uuid)
  from public, anon, authenticated, service_role;

-- Same legacy contract, now serialized against the anonymous path.
create or replace function public.submit_authenticated_vote(
  p_user_id uuid,
  p_poll_id uuid,
  p_choice_id uuid,
  p_voter_hash text,
  p_receipt_hash text
)
returns table(status text, receipt_hash text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lock_id uuid;
  v_vote_id uuid;
begin
  if p_user_id is null or p_poll_id is null or p_choice_id is null
     or p_voter_hash is null or length(p_voter_hash) <> 64
     or p_receipt_hash is null or length(p_receipt_hash) <> 64 then
    return query select 'error'::text, null::text;
    return;
  end if;

  if not public.prepare_legacy_account_vote(p_user_id, p_poll_id) then
    insert into public.vote_attempts (poll_id, choice_id, voter_hash, event)
    values (p_poll_id, p_choice_id, p_voter_hash, 'vote_duplicate');
    return query select 'already_voted'::text, null::text;
    return;
  end if;

  if not exists (select 1 from public.polls p where p.id = p_poll_id) then
    return query select 'error'::text, null::text;
    return;
  end if;

  if not exists (
    select 1 from public.polls p
    where p.id = p_poll_id
      and p.status = 'open'
      and (p.closes_at is null or p.closes_at > now())
  ) then
    insert into public.vote_attempts (poll_id, choice_id, voter_hash, event)
    values (p_poll_id, p_choice_id, p_voter_hash, 'vote_closed');
    return query select 'poll_closed'::text, null::text;
    return;
  end if;

  if not exists (
    select 1 from public.choices c
    where c.id = p_choice_id and c.poll_id = p_poll_id
  ) then
    insert into public.vote_attempts (poll_id, choice_id, voter_hash, event)
    values (p_poll_id, null, p_voter_hash, 'vote_invalid_choice');
    return query select 'invalid_choice'::text, null::text;
    return;
  end if;

  begin
    insert into public.vote_user_locks (poll_id, voter_hash)
    values (p_poll_id, p_voter_hash)
    returning id into v_lock_id;
  exception when unique_violation then
    insert into public.vote_attempts (poll_id, choice_id, voter_hash, event)
    values (p_poll_id, p_choice_id, p_voter_hash, 'vote_duplicate');
    return query select 'already_voted'::text, null::text;
    return;
  end;

  insert into public.votes (poll_id, choice_id, lock_id, user_lock_id, receipt_hash)
  values (p_poll_id, p_choice_id, null, v_lock_id, p_receipt_hash)
  returning id into v_vote_id;

  insert into public.user_poll_answers (user_id, poll_id, choice_id)
  values (p_user_id, p_poll_id, p_choice_id);

  insert into public.user_reputation_events (user_id, poll_id, event_type, points)
  values (p_user_id, p_poll_id, 'verified_answer', 1)
  on conflict (user_id, poll_id, event_type) do nothing;

  update public.profiles p
  set reputation_score = (
        select count(*)::int
        from public.user_poll_participations up
        where up.user_id = p_user_id
      ),
      updated_at = now()
  where p.id = p_user_id;

  insert into public.vote_attempts (poll_id, choice_id, voter_hash, event)
  values (p_poll_id, p_choice_id, p_voter_hash, 'vote_success');

  return query select 'accepted'::text, p_receipt_hash;
end;
$$;

revoke all on function public.submit_authenticated_vote(uuid, uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_authenticated_vote(uuid, uuid, uuid, text, text)
  to service_role;

create or replace function public.redeem_ballot_permit(
  p_permit_digest text,
  p_poll_id uuid,
  p_choice_id uuid
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_permit public.ballot_permits%rowtype;
begin
  if p_permit_digest is null or p_permit_digest !~ '^[0-9a-f]{64}$'
     or p_poll_id is null or p_choice_id is null then
    return 'invalid_permit';
  end if;

  select *
  into v_permit
  from public.ballot_permits bp
  where bp.permit_digest = p_permit_digest
  for update;

  if not found or v_permit.poll_id <> p_poll_id then
    return 'invalid_permit';
  end if;

  if v_permit.status = 'consumed' then
    return 'already_consumed';
  end if;

  if v_permit.status = 'revoked' then
    return 'revoked';
  end if;

  if v_permit.expires_at <= clock_timestamp() then
    update public.ballot_permits
    set status = 'revoked', revoked_at = now(), updated_at = now()
    where permit_digest = p_permit_digest;
    return 'expired';
  end if;

  if not exists (
    select 1 from public.polls p
    where p.id = p_poll_id
      and p.status = 'open'
      and (p.closes_at is null or p.closes_at > now())
  ) then
    return 'poll_closed';
  end if;

  if not exists (
    select 1 from public.choices c
    where c.id = p_choice_id and c.poll_id = p_poll_id
  ) then
    return 'invalid_choice';
  end if;

  insert into public.votes (poll_id, choice_id)
  values (p_poll_id, p_choice_id);

  update public.ballot_permits
  set status = 'consumed', consumed_at = now(), updated_at = now()
  where permit_digest = p_permit_digest;

  return 'accepted';
end;
$$;

revoke all on function public.redeem_ballot_permit(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.redeem_ballot_permit(text, uuid, uuid)
  to anon;

-- Account statistics now use the choice-free participation source.
create or replace function public.get_my_account_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_participations_30_days int := 0;
  v_theme_counts jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select count(*)::int
  into v_participations_30_days
  from public.user_poll_participations up
  where up.user_id = v_user_id
    and up.participated_on >= current_date - 30;

  with theme_order(theme, label, position) as (
    values
      ('politique'::text, 'Politique'::text, 1),
      ('economie'::text, 'Economie'::text, 2),
      ('societe'::text, 'Societe'::text, 3),
      ('sport'::text, 'Sport'::text, 4)
  ),
  counts as (
    select p.theme, count(*)::int as count
    from public.user_poll_participations up
    join public.polls p on p.id = up.poll_id
    where up.user_id = v_user_id
      and p.theme in ('politique', 'economie', 'societe', 'sport')
    group by p.theme
  ),
  total as (
    select coalesce(sum(count), 0)::int as total_count from counts
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'theme', theme_order.theme,
    'label', theme_order.label,
    'count', coalesce(counts.count, 0),
    'percentage', case
      when total.total_count = 0 then 0
      else round((coalesce(counts.count, 0)::numeric * 100) / total.total_count)::int
    end
  ) order by theme_order.position), '[]'::jsonb)
  into v_theme_counts
  from theme_order
  cross join total
  left join counts on counts.theme = theme_order.theme;

  return jsonb_build_object(
    'participations_30_days', v_participations_30_days,
    'participation_by_theme', v_theme_counts
  );
end;
$$;

revoke all on function public.get_my_account_stats() from public, anon, authenticated;
grant execute on function public.get_my_account_stats() to authenticated;
