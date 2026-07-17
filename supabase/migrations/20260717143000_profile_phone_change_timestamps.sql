alter table public.profiles
  add column if not exists phone_verified_at timestamptz,
  add column if not exists phone_last_changed_at timestamptz;

comment on column public.profiles.phone_verified_at is
  'Date de derniere verification OTP du telephone de compte.';

comment on column public.profiles.phone_last_changed_at is
  'Date de derniere modification effective du telephone de compte.';
