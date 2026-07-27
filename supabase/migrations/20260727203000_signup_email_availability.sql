-- Server-only email availability lookup used before sign-up.
-- This deliberately exposes only the product states required by the signup UI.
create or replace function public.get_signup_email_status(p_email text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status text;
begin
  if p_email is null
     or length(p_email) > 254
     or lower(btrim(p_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  select case
    when u.email_confirmed_at is null then 'existing_unconfirmed'
    else 'existing_confirmed'
  end
  into v_status
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
  limit 1;

  return coalesce(v_status, 'available');
end;
$$;

revoke all on function public.get_signup_email_status(text) from public, anon, authenticated;
grant execute on function public.get_signup_email_status(text) to service_role;
