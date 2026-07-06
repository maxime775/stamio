update public.polls as poll
set question = content.question,
    description = content.description,
    trend_label = content.trend_label
from (values
  (
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Êtes-vous pour ou contre la taxe Zucman ?',
    'Le débat sur la taxe Zucman porte sur la fiscalité des patrimoines les plus élevés, l’équité devant l’impôt et le rendement attendu d’un tel dispositif. Il interroge aussi ses effets possibles sur l’investissement, la localisation des capitaux et le financement de l’économie.',
    'Fiscalité'
  ),
  (
    '11111111-1111-4111-8111-111111111112'::uuid,
    'Pensez-vous qu’une peine d’inéligibilité confirmée par la cour d’appel de Paris à l’encontre de Marine Le Pen constituerait une entrave au fonctionnement démocratique ?',
    'Le débat porte sur les effets démocratiques qu’aurait une éventuelle confirmation en appel d’une peine d’inéligibilité : représentation des électeurs, application des décisions de justice et égalité devant la loi. La question reste prospective et ne préjuge ni de la décision à venir ni de ses motifs.',
    'Justice'
  ),
  (
    '11111111-1111-4111-8111-111111111113'::uuid,
    'Pensez-vous que l’augmentation de la dette publique est un problème ?',
    'Le débat sur l’augmentation de la dette publique met en regard le financement des politiques publiques, la capacité d’investissement et le coût futur du service de la dette. Son appréciation dépend notamment du niveau des taux d’intérêt, de la croissance et de l’usage des dépenses financées.',
    'Finances publiques'
  )
) as content(id, question, description, trend_label)
where poll.id = content.id;

update public.choices as choice
set label = labels.label
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 1, 'Pour'),
  ('11111111-1111-4111-8111-111111111111'::uuid, 2, 'Contre'),
  ('11111111-1111-4111-8111-111111111111'::uuid, 3, 'Ne se prononce pas'),
  ('11111111-1111-4111-8111-111111111112'::uuid, 1, 'Oui'),
  ('11111111-1111-4111-8111-111111111112'::uuid, 2, 'Non'),
  ('11111111-1111-4111-8111-111111111112'::uuid, 3, 'Ne se prononce pas'),
  ('11111111-1111-4111-8111-111111111113'::uuid, 1, 'Oui'),
  ('11111111-1111-4111-8111-111111111113'::uuid, 2, 'Non'),
  ('11111111-1111-4111-8111-111111111113'::uuid, 3, 'Ne se prononce pas')
) as labels(poll_id, position, label)
where choice.poll_id = labels.poll_id
  and choice.position = labels.position;
