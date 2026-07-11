create or replace function public.update_my_profile_field(
  p_field text,
  p_value text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_value text := trim(coalesce(p_value, ''));
  v_age int;
  v_profile jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_field = 'username' then
    v_value := public.normalize_username(v_value);
    if v_value !~ '^[a-z0-9_]{3,20}$' then
      raise exception 'invalid_username' using errcode = '23514';
    end if;
    if exists (
      select 1
      from public.profiles p
      where p.username_normalized = v_value
        and p.id <> v_user_id
    ) then
      raise exception 'username_taken' using errcode = '23505';
    end if;

    update public.profiles
    set username = v_value,
        username_normalized = v_value,
        updated_at = now()
    where id = v_user_id;
  elsif p_field = 'sex' then
    if v_value not in ('homme', 'femme') then
      raise exception 'invalid_sex' using errcode = '23514';
    end if;

    update public.profiles
    set sex = v_value,
        updated_at = now()
    where id = v_user_id;
  elsif p_field = 'age' then
    if v_value !~ '^[0-9]{1,3}$' then
      raise exception 'invalid_age' using errcode = '23514';
    end if;
    v_age := v_value::int;
    if v_age < 13 or v_age > 120 then
      raise exception 'invalid_age' using errcode = '23514';
    end if;

    update public.profiles
    set age = v_age,
        updated_at = now()
    where id = v_user_id;
  elsif p_field = 'profession' then
    if v_value not in (
      'Agriculteurs exploitants',
      'Artisans, commerçants, chefs d''entreprise',
      'Cadres et professions intellectuelles supérieures',
      'Professions intermédiaires',
      'Employés',
      'Ouvriers',
      'Retraités',
      'Autres personnes sans activité professionnelle'
    ) then
      raise exception 'invalid_profession' using errcode = '23514';
    end if;

    update public.profiles
    set profession = v_value,
        updated_at = now()
    where id = v_user_id;
  elsif p_field = 'region' then
    if v_value not in (
      'Auvergne-Rhône-Alpes',
      'Bourgogne-Franche-Comté',
      'Bretagne',
      'Centre-Val de Loire',
      'Corse',
      'Grand Est',
      'Hauts-de-France',
      'Île-de-France',
      'Normandie',
      'Nouvelle-Aquitaine',
      'Occitanie',
      'Pays de la Loire',
      'Provence-Alpes-Côte d''Azur',
      'Guadeloupe',
      'Martinique',
      'Guyane',
      'La Réunion',
      'Mayotte'
    ) then
      raise exception 'invalid_region' using errcode = '23514';
    end if;

    update public.profiles
    set region = v_value,
        updated_at = now()
    where id = v_user_id;
  else
    raise exception 'invalid_field' using errcode = '23514';
  end if;

  select to_jsonb(p)
  into v_profile
  from (
    select id, email, username, username_normalized, sex, phone_last4, age, profession, region, reputation_score, created_at, updated_at
    from public.profiles
    where id = v_user_id
  ) p;

  return v_profile;
end;
$$;

revoke all on function public.update_my_profile_field(text, text) from public, anon, authenticated;
grant execute on function public.update_my_profile_field(text, text) to authenticated;
