insert into public.polls (id, question, status, theme, featured, trend_label, closes_at)
values
  ('11111111-1111-4111-8111-111111111111', 'Faut-il rendre obligatoire la validation téléphonique pour les sondages en ligne ?', 'open', 'societe', true, 'Débat civique', null),
  ('11111111-1111-4111-8111-111111111112', 'Faut-il rendre publics les grands arbitrages budgétaires avant leur vote ?', 'open', 'politique', true, 'En hausse', null),
  ('11111111-1111-4111-8111-111111111113', 'Le télétravail doit-il devenir un droit négocié dans chaque entreprise ?', 'open', 'economie', true, 'Travail', null),
  ('11111111-1111-4111-8111-111111111114', 'Les plateformes sociales devraient-elles afficher l’origine des contenus politiques sponsorisés ?', 'open', 'societe', true, 'Numérique', null),
  ('11111111-1111-4111-8111-111111111115', 'Les grands événements sportifs doivent-ils publier un bilan carbone certifié ?', 'open', 'sport', true, 'Responsabilité', null),
  ('11111111-1111-4111-8111-111111111116', 'Faut-il simplifier les référendums locaux sur les grands projets publics ?', 'open', 'politique', false, 'Local', null),
  ('11111111-1111-4111-8111-111111111117', 'Les aides publiques aux entreprises doivent-elles être conditionnées à des objectifs mesurables ?', 'open', 'economie', false, 'Industrie', null),
  ('11111111-1111-4111-8111-111111111118', 'Faut-il créer un droit à la déconnexion plus strict pour les salariés ?', 'open', 'societe', false, 'Qualité de vie', null),
  ('11111111-1111-4111-8111-111111111119', 'Les clubs professionnels devraient-ils investir davantage dans le sport amateur local ?', 'open', 'sport', false, 'Territoires', null),
  ('11111111-1111-4111-8111-111111111120', 'La formation continue doit-elle devenir obligatoire dans les métiers exposés à l’automatisation ?', 'open', 'economie', false, 'Compétences', null)
on conflict (id) do update
set question = excluded.question,
    status = excluded.status,
    theme = excluded.theme,
    featured = excluded.featured,
    trend_label = excluded.trend_label,
    closes_at = excluded.closes_at;

insert into public.choices (id, poll_id, label, position)
values
  ('22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111', 'Oui', 1),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Non', 2),
  ('22222222-2222-4222-8222-222222222223', '11111111-1111-4111-8111-111111111111', 'Ne se prononce pas', 3),
  ('22222222-2222-4222-8222-222222222224', '11111111-1111-4111-8111-111111111112', 'Oui, systématiquement', 1),
  ('22222222-2222-4222-8222-222222222225', '11111111-1111-4111-8111-111111111112', 'Oui, pour les grands postes', 2),
  ('22222222-2222-4222-8222-222222222226', '11111111-1111-4111-8111-111111111112', 'Non', 3),
  ('22222222-2222-4222-8222-222222222227', '11111111-1111-4111-8111-111111111113', 'Oui', 1),
  ('22222222-2222-4222-8222-222222222228', '11111111-1111-4111-8111-111111111113', 'Selon les métiers', 2),
  ('22222222-2222-4222-8222-222222222229', '11111111-1111-4111-8111-111111111113', 'Non', 3),
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
