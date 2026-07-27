-- Progressive web passkey rollout. Historical profiles remain usable until a
-- later migration explicitly sets passkey_required_at for them.
alter table public.profiles
  add column if not exists passkey_required_at timestamptz,
  add column if not exists passkey_enrolled_at timestamptz;

comment on column public.profiles.passkey_required_at is
  'When set by trusted server code, sensitive account actions require a verified passkey enrollment.';
comment on column public.profiles.passkey_enrolled_at is
  'Set only by trusted server code after Supabase Auth confirms at least one passkey.';

revoke update (passkey_required_at, passkey_enrolled_at) on public.profiles from authenticated;
grant select (
  id, email, username, username_normalized, sex, phone_last4,
  phone_verified_at, phone_last_changed_at, age, profession, region,
  reputation_score, created_at, updated_at, passkey_required_at, passkey_enrolled_at
) on public.profiles to authenticated;

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
    passkey_required_at
  )
  values (
    new.id, new.email, v_username, v_username_normalized,
    new.raw_user_meta_data->>'sex', v_age,
    nullif(new.raw_user_meta_data->>'profession', ''),
    nullif(new.raw_user_meta_data->>'region', ''),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(public.profiles.username, excluded.username),
    username_normalized = coalesce(public.profiles.username_normalized, excluded.username_normalized),
    sex = excluded.sex,
    age = excluded.age,
    profession = excluded.profession,
    region = excluded.region,
    updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- Anonymous, deterministic server-only lock for authenticated voters.
create table if not exists public.vote_user_locks (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  voter_hash text not null check (length(voter_hash) = 64),
  created_at timestamptz not null default now(),
  unique (poll_id, voter_hash)
);

comment on table public.vote_user_locks is
  'Server-only HMAC locks. voter_hash contains no user_id, email, phone or raw credential.';

alter table public.vote_user_locks enable row level security;
revoke all on public.vote_user_locks from public, anon, authenticated;

alter table public.votes
  add column if not exists user_lock_id uuid references public.vote_user_locks(id) on delete restrict;
alter table public.votes alter column lock_id drop not null;
alter table public.votes drop constraint if exists votes_exactly_one_lock_check;
alter table public.votes add constraint votes_exactly_one_lock_check check (
  (lock_id is not null and user_lock_id is null)
  or (lock_id is null and user_lock_id is not null)
);
create unique index if not exists votes_user_lock_id_unique_idx
  on public.votes(user_lock_id) where user_lock_id is not null;

-- Persistent, shared rate-limit windows for Edge Functions.
create table if not exists public.abuse_rate_limits (
  key_hash text not null check (length(key_hash) = 64),
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  expires_at timestamptz not null,
  primary key (key_hash, action)
);

create index if not exists abuse_rate_limits_expires_at_idx on public.abuse_rate_limits(expires_at);
alter table public.abuse_rate_limits enable row level security;
revoke all on public.abuse_rate_limits from public, anon, authenticated;

create or replace function public.consume_rate_limit(
  p_key_hash text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_row public.abuse_rate_limits%rowtype;
begin
  if p_key_hash is null or length(p_key_hash) <> 64
     or p_action is null or btrim(p_action) = ''
     or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit_parameters' using errcode = '22023';
  end if;

  loop
    select * into v_row
    from public.abuse_rate_limits
    where key_hash = p_key_hash and action = p_action
    for update;

    if found then
      if v_row.expires_at <= v_now then
        update public.abuse_rate_limits
        set window_started_at = v_now,
            request_count = 1,
            expires_at = v_now + make_interval(secs => p_window_seconds)
        where key_hash = p_key_hash and action = p_action;
        return true;
      end if;
      if v_row.request_count >= p_limit then
        return false;
      end if;
      update public.abuse_rate_limits
      set request_count = request_count + 1
      where key_hash = p_key_hash and action = p_action;
      return true;
    end if;

    begin
      insert into public.abuse_rate_limits (
        key_hash, action, window_started_at, request_count, expires_at
      ) values (
        p_key_hash, p_action, v_now, 1, v_now + make_interval(secs => p_window_seconds)
      );
      return true;
    exception when unique_violation then
      -- A concurrent request created the window; retry under row lock.
    end;
  end loop;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

create or replace function public.purge_expired_rate_limits()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted bigint;
begin
  delete from public.abuse_rate_limits where expires_at <= clock_timestamp();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_expired_rate_limits() from public, anon, authenticated;
grant execute on function public.purge_expired_rate_limits() to service_role;

alter table public.vote_attempts
  add column if not exists voter_hash text check (voter_hash is null or length(voter_hash) = 64);
alter table public.vote_attempts drop constraint if exists vote_attempts_event_check;
alter table public.vote_attempts add constraint vote_attempts_event_check check (event in (
  'otp_started', 'otp_start_failed', 'otp_rejected',
  'vote_accepted', 'vote_duplicate', 'vote_error',
  'vote_success', 'vote_closed', 'vote_invalid_choice', 'vote_rate_limited',
  'vote_auth_failed', 'vote_passkey_required', 'vote_server_error'
));

create or replace function public.log_vote_attempt(
  p_poll_id uuid,
  p_choice_id uuid,
  p_voter_hash text,
  p_event text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.vote_attempts (poll_id, choice_id, voter_hash, event)
  values (p_poll_id, p_choice_id, p_voter_hash, p_event);
end;
$$;

revoke all on function public.log_vote_attempt(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.log_vote_attempt(uuid, uuid, text, text) to service_role;

-- Single atomic source of truth: lock, anonymous vote, user history,
-- reputation and success/duplicate/business-error audit.
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
        select count(*)::int from public.user_poll_answers a where a.user_id = p_user_id
      ),
      updated_at = now()
  where p.id = p_user_id;

  insert into public.vote_attempts (poll_id, choice_id, voter_hash, event)
  values (p_poll_id, p_choice_id, p_voter_hash, 'vote_success');

  return query select 'accepted'::text, p_receipt_hash;
end;
$$;

revoke all on function public.submit_authenticated_vote(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_authenticated_vote(uuid, uuid, uuid, text, text) to service_role;

-- Progressive comment/like enforcement. Historical profiles (required_at null)
-- remain unaffected. service_role/internal writes are explicitly allowed.
create or replace function public.require_passkey_for_sensitive_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if auth.role() = 'service_role' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if v_uid is null then
    raise exception 'authentication_required';
  end if;
  if exists (
    select 1 from public.profiles p
    where p.id = v_uid
      and p.passkey_required_at is not null
      and p.passkey_enrolled_at is null
  ) then
    raise exception 'passkey_enrollment_required' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.require_passkey_for_sensitive_write() from public, anon, authenticated;

drop trigger if exists poll_comments_require_passkey on public.poll_comments;
create trigger poll_comments_require_passkey
before insert or update on public.poll_comments
for each row execute function public.require_passkey_for_sensitive_write();

drop trigger if exists poll_comment_likes_require_passkey on public.poll_comment_likes;
create trigger poll_comment_likes_require_passkey
before insert or delete on public.poll_comment_likes
for each row execute function public.require_passkey_for_sensitive_write();
