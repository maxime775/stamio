import { LegalPage } from "@/components/LegalPage";

export default function LegalNoticesPage() {
  return <LegalPage eyebrow="Informations légales" title="Mentions légales" intro="Informations générales relatives à l’édition et à l’hébergement du service Stamio." sections={[
    { title: "Éditeur du service", paragraphs: ["Nom de l’éditeur : [à compléter]. Forme juridique, capital social et numéro d’immatriculation : [à compléter]. Adresse du siège social : [à compléter].", "Adresse de contact : [à compléter]. Directeur ou directrice de la publication : [à compléter]."] },
    { title: "Hébergement", paragraphs: ["Le service est hébergé par : [nom de l’hébergeur à compléter], [forme juridique et adresse à compléter]. Les coordonnées techniques et le lieu d’hébergement doivent être confirmés avant publication."] },
    { title: "Propriété intellectuelle", paragraphs: ["Les textes, interfaces, marques et éléments graphiques du service sont protégés par les règles applicables à la propriété intellectuelle. Toute réutilisation non autorisée peut être interdite."] },
    { title: "Contact", paragraphs: ["Pour toute question relative au service ou à son contenu : [email de contact à compléter]."] }
  ]} />;
}
