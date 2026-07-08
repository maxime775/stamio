create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Users allowed to access admin-only RPCs. Manage rows manually from trusted SQL only.';

alter table public.admin_users enable row level security;

revoke all on public.admin_users from public, anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users admin
    where admin.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated, service_role;

create or replace function public.admin_get_status()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_admin(), false);
$$;

revoke all on function public.admin_get_status() from public, anon, authenticated;
grant execute on function public.admin_get_status() to anon, authenticated, service_role;

create or replace function public.admin_create_poll(
  p_question text,
  p_description text,
  p_theme text,
  p_choices text[],
  p_closes_at timestamptz,
  p_status text default 'open',
  p_featured boolean default false,
  p_trend_label text default null
)
returns table(poll_id uuid)
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
  v_poll_id uuid;
  v_index int;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if v_question = '' then
    raise exception 'question_required' using errcode = '22023';
  end if;

  if v_description = '' then
    raise exception 'description_required' using errcode = '22023';
  end if;

  if v_theme not in ('politique', 'economie', 'societe', 'sport') then
    raise exception 'invalid_theme' using errcode = '22023';
  end if;

  if v_status not in ('open', 'closed') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  if v_status = 'open' and (p_closes_at is null or p_closes_at <= now()) then
    raise exception 'invalid_closes_at' using errcode = '22023';
  end if;

  foreach v_choice in array coalesce(p_choices, '{}') loop
    v_choice := btrim(v_choice);
    if v_choice <> '' then
      if v_choice = any(v_choices) then
        raise exception 'duplicate_choice' using errcode = '22023';
      end if;
      if length(v_choice) > 160 then
        raise exception 'choice_too_long' using errcode = '22023';
      end if;
      v_choices := array_append(v_choices, v_choice);
    end if;
  end loop;

  if coalesce(array_length(v_choices, 1), 0) < 2 then
    raise exception 'not_enough_choices' using errcode = '22023';
  end if;

  if array_length(v_choices, 1) > 6 then
    raise exception 'too_many_choices' using errcode = '22023';
  end if;

  insert into public.polls (
    question,
    description,
    status,
    theme,
    featured,
    trend_label,
    closes_at
  )
  values (
    v_question,
    v_description,
    v_status::public.poll_status,
    v_theme,
    coalesce(p_featured, false),
    v_trend_label,
    p_closes_at
  )
  returning id into v_poll_id;

  for v_index in 1..array_length(v_choices, 1) loop
    insert into public.choices (poll_id, label, position)
    values (v_poll_id, v_choices[v_index], v_index);
  end loop;

  return query select v_poll_id;
end;
$$;

revoke all on function public.admin_create_poll(text, text, text, text[], timestamptz, text, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_create_poll(text, text, text, text[], timestamptz, text, boolean, text) to authenticated, service_role;
