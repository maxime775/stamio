insert into public.polls (id, question, description, status, theme, featured, trend_label, closes_at)
values
  ('11111111-1111-4111-8111-111111111111', 'Êtes-vous pour ou contre la taxe Zucman ?', 'Le débat sur la taxe Zucman porte sur la fiscalité des patrimoines les plus élevés, l’équité devant l’impôt et le rendement attendu d’un tel dispositif. Il interroge aussi ses effets possibles sur l’investissement, la localisation des capitaux et le financement de l’économie.', 'open', 'societe', true, 'Fiscalité', now() + interval '4 days'),
  ('11111111-1111-4111-8111-111111111112', 'Pensez-vous qu’une peine d’inéligibilité confirmée par la cour d’appel de Paris à l’encontre de Marine Le Pen constituerait une entrave au fonctionnement démocratique ?', 'Le débat porte sur les effets qu’aurait une éventuelle confirmation en appel d’une peine d’inéligibilité sur l’application de la décision judiciaire, la compétition électorale et le fonctionnement démocratique. La question reste prospective et ne préjuge ni de la décision à venir ni de ses motifs.', 'open', 'politique', true, 'Justice', now() + interval '3 days 8 hours'),
  ('11111111-1111-4111-8111-111111111113', 'Pensez-vous que l’augmentation de la dette publique est un problème ?', 'Le débat sur l’augmentation de la dette publique porte sur sa soutenabilité, la charge d’intérêts et les marges de manœuvre dont disposent les pouvoirs publics. Son appréciation dépend notamment du niveau des taux d’intérêt, de la croissance et de l’usage des dépenses financées.', 'open', 'economie', true, 'Finances publiques', now() + interval '5 days'),
  ('11111111-1111-4111-8111-111111111114', 'Les plateformes sociales devraient-elles afficher l’origine des contenus politiques sponsorisés ?', 'L’identification des contenus politiques sponsorisés vise à rendre plus lisibles les acteurs qui financent la diffusion d’un message. Une telle obligation pourrait améliorer la transparence du débat public, tout en posant des questions de périmètre, de contrôle et de traitement uniforme entre plateformes.', 'open', 'societe', true, 'Numérique', now() + interval '2 days 14 hours'),
  ('11111111-1111-4111-8111-111111111115', 'Les grands événements sportifs doivent-ils publier un bilan carbone certifié ?', 'Les grands événements sportifs génèrent des déplacements, des constructions et des consommations importantes. Un bilan carbone certifié permettrait de comparer les engagements aux résultats observés. L’enjeu porte sur la fiabilité de la mesure, son coût et son influence réelle sur l’organisation des événements.', 'open', 'sport', true, 'Responsabilité', now() + interval '4 days 6 hours'),
  ('11111111-1111-4111-8111-111111111116', 'Faut-il simplifier les référendums locaux sur les grands projets publics ?', 'Les référendums locaux peuvent associer directement les habitants aux projets qui transforment leur territoire. Simplifier leur déclenchement renforcerait cette participation, mais suppose de définir des seuils, une information contradictoire et une articulation claire avec la responsabilité des élus.', 'open', 'politique', false, 'Local', now() + interval '3 days'),
  ('11111111-1111-4111-8111-111111111117', 'Les aides publiques aux entreprises doivent-elles être conditionnées à des objectifs mesurables ?', 'Conditionner les aides publiques à des objectifs mesurables vise à mieux relier financement collectif et résultats économiques, sociaux ou environnementaux. La difficulté consiste à choisir des indicateurs pertinents, contrôlables et adaptés à la taille des entreprises sans créer une charge disproportionnée.', 'open', 'economie', false, 'Industrie', now() + interval '5 days 12 hours'),
  ('11111111-1111-4111-8111-111111111118', 'Faut-il créer un droit à la déconnexion plus strict pour les salariés ?', 'Le droit à la déconnexion cherche à limiter la sollicitation professionnelle hors des horaires de travail. Un cadre plus strict pourrait mieux protéger les salariés, mais doit tenir compte des responsabilités, des fuseaux horaires et des organisations flexibles. L’enjeu est de rendre la règle applicable et vérifiable.', 'open', 'societe', false, 'Qualité de vie', now() + interval '2 days 9 hours'),
  ('11111111-1111-4111-8111-111111111119', 'Les clubs professionnels devraient-ils investir davantage dans le sport amateur local ?', 'Un investissement accru des clubs professionnels dans le sport amateur pourrait soutenir les équipements, la formation et l’accès à la pratique. Il faut toutefois déterminer le niveau de contribution, les bénéficiaires et les mécanismes de contrôle sans fragiliser les modèles économiques des clubs.', 'open', 'sport', false, 'Territoires', now() + interval '4 days 18 hours'),
  ('11111111-1111-4111-8111-111111111120', 'La formation continue doit-elle devenir obligatoire dans les métiers exposés à l’automatisation ?', 'L’automatisation transforme rapidement les compétences attendues dans de nombreux métiers. Une obligation de formation continue pourrait anticiper les transitions professionnelles, à condition d’en répartir clairement le financement, le temps consacré et la responsabilité entre salariés, employeurs et pouvoirs publics.', 'open', 'economie', false, 'Compétences', now() + interval '6 days')
on conflict (id) do update
set question = excluded.question,
    description = excluded.description,
    status = excluded.status,
    theme = excluded.theme,
    featured = excluded.featured,
    trend_label = excluded.trend_label,
    closes_at = excluded.closes_at;

-- Deterministic local series metadata keeps fresh `supabase db reset` fixtures
-- compatible with the public slug routes. Production series UUIDs are preserved
-- by the migration backfill and are never replaced by these local fixture IDs.
insert into public.poll_series (id, canonical_question, canonical_description, theme, slug)
select proposed.series_id, p.question, p.description, p.theme, proposed.slug
from (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333331'::uuid, 'taxe-zucman'::text),
    ('11111111-1111-4111-8111-111111111112'::uuid, '33333333-3333-4333-8333-333333333332'::uuid, 'peine-ineligibilite-entrave-democratie'::text),
    ('11111111-1111-4111-8111-111111111113'::uuid, '33333333-3333-4333-8333-333333333333'::uuid, 'dette-publique'::text),
    ('11111111-1111-4111-8111-111111111114'::uuid, '33333333-3333-4333-8333-333333333334'::uuid, 'origine-contenus-politiques-sponsorises'::text),
    ('11111111-1111-4111-8111-111111111115'::uuid, '33333333-3333-4333-8333-333333333335'::uuid, 'evenements-sportifs-bilan-carbone'::text),
    ('11111111-1111-4111-8111-111111111116'::uuid, '33333333-3333-4333-8333-333333333336'::uuid, 'referendums-locaux-projets-publics'::text),
    ('11111111-1111-4111-8111-111111111117'::uuid, '33333333-3333-4333-8333-333333333337'::uuid, 'aides-publiques-entreprises-objectifs-mesurables'::text),
    ('11111111-1111-4111-8111-111111111118'::uuid, '33333333-3333-4333-8333-333333333338'::uuid, 'droit-deconnexion-salaries'::text),
    ('11111111-1111-4111-8111-111111111119'::uuid, '33333333-3333-4333-8333-333333333339'::uuid, 'clubs-professionnels-sport-amateur-local'::text),
    ('11111111-1111-4111-8111-111111111120'::uuid, '33333333-3333-4333-8333-333333333340'::uuid, 'formation-continue-metiers-automatisation'::text)
) as proposed(poll_id, series_id, slug)
join public.polls p on p.id = proposed.poll_id
on conflict (id) do update
set canonical_question = excluded.canonical_question,
    canonical_description = excluded.canonical_description,
    theme = excluded.theme,
    slug = excluded.slug;

update public.polls p
set series_id = proposed.series_id,
    wave_number = coalesce(p.wave_number, 1),
    launched_at = coalesce(p.launched_at, p.created_at, now())
from (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333331'::uuid),
    ('11111111-1111-4111-8111-111111111112'::uuid, '33333333-3333-4333-8333-333333333332'::uuid),
    ('11111111-1111-4111-8111-111111111113'::uuid, '33333333-3333-4333-8333-333333333333'::uuid),
    ('11111111-1111-4111-8111-111111111114'::uuid, '33333333-3333-4333-8333-333333333334'::uuid),
    ('11111111-1111-4111-8111-111111111115'::uuid, '33333333-3333-4333-8333-333333333335'::uuid),
    ('11111111-1111-4111-8111-111111111116'::uuid, '33333333-3333-4333-8333-333333333336'::uuid),
    ('11111111-1111-4111-8111-111111111117'::uuid, '33333333-3333-4333-8333-333333333337'::uuid),
    ('11111111-1111-4111-8111-111111111118'::uuid, '33333333-3333-4333-8333-333333333338'::uuid),
    ('11111111-1111-4111-8111-111111111119'::uuid, '33333333-3333-4333-8333-333333333339'::uuid),
    ('11111111-1111-4111-8111-111111111120'::uuid, '33333333-3333-4333-8333-333333333340'::uuid)
) as proposed(poll_id, series_id)
where p.id = proposed.poll_id;

insert into public.choices (id, poll_id, label, position)
values
  ('22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111', 'Pour', 1),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Contre', 2),
  ('22222222-2222-4222-8222-222222222223', '11111111-1111-4111-8111-111111111111', 'Ne se prononce pas', 3),
  ('22222222-2222-4222-8222-222222222224', '11111111-1111-4111-8111-111111111112', 'Oui', 1),
  ('22222222-2222-4222-8222-222222222225', '11111111-1111-4111-8111-111111111112', 'Non', 2),
  ('22222222-2222-4222-8222-222222222226', '11111111-1111-4111-8111-111111111112', 'Ne se prononce pas', 3),
  ('22222222-2222-4222-8222-222222222227', '11111111-1111-4111-8111-111111111113', 'Oui', 1),
  ('22222222-2222-4222-8222-222222222228', '11111111-1111-4111-8111-111111111113', 'Non', 2),
  ('22222222-2222-4222-8222-222222222229', '11111111-1111-4111-8111-111111111113', 'Ne se prononce pas', 3),
  ('22222222-2222-4222-8222-222222222230', '11111111-1111-4111-8111-111111111114', 'Oui', 1),
  ('22222222-2222-4222-8222-222222222231', '11111111-1111-4111-8111-111111111114', 'Seulement en période électorale', 2),
  ('22222222-2222-4222-8222-222222222232', '11111111-1111-4111-8111-111111111114', 'Non', 3),
  ('22222222-2222-4222-8222-222222222233', '11111111-1111-4111-8111-111111111115', 'Oui', 1),
  ('22222222-2222-4222-8222-222222222234', '11111111-1111-4111-8111-111111111115', 'Oui, avec seuil de taille', 2),
  ('22222222-2222-4222-8222-222222222235', '11111111-1111-4111-8111-111111111115', 'Non', 3),
  ('22222222-2222-4222-8222-222222222236', '11111111-1111-4111-8111-111111111116', 'Oui', 1),
  ('22222222-2222-4222-8222-222222222237', '11111111-1111-4111-8111-111111111116', 'Au cas par cas', 2),
  ('22222222-2222-4222-8222-222222222238', '11111111-1111-4111-8111-111111111116', 'Non', 3),
  ('22222222-2222-4222-8222-222222222239', '11111111-1111-4111-8111-111111111117', 'Oui', 1),
  ('22222222-2222-4222-8222-222222222240', '11111111-1111-4111-8111-111111111117', 'Seulement pour les grandes aides', 2),
  ('22222222-2222-4222-8222-222222222241', '11111111-1111-4111-8111-111111111117', 'Non', 3),
  ('22222222-2222-4222-8222-222222222242', '11111111-1111-4111-8111-111111111118', 'Oui', 1),
  ('22222222-2222-4222-8222-222222222243', '11111111-1111-4111-8111-111111111118', 'Oui, par accord collectif', 2),
  ('22222222-2222-4222-8222-222222222244', '11111111-1111-4111-8111-111111111118', 'Non', 3),
  ('22222222-2222-4222-8222-222222222245', '11111111-1111-4111-8111-111111111119', 'Oui', 1),
  ('22222222-2222-4222-8222-222222222246', '11111111-1111-4111-8111-111111111119', 'Seulement via fonds dédiés', 2),
  ('22222222-2222-4222-8222-222222222247', '11111111-1111-4111-8111-111111111119', 'Non', 3),
  ('22222222-2222-4222-8222-222222222248', '11111111-1111-4111-8111-111111111120', 'Oui', 1),
  ('22222222-2222-4222-8222-222222222249', '11111111-1111-4111-8111-111111111120', 'Seulement avec financement public', 2),
  ('22222222-2222-4222-8222-222222222250', '11111111-1111-4111-8111-111111111120', 'Non', 3)
on conflict (id) do update
set label = excluded.label,
    position = excluded.position;
