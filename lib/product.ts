import type { PollWithStats, Sex, ThemeSlug } from "@/lib/types";

export const THEMES: Array<{ slug: ThemeSlug; label: string; intro: string }> = [
  {
    slug: "politique",
    label: "Politique",
    intro: "Institutions, participation citoyenne et décisions publiques."
  },
  {
    slug: "economie",
    label: "Économie",
    intro: "Pouvoir d'achat, travail, innovation et arbitrages économiques."
  },
  {
    slug: "societe",
    label: "Société",
    intro: "Vie quotidienne, confiance, usages numériques et cohésion sociale."
  },
  {
    slug: "sport",
    label: "Sport",
    intro: "Pratiques, grands événements et place du sport dans la vie publique."
  }
];

export const REGIONS_FR = [
  "Auvergne-Rhône-Alpes",
  "Bourgogne-Franche-Comté",
  "Bretagne",
  "Centre-Val de Loire",
  "Corse",
  "Grand Est",
  "Hauts-de-France",
  "Île-de-France",
  "Normandie",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Pays de la Loire",
  "Provence-Alpes-Côte d’Azur",
  "Guadeloupe",
  "Martinique",
  "Guyane",
  "La Réunion",
  "Mayotte"
];

export const SEX_OPTIONS: Array<{ value: Sex; label: string }> = [
  { value: "homme", label: "Homme" },
  { value: "femme", label: "Femme" }
];

export const VISITOR_VOTE_LIMIT = 3;

export const POLL_DESCRIPTIONS: Record<string, string> = {
  "11111111-1111-4111-8111-111111111111": "La vérification téléphonique peut renforcer la fiabilité d’un sondage en limitant les participations multiples. Elle introduit aussi une étape supplémentaire et soulève des attentes fortes en matière de confidentialité. La question consiste à arbitrer entre intégrité des résultats, simplicité d’accès et protection des données.",
  "11111111-1111-4111-8111-111111111112": "Rendre les arbitrages budgétaires visibles avant leur adoption permettrait au public de mieux comprendre les priorités et les compromis retenus. Cette transparence doit toutefois rester compatible avec la négociation, la lisibilité des documents et la capacité des institutions à faire évoluer leurs décisions.",
  "11111111-1111-4111-8111-111111111113": "Le télétravail modifie l’organisation, les coûts et l’équilibre entre vie professionnelle et personnelle. En faire un droit négocié créerait un cadre commun, mais les contraintes diffèrent fortement selon les métiers et les entreprises. L’enjeu est de concilier souplesse, équité et continuité de l’activité.",
  "11111111-1111-4111-8111-111111111114": "L’identification des contenus politiques sponsorisés vise à rendre plus lisibles les acteurs qui financent la diffusion d’un message. Une telle obligation pourrait améliorer la transparence du débat public, tout en posant des questions de périmètre, de contrôle et de traitement uniforme entre plateformes.",
  "11111111-1111-4111-8111-111111111115": "Les grands événements sportifs génèrent des déplacements, des constructions et des consommations importantes. Un bilan carbone certifié permettrait de comparer les engagements aux résultats observés. L’enjeu porte sur la fiabilité de la mesure, son coût et son influence réelle sur l’organisation des événements.",
  "11111111-1111-4111-8111-111111111116": "Les référendums locaux peuvent associer directement les habitants aux projets qui transforment leur territoire. Simplifier leur déclenchement renforcerait cette participation, mais suppose de définir des seuils, une information contradictoire et une articulation claire avec la responsabilité des élus.",
  "11111111-1111-4111-8111-111111111117": "Conditionner les aides publiques à des objectifs mesurables vise à mieux relier financement collectif et résultats économiques, sociaux ou environnementaux. La difficulté consiste à choisir des indicateurs pertinents, contrôlables et adaptés à la taille des entreprises sans créer une charge disproportionnée.",
  "11111111-1111-4111-8111-111111111118": "Le droit à la déconnexion cherche à limiter la sollicitation professionnelle hors des horaires de travail. Un cadre plus strict pourrait mieux protéger les salariés, mais doit tenir compte des responsabilités, des fuseaux horaires et des organisations flexibles. L’enjeu est de rendre la règle applicable et vérifiable.",
  "11111111-1111-4111-8111-111111111119": "Un investissement accru des clubs professionnels dans le sport amateur pourrait soutenir les équipements, la formation et l’accès à la pratique. Il faut toutefois déterminer le niveau de contribution, les bénéficiaires et les mécanismes de contrôle sans fragiliser les modèles économiques des clubs.",
  "11111111-1111-4111-8111-111111111120": "L’automatisation transforme rapidement les compétences attendues dans de nombreux métiers. Une obligation de formation continue pourrait anticiper les transitions professionnelles, à condition d’en répartir clairement le financement, le temps consacré et la responsabilité entre salariés, employeurs et pouvoirs publics."
};

export function getPollDescription(pollId: string) {
  return POLL_DESCRIPTIONS[pollId] ?? "Cette question met en regard plusieurs priorités collectives. Les réponses permettent d’observer la manière dont les participants arbitrent entre efficacité, équité et conditions de mise en œuvre.";
}

export const FALLBACK_POLLS: PollWithStats[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    question: "Faut-il rendre obligatoire la validation téléphonique pour les sondages en ligne ?",
    description: POLL_DESCRIPTIONS["11111111-1111-4111-8111-111111111111"],
    status: "open",
    theme: "societe",
    featured: true,
    trend_label: "Débat civique",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    closes_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    totalVotes: 0,
    choices: [
      { id: "22222222-2222-4222-8222-222222222221", poll_id: "11111111-1111-4111-8111-111111111111", label: "Oui", position: 1 },
      { id: "22222222-2222-4222-8222-222222222222", poll_id: "11111111-1111-4111-8111-111111111111", label: "Non", position: 2 },
      { id: "22222222-2222-4222-8222-222222222223", poll_id: "11111111-1111-4111-8111-111111111111", label: "Ne se prononce pas", position: 3 }
    ]
  },
  {
    id: "11111111-1111-4111-8111-111111111112",
    question: "Faut-il rendre publics les grands arbitrages budgétaires avant leur vote ?",
    description: POLL_DESCRIPTIONS["11111111-1111-4111-8111-111111111112"],
    status: "open",
    theme: "politique",
    featured: true,
    trend_label: "En hausse",
    created_at: "2026-06-24T09:30:00Z",
    closes_at: null,
    totalVotes: 0,
    choices: []
  },
  {
    id: "11111111-1111-4111-8111-111111111113",
    question: "Le télétravail doit-il devenir un droit négocié dans chaque entreprise ?",
    description: POLL_DESCRIPTIONS["11111111-1111-4111-8111-111111111113"],
    status: "open",
    theme: "economie",
    featured: true,
    trend_label: "Travail",
    created_at: "2026-06-23T15:00:00Z",
    closes_at: null,
    totalVotes: 0,
    choices: []
  },
  {
    id: "11111111-1111-4111-8111-111111111114",
    question: "Les plateformes sociales devraient-elles afficher l'origine des contenus politiques sponsorisés ?",
    description: POLL_DESCRIPTIONS["11111111-1111-4111-8111-111111111114"],
    status: "open",
    theme: "societe",
    featured: true,
    trend_label: "Numérique",
    created_at: "2026-06-22T11:15:00Z",
    closes_at: null,
    totalVotes: 0,
    choices: []
  },
  {
    id: "11111111-1111-4111-8111-111111111115",
    question: "Les grands événements sportifs doivent-ils publier un bilan carbone certifié ?",
    description: POLL_DESCRIPTIONS["11111111-1111-4111-8111-111111111115"],
    status: "open",
    theme: "sport",
    featured: true,
    trend_label: "Responsabilité",
    created_at: "2026-06-21T14:45:00Z",
    closes_at: null,
    totalVotes: 0,
    choices: []
  }
];

export function getThemeLabel(slug?: ThemeSlug | null) {
  return THEMES.find((theme) => theme.slug === slug)?.label ?? "Société";
}

export function isThemeSlug(value: string | undefined): value is ThemeSlug {
  return value === "politique" || value === "economie" || value === "societe" || value === "sport";
}

export function isSex(value: string): value is Sex {
  return value === "homme" || value === "femme";
}

export function getSexLabel(value?: Sex | null) {
  return SEX_OPTIONS.find((option) => option.value === value)?.label ?? "Non renseigné";
}
