create table if not exists public.poll_series (
  id uuid primary key default gen_random_uuid(),
  canonical_question text not null,
  canonical_description text,
  theme text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint poll_series_theme_check check (theme in ('politique', 'economie', 'societe', 'sport'))
);

comment on table public.poll_series is
  'Logical recurring poll questions. Each row can have one or more poll waves in public.polls.';

alter table public.poll_series enable row level security;

revoke all on public.poll_series from public, anon, authenticated;

drop trigger if exists poll_series_set_updated_at on public.poll_series;
create trigger poll_series_set_updated_at before update on public.poll_series
for each row execute function public.set_updated_at();

alter table public.polls
  add column if not exists series_id uuid references public.poll_series(id) on delete set null,
  add column if not exists wave_number integer,
  add column if not exists launched_at timestamptz not null default now(),
  add column if not exists show_in_results boolean not null default false,
  add column if not exists archived boolean not null default false;

alter table public.choices
  add column if not exists choice_key text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'polls_wave_number_check'
      and conrelid = 'public.polls'::regclass
  ) then
    alter table public.polls
      add constraint polls_wave_number_check check (wave_number is null or wave_number > 0);
  end if;
end;
$$;

create index if not exists poll_series_theme_idx on public.poll_series(theme);
create index if not exists poll_series_archived_idx on public.poll_series(archived);
create index if not exists polls_series_id_idx on public.polls(series_id);
create index if not exists polls_show_in_results_idx on public.polls(show_in_results) where show_in_results = true;
create index if not exists polls_archived_idx on public.polls(archived);
create index if not exists choices_choice_key_idx on public.choices(poll_id, choice_key);

do $$
declare
  v_poll record;
  v_series_id uuid;
begin
  for v_poll in
    select id, question, description, theme, created_at, archived
    from public.polls
    where series_id is null
    order by created_at asc
  loop
    insert into public.poll_series (
      canonical_question,
      canonical_description,
      theme,
      archived,
      created_at,
      updated_at
    )
    values (
      v_poll.question,
      v_poll.description,
      coalesce(v_poll.theme, 'societe'),
      coalesce(v_poll.archived, false),
      coalesce(v_poll.created_at, now()),
      now()
    )
    returning id into v_series_id;

    update public.polls
    set series_id = v_series_id,
        wave_number = coalesce(wave_number, 1),
        launched_at = coalesce(launched_at, created_at, now())
    where id = v_poll.id;
  end loop;
end;
$$;

update public.choices
set choice_key = case
  when lower(btrim(label)) in ('oui', 'yes') then 'yes'
  when lower(btrim(label)) in ('non', 'no') then 'no'
  when lower(btrim(label)) in ('ne se prononce pas', 'ne sait pas', 'sans opinion', 'no opinion') then 'no_opinion'
  else 'choice_' || position::text
end
where choice_key is null;

drop policy if exists "Public can read open polls" on public.polls;
drop policy if exists "Public can read visible polls" on public.polls;
create policy "Public can read visible polls"
on public.polls
for select
to anon, authenticated
using (
  archived = false
  and (
    (status = 'open' and (closes_at is null or closes_at > now()))
    or (status = 'closed' and show_in_results = true)
  )
);

drop policy if exists "Public can read choices for open polls" on public.choices;
drop policy if exists "Public can read choices for visible polls" on public.choices;
create policy "Public can read choices for visible polls"
on public.choices
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls p
    where p.id = choices.poll_id
      and p.archived = false
      and (
        (p.status = 'open' and (p.closes_at is null or p.closes_at > now()))
        or (p.status = 'closed' and p.show_in_results = true)
      )
  )
);

grant select on public.polls to anon, authenticated;
grant select on public.choices to anon, authenticated;
revoke insert, update, delete on public.polls from anon, authenticated;
revoke insert, update, delete on public.choices from anon, authenticated;

create or replace function public.admin_clean_choice_key(p_label text, p_position integer)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when lower(btrim(coalesce(p_label, ''))) in ('oui', 'yes') then 'yes'
    when lower(btrim(coalesce(p_label, ''))) in ('non', 'no') then 'no'
    when lower(btrim(coalesce(p_label, ''))) in ('ne se prononce pas', 'ne sait pas', 'sans opinion', 'no opinion') then 'no_opinion'
    else 'choice_' || greatest(coalesce(p_position, 1), 1)::text
  end;
$$;

revoke all on function public.admin_clean_choice_key(text, integer) from public, anon, authenticated;
grant execute on function public.admin_clean_choice_key(text, integer) to service_role;

drop function if exists public.admin_create_poll(text, text, text, text[], timestamptz, text, boolean, text);
create or replace function public.admin_create_poll(
  p_question text,
  p_description text,
  p_theme text,
  p_choices text[],
  p_closes_at timestamptz,
  p_status text default 'open',
  p_featured boolean default false,
  p_trend_label text default null,
  p_series_id uuid default null,
  p_choice_keys text[] default null,
  p_show_in_results boolean default false
)
returns table(poll_id uuid, series_id uuid, wave_number integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_question text := btrim(coalesce(p_question, ''));
  v_description text := btrim(coalesce(p_description, ''));
  v_theme text := btrim(coalesce(p_theme, ''));
  v_status text := btrim(coalesce(p_status, 'open'));
  v_trend_label text := nullif(btrim(coalesce(p_trend_label, '')), '');
  v_choice text;
  v_choices text[] := '{}';
  v_choice_keys text[] := '{}';
  v_key text;
  v_poll_id uuid;
  v_series_id uuid;
  v_wave_number integer;
  v_index integer;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if v_question = '' then raise exception 'question_required' using errcode = '22023'; end if;
  if v_description = '' then raise exception 'description_required' using errcode = '22023'; end if;
  if v_theme not in ('politique', 'economie', 'societe', 'sport') then raise exception 'invalid_theme' using errcode = '22023'; end if;
  if v_status not in ('open', 'closed') then raise exception 'invalid_status' using errcode = '22023'; end if;
  if v_status = 'open' and (p_closes_at is null or p_closes_at <= now()) then raise exception 'invalid_closes_at' using errcode = '22023'; end if;

  foreach v_choice in array coalesce(p_choices, '{}') loop
    v_choice := btrim(v_choice);
    if v_choice <> '' then
      if v_choice = any(v_choices) then raise exception 'duplicate_choice' using errcode = '22023'; end if;
      if length(v_choice) > 160 then raise exception 'choice_too_long' using errcode = '22023'; end if;
      v_choices := array_append(v_choices, v_choice);
    end if;
  end loop;

  if coalesce(array_length(v_choices, 1), 0) < 2 then raise exception 'not_enough_choices' using errcode = '22023'; end if;
  if array_length(v_choices, 1) > 6 then raise exception 'too_many_choices' using errcode = '22023'; end if;

  for v_index in 1..array_length(v_choices, 1) loop
    v_key := nullif(btrim(coalesce(p_choice_keys[v_index], '')), '');
    if v_key is null then v_key := public.admin_clean_choice_key(v_choices[v_index], v_index); end if;
    if v_key = any(v_choice_keys) then v_key := v_key || '_' || v_index::text; end if;
    v_choice_keys := array_append(v_choice_keys, v_key);
  end loop;

  if p_series_id is null then
    insert into public.poll_series (canonical_question, canonical_description, theme)
    values (v_question, v_description, v_theme)
    returning id into v_series_id;
    v_wave_number := 1;
  else
    select ps.id into v_series_id
    from public.poll_series ps
    where ps.id = p_series_id and ps.archived = false;
    if v_series_id is null then raise exception 'invalid_series' using errcode = '22023'; end if;

    select coalesce(max(p.wave_number), 0) + 1 into v_wave_number
    from public.polls p
    where p.series_id = v_series_id;
  end if;

  insert into public.polls (
    question,
    description,
    status,
    theme,
    featured,
    trend_label,
    closes_at,
    series_id,
    wave_number,
    launched_at,
    show_in_results,
    archived
  )
  values (
    v_question,
    v_description,
    v_status::public.poll_status,
    v_theme,
    coalesce(p_featured, false),
    v_trend_label,
    p_closes_at,
    v_series_id,
    v_wave_number,
    now(),
    case when v_status = 'closed' then coalesce(p_show_in_results, false) else false end,
    false
  )
  returning id into v_poll_id;

  for v_index in 1..array_length(v_choices, 1) loop
    insert into public.choices (poll_id, label, position, choice_key)
    values (v_poll_id, v_choices[v_index], v_index, v_choice_keys[v_index]);
  end loop;

  poll_id := v_poll_id;
  series_id := v_series_id;
  wave_number := v_wave_number;
  return next;
end;
$$;

revoke all on function public.admin_create_poll(text, text, text, text[], timestamptz, text, boolean, text, uuid, text[], boolean) from public, anon, authenticated;
grant execute on function public.admin_create_poll(text, text, text, text[], timestamptz, text, boolean, text, uuid, text[], boolean) to authenticated, service_role;

create or replace function public.admin_list_polls()
returns table(
  id uuid,
  series_id uuid,
  wave_number integer,
  question text,
  description text,
  theme text,
  status text,
  closes_at timestamptz,
  created_at timestamptz,
  launched_at timestamptz,
  featured boolean,
  show_in_results boolean,
  archived boolean,
  trend_label text,
  choice_count bigint,
  total_votes bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;

  return query
  select
    p.id,
    p.series_id,
    p.wave_number,
    p.question,
    p.description,
    p.theme,
    p.status::text,
    p.closes_at,
    p.created_at,
    p.launched_at,
    p.featured,
    p.show_in_results,
    p.archived,
    p.trend_label,
    count(distinct c.id)::bigint as choice_count,
    count(distinct v.id)::bigint as total_votes
  from public.polls p
  left join public.choices c on c.poll_id = p.id
  left join public.votes v on v.poll_id = p.id
  group by p.id
  order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_polls() from public, anon, authenticated;
grant execute on function public.admin_list_polls() to authenticated, service_role;

create or replace function public.admin_get_poll(p_poll_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;

  select jsonb_build_object(
    'poll', to_jsonb(p),
    'series', to_jsonb(ps),
    'choices', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.position)
      from public.choices c
      where c.poll_id = p.id
    ), '[]'::jsonb),
    'total_votes', (
      select count(*)::bigint
      from public.votes v
      where v.poll_id = p.id
    )
  )
  into v_result
  from public.polls p
  left join public.poll_series ps on ps.id = p.series_id
  where p.id = p_poll_id;

  if v_result is null then raise exception 'poll_not_found' using errcode = '22023'; end if;
  return v_result;
end;
$$;

revoke all on function public.admin_get_poll(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_poll(uuid) to authenticated, service_role;

create or replace function public.admin_relaunch_poll(
  p_poll_id uuid,
  p_closes_at timestamptz,
  p_status text default 'open',
  p_featured boolean default false
)
returns table(poll_id uuid, series_id uuid, wave_number integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.polls%rowtype;
  v_series_id uuid;
  v_wave_number integer;
  v_poll_id uuid;
  v_status text := btrim(coalesce(p_status, 'open'));
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if v_status not in ('open', 'closed') then raise exception 'invalid_status' using errcode = '22023'; end if;
  if v_status = 'open' and (p_closes_at is null or p_closes_at <= now()) then raise exception 'invalid_closes_at' using errcode = '22023'; end if;

  select * into v_source
  from public.polls
  where id = p_poll_id and archived = false;
  if not found then raise exception 'poll_not_found' using errcode = '22023'; end if;

  v_series_id := v_source.series_id;
  if v_series_id is null then
    insert into public.poll_series (canonical_question, canonical_description, theme)
    values (v_source.question, v_source.description, v_source.theme)
    returning id into v_series_id;

    update public.polls
    set series_id = v_series_id,
        wave_number = coalesce(wave_number, 1)
    where id = v_source.id;
  end if;

  select coalesce(max(p.wave_number), 0) + 1 into v_wave_number
  from public.polls p
  where p.series_id = v_series_id;

  insert into public.polls (
    question,
    description,
    status,
    theme,
    featured,
    trend_label,
    closes_at,
    series_id,
    wave_number,
    launched_at,
    show_in_results,
    archived
  )
  values (
    v_source.question,
    v_source.description,
    v_status::public.poll_status,
    v_source.theme,
    coalesce(p_featured, false),
    v_source.trend_label,
    p_closes_at,
    v_series_id,
    v_wave_number,
    now(),
    false,
    false
  )
  returning id into v_poll_id;

  insert into public.choices (poll_id, label, position, choice_key)
  select v_poll_id,
         c.label,
         c.position,
         coalesce(c.choice_key, public.admin_clean_choice_key(c.label, c.position))
  from public.choices c
  where c.poll_id = v_source.id
  order by c.position;

  poll_id := v_poll_id;
  series_id := v_series_id;
  wave_number := v_wave_number;
  return next;
end;
$$;

revoke all on function public.admin_relaunch_poll(uuid, timestamptz, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_relaunch_poll(uuid, timestamptz, text, boolean) to authenticated, service_role;

create or replace function public.admin_update_poll(
  p_poll_id uuid,
  p_question text,
  p_description text,
  p_theme text,
  p_closes_at timestamptz,
  p_status text,
  p_featured boolean,
  p_show_in_results boolean,
  p_choices text[] default null,
  p_choice_keys text[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll public.polls%rowtype;
  v_vote_count bigint;
  v_question text := btrim(coalesce(p_question, ''));
  v_description text := btrim(coalesce(p_description, ''));
  v_theme text := btrim(coalesce(p_theme, ''));
  v_status text := btrim(coalesce(p_status, 'open'));
  v_choices text[] := '{}';
  v_existing_choices text[];
  v_choice text;
  v_key text;
  v_index integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if v_question = '' then raise exception 'question_required' using errcode = '22023'; end if;
  if v_theme not in ('politique', 'economie', 'societe', 'sport') then raise exception 'invalid_theme' using errcode = '22023'; end if;
  if v_status not in ('open', 'closed') then raise exception 'invalid_status' using errcode = '22023'; end if;
  if v_status = 'open' and (p_closes_at is null or p_closes_at <= now()) then raise exception 'invalid_closes_at' using errcode = '22023'; end if;

  select * into v_poll from public.polls where id = p_poll_id;
  if not found then raise exception 'poll_not_found' using errcode = '22023'; end if;

  select count(*) into v_vote_count from public.votes v where v.poll_id = p_poll_id;

  foreach v_choice in array coalesce(p_choices, '{}') loop
    v_choice := btrim(v_choice);
    if v_choice <> '' then
      if v_choice = any(v_choices) then raise exception 'duplicate_choice' using errcode = '22023'; end if;
      if length(v_choice) > 160 then raise exception 'choice_too_long' using errcode = '22023'; end if;
      v_choices := array_append(v_choices, v_choice);
    end if;
  end loop;

  if p_choices is not null and (coalesce(array_length(v_choices, 1), 0) < 2 or array_length(v_choices, 1) > 6) then
    raise exception 'invalid_choice_count' using errcode = '22023';
  end if;

  if v_vote_count > 0 then
    select array_agg(c.label order by c.position) into v_existing_choices
    from public.choices c
    where c.poll_id = p_poll_id;

    if v_question <> v_poll.question or v_theme <> v_poll.theme then
      raise exception 'destructive_update_blocked' using errcode = '42501';
    end if;

    if p_choices is not null and v_choices is distinct from v_existing_choices then
      raise exception 'choice_update_blocked' using errcode = '42501';
    end if;
  end if;

  update public.polls
  set question = v_question,
      description = v_description,
      theme = v_theme,
      status = v_status::public.poll_status,
      closes_at = p_closes_at,
      featured = coalesce(p_featured, false),
      show_in_results = case when v_status = 'closed' then coalesce(p_show_in_results, false) else false end
  where id = p_poll_id;

  if v_vote_count = 0 and p_choices is not null then
    delete from public.choices where poll_id = p_poll_id;
    for v_index in 1..array_length(v_choices, 1) loop
      v_key := nullif(btrim(coalesce(p_choice_keys[v_index], '')), '');
      if v_key is null then v_key := public.admin_clean_choice_key(v_choices[v_index], v_index); end if;
      insert into public.choices (poll_id, label, position, choice_key)
      values (p_poll_id, v_choices[v_index], v_index, v_key);
    end loop;
  end if;

  if v_poll.series_id is not null and v_vote_count = 0 and coalesce(v_poll.wave_number, 1) = 1 then
    update public.poll_series
    set canonical_question = v_question,
        canonical_description = v_description,
        theme = v_theme
    where id = v_poll.series_id;
  end if;
end;
$$;

revoke all on function public.admin_update_poll(uuid, text, text, text, timestamptz, text, boolean, boolean, text[], text[]) from public, anon, authenticated;
grant execute on function public.admin_update_poll(uuid, text, text, text, timestamptz, text, boolean, boolean, text[], text[]) to authenticated, service_role;

create or replace function public.admin_close_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;

  update public.polls
  set status = 'closed'::public.poll_status,
      closes_at = least(coalesce(closes_at, now()), now()),
      show_in_results = false
  where id = p_poll_id and archived = false;

  if not found then raise exception 'poll_not_found' using errcode = '22023'; end if;
end;
$$;

revoke all on function public.admin_close_poll(uuid) from public, anon, authenticated;
grant execute on function public.admin_close_poll(uuid) to authenticated, service_role;

create or replace function public.admin_set_poll_results_visibility(p_poll_id uuid, p_show boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.poll_status;
  v_archived boolean;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;

  select status, archived into v_status, v_archived
  from public.polls
  where id = p_poll_id;

  if not found then raise exception 'poll_not_found' using errcode = '22023'; end if;
  if v_status <> 'closed' then raise exception 'poll_must_be_closed' using errcode = '22023'; end if;
  if v_archived then raise exception 'poll_archived' using errcode = '22023'; end if;

  update public.polls
  set show_in_results = coalesce(p_show, false)
  where id = p_poll_id;
end;
$$;

revoke all on function public.admin_set_poll_results_visibility(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_poll_results_visibility(uuid, boolean) to authenticated, service_role;

create or replace function public.admin_delete_or_archive_poll(p_poll_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vote_count bigint;
  v_comment_count bigint;
  v_answer_count bigint;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;

  if not exists (select 1 from public.polls where id = p_poll_id) then
    raise exception 'poll_not_found' using errcode = '22023';
  end if;

  select count(*) into v_vote_count from public.votes where poll_id = p_poll_id;
  select count(*) into v_comment_count from public.poll_comments where poll_id = p_poll_id;
  select count(*) into v_answer_count from public.user_poll_answers where poll_id = p_poll_id;

  if v_vote_count = 0 and v_comment_count = 0 and v_answer_count = 0 then
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

revoke all on function public.admin_delete_or_archive_poll(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_or_archive_poll(uuid) to authenticated, service_role;

create or replace function public.admin_get_series_history(p_series_id uuid)
returns table(
  poll_id uuid,
  wave_number integer,
  status text,
  created_at timestamptz,
  closes_at timestamptz,
  show_in_results boolean,
  archived boolean,
  total_votes bigint,
  results jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;

  return query
  select
    p.id,
    p.wave_number,
    p.status::text,
    p.created_at,
    p.closes_at,
    p.show_in_results,
    p.archived,
    count(distinct v.id)::bigint,
    coalesce(jsonb_agg(
      distinct jsonb_build_object(
        'choice_id', c.id,
        'choice_key', c.choice_key,
        'label', c.label,
        'votes', (
          select count(*)::bigint
          from public.votes vv
          where vv.poll_id = p.id and vv.choice_id = c.id
        )
      )
    ) filter (where c.id is not null), '[]'::jsonb)
  from public.polls p
  left join public.choices c on c.poll_id = p.id
  left join public.votes v on v.poll_id = p.id
  where p.series_id = p_series_id
  group by p.id
  order by coalesce(p.wave_number, 1) asc, p.created_at asc;
end;
$$;

revoke all on function public.admin_get_series_history(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_series_history(uuid) to authenticated, service_role;

create or replace function public.get_poll_results(p_poll_id uuid)
returns table(choice_id uuid, label text, votes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.id as choice_id,
         c.label,
         count(v.id) as votes
  from public.choices c
  join public.polls p on p.id = c.poll_id
  left join public.votes v on v.choice_id = c.id
  where c.poll_id = p_poll_id
    and p.archived = false
    and (
      (p.status = 'open' and (p.closes_at is null or p.closes_at > now()))
      or (p.status = 'closed' and p.show_in_results = true)
    )
  group by c.id, c.label, c.position
  order by c.position;
$$;

revoke all on function public.get_poll_results(uuid) from public, anon, authenticated;
grant execute on function public.get_poll_results(uuid) to anon, authenticated, service_role;
