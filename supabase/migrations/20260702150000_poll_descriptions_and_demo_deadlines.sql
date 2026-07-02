alter table public.polls
  add column if not exists description text;

comment on column public.polls.description is
  'Neutral analytical context displayed before participation; contains no user or vote data.';

update public.polls as p
set description = values_to_apply.description,
    closes_at = case
      when p.status = 'open' and p.closes_at is null then now() + values_to_apply.demo_duration
      else p.closes_at
    end
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'La vérification téléphonique peut renforcer la fiabilité d’un sondage en limitant les participations multiples. Elle introduit aussi une étape supplémentaire et soulève des attentes fortes en matière de confidentialité. La question consiste à arbitrer entre intégrité des résultats, simplicité d’accès et protection des données.', interval '4 days'),
  ('11111111-1111-4111-8111-111111111112'::uuid, 'Rendre les arbitrages budgétaires visibles avant leur adoption permettrait au public de mieux comprendre les priorités et les compromis retenus. Cette transparence doit toutefois rester compatible avec la négociation, la lisibilité des documents et la capacité des institutions à faire évoluer leurs décisions.', interval '3 days 8 hours'),
  ('11111111-1111-4111-8111-111111111113'::uuid, 'Le télétravail modifie l’organisation, les coûts et l’équilibre entre vie professionnelle et personnelle. En faire un droit négocié créerait un cadre commun, mais les contraintes diffèrent fortement selon les métiers et les entreprises. L’enjeu est de concilier souplesse, équité et continuité de l’activité.', interval '5 days'),
  ('11111111-1111-4111-8111-111111111114'::uuid, 'L’identification des contenus politiques sponsorisés vise à rendre plus lisibles les acteurs qui financent la diffusion d’un message. Une telle obligation pourrait améliorer la transparence du débat public, tout en posant des questions de périmètre, de contrôle et de traitement uniforme entre plateformes.', interval '2 days 14 hours'),
  ('11111111-1111-4111-8111-111111111115'::uuid, 'Les grands événements sportifs génèrent des déplacements, des constructions et des consommations importantes. Un bilan carbone certifié permettrait de comparer les engagements aux résultats observés. L’enjeu porte sur la fiabilité de la mesure, son coût et son influence réelle sur l’organisation des événements.', interval '4 days 6 hours'),
  ('11111111-1111-4111-8111-111111111116'::uuid, 'Les référendums locaux peuvent associer directement les habitants aux projets qui transforment leur territoire. Simplifier leur déclenchement renforcerait cette participation, mais suppose de définir des seuils, une information contradictoire et une articulation claire avec la responsabilité des élus.', interval '3 days'),
  ('11111111-1111-4111-8111-111111111117'::uuid, 'Conditionner les aides publiques à des objectifs mesurables vise à mieux relier financement collectif et résultats économiques, sociaux ou environnementaux. La difficulté consiste à choisir des indicateurs pertinents, contrôlables et adaptés à la taille des entreprises sans créer une charge disproportionnée.', interval '5 days 12 hours'),
  ('11111111-1111-4111-8111-111111111118'::uuid, 'Le droit à la déconnexion cherche à limiter la sollicitation professionnelle hors des horaires de travail. Un cadre plus strict pourrait mieux protéger les salariés, mais doit tenir compte des responsabilités, des fuseaux horaires et des organisations flexibles. L’enjeu est de rendre la règle applicable et vérifiable.', interval '2 days 9 hours'),
  ('11111111-1111-4111-8111-111111111119'::uuid, 'Un investissement accru des clubs professionnels dans le sport amateur pourrait soutenir les équipements, la formation et l’accès à la pratique. Il faut toutefois déterminer le niveau de contribution, les bénéficiaires et les mécanismes de contrôle sans fragiliser les modèles économiques des clubs.', interval '4 days 18 hours'),
  ('11111111-1111-4111-8111-111111111120'::uuid, 'L’automatisation transforme rapidement les compétences attendues dans de nombreux métiers. Une obligation de formation continue pourrait anticiper les transitions professionnelles, à condition d’en répartir clairement le financement, le temps consacré et la responsabilité entre salariés, employeurs et pouvoirs publics.', interval '6 days')
) as values_to_apply(id, description, demo_duration)
where p.id = values_to_apply.id;
