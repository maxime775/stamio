insert into public.polls (
  id,
  question,
  description,
  status,
  theme,
  featured,
  trend_label,
  closes_at
)
values
  (
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Êtes-vous pour ou contre la taxe Zucman ?',
    'Le débat sur la taxe Zucman porte sur la fiscalité des patrimoines les plus élevés, l’équité devant l’impôt et le rendement attendu d’un tel dispositif. Il interroge aussi ses effets possibles sur l’investissement, la localisation des capitaux et le financement de l’économie.',
    'open',
    'societe',
    true,
    'Fiscalité',
    now() + interval '30 days'
  ),
  (
    '11111111-1111-4111-8111-111111111112'::uuid,
    'Pensez-vous qu’une peine d’inéligibilité confirmée par la cour d’appel de Paris à l’encontre de Marine Le Pen constituerait une entrave au fonctionnement démocratique ?',
    'Le débat porte sur les effets qu’aurait une éventuelle confirmation en appel d’une peine d’inéligibilité sur l’application de la décision judiciaire, la compétition électorale et le fonctionnement démocratique. La question reste prospective et ne préjuge ni de la décision à venir ni de ses motifs.',
    'open',
    'politique',
    true,
    'Justice',
    now() + interval '30 days'
  ),
  (
    '11111111-1111-4111-8111-111111111113'::uuid,
    'Pensez-vous que l’augmentation de la dette publique est un problème ?',
    'Le débat sur l’augmentation de la dette publique porte sur sa soutenabilité, la charge d’intérêts et les marges de manœuvre dont disposent les pouvoirs publics. Son appréciation dépend notamment du niveau des taux d’intérêt, de la croissance et de l’usage des dépenses financées.',
    'open',
    'economie',
    true,
    'Finances publiques',
    now() + interval '30 days'
  )
on conflict (id) do update
set question = excluded.question,
    description = excluded.description,
    status = 'open',
    theme = excluded.theme,
    featured = true,
    trend_label = excluded.trend_label,
    closes_at = case
      when polls.closes_at is null or polls.closes_at < now() + interval '7 days' then excluded.closes_at
      else polls.closes_at
    end;

insert into public.choices (id, poll_id, label, position)
values
  ('22222222-2222-4222-8222-222222222221'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Pour', 1),
  ('22222222-2222-4222-8222-222222222222'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Contre', 2),
  ('22222222-2222-4222-8222-222222222223'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Ne se prononce pas', 3),
  ('22222222-2222-4222-8222-222222222224'::uuid, '11111111-1111-4111-8111-111111111112'::uuid, 'Oui', 1),
  ('22222222-2222-4222-8222-222222222225'::uuid, '11111111-1111-4111-8111-111111111112'::uuid, 'Non', 2),
  ('22222222-2222-4222-8222-222222222226'::uuid, '11111111-1111-4111-8111-111111111112'::uuid, 'Ne se prononce pas', 3),
  ('22222222-2222-4222-8222-222222222227'::uuid, '11111111-1111-4111-8111-111111111113'::uuid, 'Oui', 1),
  ('22222222-2222-4222-8222-222222222228'::uuid, '11111111-1111-4111-8111-111111111113'::uuid, 'Non', 2),
  ('22222222-2222-4222-8222-222222222229'::uuid, '11111111-1111-4111-8111-111111111113'::uuid, 'Ne se prononce pas', 3)
on conflict (poll_id, position) do update
set label = excluded.label;
