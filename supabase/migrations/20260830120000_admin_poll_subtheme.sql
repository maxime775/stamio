drop function if exists public.admin_update_poll(uuid, text, text, text, timestamptz, text, boolean, boolean, text[], text[], jsonb);

create function public.admin_update_poll(
  p_poll_id uuid,
  p_question text,
  p_description text,
  p_theme text,
  p_closes_at timestamptz,
  p_status text,
  p_featured boolean,
  p_show_in_results boolean,
  p_trend_label text,
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
  v_trend_label text := nullif(btrim(coalesce(p_trend_label, '')), '');
  v_choices text[] := '{}';
  v_existing_choices text[];
  v_choice text;
  v_key text;
  v_index integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if v_question = '' then raise exception 'question_required' using errcode = '22023'; end if;
  if length(v_description) > 20000 then raise exception 'description_too_long' using errcode = '22023'; end if;
  if length(v_trend_label) > 60 then raise exception 'trend_label_too_long' using errcode = '22023'; end if;
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
      show_in_results = case when v_status = 'closed' then coalesce(p_show_in_results, false) else false end,
      trend_label = v_trend_label
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

revoke all on function public.admin_update_poll(uuid, text, text, text, timestamptz, text, boolean, boolean, text, text[], text[], jsonb) from public, anon, authenticated;
grant execute on function public.admin_update_poll(uuid, text, text, text, timestamptz, text, boolean, boolean, text, text[], text[], jsonb) to authenticated, service_role;
