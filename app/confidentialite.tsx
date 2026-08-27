import {
  LegalEmailLink,
  LegalPage,
  legalCallout,
  legalList,
  legalParagraph,
  legalSubheading,
  legalTable,
  type LegalSection
} from "@/components/LegalPage";

const sections: LegalSection[] = [
  {
    title: "1. Objet de la présente politique",
    blocks: [
      legalParagraph("La présente politique de confidentialité décrit la manière dont Stamio collecte, utilise, conserve et protège les données à caractère personnel des utilisateurs du site stamio.fr."),
      legalParagraph("Stamio est une plateforme permettant notamment de consulter des questions d’actualité et de société, d’y participer, de consulter des résultats agrégés et, lorsque cette fonctionnalité est disponible, de contribuer aux espaces de discussion."),
      legalParagraph("La présente politique est établie conformément au règlement (UE) 2016/679 du 27 avril 2016, dit « RGPD », ainsi qu’à la loi française n° 78-17 du 6 janvier 1978 relative à l’informatique, aux fichiers et aux libertés."),
      legalParagraph("Elle s’applique aux traitements de données réalisés dans le cadre de Stamio. Les sites et services tiers accessibles au moyen de liens externes disposent de leurs propres politiques de confidentialité.")
    ]
  },
  {
    title: "2. Responsable du traitement",
    blocks: [
      legalParagraph("Le responsable des traitements de données personnelles réalisés dans le cadre de Stamio est :"),
      legalCallout([
        "Responsable du traitement : Maxime Opinel — Stamio",
        <>E-mail professionnel : <LegalEmailLink email="maxime@stamio.fr" /></>,
        <>Protection des données et exercice des droits : <LegalEmailLink email="privacy@stamio.fr" /></>
      ]),
      legalParagraph(<>Toute question relative à la protection des données personnelles ou toute demande d’exercice de vos droits peut être adressée à <LegalEmailLink email="privacy@stamio.fr" />.</>)
    ]
  },
  {
    title: "3. Vote anonyme et séparation entre le compte utilisateur et le bulletin",
    blocks: [
      legalParagraph("Les votes sur Stamio sont anonymes. Le choix exprimé n’est pas enregistré avec le compte utilisateur et Stamio ne conserve aucun lien durable permettant de rattacher un bulletin à un profil utilisateur."),
      legalParagraph("Lorsqu’un utilisateur participe à une question, Stamio conserve séparément :"),
      legalList([
        "la participation du compte, afin de savoir que ce compte a déjà participé à la question concernée et d’empêcher un second vote sur la même vague ;",
        "le bulletin, qui contient la question concernée et le choix exprimé, sans identifiant du compte utilisateur."
      ]),
      legalParagraph("Le bulletin enregistré dans la base métier de Stamio ne contient notamment ni identifiant utilisateur, ni adresse e-mail, ni identifiant de Passkey, ni identifiant de participation, ni identifiant permettant de le rattacher durablement au compte ayant voté."),
      legalParagraph("Une autorisation technique temporaire est utilisée lors de la transaction afin de permettre au serveur de vérifier qu’un compte est autorisé à voter. Cette autorisation ne contient pas le choix exprimé. Le lien technique temporaire nécessaire à cette opération est supprimé après finalisation du vote ou par le mécanisme automatique de réconciliation prévu à cet effet."),
      legalParagraph("Cette architecture permet de mettre en œuvre le principe « 1 compte vérifié = 1 vote par vague » sans conserver durablement l’association entre le compte et la réponse exprimée."),
      legalParagraph("Stamio ne constitue pas de profil politique individuel à partir des choix exprimés dans les votes et n’utilise pas les bulletins pour du ciblage publicitaire, commercial ou politique.")
    ]
  },
  {
    title: "4. Données personnelles susceptibles d’être traitées",
    blocks: [
      legalSubheading("4.1. Données de compte"),
      legalParagraph("Lors de la création et de l’utilisation d’un compte, Stamio peut traiter notamment :"),
      legalList([
        "votre adresse e-mail ;",
        "votre nom d’utilisateur ou pseudonyme ;",
        "un identifiant technique de compte ;",
        "l’état de confirmation de votre adresse e-mail ;",
        "les informations nécessaires à la création, à la gestion et à la sécurisation de votre compte ;",
        "les dates et informations techniques liées à certaines opérations effectuées sur le compte."
      ]),
      legalParagraph("Stamio ne demande pas de numéro de téléphone dans son parcours actuel d’inscription et de vote."),
      legalSubheading("4.2. Données d’authentification"),
      legalParagraph("Stamio utilise notamment des mots de passe et des Passkeys pour permettre l’authentification des utilisateurs."),
      legalParagraph("Les mots de passe ne sont pas conservés en clair par Stamio."),
      legalParagraph("Dans le cas d’une Passkey, Stamio conserve uniquement les informations cryptographiques et techniques nécessaires à la vérification de l’authentification, notamment l’identifiant du credential et la clé publique correspondante."),
      legalParagraph("La clé privée reste sous le contrôle de l’appareil ou du gestionnaire de Passkeys de l’utilisateur."),
      legalSubheading("4.3. Données biométriques utilisées par l’appareil"),
      legalParagraph("Une Passkey peut être déverrouillée localement au moyen de mécanismes tels que Face ID, Touch ID, Windows Hello, le code de l’appareil ou tout autre mécanisme proposé par le système d’exploitation."),
      legalParagraph("Stamio ne reçoit ni ne conserve les données biométriques utilisées localement par l’appareil, telles qu’une empreinte digitale ou une représentation du visage."),
      legalParagraph("Ces données restent gérées par l’appareil, le système d’exploitation ou le gestionnaire de Passkeys utilisé par l’utilisateur."),
      legalSubheading("4.4. Données relatives à la participation aux questions"),
      legalParagraph("Afin d’assurer l’unicité de la participation, Stamio peut conserver pour chaque compte :"),
      legalList([
        "l’identifiant du compte ;",
        "l’identifiant de la question ou de la vague à laquelle il a participé ;",
        "la date ou les informations temporelles minimales nécessaires au fonctionnement du service."
      ]),
      legalParagraph("Ces informations peuvent également permettre à l’utilisateur de retrouver les questions auxquelles il a déjà participé."),
      legalParagraph("L’historique de participation du compte ne contient pas le choix exprimé par l’utilisateur."),
      legalSubheading("4.5. Bulletins de vote"),
      legalParagraph("Un bulletin peut comprendre notamment :"),
      legalList([
        "l’identifiant de la question ou de la vague ;",
        "l’identifiant du choix exprimé ;",
        "la date ou les informations temporelles strictement nécessaires au comptage et à l’évolution des résultats."
      ]),
      legalParagraph("Le bulletin n’est pas enregistré avec l’identifiant du compte ayant participé."),
      legalSubheading("4.6. Commentaires, discussions et contenus publiés"),
      legalParagraph("Lorsque les fonctionnalités de discussion sont utilisées, Stamio peut traiter notamment :"),
      legalList([
        "le pseudonyme ou l’identifiant public de l’utilisateur ;",
        "le contenu du commentaire ou de la réponse ;",
        "la date de publication ;",
        "les éventuelles interactions associées au contenu ;",
        "les informations nécessaires à sa gestion et à sa modération."
      ]),
      legalParagraph("Les contenus publiés dans un espace présenté comme public sont susceptibles d’être consultés par les autres utilisateurs et visiteurs du site."),
      legalSubheading("4.7. Données techniques et de sécurité"),
      legalParagraph("Lors de l’utilisation du service, Stamio ou ses prestataires techniques peuvent traiter certaines données nécessaires au fonctionnement et à la sécurité du site, notamment :"),
      legalList([
        "l’adresse IP ;",
        "le type de navigateur ;",
        "le type d’appareil ;",
        "le système d’exploitation ;",
        "les dates et heures de connexion ou de requête ;",
        "des journaux techniques ;",
        "des données permettant d’appliquer des limitations de requêtes ;",
        "des informations nécessaires à la prévention des abus, du spam, des attaques et des tentatives de contournement du système de vote."
      ]),
      legalParagraph("Lorsque cela est approprié, certaines informations peuvent être transformées au moyen de fonctions cryptographiques afin de réduire leur exposition directe.")
    ]
  },
  {
    title: "5. Origine des données",
    blocks: [
      legalParagraph("Les données traitées par Stamio proviennent principalement :"),
      legalList([
        "des informations que vous fournissez directement lors de la création ou de la gestion de votre compte ;",
        "des actions que vous effectuez volontairement sur le service, telles qu’une participation ou la publication d’un commentaire ;",
        "des informations techniques produites automatiquement lors de votre utilisation du site ;",
        "des prestataires techniques nécessaires à l’authentification, à l’hébergement, à la sécurité ou au fonctionnement du service."
      ]),
      legalParagraph("Stamio n’achète pas de bases de données personnelles auprès de courtiers en données et n’utilise pas de fichiers tiers afin d’enrichir des profils individuels d’utilisateurs.")
    ]
  },
  {
    title: "6. Caractère obligatoire ou facultatif des données",
    blocks: [
      legalParagraph("Les informations nécessaires à la création du compte et à l’authentification sont obligatoires lorsque vous souhaitez utiliser les fonctionnalités nécessitant un compte."),
      legalParagraph("En l’absence de ces informations, certaines fonctionnalités peuvent ne pas être accessibles, notamment :"),
      legalList([
        "le vote ;",
        "l’accès à certaines informations liées au compte ;",
        "l’historique personnel de participation ;",
        "la publication de commentaires ou de contributions lorsque l’authentification est requise."
      ]),
      legalParagraph("La participation à une question et la publication de commentaires restent facultatives."),
      legalParagraph("Les parties publiques de Stamio peuvent être consultées sans création de compte lorsqu’elles ont été conçues à cet effet.")
    ]
  },
  {
    title: "7. Finalités et bases légales des traitements",
    blocks: [
      legalParagraph("Tout traitement de données personnelles mis en œuvre par Stamio poursuit une finalité déterminée et repose sur une base légale appropriée au regard de l’article 6 du RGPD."),
      legalTable("Finalités et bases légales des traitements", ["Finalité", "Base légale"], [
        ["Création et gestion du compte", "Exécution du service demandé — article 6(1)(b) du RGPD"],
        ["Confirmation de l’adresse e-mail", "Exécution du service demandé — article 6(1)(b)"],
        ["Authentification par mot de passe ou Passkey", "Exécution du service demandé — article 6(1)(b)"],
        ["Récupération et sécurisation du compte", "Exécution du service demandé — article 6(1)(b)"],
        ["Enregistrement du fait qu’un compte a participé à une question", "Exécution du service demandé — article 6(1)(b)"],
        ["Prévention d’un second vote du même compte sur une même vague", "Exécution du service demandé et intégrité du service — article 6(1)(b)"],
        ["Enregistrement et comptabilisation du bulletin", "Exécution du service demandé — article 6(1)(b)"],
        ["Publication des résultats agrégés", "Exécution et fonctionnement du service — article 6(1)(b)"],
        ["Publication des commentaires demandés par l’utilisateur", "Exécution du service demandé — article 6(1)(b)"],
        ["Modération des contenus et prévention des abus", "Intérêt légitime de Stamio à protéger les utilisateurs et le service — article 6(1)(f)"],
        ["Sécurité informatique, prévention de la fraude, du spam et des attaques", "Intérêt légitime de Stamio à assurer la sécurité et l’intégrité de la plateforme — article 6(1)(f)"],
        ["Limitations de requêtes et prévention des usages automatisés abusifs", "Intérêt légitime de Stamio — article 6(1)(f)"],
        ["Gestion des demandes relatives à l’exercice des droits RGPD", "Respect des obligations légales de Stamio — article 6(1)(c)"],
        ["Réponse à une autorité compétente lorsqu’elle est légalement requise", "Respect d’une obligation légale — article 6(1)(c)"],
        ["Gestion des autres demandes adressées à Stamio", "Intérêt légitime à assurer le fonctionnement et le suivi du service, ou exécution du service selon la nature de la demande"]
      ]),
      legalParagraph("Lorsque Stamio fonde un traitement sur son intérêt légitime, cet intérêt consiste notamment à assurer la sécurité du service, prévenir les abus et la fraude, protéger la plateforme et ses utilisateurs et préserver l’intégrité du système de participation."),
      legalParagraph("Ces intérêts sont mis en balance avec les droits et libertés des utilisateurs et les traitements concernés sont limités à ce qui est nécessaire à ces finalités.")
    ]
  },
  {
    title: "8. Questions politiques, sociétales et données sensibles",
    blocks: [
      legalParagraph("Certaines questions proposées sur Stamio peuvent porter sur des sujets politiques, électoraux, sociaux, économiques, religieux, éthiques ou plus largement sur des thèmes susceptibles de révéler certaines opinions ou convictions."),
      legalParagraph("Les opinions politiques, les convictions religieuses ou philosophiques et plusieurs autres catégories de données bénéficient d’une protection renforcée en application de l’article 9 du RGPD."),
      legalSubheading("Le choix exprimé dans un bulletin"),
      legalParagraph("Les votes sur Stamio sont anonymes selon le fonctionnement décrit à la section 3 : le choix exprimé n’est pas enregistré avec le compte et aucun lien durable compte-bulletin n’est conservé dans la base métier."),
      legalParagraph("L’historique personnel d’un compte indique qu’une participation a eu lieu, mais ne contient pas le choix exprimé."),
      legalParagraph("Stamio n’utilise pas les réponses individuelles pour déterminer les opinions politiques d’un utilisateur, constituer un profil politique ou effectuer du ciblage."),
      legalSubheading("Les commentaires publics"),
      legalParagraph("Un utilisateur peut volontairement publier un commentaire contenant une opinion, une conviction ou une autre information personnelle."),
      legalParagraph("Lorsqu’une personne choisit délibérément de rendre publique une donnée sensible la concernant, son traitement peut, selon les circonstances et sous réserve des conditions prévues par le RGPD, relever notamment de l’exception applicable aux données manifestement rendues publiques par la personne concernée, prévue à l’article 9(2)(e) du RGPD."),
      legalParagraph("Les utilisateurs sont invités à ne pas publier :"),
      legalList([
        "de données sensibles qui ne seraient pas nécessaires à leur contribution ;",
        "de données personnelles concernant des tiers ;",
        "d’informations permettant d’identifier inutilement d’autres personnes."
      ])
    ]
  },
  {
    title: "9. Destinataires des données",
    blocks: [
      legalParagraph("Les données personnelles ne sont accessibles qu’aux personnes et prestataires pour lesquels cet accès est nécessaire à l’accomplissement des finalités décrites dans la présente politique."),
      legalParagraph("Peuvent notamment être destinataires des données :"),
      legalList([
        "l’éditeur et les personnes expressément autorisées à administrer Stamio ;",
        "les prestataires d’hébergement ;",
        "les prestataires de base de données et d’authentification ;",
        "les prestataires nécessaires à l’envoi d’e-mails transactionnels ;",
        "les prestataires nécessaires à la sécurité et au fonctionnement technique du service ;",
        "les autorités administratives, judiciaires ou policières lorsqu’une communication est imposée par la loi."
      ]),
      legalSubheading("Supabase"),
      legalParagraph("Supabase est utilisé notamment pour la base de données, l’authentification, les fonctions serveur, certaines opérations techniques liées au vote et le stockage de certaines données nécessaires au service."),
      legalSubheading("OVHcloud"),
      legalParagraph("OVHcloud est utilisé notamment pour l’hébergement et la mise à disposition du site web Stamio ainsi que pour certains services liés au nom de domaine et à la messagerie professionnelle."),
      legalParagraph("Stamio veille à ce que ses prestataires traitent les données dans le cadre des services fournis et conformément aux obligations applicables en matière de protection des données."),
      legalParagraph("Stamio ne vend ni ne loue les données personnelles de ses utilisateurs."),
      legalParagraph("Les données ne sont pas communiquées à des annonceurs afin de permettre un ciblage publicitaire ou politique individuel.")
    ]
  },
  {
    title: "10. Localisation des données et transferts internationaux",
    blocks: [
      legalParagraph("Les principaux traitements de données sont réalisés au moyen d’infrastructures situées en Europe ou dans des territoires bénéficiant d’un cadre reconnu en matière de protection des données."),
      legalParagraph("Le projet Supabase principal utilisé par Stamio est actuellement hébergé dans la région technique West Europe (London), au Royaume-Uni."),
      legalParagraph("Le Royaume-Uni bénéficie d’une décision d’adéquation de la Commission européenne au titre du RGPD, renouvelée le 19 décembre 2025. Les transferts couverts par une telle décision peuvent être effectués sans mécanisme de transfert supplémentaire de type clauses contractuelles types."),
      legalParagraph("Lorsque l’intervention d’un prestataire implique un transfert de données vers un pays ne bénéficiant pas d’une décision d’adéquation applicable, Stamio veille à ce qu’un mécanisme de transfert prévu par le RGPD soit utilisé lorsque cela est requis, notamment des clauses contractuelles types ou toute autre garantie appropriée.")
    ]
  },
  {
    title: "11. Durées de conservation",
    blocks: [
      legalParagraph("Stamio applique le principe de limitation de la conservation : les données ne sont pas conservées plus longtemps que nécessaire au regard de la finalité pour laquelle elles sont traitées."),
      legalParagraph("Lorsque la durée exacte ne peut pas être déterminée à l’avance, elle est définie au moyen de critères liés à la finalité du traitement."),
      legalSubheading("11.1. Données de compte"),
      legalParagraph("Les données nécessaires au fonctionnement du compte sont conservées pendant la durée d’existence du compte."),
      legalParagraph("Lorsqu’un compte est supprimé, les données directement rattachables à celui-ci sont supprimées ou rendues inaccessibles dans la mesure où leur conservation n’est plus nécessaire, sous réserve des obligations légales applicables, de la gestion d’un éventuel litige, des délais techniques de sauvegarde et des journaux de sécurité encore nécessaires à la prévention ou à l’analyse d’un incident."),
      legalSubheading("11.2. Données d’authentification et Passkeys"),
      legalParagraph("Les informations nécessaires à une Passkey sont conservées tant que celle-ci est enregistrée sur le compte."),
      legalParagraph("Lorsqu’une Passkey est supprimée, les informations qui ne sont plus nécessaires à son fonctionnement n’ont pas vocation à être conservées dans la base active."),
      legalSubheading("11.3. Historique de participation"),
      legalParagraph("La donnée indiquant qu’un compte a participé à une question peut être conservée pendant la durée d’existence du compte afin d’empêcher un second vote sur la même vague, de permettre le fonctionnement de l’historique de participation et d’assurer l’intégrité du système."),
      legalParagraph("Cette donnée ne contient pas le choix exprimé."),
      legalSubheading("11.4. Bulletins"),
      legalParagraph("Les bulletins anonymes séparés du compte peuvent être conservés afin de comptabiliser les résultats, de présenter leur évolution dans le temps, de conserver l’historique des résultats et d’assurer la cohérence statistique du service."),
      legalParagraph("Stamio ne conserve pas dans sa base métier de lien durable permettant de déterminer quel bulletin appartient à quel compte."),
      legalParagraph("Lorsqu’une finalité n’exige plus l’identification d’une personne, l’article 11 du RGPD prévoit que le responsable du traitement n’est pas tenu de conserver, d’obtenir ou de traiter des informations supplémentaires à la seule fin d’identifier à nouveau la personne concernée."),
      legalSubheading("11.5. Commentaires et contributions"),
      legalParagraph("Les commentaires et contributions peuvent être conservés pendant leur période de publication sur Stamio."),
      legalParagraph("Ils peuvent être supprimés lorsqu’ils ne sont plus nécessaires, lorsqu’un utilisateur exerce valablement un droit à l’effacement ou lorsque leur retrait résulte de la modération."),
      legalParagraph("Certaines informations peuvent être temporairement conservées lorsque cela est nécessaire à la gestion d’un signalement, d’un abus, d’un litige ou d’une obligation légale."),
      legalSubheading("11.6. Journaux et données techniques de sécurité"),
      legalParagraph("Les journaux techniques et données nécessaires à la sécurité sont conservés pendant une durée limitée correspondant aux besoins de fonctionnement du service, de prévention des abus, de détection des incidents et d’investigation en cas d’incident de sécurité."),
      legalParagraph("Leur durée peut également dépendre des cycles techniques de journalisation et de sauvegarde des prestataires utilisés."),
      legalParagraph("En cas d’incident ou de litige, les éléments strictement nécessaires peuvent être conservés pendant la durée requise pour traiter cet incident ou assurer la défense d’un droit."),
      legalSubheading("11.7. Demandes adressées à Stamio"),
      legalParagraph("Les échanges avec Stamio sont conservés pendant la durée nécessaire au traitement de la demande."),
      legalParagraph("Ils peuvent ensuite être conservés pendant une durée limitée lorsqu’il est nécessaire de conserver une preuve de la demande, de son traitement ou de l’exercice d’un droit.")
    ]
  },
  {
    title: "12. Cookies, stockage local et autres traceurs",
    blocks: [
      legalParagraph("À la date de la présente politique, Stamio n’utilise pas de traceurs destinés au ciblage publicitaire, au profilage publicitaire ou au suivi commercial des utilisateurs entre différents sites."),
      legalParagraph("Stamio peut utiliser des cookies, du stockage local ou des mécanismes équivalents strictement nécessaires notamment à :"),
      legalList([
        "l’authentification ;",
        "la conservation et la sécurisation de la session ;",
        "la sécurité du site ;",
        "la prévention des abus ;",
        "la mémorisation d’informations indispensables au fonctionnement d’une fonctionnalité demandée par l’utilisateur."
      ]),
      legalParagraph("Les traceurs strictement nécessaires au fonctionnement d’un service expressément demandé par l’utilisateur peuvent, dans les conditions prévues par la réglementation, être exemptés du recueil préalable du consentement."),
      legalParagraph("Si Stamio introduit ultérieurement des traceurs publicitaires, des outils de profilage ou des dispositifs de mesure d’audience nécessitant un consentement préalable, ils ne seront activés qu’après mise en place du mécanisme de consentement requis et la présente politique sera mise à jour.")
    ]
  },
  {
    title: "13. Sécurité des données",
    blocks: [
      legalParagraph("Stamio met en œuvre des mesures techniques et organisationnelles destinées à protéger les données contre l’accès non autorisé, la modification non autorisée, la perte, la destruction, la divulgation et l’utilisation abusive."),
      legalParagraph("Ces mesures comprennent notamment :"),
      legalList([
        "l’utilisation de connexions sécurisées HTTPS/TLS ;",
        "l’utilisation de mécanismes d’authentification sécurisés ;",
        "la prise en charge des Passkeys ;",
        "des contrôles d’accès côté serveur ;",
        "des restrictions d’accès aux données et fonctions sensibles ;",
        "des politiques de sécurité au niveau de la base de données ;",
        "des mécanismes de limitation des requêtes et de prévention des abus ;",
        "la conservation des secrets techniques exclusivement côté serveur ;",
        "la minimisation des données collectées ;",
        "la séparation technique entre les informations liées au compte et les bulletins ;",
        "un mécanisme de finalisation et de réconciliation des votes ne nécessitant pas de conserver durablement une association entre le compte et le choix exprimé."
      ]),
      legalParagraph("Aucun système informatique ne permet toutefois de garantir un risque nul.")
    ]
  },
  {
    title: "14. Vos droits",
    blocks: [
      legalParagraph("Conformément au RGPD et à la loi Informatique et Libertés, vous disposez, selon les conditions applicables au traitement concerné :"),
      legalList([
        "d’un droit d’accès à vos données personnelles ;",
        "d’un droit de rectification des données inexactes ou incomplètes ;",
        "d’un droit à l’effacement lorsque les conditions légales sont réunies ;",
        "d’un droit à la limitation du traitement ;",
        "d’un droit d’opposition aux traitements fondés sur l’intérêt légitime ;",
        "d’un droit à la portabilité lorsque les conditions légales de ce droit sont remplies ;",
        "du droit de retirer votre consentement à tout moment lorsqu’un traitement est fondé sur le consentement, sans remettre en cause la licéité du traitement effectué avant ce retrait."
      ]),
      legalSubheading("Comment exercer vos droits ?"),
      legalParagraph(<>Vous pouvez adresser votre demande à : <LegalEmailLink email="privacy@stamio.fr" /></>),
      legalParagraph("Afin de protéger vos données et votre compte, Stamio peut demander les informations strictement nécessaires pour vérifier votre identité lorsque celle-ci ne peut raisonnablement être établie autrement."),
      legalParagraph("Stamio répond aux demandes dans les délais prévus par le RGPD, en principe dans un délai d’un mois à compter de la réception d’une demande complète. Ce délai peut être prolongé dans les conditions prévues par la réglementation lorsque la complexité ou le nombre des demandes le justifie.")
    ]
  },
  {
    title: "15. Suppression du compte et conséquences sur les bulletins",
    blocks: [
      legalParagraph(<>Vous pouvez demander la suppression de votre compte et des données personnelles qui lui sont associées en écrivant à <LegalEmailLink email="privacy@stamio.fr" /></>),
      legalParagraph("La suppression du compte porte sur les données personnelles qui peuvent encore être rattachées à celui-ci, sous réserve des informations dont la conservation resterait nécessaire en raison d’une obligation légale, d’un litige, d’un besoin de sécurité ou d’un autre motif légalement applicable."),
      legalSubheading("Pourquoi le bulletin n’est-il pas supprimé avec le compte ?"),
      legalParagraph("Stamio a précisément été conçu pour ne pas conserver durablement le lien permettant d’identifier quel bulletin appartient à un compte déterminé."),
      legalParagraph("Par conséquent, une fois cette séparation réalisée, la suppression du compte ne permet pas à Stamio de rechercher puis de supprimer « le bulletin de cet utilisateur », puisque cette association n’est pas conservée."),
      legalParagraph("Stamio ne collecte et ne recrée pas d’informations supplémentaires uniquement afin de réidentifier un bulletin pour répondre à une demande portant sur une personne déterminée."),
      legalParagraph("Cette situation est expressément envisagée par l’article 11 du RGPD lorsque les finalités du traitement n’exigent plus l’identification de la personne concernée."),
      legalParagraph("Les bulletins et les résultats qui ne peuvent plus être rattachés par Stamio à un utilisateur donné peuvent donc continuer à être conservés pour les finalités statistiques et historiques du service.")
    ]
  },
  {
    title: "16. Absence de profilage politique et de décision automatisée significative",
    blocks: [
      legalParagraph("Stamio ne constitue pas de profil politique individuel à partir des choix exprimés dans les questions."),
      legalParagraph("Les réponses individuelles ne sont pas utilisées pour :"),
      legalList([
        "déterminer les convictions politiques supposées d’un utilisateur ;",
        "classer les utilisateurs en fonction de leurs opinions ;",
        "leur adresser de la publicité politique individualisée ;",
        "leur adresser de la publicité commerciale individualisée sur la base de leurs votes."
      ]),
      legalParagraph("Stamio ne prend pas, sur la seule base d’un traitement automatisé de données personnelles, de décision produisant à l’égard d’un utilisateur des effets juridiques ou des effets similaires significatifs au sens de l’article 22 du RGPD."),
      legalParagraph("L’historique des questions auxquelles un compte a participé peut être utilisé pour fournir les fonctionnalités correspondantes dans son espace personnel, mais il ne contient pas les réponses données.")
    ]
  },
  {
    title: "17. Liens et ressources externes",
    blocks: [
      legalParagraph("Stamio peut proposer des liens vers des articles, études, décisions de justice, documents officiels, médias, sites institutionnels ou autres ressources externes."),
      legalParagraph("Lorsque vous quittez Stamio pour consulter un site tiers, les traitements réalisés par ce site relèvent de la responsabilité de son propre éditeur."),
      legalParagraph("La présente politique de confidentialité ne s’applique pas aux traitements réalisés directement par ces sites externes.")
    ]
  },
  {
    title: "18. Réclamation auprès de la CNIL",
    blocks: [
      legalParagraph(<>Si vous estimez que le traitement de vos données personnelles n’est pas conforme à la réglementation, vous pouvez d’abord contacter Stamio à <LegalEmailLink email="privacy@stamio.fr" />.</>),
      legalParagraph("Vous disposez également du droit d’introduire une réclamation auprès de l’autorité française de contrôle :"),
      legalCallout([
        "Commission nationale de l’informatique et des libertés — CNIL",
        "3 Place de Fontenoy",
        "TSA 80715",
        "75334 Paris Cedex 07",
        "France"
      ]),
      legalParagraph("Vous pouvez également effectuer certaines démarches directement depuis le site officiel de la CNIL.")
    ]
  },
  {
    title: "19. Sort des données après le décès",
    blocks: [
      legalParagraph("Dans les conditions prévues par la législation française, vous pouvez définir des directives relatives à la conservation, à l’effacement et à la communication de vos données personnelles après votre décès."),
      legalParagraph(<>Lorsque ces directives concernent spécifiquement Stamio, elles peuvent être adressées à <LegalEmailLink email="privacy@stamio.fr" />.</>),
      legalParagraph("En l’absence de directives, les personnes habilitées par la loi peuvent exercer certains droits dans les conditions prévues par la législation applicable.")
    ]
  },
  {
    title: "20. Modification de la présente politique",
    blocks: [
      legalParagraph("La présente politique de confidentialité peut être modifiée afin de tenir compte notamment :"),
      legalList([
        "d’une évolution du fonctionnement de Stamio ;",
        "de l’ajout, du remplacement ou de la suppression d’un prestataire ;",
        "de l’introduction d’une nouvelle fonctionnalité ;",
        "d’une évolution des données traitées ;",
        "d’un changement dans les mesures de sécurité ;",
        "d’une évolution législative, réglementaire ou jurisprudentielle."
      ]),
      legalParagraph("La date de dernière mise à jour figure en haut de la présente page."),
      legalParagraph("Lorsqu’une modification est susceptible d’avoir un impact significatif sur les personnes concernées, Stamio pourra en informer les utilisateurs par un moyen approprié, notamment sur le site ou par e-mail.")
    ]
  },
  {
    title: "21. Contact",
    blocks: [
      legalSubheading("Questions générales concernant Stamio"),
      legalParagraph("Maxime Opinel — Stamio"),
      legalParagraph(<LegalEmailLink email="maxime@stamio.fr" />),
      legalSubheading("Protection des données personnelles et exercice des droits"),
      legalParagraph(<LegalEmailLink email="privacy@stamio.fr" />)
    ]
  }
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Données personnelles"
      title="Politique de confidentialité et de protection des données personnelles"
      updatedAt="Dernière mise à jour : 27 août 2026"
      intro="La présente politique explique de manière transparente quelles données Stamio traite, pourquoi elles sont utilisées, comment les votes sont rendus anonymes dans le système, et comment exercer vos droits."
      sections={sections}
      footerNote="Document de référence — version du 27 août 2026. Toute évolution substantielle du fonctionnement de Stamio ou de ses prestataires doit conduire à réexaminer la présente politique."
    />
  );
}
