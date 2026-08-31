# Checklist manuelle Passkeys — Expo Web

| Action | Résultat attendu | Observé |
|---|---|---|
| Inscription sur Android / Chrome web | Champs sociodémographiques conservés, email envoyé, aucun SMS | À exécuter |
| Inscription sur iPhone / Safari web | Même résultat, UI mobile sans débordement | À exécuter |
| Inscription Windows / Edge | Retour email puis Windows Hello | À exécuter |
| Inscription Mac / Safari | Retour email puis Touch ID | À exécuter |
| Ouvrir le lien dans le même navigateur | Page intermédiaire, vérification seulement après clic, session créée | À exécuter |
| Ouvrir le lien dans un autre navigateur | Confirmation affichée dans le navigateur secondaire, reprise détectée dans le navigateur initiateur, sans transfert de session | À exécuter |
| Ouvrir le lien sur un autre appareil web | Confirmation affichée sur l’autre appareil, reprise détectée sur l’appareil initiateur, puis enrôlement local | À exécuter |
| Scanner/précharger le lien sans cliquer | Le token n’est pas consommé automatiquement | À exécuter |
| Lien expiré ou déjà utilisé | Message générique, aucun détail technique | À exécuter |
| Renvoyer plusieurs fois | Cooldown UI et limite Supabase Auth réelle | À exécuter |
| Ouvrir l’écran dans un binaire Expo natif | Message indiquant d’utiliser le site web, aucune cérémonie lancée | À exécuter |
| Annuler la fenêtre native du navigateur | Reste sur l’étape et propose « Réessayer » | À exécuter |
| Rafraîchir / revenir en arrière | Même compte et profil, aucun doublon | À exécuter |
| Connexion mobile web et desktop | Sélecteur natif découvrable, session Supabase active | À exécuter |
| Connexion desktop avec téléphone / QR natif | Parcours du navigateur, aucun QR construit par Stamio | À exécuter |
| Ajouter et renommer une deuxième clé | Liste resynchronisée, nom limité à 120 caractères | À exécuter |
| Deux passkeys, un seul droit de vote | Enregistrer deux passkeys sur le même compte, voter avec la première, se déconnecter, se reconnecter avec la seconde et revoter : le second vote est refusé et il reste un vote, un verrou et un historique | Confirmé pour l’enregistrement multiple ; vote croisé à exécuter |
| Supprimer une clé | Confirmation visuelle puis suppression serveur | À exécuter |
| Supprimer la dernière clé avec email confirmé | Suppression serveur permise, état resynchronisé, récupération email disponible | À exécuter |
| Supprimer la dernière clé sans récupération fiable | Refus serveur | À exécuter |
| Récupération par email | Même user_id, même profil et historique | À exécuter |
| Compte historique avec `passkey_required_at = NULL` | Non bloqué par la seule migration | À exécuter |
| Nouveau compte requis non enrôlé | Vote, commentaire et like refusés | À exécuter |
| Voter après enrôlement | Vote anonyme et historique créés atomiquement | À exécuter |
| Deux votes simultanés | Un accepté, un `already_voted`, un seul vote/historique/verrou | À exécuter |
| Provoquer l’échec de l’historique | Aucun vote ni verrou conservé | À exécuter |
| Dépasser la limite de vote | HTTP 429 persistant entre instances, aucune Map mémoire | À exécuter |
| Écrans à 320, 375, 390, 768, 1024 et 1440 px | Aucun texte rogné ni CTA hors écran | À exécuter |
| Inspecter réseau et UI | Aucun SMS, téléphone d’inscription ou OTP manuel | À exécuter |
