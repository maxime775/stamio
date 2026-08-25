-- Public URLs are series metadata. Poll UUIDs remain the only identifiers used
-- by voting, discussions, results aggregation and all other business logic.

alter table public.poll_series
  add column if not exists slug text;

create or replace function public.normalize_poll_series_slug(p_value text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  with normalized as (
    select regexp_replace(
      translate(
        replace(replace(replace(replace(lower(btrim(p_value)), 'œ', 'oe'), 'æ', 'ae'), '’', ''), '''', ''),
        'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ',
        'aaaaaaceeeeiiiinooooouuuuyy'
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    ) as value
  ), cleaned as (
    select regexp_replace(value, '(^-+|-+$)', '', 'g') as value
    from normalized
  ), clipped as (
    select value, left(value, 80) as short_value
    from cleaned
  )
  select case
    when length(value) <= 80 then value
    else regexp_replace(short_value, '-[^-]*$', '')
  end
  from clipped;
$$;

revoke all on function public.normalize_poll_series_slug(text) from public, anon, authenticated;
grant execute on function public.normalize_poll_series_slug(text) to authenticated, service_role;

-- Editorially reviewed slugs for the four series inventoried in production.
-- Local fixture series are inserted later by supabase/seed.sql with their own
-- slugs and are intentionally not part of this production backfill.
update public.poll_series ps
set slug = proposed.slug
from (
  values
    ('a926388b-2958-4d49-8a14-2ec4992027ca'::uuid, 'taxe-zucman'::text),
    ('23fedfb0-9be5-4e8c-86ee-a1b5a335f67a'::uuid, 'peine-ineligibilite-entrave-democratie'::text),
    ('cd21b620-764b-4713-b707-2a05363103bb'::uuid, 'dette-publique'::text),
    ('cd91e59b-e5a5-4f51-b803-d744dc7c87bc'::uuid, 'sortie-nucleaire-france'::text)
) as proposed(series_id, slug)
where ps.id = proposed.series_id
  and ps.slug is null;

do $$
declare
  v_collision record;
begin
  if exists (select 1 from public.poll_series where slug is null) then
    raise exception 'poll_series_slug_backfill_incomplete: %',
      (select string_agg(id::text, ', ' order by id) from public.poll_series where slug is null)
      using errcode = '23502', hint = 'Add and review an explicit slug for every existing series before applying the migration.';
  end if;

  select slug, array_agg(id order by id) as series_ids
  into v_collision
  from public.poll_series
  group by slug
  having count(*) > 1
  limit 1;

  if found then
    raise exception 'poll_series_slug_collision: % (%)', v_collision.slug, v_collision.series_ids
      using errcode = '23505', hint = 'Choose and review a distinct editorial slug before applying the migration.';
  end if;

  if exists (
    select 1
    from public.poll_series
    where length(slug) not between 3 and 80
       or slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ) then
    raise exception 'invalid_poll_series_slug_backfill'
      using errcode = '22023', hint = 'Choose and review a valid editorial slug before applying the migration.';
  end if;
end;
$$;

alter table public.poll_series
  alter column slug set not null;

alter table public.poll_series
  add constraint poll_series_slug_format_check
  check (
    length(slug) between 3 and 80
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  );

create unique index poll_series_slug_unique_idx on public.poll_series(slug);

grant select (id, slug) on public.poll_series to anon, authenticated;

drop policy if exists "Public can read visible poll series slugs" on public.poll_series;
create policy "Public can read visible poll series slugs"
on public.poll_series
for select
to anon, authenticated
using (
  archived = false
  and exists (
    select 1
    from public.polls p
    where p.series_id = poll_series.id
      and p.archived = false
      and (
        (p.status = 'open' and (p.closes_at is null or p.closes_at > now()))
        or (p.status = 'closed' and p.show_in_results = true)
      )
  )
);

create or replace function public.resolve_public_question(p_slug text)
returns table(poll_id uuid, series_id uuid, series_slug text, wave_number integer, route_kind text)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    ps.id,
    ps.slug,
    p.wave_number,
    case
      when p.status = 'open' and (p.closes_at is null or p.closes_at > now()) then 'question'
      else 'resultats'
    end
  from public.poll_series ps
  join public.polls p on p.series_id = ps.id
  where ps.slug = p_slug
    and ps.archived = false
    and p.archived = false
    and (
      (p.status = 'open' and (p.closes_at is null or p.closes_at > now()))
      or (p.status = 'closed' and p.show_in_results = true)
    )
  order by
    case when p.status = 'open' and (p.closes_at is null or p.closes_at > now()) then 0 else 1 end,
    p.wave_number desc nulls last,
    p.launched_at desc,
    p.created_at desc
  limit 1;
$$;

revoke all on function public.resolve_public_question(text) from public, anon, authenticated;
grant execute on function public.resolve_public_question(text) to anon, authenticated, service_role;

create or replace function public.resolve_public_poll_result(p_slug text, p_wave_number integer)
returns table(poll_id uuid, series_id uuid, series_slug text, wave_number integer)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, ps.id, ps.slug, p.wave_number
  from public.poll_series ps
  join public.polls p on p.series_id = ps.id
  where ps.slug = p_slug
    and ps.archived = false
    and p.archived = false
    and p.wave_number = p_wave_number
    and p.status = 'closed'
    and p.show_in_results = true
  limit 1;
$$;

revoke all on function public.resolve_public_poll_result(text, integer) from public, anon, authenticated;
grant execute on function public.resolve_public_poll_result(text, integer) to anon, authenticated, service_role;

create or replace function public.resolve_legacy_poll_url(p_poll_id uuid)
returns table(poll_id uuid, series_id uuid, series_slug text, wave_number integer, route_kind text)
language sql
stable
security definer
set search_path = public
as $$
  with source_poll as (
    select p.*, ps.slug as series_slug, ps.archived as series_archived
    from public.polls p
    join public.poll_series ps on ps.id = p.series_id
    where p.id = p_poll_id
      and p.archived = false
      and ps.archived = false
  ), active_poll as (
    select p.id
    from public.polls p
    join source_poll source on source.series_id = p.series_id
    where p.archived = false
      and p.status = 'open'
      and (p.closes_at is null or p.closes_at > now())
    order by p.wave_number desc nulls last, p.launched_at desc, p.created_at desc
    limit 1
  )
  select
    source.id,
    source.series_id,
    source.series_slug,
    source.wave_number,
    case when active.id = source.id then 'question' else 'resultats' end
  from source_poll source
  left join active_poll active on true
  where active.id = source.id
     or (source.status = 'closed' and source.show_in_results = true)
  limit 1;
$$;

revoke all on function public.resolve_legacy_poll_url(uuid) from public, anon, authenticated;
grant execute on function public.resolve_legacy_poll_url(uuid) to anon, authenticated, service_role;

drop function if exists public.admin_create_poll(text, text, text, text[], timestamptz, text, boolean, text, uuid, text[], boolean, jsonb);
create function public.admin_create_poll(
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
  p_resources jsonb default '[]'::jsonb,
  p_slug text default null
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
  v_slug text;
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
  if length(v_description) > 20000 then raise exception 'description_too_long' using errcode = '22023'; end if;
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
    v_slug := coalesce(nullif(btrim(p_slug), ''), public.normalize_poll_series_slug(v_question));
    if length(v_slug) not between 3 and 80 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      raise exception 'invalid_series_slug' using errcode = '22023';
    end if;
    if exists (select 1 from public.poll_series ps where ps.slug = v_slug) then
      raise exception 'slug_already_exists' using errcode = '23505';
    end if;

    insert into public.poll_series (canonical_question, canonical_description, theme, slug)
    values (v_question, v_description, v_theme, v_slug)
    returning id into v_series_id;
    v_wave_number := 1;
  else
    select ps.id, ps.slug into v_series_id, v_slug
    from public.poll_series ps
    where ps.id = p_series_id and ps.archived = false;
    if v_series_id is null then raise exception 'invalid_series' using errcode = '22023'; end if;

    select coalesce(max(p.wave_number), 0) + 1 into v_wave_number
    from public.polls p
    where p.series_id = v_series_id;
  end if;

  insert into public.polls (
    question, description, status, theme, featured, trend_label, closes_at,
    series_id, wave_number, launched_at, show_in_results, archived
  )
  values (
    v_question, v_description, v_status::public.poll_status, v_theme,
    coalesce(p_featured, false), v_trend_label, p_closes_at, v_series_id,
    v_wave_number, now(),
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

revoke all on function public.admin_create_poll(text, text, text, text[], timestamptz, text, boolean, text, uuid, text[], boolean, jsonb, text) from public, anon, authenticated;
grant execute on function public.admin_create_poll(text, text, text, text[], timestamptz, text, boolean, text, uuid, text[], boolean, jsonb, text) to authenticated, service_role;

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

  select * into v_source from public.polls where id = p_poll_id and archived = false;
  if not found then raise exception 'poll_not_found' using errcode = '22023'; end if;

  v_series_id := v_source.series_id;
  if v_series_id is null then
    insert into public.poll_series (canonical_question, canonical_description, theme, slug)
    values (v_source.question, v_source.description, v_source.theme, public.normalize_poll_series_slug(v_source.question))
    returning id into v_series_id;

    update public.polls
    set series_id = v_series_id, wave_number = coalesce(wave_number, 1)
    where id = v_source.id;
  end if;

  select coalesce(max(p.wave_number), 0) + 1 into v_wave_number
  from public.polls p where p.series_id = v_series_id;

  insert into public.polls (
    question, description, status, theme, featured, trend_label, closes_at,
    series_id, wave_number, launched_at, show_in_results, archived
  )
  values (
    v_source.question, v_source.description, v_status::public.poll_status,
    v_source.theme, coalesce(p_featured, false), v_source.trend_label,
    p_closes_at, v_series_id, v_wave_number, now(), false, false
  )
  returning id into v_poll_id;

  insert into public.choices (poll_id, label, position, choice_key)
  select v_poll_id, c.label, c.position,
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

drop function if exists public.admin_list_polls();
create function public.admin_list_polls()
returns table(
  id uuid,
  series_id uuid,
  series_slug text,
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
    p.id, p.series_id, ps.slug, p.wave_number, p.question, p.description,
    p.theme, p.status::text, p.closes_at, p.created_at, p.launched_at,
    p.featured, p.show_in_results, p.archived, p.trend_label,
    count(distinct c.id)::bigint, count(distinct v.id)::bigint
  from public.polls p
  left join public.poll_series ps on ps.id = p.series_id
  left join public.choices c on c.poll_id = p.id
  left join public.votes v on v.poll_id = p.id
  group by p.id, ps.slug
  order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_polls() from public, anon, authenticated;
grant execute on function public.admin_list_polls() to authenticated, service_role;

-- Review query to run against the target database before applying this local migration:
-- select ps.id as series_id, ps.canonical_question as question, ps.slug
-- from public.poll_series ps order by ps.created_at, ps.id;
