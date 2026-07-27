-- Explicit backend grants after the historical lockdown migrations.
-- RLS remains enabled; anon and authenticated permissions are unchanged.
grant select, insert, update, delete on table
  public.polls,
  public.choices,
  public.profiles,
  public.votes,
  public.vote_user_locks,
  public.vote_attempts,
  public.user_poll_answers,
  public.user_reputation_events,
  public.abuse_rate_limits,
  public.poll_comments,
  public.poll_comment_likes
to service_role;
