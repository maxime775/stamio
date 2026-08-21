export type DecisionStatus = "possible" | "impossible" | "conditional";

export type DecisionNode = {
  id: string;
  edgeLabel?: string;
  label?: string;
  title: string;
  body?: string;
  type: "decision" | "question" | "outcome";
  status?: DecisionStatus;
  children?: DecisionNode[];
};

export type DecisionTreeDefinition = {
  id: string;
  eyebrow: string;
  title: string;
  previewDescription: string;
  subtitle: string;
  root: DecisionNode;
  note: string;
};

export type DecisionTreePreviewDefinition = Pick<
  DecisionTreeDefinition,
  "id" | "eyebrow" | "title" | "previewDescription" | "subtitle"
>;

export const INELIGIBILITY_POLL_ID = "11111111-1111-4111-8111-111111111112";

export const decisionTreePreviewByPollId: Readonly<Record<string, DecisionTreePreviewDefinition>> = {
  [INELIGIBILITY_POLL_ID]: {
    id: "cassation-ineligibilite-2027",
    eyebrow: "DÉCRYPTAGE",
    title: "Pourvoi en cassation : quelles conséquences pour l’inéligibilité ?",
    previewDescription:
      "Visualisez les principales issues possibles devant la Cour de cassation et leurs conséquences potentielles au regard du premier tour du 18 avril 2027.",
    subtitle: "Arbre de décision synthétique — situation au regard du premier tour du 18 avril 2027"
  }
};
