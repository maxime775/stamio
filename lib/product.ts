import type { Sex, ThemeSlug } from "@/lib/types";

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

export const CSP_PROFESSIONS = [
  "Agriculteurs exploitants",
  "Artisans, commerçants, chefs d'entreprise",
  "Cadres et professions intellectuelles supérieures",
  "Professions intermédiaires",
  "Employés",
  "Ouvriers",
  "Retraités",
  "Autres personnes sans activité professionnelle"
] as const;

export const MAIN_THEME_POLL_CONTENT = {
  societe: {
    question: "Êtes-vous pour ou contre la taxe Zucman ?",
    description: "Le débat sur la taxe Zucman porte sur la fiscalité des patrimoines les plus élevés, l’équité devant l’impôt et le rendement attendu d’un tel dispositif. Il interroge aussi ses effets possibles sur l’investissement, la localisation des capitaux et le financement de l’économie."
  },
  politique: {
    question: "Pensez-vous qu’une peine d’inéligibilité confirmée par la cour d’appel de Paris à l’encontre de Marine Le Pen constituerait une entrave au fonctionnement démocratique ?",
    description: "Le débat porte sur les effets qu’aurait une éventuelle confirmation en appel d’une peine d’inéligibilité sur l’application de la décision judiciaire, la compétition électorale et le fonctionnement démocratique. La question reste prospective et ne préjuge ni de la décision à venir ni de ses motifs."
  },
  economie: {
    question: "Pensez-vous que l’augmentation de la dette publique est un problème ?",
    description: "Le débat sur l’augmentation de la dette publique porte sur sa soutenabilité, la charge d’intérêts et les marges de manœuvre dont disposent les pouvoirs publics. Son appréciation dépend notamment du niveau des taux d’intérêt, de la croissance et de l’usage des dépenses financées."
  }
} as const;

export const POLL_DESCRIPTIONS: Record<string, string> = {
  "11111111-1111-4111-8111-111111111111": MAIN_THEME_POLL_CONTENT.societe.description,
  "11111111-1111-4111-8111-111111111112": MAIN_THEME_POLL_CONTENT.politique.description,
  "11111111-1111-4111-8111-111111111113": MAIN_THEME_POLL_CONTENT.economie.description,
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

export function getThemeLabel(slug?: ThemeSlug | null) {
  return THEMES.find((theme) => theme.slug === slug)?.label ?? "Société";
}

export function getThemeRoute(slug: ThemeSlug | "all") {
  return slug === "all" ? "/themes" : `/themes/${slug}`;
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
