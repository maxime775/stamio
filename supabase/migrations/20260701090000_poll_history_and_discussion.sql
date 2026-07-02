create table if not exists public.poll_comments (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.poll_comments(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.poll_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.poll_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

comment on table public.poll_comments is
  'Direct client writes are intentionally not granted; authenticated users must use RPC functions that derive user_id from auth.uid().';

comment on table public.poll_comment_likes is
  'Direct client writes are intentionally not granted; authenticated users must use RPC functions that derive user_id from auth.uid().';

create index if not exists poll_comments_poll_created_idx on public.poll_comments(poll_id, created_at desc);
create index if not exists poll_comments_parent_idx on public.poll_comments(parent_comment_id);
create index if not exists poll_comment_likes_comment_idx on public.poll_comment_likes(comment_id);

alter table public.poll_comments enable row level security;
alter table public.poll_comment_likes enable row level security;

revoke all on public.poll_comments from anon, authenticated;
revoke all on public.poll_comment_likes from anon, authenticated;
grant select (id, poll_id, parent_comment_id, body, created_at, updated_at, deleted_at)
on public.poll_comments to anon, authenticated;
grant select (id, comment_id, created_at)
on public.poll_comment_likes to anon, authenticated;

create policy "Discussions are publicly readable"
on public.poll_comments for select to anon, authenticated using (deleted_at is null);

create policy "Authenticated users create own comments"
on public.poll_comments for insert to authenticated
with check (auth.uid() = user_id);

create policy "Authors update own comments"
on public.poll_comments for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Discussion likes are publicly readable"
on public.poll_comment_likes for select to anon, authenticated using (true);

create policy "Authenticated users create own likes"
on public.poll_comment_likes for insert to authenticated
with check (auth.uid() = user_id);

create policy "Authenticated users remove own likes"
on public.poll_comment_likes for delete to authenticated
using (auth.uid() = user_id);

create or replace function public.get_poll_results_history(p_poll_id uuid)
returns table(choice_id uuid, label text, captured_at timestamptz, votes bigint, percentage numeric)
language sql
stable
security definer
set search_path = public
as $$
  with poll_window as (
    select date_trunc('hour', p.created_at) as starts_at,
           date_trunc('hour', least(now(), coalesce(p.closes_at, now()))) as ends_at
    from public.polls p
    where p.id = p_poll_id
  ),
  buckets as (
    select generate_series(starts_at, greatest(starts_at, ends_at), interval '1 hour') as captured_at
    from poll_window
  ),
  cumulative as (
    select c.id as choice_id, c.label, c.position, b.captured_at,
           count(v.id) as votes
    from public.choices c
    cross join buckets b
    left join public.votes v
      on v.choice_id = c.id
     and v.created_at < b.captured_at + interval '1 hour'
    where c.poll_id = p_poll_id
    group by c.id, c.label, c.position, b.captured_at
  ),
  totals as (
    select cumulative.*, sum(votes) over (partition by captured_at) as total_votes
    from cumulative
  )
  select choice_id, label, captured_at, votes,
         case when total_votes = 0 then 0::numeric
              else round((votes::numeric * 100) / total_votes, 2)
         end as percentage
  from totals
  order by captured_at, position;
$$;

revoke all on function public.get_poll_results_history(uuid) from public, anon, authenticated;
grant execute on function public.get_poll_results_history(uuid) to service_role;

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
set search_path = public
as $$
  select c.id, c.poll_id, c.parent_comment_id,
         case when c.deleted_at is null then c.body else '[Commentaire supprimé]' end,
         c.created_at, c.updated_at, c.deleted_at,
         case when c.user_id = auth.uid() then 'Vous' else 'Membre Sayit' end,
         count(l.id),
         coalesce(bool_or(l.user_id = auth.uid()), false)
  from public.poll_comments c
  left join public.poll_comment_likes l on l.comment_id = c.id
  where c.poll_id = p_poll_id
  group by c.id
  order by c.created_at desc;
$$;

revoke all on function public.get_poll_comments(uuid) from public;
grant execute on function public.get_poll_comments(uuid) to anon, authenticated;

create or replace function public.create_poll_comment(
  p_poll_id uuid,
  p_parent_comment_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_comment_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then raise exception 'invalid_comment'; end if;
  if not exists (select 1 from public.polls where id = p_poll_id) then raise exception 'invalid_poll'; end if;
  if p_parent_comment_id is not null and not exists (
    select 1 from public.poll_comments
    where id = p_parent_comment_id and poll_id = p_poll_id and deleted_at is null
  ) then raise exception 'invalid_parent'; end if;

  insert into public.poll_comments (poll_id, user_id, parent_comment_id, body)
  values (p_poll_id, v_user_id, p_parent_comment_id, btrim(p_body))
  returning id into v_comment_id;
  return v_comment_id;
end;
$$;

create or replace function public.toggle_poll_comment_like(p_comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from public.poll_comments where id = p_comment_id and deleted_at is null) then raise exception 'invalid_comment'; end if;
  delete from public.poll_comment_likes where comment_id = p_comment_id and user_id = v_user_id;
  if found then return false; end if;
  insert into public.poll_comment_likes (comment_id, user_id) values (p_comment_id, v_user_id);
  return true;
end;
$$;

revoke all on function public.create_poll_comment(uuid, uuid, text) from public, anon;
revoke all on function public.toggle_poll_comment_like(uuid) from public, anon;
grant execute on function public.create_poll_comment(uuid, uuid, text) to authenticated;
grant execute on function public.toggle_poll_comment_like(uuid) to authenticated;

drop trigger if exists poll_comments_set_updated_at on public.poll_comments;
create trigger poll_comments_set_updated_at before update on public.poll_comments
for each row execute function public.set_updated_at();
