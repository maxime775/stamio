import { LegalInlineLink, LegalPage } from "@/components/LegalPage";

export default function LegalNoticesPage() {
  return <LegalPage eyebrow="Informations légales" title="Mentions légales" intro="Informations générales relatives à l’édition, à l’hébergement et au fonctionnement du site Stamio." sections={[
    {
      title: "Éditeur du site",
      paragraphs: [
        "Le site Stamio, accessible à l’adresse stamio.fr, est édité à titre personnel par :",
        "Maxime Opinel\nAdresse de contact : maxime.opinel@gmail.com",
        "Stamio est actuellement un projet développé et exploité en nom propre. Aucune structure juridique dédiée n’a encore été constituée à ce stade."
      ]
    },
    {
      title: "Directeur de la publication",
      paragraphs: ["Directeur de la publication : Maxime Opinel"]
    },
    {
      title: "Hébergeur",
      paragraphs: [
        "Le site est hébergé par OVH SAS.",
        "OVH SAS\n2 rue Kellermann\n59100 Roubaix\nFrance"
      ]
    },
    {
      title: "Objet du site",
      paragraphs: [
        "Stamio est une plateforme de participation en ligne permettant de répondre à des questions ouvertes, de consulter des résultats agrégés et de prendre part à des échanges autour de sujets d’intérêt public ou collectif.",
        "Les résultats publiés sur Stamio correspondent aux participations recueillies auprès des utilisateurs de la plateforme. Ils ne constituent pas des sondages représentatifs au sens statistique du terme."
      ]
    },
    {
      title: "Données personnelles",
      paragraphs: [
        "Stamio peut traiter les données nécessaires à la création de compte, à la sécurisation de la participation et au fonctionnement du service.",
        "Les participations sont affichées sous forme agrégée. Les mécanismes de vérification servent notamment à limiter les participations multiples.",
        <>Les modalités détaillées de traitement des données personnelles sont précisées dans la <LegalInlineLink href="/confidentialite">politique de confidentialité</LegalInlineLink> du site.</>
      ]
    },
    {
      title: "Cookies",
      paragraphs: ["Le site peut utiliser des cookies ou technologies similaires strictement nécessaires à son fonctionnement, notamment pour l’authentification, la sécurité et la conservation de certaines préférences."]
    },
    {
      title: "Propriété intellectuelle",
      paragraphs: ["Les textes, interfaces, éléments graphiques, logo, marque et contenus du site sont protégés par les règles applicables à la propriété intellectuelle. Ils ne peuvent être reproduits ou réutilisés sans autorisation préalable."]
    },
    {
      title: "Responsabilité",
      paragraphs: ["Le site peut évoluer et les informations publiées peuvent être modifiées. L’éditeur s’efforce d’assurer l’exactitude des informations diffusées, sans garantir l’absence totale d’erreur ou d’interruption."]
    },
    {
      title: "Contact",
      paragraphs: ["Pour toute question relative au site, vous pouvez écrire à : maxime.opinel@gmail.com."]
    }
  ]} />;
}
