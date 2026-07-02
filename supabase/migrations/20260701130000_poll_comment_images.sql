alter table public.poll_comments
  add column if not exists image_path text,
  add column if not exists image_mime_type text,
  add column if not exists image_size integer;

alter table public.poll_comments
  add constraint poll_comments_image_metadata_check check (
    (image_path is null and image_mime_type is null and image_size is null)
    or (image_path is not null and image_mime_type in ('image/png', 'image/jpeg', 'image/webp') and image_size between 1 and 5242880)
  );

comment on column public.poll_comments.image_path is
  'Public Storage object path only; never contains email, phone number, or other profile data.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('poll-comment-images', 'poll-comment-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads poll comment images" on storage.objects;
create policy "Public reads poll comment images"
on storage.objects for select to anon, authenticated
using (bucket_id = 'poll-comment-images');

drop policy if exists "Authenticated users upload own poll comment images" on storage.objects;
create policy "Authenticated users upload own poll comment images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'poll-comment-images'
  and name ~ (
    '^poll-comments/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/' ||
    auth.uid()::text ||
    '/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}[.](png|jpe?g|webp)$'
  )
);

drop policy if exists "Authenticated users remove own poll comment images" on storage.objects;
create policy "Authenticated users remove own poll comment images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'poll-comment-images'
  and name ~ (
    '^poll-comments/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/' ||
    auth.uid()::text ||
    '/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}[.](png|jpe?g|webp)$'
  )
);

create or replace function public.get_poll_comments_v2(p_poll_id uuid)
returns table(
  id uuid,
  poll_id uuid,
  parent_comment_id uuid,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  author_label text,
  likes bigint,
  liked_by_me boolean,
  image_path text,
  image_mime_type text,
  image_size integer
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.poll_id, c.parent_comment_id,
         case when c.deleted_at is null then c.body else '[Commentaire supprime]' end,
         c.created_at, c.updated_at, c.deleted_at,
         case when c.user_id = auth.uid() then 'Vous' else 'Membre Sayit' end,
         count(l.id),
         coalesce(bool_or(l.user_id = auth.uid()), false),
         case when c.deleted_at is null then c.image_path else null end,
         case when c.deleted_at is null then c.image_mime_type else null end,
         case when c.deleted_at is null then c.image_size else null end
  from public.poll_comments c
  left join public.poll_comment_likes l on l.comment_id = c.id
  where c.poll_id = p_poll_id
  group by c.id
  order by c.created_at desc;
$$;

revoke all on function public.get_poll_comments_v2(uuid) from public;
grant execute on function public.get_poll_comments_v2(uuid) to anon, authenticated;

create or replace function public.create_poll_comment_with_image(
  p_poll_id uuid,
  p_parent_comment_id uuid,
  p_body text,
  p_image_path text,
  p_image_mime_type text,
  p_image_size integer
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_user_id uuid := auth.uid();
  v_comment_id uuid;
  v_expected_prefix text;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then raise exception 'invalid_comment'; end if;
  if not exists (select 1 from public.polls where id = p_poll_id) then raise exception 'invalid_poll'; end if;
  if p_parent_comment_id is not null and not exists (
    select 1 from public.poll_comments where id = p_parent_comment_id and poll_id = p_poll_id and deleted_at is null
  ) then raise exception 'invalid_parent'; end if;

  if p_image_path is null
     or p_image_mime_type is null
     or p_image_size is null
  then raise exception 'invalid_comment_image'; end if;

  v_expected_prefix := 'poll-comments/' || p_poll_id::text || '/' || v_user_id::text || '/';
  if left(p_image_path, char_length(v_expected_prefix)) <> v_expected_prefix
     or p_image_path !~ (
       '^' || v_expected_prefix ||
       '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}[.](png|jpe?g|webp)$'
     )
     or p_image_mime_type not in ('image/png', 'image/jpeg', 'image/webp')
     or not (
       (p_image_mime_type = 'image/png' and p_image_path ~ '[.]png$')
       or (p_image_mime_type = 'image/jpeg' and p_image_path ~ '[.]jpe?g$')
       or (p_image_mime_type = 'image/webp' and p_image_path ~ '[.]webp$')
     )
     or p_image_size not between 1 and 5242880
     or not exists (
       select 1 from storage.objects o
       where o.bucket_id = 'poll-comment-images'
         and o.name = p_image_path
         and coalesce(o.metadata->>'mimetype', '') = p_image_mime_type
         and coalesce((o.metadata->>'size')::bigint, 0) = p_image_size
     )
  then raise exception 'invalid_comment_image'; end if;

  insert into public.poll_comments (poll_id, user_id, parent_comment_id, body, image_path, image_mime_type, image_size)
  values (p_poll_id, v_user_id, p_parent_comment_id, btrim(p_body), p_image_path, p_image_mime_type, p_image_size)
  returning id into v_comment_id;
  return v_comment_id;
end;
$$;

revoke all on function public.create_poll_comment_with_image(uuid, uuid, text, text, text, integer) from public, anon;
grant execute on function public.create_poll_comment_with_image(uuid, uuid, text, text, text, integer) to authenticated;
