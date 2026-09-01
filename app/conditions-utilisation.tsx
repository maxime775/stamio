import {
  LegalEmailLink,
  LegalInlineLink,
  LegalPage,
  legalList,
  legalParagraph,
  type LegalSection
} from "@/components/LegalPage";

const sections: LegalSection[] = [
  {
    title: "1. Objet et champ d'application",
    blocks: [
      legalParagraph("Les présentes conditions générales d'utilisation (ci-après les « CGU ») ont pour objet de définir les règles d'accès et d'utilisation du site stamio.fr et des fonctionnalités proposées sous la marque Stamio."),
      legalParagraph("Stamio est une plateforme de participation et de débat permettant notamment de consulter des questions d'actualité ou de société, d'exprimer un choix, de consulter des résultats agrégés et leur évolution, et, lorsque cette fonctionnalité est disponible, de publier ou consulter des contributions dans des espaces de discussion."),
      legalParagraph("Les CGU s'appliquent à toute personne qui consulte ou utilise Stamio, avec ou sans compte. Certaines fonctionnalités sont réservées aux utilisateurs authentifiés."),
      legalParagraph(<>La <LegalInlineLink href="/confidentialite">politique de confidentialité et de protection des données personnelles</LegalInlineLink> est distincte des présentes CGU et précise les traitements de données réalisés par Stamio.</>)
    ]
  },
  {
    title: "2. Définitions",
    blocks: [legalList([
      "« Stamio » : le service accessible notamment à l'adresse stamio.fr.",
      "« Utilisateur » : toute personne consultant ou utilisant Stamio.",
      "« Compte » : l'espace individuel associé à un utilisateur authentifié.",
      "« Question » : une question publiée sur Stamio et proposée à la participation des utilisateurs.",
      "« Vague » : une période ou occurrence déterminée d'une question, pour laquelle un compte peut participer une seule fois.",
      "« Participation » : le fait qu'un compte ait participé à une question ou à une vague donnée, indépendamment du choix exprimé.",
      <>« Bulletin » : le choix exprimé sur une question. Le bulletin est enregistré séparément du compte selon le fonctionnement décrit dans la <LegalInlineLink href="/confidentialite">politique de confidentialité</LegalInlineLink>.</>,
      "« Contribution » : tout commentaire, réponse, texte ou autre contenu qu'un utilisateur publie sur Stamio."
    ])]
  },
  {
    title: "3. Accès au service et acceptation des CGU",
    blocks: [
      legalParagraph("La consultation des contenus publics de Stamio est accessible sans création de compte, sauf lorsque des contraintes techniques, juridiques ou de sécurité imposent une restriction particulière."),
      legalParagraph("L'utilisation des fonctionnalités réservées aux comptes, notamment le vote ou la publication d'une contribution lorsqu'une authentification est requise, suppose la prise de connaissance et l'acceptation des présentes CGU."),
      legalParagraph("Le choix de recevoir par e-mail les nouveaux sujets et les analyses publiées sur Stamio est facultatif, distinct de l’acceptation des présentes CGU et modifiable à tout moment depuis les préférences du compte."),
      legalParagraph("L'utilisateur qui n'accepte pas les CGU doit s'abstenir d'utiliser les fonctionnalités nécessitant un compte."),
      legalParagraph("Stamio peut faire évoluer les modalités d'accès au service, notamment pour des raisons de sécurité, de conformité, de maintenance ou d'amélioration du produit.")
    ]
  },
  {
    title: "4. Création, authentification et sécurité du compte",
    blocks: [
      legalParagraph("Pour créer un compte, l'utilisateur doit fournir les informations demandées dans le parcours d'inscription, notamment une adresse e-mail valide, et confirmer cette adresse lorsque cela est requis."),
      legalParagraph("Stamio peut proposer plusieurs mécanismes d'authentification, notamment un mot de passe et des Passkeys. L'utilisateur est responsable de la sécurité de son adresse e-mail, de ses moyens d'authentification et des appareils sur lesquels ses Passkeys sont disponibles."),
      legalList([
        "ne pas partager volontairement ses moyens d'authentification avec un tiers ;",
        "utiliser des moyens d'authentification suffisamment sécurisés ;",
        "signaler rapidement à Stamio toute suspicion de compromission du compte ;",
        "maintenir, autant que possible, des informations de compte exactes et à jour."
      ]),
      legalParagraph("Stamio peut demander une nouvelle authentification, révoquer une session ou imposer une mesure de sécurité lorsqu'un risque de compromission, d'abus ou d'accès non autorisé est détecté.")
    ]
  },
  {
    title: "5. Règles de participation et intégrité du vote",
    blocks: [
      legalParagraph("Le principe de participation de Stamio est le suivant : « 1 compte vérifié = 1 vote par vague »."),
      legalParagraph("Le système empêche un même compte de déposer plusieurs bulletins sur une même vague. Le contrôle porte sur le compte et la vague, et non sur le nombre de Passkeys enregistrées sur le compte."),
      legalParagraph("Il est interdit de chercher à contourner ce mécanisme, notamment en créant ou en utilisant plusieurs comptes dans le but de multiplier artificiellement les participations, en automatisant des votes, en manipulant les requêtes techniques ou en tentant d'exploiter une faille."),
      legalParagraph(<>Le vote est anonyme selon le fonctionnement décrit dans la <LegalInlineLink href="/confidentialite">politique de confidentialité</LegalInlineLink> : le choix exprimé n'est pas enregistré avec le compte et Stamio ne conserve aucun lien durable permettant de rattacher le bulletin à un profil utilisateur.</>),
      legalParagraph("Une participation validée est définitive pour la vague concernée et n'a pas vocation à être modifiée ou remplacée depuis le compte, sauf mécanisme contraire expressément proposé par Stamio."),
      legalParagraph("En cas d'interruption technique avant la finalisation d'un vote, Stamio peut appliquer ses mécanismes de reprise ou de réconciliation afin d'assurer la cohérence du bulletin et de la participation sans créer de double vote.")
    ]
  },
  {
    title: "6. Résultats, portée statistique et interprétation",
    blocks: [
      legalParagraph("Les résultats affichés par Stamio correspondent aux bulletins effectivement comptabilisés sur la plateforme pour la question ou la vague concernée."),
      legalParagraph("Sauf indication explicite contraire, les résultats de Stamio ne constituent pas un sondage représentatif de la population française ou d'une autre population de référence au sens des méthodes employées par les instituts de sondage."),
      legalParagraph("La population des participants peut être auto-sélectionnée et dépendre notamment de l'audience de Stamio, de la diffusion de la question, du nombre de participants et de la période d'ouverture. Les résultats doivent donc être interprétés comme un signal issu des participants à la question, et non comme une mesure scientifique de l'opinion générale."),
      legalParagraph("Stamio peut afficher des pourcentages, des volumes de participation, des évolutions dans le temps ou d'autres représentations agrégées. Des écarts d'arrondi peuvent exister dans certains affichages sans modifier le nombre réel de bulletins comptabilisés.")
    ]
  },
  {
    title: "7. Questions, contenus éditoriaux et ressources externes",
    blocks: [
      legalParagraph("Stamio s'efforce de formuler les questions de manière claire et neutre et de fournir, lorsqu'il le juge utile, des éléments de contexte, des ressources, des arbres de décision ou des liens permettant de mieux comprendre les enjeux."),
      legalParagraph("Ces éléments ont une finalité informative et éditoriale. Ils ne constituent pas un conseil juridique, financier, fiscal, médical ou professionnel personnalisé."),
      legalParagraph("Stamio peut corriger, compléter, suspendre, clôturer, archiver ou retirer une question pour des raisons éditoriales, juridiques, techniques ou de sécurité. Lorsqu'une modification substantielle est susceptible d'affecter l'interprétation d'une consultation en cours, Stamio peut décider de clôturer la vague concernée et d'en ouvrir une nouvelle afin de préserver la cohérence de l'historique."),
      legalParagraph("Les liens vers des sources externes sont fournis à titre documentaire. Stamio ne contrôle pas en permanence leur disponibilité, leur contenu ou leurs mises à jour.")
    ]
  },
  {
    title: "8. Contributions et espaces de discussion",
    blocks: [
      legalParagraph("Lorsque Stamio permet la publication de commentaires ou de réponses, l'utilisateur demeure responsable du contenu qu'il publie."),
      legalParagraph("Les espaces signalés comme publics sont accessibles aux autres utilisateurs et peuvent être consultés par des visiteurs. L'utilisateur ne doit donc pas y publier d'informations qu'il souhaite conserver confidentielles."),
      legalParagraph("L'utilisateur s'engage à contribuer de bonne foi, à respecter les autres participants et à ne pas détourner les espaces de discussion de leur finalité de débat et d'échange.")
    ]
  },
  {
    title: "9. Contenus et comportements interdits",
    blocks: [
      legalParagraph("Sont notamment interdits, sans que cette liste soit exhaustive :"),
      legalList([
        "les contenus ou comportements contraires à la loi ou aux règlements applicables ;",
        "les menaces, appels à la violence, harcèlement, intimidation ou incitation à commettre une infraction ;",
        "les propos haineux ou discriminatoires illicites ;",
        "les contenus diffamatoires, injurieux ou portant illicitement atteinte aux droits d'autrui ;",
        "la publication sans droit de données personnelles, d'éléments confidentiels ou de coordonnées concernant un tiers ;",
        "l'usurpation d'identité ou la présentation trompeuse de son identité ou de sa qualité ;",
        "les contenus portant atteinte aux droits de propriété intellectuelle de tiers ;",
        "le spam, la publicité non sollicitée, les opérations artificielles de promotion ou les messages répétitifs ;",
        "la diffusion de logiciels malveillants, de liens frauduleux ou de contenus destinés à compromettre la sécurité du service ou de ses utilisateurs ;",
        "les tentatives de manipulation artificielle des votes, résultats, compteurs ou espaces de discussion ;",
        "l'utilisation de robots, scripts ou procédés automatisés visant à contourner les limitations, extraire massivement des données ou perturber le fonctionnement du service, sauf autorisation préalable ou indexation légitime par un moteur de recherche ;",
        "la tentative d'accéder à des données, fonctions, comptes ou systèmes auxquels l'utilisateur n'est pas autorisé à accéder."
      ])
    ]
  },
  {
    title: "10. Modération et signalement de contenus",
    blocks: [
      legalParagraph("Stamio peut modérer les contributions afin d'assurer la sécurité du service, le respect de la loi et des présentes CGU. La modération peut être réalisée après publication et, le cas échéant, avec l'aide de mécanismes techniques."),
      legalParagraph("Selon la gravité et le contexte, Stamio peut notamment limiter la visibilité d'un contenu, le retirer, fermer un fil de discussion, limiter temporairement certaines fonctionnalités, suspendre un compte ou mettre fin à son accès au service."),
      legalParagraph("Lorsqu'une décision de modération concerne directement un contenu ou un compte et que la réglementation l'exige, Stamio fournit à l'utilisateur concerné les motifs principaux de la décision et les possibilités de contestation, sauf lorsque la loi, une injonction d'une autorité ou un impératif de sécurité interdit ou limite cette information."),
      legalParagraph(<>Tout utilisateur ou tiers peut signaler un contenu qu'il estime illicite ou contraire aux présentes CGU en écrivant à <LegalEmailLink email="contact@stamio.fr" />. Le signalement doit, dans la mesure du possible, identifier précisément le contenu concerné, indiquer son emplacement ou son URL, expliquer les raisons du signalement et fournir une adresse de contact permettant à Stamio d'en assurer le suivi.</>),
      legalParagraph(<>Les décisions de modération peuvent être contestées à la même adresse en précisant le contenu ou le compte concerné et les raisons de la contestation.</>)
    ]
  },
  {
    title: "11. Suspension, restriction et suppression de compte",
    blocks: [
      legalParagraph("Stamio peut restreindre ou suspendre un compte lorsque cela est nécessaire pour protéger le service ou ses utilisateurs, répondre à une obligation légale, prévenir une fraude ou faire cesser une violation des présentes CGU."),
      legalParagraph("Une suppression définitive ou une restriction durable est réservée notamment aux violations graves ou répétées, aux tentatives de manipulation du vote, aux atteintes à la sécurité ou aux obligations légales imposant une telle mesure."),
      legalParagraph(<>L'utilisateur peut demander la suppression de son compte dans les conditions décrites dans la <LegalInlineLink href="/confidentialite">politique de confidentialité</LegalInlineLink>, notamment en écrivant à <LegalEmailLink email="privacy@stamio.fr" />.</>),
      legalParagraph("La suppression d'un compte n'entraîne pas la suppression d'un bulletin déjà anonymisé lorsqu'aucun lien permettant de rattacher ce bulletin au compte n'est conservé.")
    ]
  },
  {
    title: "12. Propriété intellectuelle de Stamio",
    blocks: [
      legalParagraph("Sous réserve des droits appartenant à des tiers, les éléments propres à Stamio, notamment sa marque, son nom, son logo, son identité visuelle, son interface, ses textes originaux, ses éléments graphiques, ses logiciels et la structure de ses bases de données sont protégés par les règles applicables en matière de propriété intellectuelle."),
      legalParagraph("La consultation et l'utilisation normale du service n'emportent aucune cession de droits de propriété intellectuelle au profit de l'utilisateur."),
      legalParagraph("Sauf exception prévue par la loi ou autorisation expresse, il est interdit de reproduire ou exploiter de manière substantielle les contenus ou bases de données de Stamio à des fins commerciales, publicitaires ou concurrentes.")
    ]
  },
  {
    title: "13. Contenus publiés par les utilisateurs",
    blocks: [
      legalParagraph("L'utilisateur conserve, à l'égard de Stamio, les droits qu'il détient sur les contenus originaux qu'il publie."),
      legalParagraph("Afin de permettre le fonctionnement du service, l'utilisateur accorde à Stamio, pour la durée pendant laquelle son contenu est publié et dans la mesure nécessaire au fonctionnement de la plateforme, une autorisation non exclusive et gratuite d'héberger, reproduire techniquement, afficher, mettre en forme et diffuser cette contribution sur Stamio, ainsi que de la modérer conformément aux présentes CGU."),
      legalParagraph("L'utilisateur garantit qu'il dispose des droits nécessaires pour publier sa contribution et que celle-ci ne porte pas illicitement atteinte aux droits d'un tiers.")
    ]
  },
  {
    title: "14. Réutilisation des résultats et contenus publics",
    blocks: [
      legalParagraph("Les utilisateurs, journalistes, chercheurs, associations et autres tiers peuvent citer de courts extraits des contenus publics ou reproduire ponctuellement des résultats agrégés à des fins d'information, de commentaire ou d'analyse, sous réserve des exceptions prévues par la loi et d'une attribution claire à Stamio avec, lorsque cela est possible, un lien vers la question concernée."),
      legalParagraph("Cette faculté n'autorise pas l'extraction ou la réutilisation substantielle, répétée ou systématique de la base de données de Stamio, ni la présentation de données Stamio d'une manière trompeuse ou laissant croire à une représentativité statistique qui n'est pas annoncée par Stamio."),
      legalParagraph("Toute utilisation commerciale substantielle des données ou contenus de Stamio doit faire l'objet d'un accord préalable, sauf droit légal contraire.")
    ]
  },
  {
    title: "15. Sécurité, maintenance et disponibilité",
    blocks: [
      legalParagraph("Stamio met en œuvre des mesures raisonnables destinées à assurer la sécurité, l'intégrité et la disponibilité du service. Aucun service informatique ne peut cependant garantir une disponibilité ou une sécurité absolue."),
      legalParagraph("L'accès à tout ou partie de Stamio peut être temporairement interrompu, notamment pour maintenance, mise à jour, correction d'incident, évolution technique, mesure de sécurité ou événement indépendant de la volonté de l'éditeur."),
      legalParagraph("Stamio peut modifier son architecture, ses fonctionnalités ou son interface à condition de respecter les droits des utilisateurs et les obligations légales applicables.")
    ]
  },
  {
    title: "16. Données personnelles et confidentialité",
    blocks: [
      legalParagraph(<>Les traitements de données personnelles réalisés dans le cadre de Stamio sont décrits dans la « <LegalInlineLink href="/confidentialite">Politique de confidentialité et de protection des données personnelles</LegalInlineLink> », accessible depuis le pied de page du site.</>),
      legalParagraph(<>Les demandes relatives aux données personnelles et à l'exercice des droits RGPD doivent être adressées à <LegalEmailLink email="privacy@stamio.fr" />.</>)
    ]
  },
  {
    title: "17. Cookies et stockage local",
    blocks: [
      legalParagraph("Stamio peut utiliser des cookies, du stockage local ou des mécanismes équivalents strictement nécessaires au fonctionnement, à l'authentification, à la sécurité ou aux fonctionnalités expressément demandées par l'utilisateur."),
      legalParagraph(<>À la date des présentes CGU, Stamio n'utilise pas de traceurs destinés au ciblage publicitaire ou au profilage publicitaire. Les informations détaillées sont disponibles dans la <LegalInlineLink href="/confidentialite">politique de confidentialité</LegalInlineLink>.</>)
    ]
  },
  {
    title: "18. Gratuité et évolution du modèle du service",
    blocks: [
      legalParagraph("À la date des présentes CGU, les fonctionnalités décrites sont mises à disposition sans paiement demandé aux utilisateurs pour participer aux questions publiques."),
      legalParagraph("Si Stamio devait introduire ultérieurement une fonctionnalité payante ou un abonnement, les conditions commerciales applicables seraient communiquées aux utilisateurs concernés avant toute souscription et feraient, si nécessaire, l'objet de conditions spécifiques.")
    ]
  },
  {
    title: "19. Responsabilité",
    blocks: [
      legalParagraph("Stamio s'efforce d'assurer la qualité éditoriale, la disponibilité du service et l'exactitude technique des résultats affichés. Des erreurs, interruptions ou indisponibilités peuvent néanmoins survenir."),
      legalParagraph("Stamio ne garantit pas l'exactitude, l'exhaustivité ou l'actualité permanente des contenus publiés par des tiers, des contributions d'utilisateurs ou des ressources externes auxquelles le site renvoie."),
      legalParagraph("L'utilisateur demeure responsable de l'usage qu'il fait des informations consultées sur Stamio et des contenus qu'il publie."),
      legalParagraph("Aucune stipulation des présentes CGU n'a pour objet d'exclure ou de limiter une responsabilité qui ne pourrait légalement être exclue ou limitée.")
    ]
  },
  {
    title: "20. Modification des CGU",
    blocks: [
      legalParagraph("Stamio peut modifier les présentes CGU afin de tenir compte d'une évolution du service, de ses fonctionnalités, de la réglementation ou de ses règles de modération."),
      legalParagraph("La date de dernière mise à jour figure en tête du document. En cas de modification substantielle applicable aux utilisateurs disposant d'un compte, Stamio peut les en informer par un moyen approprié et, lorsque cela est nécessaire, demander une nouvelle acceptation des CGU.")
    ]
  },
  {
    title: "21. Droit applicable et règlement des différends",
    blocks: [
      legalParagraph("Les présentes CGU sont régies par le droit français, sous réserve des dispositions impératives éventuellement applicables à l'utilisateur."),
      legalParagraph("En cas de difficulté, l'utilisateur est invité à contacter Stamio afin de rechercher une solution amiable avant toute procédure contentieuse."),
      legalParagraph("À défaut d'accord amiable, le litige relève des juridictions compétentes selon les règles légales applicables. Les présentes CGU n'ont pas pour effet de priver un utilisateur d'une protection juridictionnelle impérative dont il bénéficierait.")
    ]
  },
  {
    title: "22. Contact",
    blocks: [
      legalParagraph(<>Questions générales, signalement d'un contenu ou contestation d'une décision de modération : <LegalEmailLink email="contact@stamio.fr" /></>),
      legalParagraph(<>Protection des données personnelles et exercice des droits : <LegalEmailLink email="privacy@stamio.fr" /></>)
    ]
  }
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Cadre d'utilisation"
      title="Conditions générales d'utilisation"
      updatedAt="Dernière mise à jour : 31 août 2026"
      intro="Règles applicables à l'accès et à l'utilisation de Stamio"
      summary={[
        "En bref",
        "Stamio permet de consulter des questions, de voter anonymement, de consulter des résultats agrégés et, lorsque la fonctionnalité est disponible, de participer à des discussions. Les présentes CGU encadrent l'utilisation du service, l'intégrité du vote, les contenus publiés et la modération."
      ]}
      sections={sections}
    />
  );
}
