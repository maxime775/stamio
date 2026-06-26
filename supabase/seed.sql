insert into public.polls (id, question, status, closes_at)
values (
  '11111111-1111-4111-8111-111111111111',
  'Faut-il rendre obligatoire la validation téléphonique pour les sondages en ligne ?',
  'open',
  null
)
on conflict (id) do update
set question = excluded.question,
    status = excluded.status,
    closes_at = excluded.closes_at;

insert into public.choices (id, poll_id, label, position)
values
  ('22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111', 'Oui', 1),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Non', 2),
  ('22222222-2222-4222-8222-222222222223', '11111111-1111-4111-8111-111111111111', 'Ne se prononce pas', 3)
on conflict (id) do update
set label = excluded.label,
    position = excluded.position;
