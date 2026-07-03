import { LegalPage } from "@/components/LegalPage";

export default function TermsPage() {
  return <LegalPage eyebrow="Cadre d’utilisation" title="Conditions d’utilisation" intro="Règles générales applicables à l’accès et à l’utilisation du service Sayit." sections={[
    { title: "Accès au service", paragraphs: ["L’utilisateur s’engage à fournir des informations exactes lors de la création de son compte et à préserver la confidentialité de ses moyens d’accès.", "Certaines fonctionnalités peuvent être limitées, modifiées ou interrompues pour des raisons de sécurité, de maintenance ou d’évolution du service."] },
    { title: "Sondages et résultats", paragraphs: ["Les sondages proposent une lecture indicative des réponses enregistrées par le service. Ils ne constituent pas nécessairement des études représentatives ou exhaustives de la population.", "Toute tentative de contournement des mécanismes de vérification ou de participation multiple est interdite."] },
    { title: "Commentaires et modération", paragraphs: ["Les contenus illicites, menaçants, discriminatoires, diffamatoires, frauduleux ou portant atteinte aux droits d’autrui sont interdits. L’utilisateur reste responsable des contenus qu’il publie.", "Le service peut modérer, masquer ou supprimer un contenu contraire aux règles applicables et prendre les mesures nécessaires à la protection de la plateforme."] },
    { title: "Responsabilité et évolution", paragraphs: ["Le service s’efforce de fournir des informations et fonctionnalités fiables, sans garantir une disponibilité permanente ni l’absence exhaustive d’erreurs.", "Ces conditions peuvent évoluer afin de refléter les changements fonctionnels, techniques ou réglementaires. Les modalités d’information des utilisateurs sont à préciser avant publication."] }
  ]} />;
}
