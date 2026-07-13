create table if not exists public.poll_resources (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  title text not null,
  url text not null,
  resource_type text not null,
  description text,
  position integer not null,
  created_at timestamptz not null default now(),
  constraint poll_resources_type_check check (resource_type in ('link', 'pdf', 'article', 'report', 'other')),
  constraint poll_resources_position_check check (position > 0),
  constraint poll_resources_title_check check (btrim(title) <> '' and length(title) <= 140),
  constraint poll_resources_url_check check (url ~* '^https?://[^[:space:]]+$' and length(url) <= 2048),
  constraint poll_resources_description_check check (description is null or length(description) <= 280)
);

comment on table public.poll_resources is
  'Admin-managed public context links attached to a poll. URLs only; no client-side upload.';

alter table public.poll_resources enable row level security;

revoke all on public.poll_resources from public, anon, authenticated;

create index if not exists poll_resources_poll_position_idx on public.poll_resources(poll_id, position);

drop policy if exists "Public can read resources for visible polls" on public.poll_resources;
create policy "Public can read resources for visible polls"
on public.poll_resources
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls p
    where p.id = poll_resources.poll_id
      and p.archived = false
      and (
        (p.status = 'open' and (p.closes_at is null or p.closes_at > now()))
        or (p.status = 'closed' and p.show_in_results = true)
      )
  )
);

grant select on public.poll_resources to anon, authenticated;
revoke insert, update, delete on public.poll_resources from anon, authenticated;

create or replace function public.admin_replace_poll_resources(
  p_poll_id uuid,
  p_resources jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resource jsonb;
  v_position integer := 0;
  v_title text;
  v_url text;
  v_type text;
  v_description text;
  v_payload jsonb := coalesce(p_resources, '[]'::jsonb);
begin
  if jsonb_typeof(v_payload) <> 'array' then
    raise exception 'invalid_resources' using errcode = '22023';
  end if;

  if jsonb_array_length(v_payload) > 5 then
    raise exception 'too_many_resources' using errcode = '22023';
  end if;

  delete from public.poll_resources where poll_id = p_poll_id;

  for v_resource in select value from jsonb_array_elements(v_payload) loop
    v_position := v_position + 1;
    v_title := btrim(coalesce(v_resource->>'title', ''));
    v_url := btrim(coalesce(v_resource->>'url', ''));
    v_type := btrim(coalesce(v_resource->>'resource_type', ''));
    v_description := nullif(btrim(coalesce(v_resource->>'description', '')), '');

    if v_title = '' then raise exception 'resource_title_required' using errcode = '22023'; end if;
    if length(v_title) > 140 then raise exception 'resource_title_too_long' using errcode = '22023'; end if;
    if v_url = '' then raise exception 'resource_url_required' using errcode = '22023'; end if;
    if length(v_url) > 2048 or v_url !~* '^https?://[^[:space:]]+$' then
      raise exception 'invalid_resource_url' using errcode = '22023';
    end if;
    if v_type not in ('link', 'pdf', 'article', 'report', 'other') then
      raise exception 'invalid_resource_type' using errcode = '22023';
    end if;
    if v_description is not null and length(v_description) > 280 then
      raise exception 'resource_description_too_long' using errcode = '22023';
    end if;

    insert into public.poll_resources (
      poll_id,
      title,
      url,
      resource_type,
      description,
      position
    )
    values (
      p_poll_id,
      v_title,
      v_url,
      v_type,
      v_description,
      v_position
    );
  end loop;
end;
$$;

revoke all on function public.admin_replace_poll_resources(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_replace_poll_resources(uuid, jsonb) to service_role;

drop function if exists public.admin_create_poll(text, text, text, text[], timestamptz, text, boolean, text, uuid, text[], boolean);
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
  p_show_in_results boolean default false,
  p_resources jsonb default '[]'::jsonb
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
  if length(v_description) > 4000 then raise exception 'description_too_long' using errcode = '22023'; end if;
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

  perform public.admin_replace_poll_resources(v_poll_id, p_resources);

  poll_id := v_poll_id;
  series_id := v_series_id;
  wave_number := v_wave_number;
  return next;
end;
$$;

revoke all on function public.admin_create_poll(text, text, text, text[], timestamptz, text, boolean, text, uuid, text[], boolean, jsonb) from public, anon, authenticated;
grant execute on function public.admin_create_poll(text, text, text, text[], timestamptz, text, boolean, text, uuid, text[], boolean, jsonb) to authenticated, service_role;

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
    'resources', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.position)
      from public.poll_resources r
      where r.poll_id = p.id
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

  insert into public.poll_resources (poll_id, title, url, resource_type, description, position)
  select v_poll_id, r.title, r.url, r.resource_type, r.description, r.position
  from public.poll_resources r
  where r.poll_id = v_source.id
  order by r.position;

  poll_id := v_poll_id;
  series_id := v_series_id;
  wave_number := v_wave_number;
  return next;
end;
$$;

revoke all on function public.admin_relaunch_poll(uuid, timestamptz, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_relaunch_poll(uuid, timestamptz, text, boolean) to authenticated, service_role;

drop function if exists public.admin_update_poll(uuid, text, text, text, timestamptz, text, boolean, boolean, text[], text[]);
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
  p_choice_keys text[] default null,
  p_resources jsonb default null
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
  if length(v_description) > 4000 then raise exception 'description_too_long' using errcode = '22023'; end if;
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

  if p_resources is not null then
    perform public.admin_replace_poll_resources(p_poll_id, p_resources);
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

revoke all on function public.admin_update_poll(uuid, text, text, text, timestamptz, text, boolean, boolean, text[], text[], jsonb) from public, anon, authenticated;
grant execute on function public.admin_update_poll(uuid, text, text, text, timestamptz, text, boolean, boolean, text[], text[], jsonb) to authenticated, service_role;
