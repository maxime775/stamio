create or replace function public.normalize_username(p_username text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(p_username, '')));
$$;

alter table public.profiles
  add column if not exists username text,
  add column if not exists username_normalized text;

update public.profiles
set username_normalized = public.normalize_username(username)
where username is not null
  and username_normalized is distinct from public.normalize_username(username);

do $$ begin
  alter table public.profiles
    add constraint profiles_username_format_check
    check (
      username is null
      or username ~ '^[A-Za-z0-9_]{3,20}$'
    );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_username_normalized_format_check
    check (
      username_normalized is null
      or username_normalized ~ '^[a-z0-9_]{3,20}$'
    );
exception
  when duplicate_object then null;
end $$;

create unique index if not exists profiles_username_normalized_unique_idx
on public.profiles(username_normalized)
where username_normalized is not null;

create or replace function public.check_username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := public.normalize_username(p_username);
begin
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles p
    where p.username_normalized = v_username
      and p.id is distinct from auth.uid()
  );
end;
$$;

revoke all on function public.check_username_available(text) from public, anon, authenticated;
grant execute on function public.check_username_available(text) to anon, authenticated;

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
  from public.user_poll_answers a
  where a.user_id = v_user_id
    and a.created_at >= now() - interval '30 days';

  with theme_order(theme, label, position) as (
    values
      ('politique'::text, 'Politique'::text, 1),
      ('economie'::text, 'Economie'::text, 2),
      ('societe'::text, 'Societe'::text, 3),
      ('sport'::text, 'Sport'::text, 4)
  ),
  counts as (
    select p.theme, count(*)::int as count
    from public.user_poll_answers a
    join public.polls p on p.id = a.poll_id
    where a.user_id = v_user_id
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

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
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
    nullif(new.raw_user_meta_data->>'phone_last4', ''),
    v_age,
    nullif(new.raw_user_meta_data->>'profession', ''),
    nullif(new.raw_user_meta_data->>'region', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      username = excluded.username,
      username_normalized = excluded.username_normalized,
      sex = excluded.sex,
      phone_last4 = excluded.phone_last4,
      age = excluded.age,
      profession = excluded.profession,
      region = excluded.region,
      updated_at = now();

  return new;
end;
$$;
