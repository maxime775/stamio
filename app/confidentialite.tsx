import { LegalPage } from "@/components/LegalPage";

export default function PrivacyPage() {
  return <LegalPage eyebrow="Données personnelles" title="Politique de confidentialité" intro="Présentation générale des traitements susceptibles d’être mis en œuvre dans le cadre du service." sections={[
    { title: "Données et finalités", paragraphs: ["Les données communiquées peuvent être utilisées pour créer et sécuriser un compte, permettre la participation aux sondages, prévenir les votes multiples, gérer les commentaires et assurer la modération.", "Des données techniques peuvent également être traitées pour la sécurité du service, la prévention des abus et la production de statistiques agrégées."] },
    { title: "Vérification et confidentialité du vote", paragraphs: ["La vérification téléphonique sert à contrôler l’unicité d’une participation selon le fonctionnement du service. Les résultats publics sont présentés sous forme agrégée et ne doivent pas révéler de données individuelles."] },
    { title: "Durées, destinataires et droits", paragraphs: ["Les durées de conservation, les destinataires autorisés et les bases juridiques doivent être documentés précisément avant publication.", "Les modalités d’exercice des droits d’accès, de rectification, d’effacement, d’opposition et de limitation doivent être adressées à : [contact données personnelles ou DPO à compléter]."] },
    { title: "Cookies et services tiers", paragraphs: ["La liste des traceurs, prestataires techniques et éventuels transferts de données doit être complétée en fonction de la configuration réellement déployée."] }
  ]} />;
}
