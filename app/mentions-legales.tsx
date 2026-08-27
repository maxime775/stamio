import {
  LegalEmailLink,
  LegalInlineLink,
  LegalPage,
  legalCallout,
  legalList,
  legalParagraph,
  type LegalSection
} from "@/components/LegalPage";

const sections: LegalSection[] = [
  {
    title: "1. Identification du site",
    blocks: [
      legalParagraph("Nom du service : Stamio"),
      legalParagraph(<>Site : <LegalInlineLink href="/">https://stamio.fr</LegalInlineLink></>),
      legalParagraph("Objet : plateforme de participation et de débat permettant notamment de consulter des questions d'actualité ou de société, de voter anonymement, de consulter des résultats agrégés et, lorsque la fonctionnalité est disponible, de contribuer à des espaces de discussion.")
    ]
  },
  {
    title: "2. Éditeur du site",
    blocks: [
      legalParagraph("Le site stamio.fr est édité à titre non professionnel par :"),
      legalCallout([
        "Maxime Opinel, personne physique",
        <>E-mail : <LegalEmailLink email="maxime@stamio.fr" /></>
      ]),
      legalParagraph("Les informations d'immatriculation professionnelle éventuellement applicables devront être ajoutées si l'éditeur devient assujetti à une formalité d'immatriculation correspondante.")
    ]
  },
  {
    title: "3. Directeur de la publication",
    blocks: [
      legalParagraph("Directeur de la publication : Maxime Opinel"),
      legalParagraph(<>Contact du directeur de la publication : <LegalEmailLink email="maxime@stamio.fr" /></>)
    ]
  },
  {
    title: "4. Hébergement du site",
    blocks: [
      legalParagraph("Le site web stamio.fr est hébergé par :"),
      legalCallout([
        "OVH SAS (OVHcloud)",
        "SAS au capital de 50 000 000 €",
        "RCS Lille Métropole 424 761 419 00045",
        "2 rue Kellermann, 59100 Roubaix, France",
        "Téléphone : 1007 depuis la France ; +33 9 72 10 10 07 depuis l'étranger"
      ])
    ]
  },
  {
    title: "5. Prestataire de base de données, d'authentification et de stockage",
    blocks: [
      legalParagraph("Stamio utilise les services de Supabase pour notamment la base de données, l'authentification, les fonctions serveur et certains traitements techniques du service."),
      legalParagraph("Prestataire contractuel : Supabase, Inc."),
      legalParagraph("Adresse indiquée dans la documentation contractuelle de Supabase : 970 Toa Payoh North #07-04, Singapore 318992."),
      legalParagraph(<>Le projet principal de Stamio est déployé dans la région technique West Europe (London), eu-west-2. Les informations relatives aux traitements et transferts de données sont détaillées dans la <LegalInlineLink href="/confidentialite">Politique de confidentialité et de protection des données personnelles</LegalInlineLink>.</>)
    ]
  },
  {
    title: "6. Contact",
    blocks: [
      legalParagraph(<>Pour toute question générale relative au site : <LegalEmailLink email="maxime@stamio.fr" /></>),
      legalParagraph(<>Pour toute question relative aux données personnelles ou à l'exercice des droits RGPD : <LegalEmailLink email="privacy@stamio.fr" /></>)
    ]
  },
  {
    title: "7. Droit de réponse",
    blocks: [
      legalParagraph("Toute personne nommée ou désignée dans un contenu mis à disposition sur Stamio peut exercer le droit de réponse prévu par la législation applicable aux services de communication au public en ligne."),
      legalParagraph(<>Les demandes de droit de réponse doivent être adressées au directeur de la publication à <LegalEmailLink email="maxime@stamio.fr" />, en identifiant précisément le contenu concerné et en fournissant les éléments nécessaires au traitement de la demande.</>)
    ]
  },
  {
    title: "8. Signalement d'un contenu illicite ou problématique",
    blocks: [
      legalParagraph("Stamio permet aux utilisateurs et aux tiers de signaler un contenu qu'ils estiment illicite ou contraire aux règles d'utilisation du service."),
      legalParagraph(<>Le signalement peut être adressé par voie électronique à <LegalEmailLink email="maxime@stamio.fr" />.</>),
      legalParagraph("Afin de permettre un traitement efficace, le signalement doit, dans la mesure du possible, préciser :"),
      legalList([
        "le contenu concerné et son emplacement ou son URL ;",
        "les raisons pour lesquelles le contenu est considéré comme illicite ou contraire aux règles du service ;",
        "les éléments factuels ou juridiques utiles à l'examen du signalement ;",
        "une adresse de contact permettant d'assurer le suivi de la demande."
      ]),
      legalParagraph(<>Stamio examine les signalements de bonne foi et peut retirer, restreindre ou maintenir le contenu selon les faits, le droit applicable et les <LegalInlineLink href="/conditions-utilisation">Conditions générales d'utilisation</LegalInlineLink>.</>)
    ]
  },
  {
    title: "9. Propriété intellectuelle",
    blocks: [
      legalParagraph("Sous réserve des droits appartenant à des tiers, la structure générale du site, la marque Stamio, le nom, le logo, l'identité visuelle, les interfaces, les textes originaux, les éléments graphiques, les logiciels et la structure des bases de données sont protégés par les règles applicables en matière de propriété intellectuelle."),
      legalParagraph("La consultation du site n'emporte aucune cession de droits au profit de l'utilisateur."),
      legalParagraph("Les contenus provenant de tiers, notamment articles, études, décisions, images, documents officiels ou ressources externes, demeurent soumis aux droits et licences de leurs auteurs ou éditeurs respectifs."),
      legalParagraph("Toute reproduction ou réutilisation substantielle des contenus ou bases de données de Stamio à des fins commerciales, publicitaires ou concurrentes est soumise à autorisation, sous réserve des exceptions prévues par la loi.")
    ]
  },
  {
    title: "10. Résultats et réutilisation",
    blocks: [
      legalParagraph("Les résultats publiés sur Stamio correspondent aux participations enregistrées sur la plateforme pour les questions concernées."),
      legalParagraph("Sauf mention explicite contraire, ils ne doivent pas être présentés comme des sondages statistiquement représentatifs d'une population de référence."),
      legalParagraph("La citation ponctuelle de résultats agrégés ou de courts extraits est admise dans les limites prévues par la loi, sous réserve d'une attribution claire à Stamio et de ne pas présenter les données de manière trompeuse.")
    ]
  },
  {
    title: "11. Responsabilité éditoriale et liens externes",
    blocks: [
      legalParagraph("Stamio s'efforce de publier des informations exactes et de maintenir ses contenus à jour, sans pouvoir garantir l'absence totale d'erreurs ou l'actualité permanente de toutes les informations et sources externes."),
      legalParagraph("Les liens hypertextes vers des sites tiers sont proposés à titre documentaire. Stamio n'exerce pas de contrôle permanent sur ces sites et n'est pas responsable de leurs contenus, de leur disponibilité ou de leurs propres traitements de données."),
      legalParagraph("Les contributions publiées par les utilisateurs demeurent sous la responsabilité de leurs auteurs, sous réserve des obligations de modération et de retrait qui incombent à Stamio lorsqu'il a connaissance d'un contenu illicite ou contraire aux règles du service.")
    ]
  },
  {
    title: "12. Données personnelles",
    blocks: [
      legalParagraph(<>Les traitements de données personnelles réalisés dans le cadre de Stamio sont décrits dans la page « Politique de confidentialité et de protection des données personnelles », accessible à l'adresse <LegalInlineLink href="/confidentialite">https://stamio.fr/confidentialite</LegalInlineLink>.</>),
      legalParagraph(<>Le contact dédié à la protection des données et à l'exercice des droits est : <LegalEmailLink email="privacy@stamio.fr" />.</>)
    ]
  },
  {
    title: "13. Cookies et traceurs",
    blocks: [
      legalParagraph("À la date de la présente page, Stamio n'utilise pas de traceurs destinés au ciblage publicitaire ou au profilage publicitaire."),
      legalParagraph("Des cookies, éléments de stockage local ou mécanismes équivalents peuvent être utilisés lorsqu'ils sont strictement nécessaires à l'authentification, à la sécurité, à la conservation de la session ou au fonctionnement d'une fonctionnalité demandée par l'utilisateur."),
      legalParagraph(<>Les informations détaillées sont disponibles dans la <LegalInlineLink href="/confidentialite">politique de confidentialité</LegalInlineLink>.</>)
    ]
  },
  {
    title: "14. Conditions générales d'utilisation",
    blocks: [
      legalParagraph(<>Les règles relatives à l'utilisation du service, à l'intégrité du vote, aux contributions, à la modération, à la propriété intellectuelle et à la responsabilité sont détaillées dans les Conditions générales d'utilisation accessibles à l'adresse <LegalInlineLink href="/conditions-utilisation">https://stamio.fr/conditions-utilisation</LegalInlineLink>.</>)
    ]
  },
  {
    title: "15. Droit applicable",
    blocks: [
      legalParagraph("Le site et les présentes mentions légales sont soumis au droit français, sous réserve des dispositions impératives éventuellement applicables.")
    ]
  },
  {
    title: "16. Mise à jour des mentions légales",
    blocks: [
      legalParagraph("Les présentes mentions légales peuvent être modifiées afin de tenir compte d'une évolution de l'identité de l'éditeur, de l'hébergement, des prestataires techniques, du fonctionnement du service ou de la réglementation applicable."),
      legalParagraph("La date de dernière mise à jour figure en tête de la page.")
    ]
  }
];

export default function LegalNoticesPage() {
  return (
    <LegalPage
      eyebrow="Informations légales"
      title="Mentions légales"
      updatedAt="Dernière mise à jour : 27 août 2026"
      intro="Informations relatives à l'édition, à l'hébergement et à l'utilisation de stamio.fr"
      sections={sections}
    />
  );
}
