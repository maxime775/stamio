-- Resolve only the public username needed by discussion readers. The profiles
-- table remains private; neither user ids nor any other profile field are
-- returned by these narrowly scoped discussion RPCs.
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
set search_path = pg_catalog, public
as $$
  select c.id, c.poll_id, c.parent_comment_id,
         case when c.deleted_at is null then c.body else '[Commentaire supprime]' end,
         c.created_at, c.updated_at, c.deleted_at,
         case when p.id is null then 'Compte supprimé' else '@' || p.username end,
         count(l.id),
         coalesce(bool_or(l.user_id = auth.uid()), false),
         case when c.deleted_at is null then c.image_path else null end,
         case when c.deleted_at is null then c.image_mime_type else null end,
         case when c.deleted_at is null then c.image_size else null end
  from public.poll_comments c
  left join public.profiles p on p.id = c.user_id
  left join public.poll_comment_likes l on l.comment_id = c.id
  where c.poll_id = p_poll_id
  group by c.id, p.id, p.username
  order by c.created_at desc;
$$;

revoke all on function public.get_poll_comments_v2(uuid) from public, anon, authenticated;
grant execute on function public.get_poll_comments_v2(uuid) to anon, authenticated;

-- Keep the legacy reader safe for any older client still calling it.
create or replace function public.get_poll_comments(p_poll_id uuid)
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
  liked_by_me boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select c.id, c.poll_id, c.parent_comment_id, c.body, c.created_at,
         c.updated_at, c.deleted_at, c.author_label, c.likes,
         c.liked_by_me
  from public.get_poll_comments_v2(p_poll_id) c;
$$;

revoke all on function public.get_poll_comments(uuid) from public, anon, authenticated;
grant execute on function public.get_poll_comments(uuid) to anon, authenticated;
