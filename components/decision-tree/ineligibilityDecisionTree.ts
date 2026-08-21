import type { DecisionTreeDefinition } from "@/lib/decisionTrees";

export const ineligibilityDecisionTree: DecisionTreeDefinition = {
  id: "cassation-ineligibilite-2027",
  eyebrow: "DÉCRYPTAGE JURIDIQUE",
  title: "Pourvoi en cassation : quelles conséquences pour l’inéligibilité ?",
  previewDescription:
    "Visualisez les principales issues possibles devant la Cour de cassation et leurs conséquences potentielles au regard du premier tour du 18 avril 2027.",
  subtitle: "Arbre de décision synthétique — situation au regard du premier tour du 18 avril 2027",
  note:
    "Certaines branches dépendent du dispositif exact de l’arrêt et de l’interprétation du maintien de l’exécution provisoire.",
  root: {
    id: "cour-de-cassation",
    label: "COUR DE CASSATION",
    title: "Quelle décision est rendue sur l’arrêt de la cour d’appel ?",
    type: "question",
    children: [
      {
        id: "rejet",
        title: "Rejet du pourvoi",
        body: "L’arrêt de la cour d’appel devient définitif.",
        type: "decision",
        children: [
          {
            id: "rejet-effet",
            label: "Effet juridique",
            title:
              "La peine d’appel s’impose : 45 mois d’inéligibilité, dont 30 mois avec sursis. La partie ferme de 15 mois est considérée comme déjà exécutée.",
            type: "decision",
            children: [
              {
                id: "rejet-date",
                label: "Au 18 avril 2027",
                title:
                  "Sur le seul fondement de cette condamnation, aucune inéligibilité ferme ne serait encore en cours.",
                type: "outcome",
                status: "possible"
              }
            ]
          }
        ]
      },
      {
        id: "cassation-partielle",
        title: "Cassation partielle",
        body: "Une partie seulement de l’arrêt d’appel disparaît.",
        type: "decision",
        children: [
          {
            id: "partielle-concerne-peine",
            title: "La cassation concerne-t-elle la peine d’inéligibilité ?",
            type: "question",
            children: [
              {
                id: "partielle-non",
                edgeLabel: "NON",
                title: "L’inéligibilité n’est pas cassée",
                body:
                  "La disposition d’appel devient définitive sur ce point. Les 15 mois fermes restent considérés comme déjà exécutés.",
                type: "outcome",
                status: "possible"
              },
              {
                id: "partielle-oui",
                edgeLabel: "OUI",
                title: "L’inéligibilité est cassée",
                body: "La peine doit être redéterminée.",
                type: "decision",
                children: [
                  {
                    id: "partielle-renvoi-question",
                    title: "La Cour renvoie-t-elle l’affaire ?",
                    type: "question",
                    children: [
                      {
                        id: "partielle-avec-renvoi",
                        edgeLabel: "AVEC",
                        title: "Avec renvoi",
                        body:
                          "Une nouvelle cour d’appel doit fixer l’inéligibilité. Tant qu’elle n’a pas statué, le maintien ou la reprise de l’exécution provisoire des 5 ans peut être déterminant.",
                        type: "outcome",
                        status: "conditional"
                      },
                      {
                        id: "partielle-sans-renvoi",
                        edgeLabel: "SANS",
                        title: "Sans renvoi",
                        body:
                          "La Cour fixe elle-même la conséquence. Si aucune inéligibilité ferme ne couvre avril 2027, la candidature reste possible ; sinon, elle est impossible.",
                        type: "outcome",
                        status: "conditional"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "cassation-totale-renvoi",
        title: "Cassation totale avec renvoi",
        body: "L’arrêt d’appel disparaît et l’affaire repart devant une cour d’appel de renvoi.",
        type: "decision",
        children: [
          {
            id: "totale-renvoi-regime",
            label: "Régime intermédiaire",
            title:
              "Le jugement de première instance n’est pas définitif. Mais son exécution provisoire de 5 ans peut continuer ou reprendre effet pendant l’attente du nouvel arrêt.",
            type: "decision",
            children: [
              {
                id: "totale-renvoi-avant-scrutin",
                title: "La cour d’appel de renvoi statue-t-elle avant le scrutin ?",
                type: "question",
                children: [
                  {
                    id: "totale-renvoi-non",
                    edgeLabel: "NON",
                    title: "Aucun nouvel arrêt",
                    body:
                      "Si l’exécution provisoire des 5 ans gouverne encore la situation, elle couvre nécessairement avril 2027.",
                    type: "outcome",
                    status: "impossible"
                  },
                  {
                    id: "totale-renvoi-oui",
                    edgeLabel: "OUI",
                    title: "Un nouvel arrêt est rendu",
                    body:
                      "Relaxe ou absence d’inéligibilité ferme encore en cours : candidature possible. Inéligibilité ferme encore en cours : candidature impossible.",
                    type: "outcome",
                    status: "conditional"
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "cassation-totale-sans-renvoi",
        title: "Cassation totale sans renvoi",
        body: "La Cour de cassation tranche définitivement sans nouvelle audience d’appel.",
        type: "decision",
        children: [
          {
            id: "totale-sans-renvoi-consequence",
            title: "Quelle conséquence résulte exactement du dispositif ?",
            type: "question",
            children: [
              {
                id: "jugement-premiere-instance",
                title: "Le jugement de première instance devient définitif",
                body:
                  "Les 5 ans d’inéligibilité prononcés en première instance s’imposent et couvrent avril 2027.",
                type: "outcome",
                status: "impossible"
              },
              {
                id: "condamnation-disparait",
                title: "La condamnation ou l’inéligibilité disparaît",
                body: "Aucune inéligibilité issue de cette affaire ne fait alors obstacle à la candidature.",
                type: "outcome",
                status: "possible"
              },
              {
                id: "cour-corrige-peine",
                title: "La Cour corrige elle-même la peine",
                body:
                  "Il faut lire le dispositif : si une inéligibilité ferme couvre encore avril 2027, la candidature est impossible ; sinon, elle reste possible.",
                type: "outcome",
                status: "conditional"
              }
            ]
          }
        ]
      }
    ]
  }
};
