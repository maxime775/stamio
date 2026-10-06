const QUESTION_BRIEFS_BY_SERIES_SLUG: Readonly<Record<string, string>> = {
  "taxe-zucman":
    "La taxe Zucman vise à instaurer un impôt minimum de 2 % sur les patrimoines supérieurs à 100 M€, soit environ 1 800 contribuables. Ses défenseurs y voient un moyen de renforcer la justice fiscale et de limiter certaines stratégies d’optimisation. Ses opposants soulignent les difficultés de valorisation, le risque d’exil fiscal et les effets possibles sur l’investissement. L’édito examine aussi les modalités de mise en œuvre et leurs conséquences sur le financement de l’économie.",
  "pensez-vous-que-lintelligence-artificielle-menace-votre-emploi":
    "La question invite à distinguer l’automatisation de certaines tâches, la transformation des métiers et la disparition éventuelle d’emplois. Elle porte aussi sur les personnes et les secteurs susceptibles d’être les plus exposés, ainsi que sur la vitesse de ces évolutions. L’enjeu est de comprendre ce que l’IA peut changer dans le travail sans confondre l’exposition d’un poste avec sa suppression. L’édito développe ces différents scénarios avant de vous laisser vous prononcer.",
  "la-fifa-est-elle-corrompue":
    "La question invite à examiner ce que recouvre l’accusation de corruption lorsqu’elle vise la FIFA. Elle appelle à distinguer les faits établis, les soupçons et les jugements portés sur le fonctionnement de l’organisation. Elle interroge aussi les critères qui permettent de qualifier une pratique de corrompue. L’édito propose les éléments du débat afin de permettre à chacun de se faire un avis.",
  "peine-ineligibilite-entrave-democratie":
    "La question porte sur les effets qu’aurait une éventuelle confirmation en appel d’une peine d’inéligibilité sur l’application de la décision judiciaire, la compétition électorale et le fonctionnement démocratique. L’exécution provisoire peut aussi peser sur la possibilité d’une candidature, selon le dispositif exact de la décision. Le débat met ainsi en regard l’application de la peine et la représentation des électeurs. L’édito présente ce cadre prospectif sans préjuger de la décision à venir ni de ses motifs."
};

export function getQuestionBrief(seriesSlug?: string | null): string | null {
  if (!seriesSlug) return null;
  return QUESTION_BRIEFS_BY_SERIES_SLUG[seriesSlug] ?? null;
}
