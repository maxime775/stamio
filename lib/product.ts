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

export const FALLBACK_POLLS: PollWithStats[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    question: "Faut-il rendre obligatoire la validation téléphonique pour les sondages en ligne ?",
    status: "open",
    theme: "societe",
    featured: true,
    trend_label: "Débat civique",
    created_at: "2026-06-25T10:00:00Z",
    closes_at: null,
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
