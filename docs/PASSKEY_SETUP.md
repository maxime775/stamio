# Configuration Passkeys Stamio

Cette phase prend en charge **Expo Web uniquement** : Chrome, Edge, Safari et Firefox compatibles WebAuthn, sur mobile web et desktop. Elle n’ajoute aucun pont natif aux binaires Expo iOS ou Android.

## Supabase Dashboard

1. Dans **Authentication → Passkeys**, activer Passkeys.
2. Définir **Relying Party Display Name** sur `Stamio`.
3. Définir définitivement **Relying Party ID** sur `stamio.fr`.
4. Autoriser `https://stamio.fr`; ajouter `https://www.stamio.fr` uniquement si ce sous-domaine sert réellement l’application.
5. Activer le fournisseur Email et **Confirm Email**.
6. Définir la Site URL sur `https://stamio.fr`.
7. Autoriser `https://stamio.fr/auth/callback` et `https://stamio.fr/auth/reset-password`.
8. Tester la délivrabilité des emails avec la configuration existante.
9. Après validation complète sur un projet isolé, désactiver le fournisseur Phone.
10. Ne jamais modifier le RP ID après les premiers enrôlements.

N’ajouter ni wildcard, ni domaine de preview, ni ancien domaine Sayit aux origines de production.

## Template « Confirm sign up »

Le lien doit ouvrir la page intermédiaire Stamio avec le hash, sans vérification automatique :

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">
  Confirmer mon adresse email
</a>
```

La page retire immédiatement `token_hash` de l’URL visible et n’appelle `verifyOtp` qu’après le clic explicite sur « Confirmer mon adresse email ». Il n’existe aucun champ de saisie de code. Ce mécanisme ne dépend pas du code verifier PKCE du navigateur ayant commencé l’inscription et fonctionne donc depuis un autre navigateur ou appareil web.

Le template de récupération doit conserver son lien Supabase existant. Vérifier sa durée réelle avant de modifier un texte d’expiration.

## Authentication → Rate Limits

Vérifier et tester les limites natives Supabase Auth pour :

- création de compte ;
- renvoi de confirmation ;
- connexion par mot de passe et par passkey ;
- récupération de mot de passe ;
- vérification des liens email.

Le délai de 60 secondes affiché par Stamio lors d’un renvoi est seulement un retour d’interface. La protection persistante est celle de Supabase Auth.

## Protection CAPTCHA

Dans **Authentication → Bot and Abuse Protection**, activer CAPTCHA sur l’inscription, la connexion et la récupération. Cloudflare Turnstile peut être réutilisé si le projet Supabase est configuré avec les clés existantes. La clé secrète reste côté Supabase/serveur et la clé site seule peut être publique. Ne créer aucun proxy recevant les mots de passe.

## Edge Functions et secrets

Après validation de la migration sur un projet isolé, les fonctions concernées sont :

- `authorize-vote` ;
- `submit-ballot` ;
- `finalize-vote` ;
- `verify-passkey-enrollment` ;
- `delete-passkey` ;
- `check-signup-email` ;
- `get-results` ;
- `get-results-history`.

Secrets serveur nécessaires au vote :

- `VOTER_HASH_SECRET` : secret HMAC dédié au rate limit compte/poll de Phase A ;
- clés Supabase serveur déjà utilisées.

`check-signup-email` nécessite également `EMAIL_LOOKUP_SECRET`, une valeur aléatoire dédiée au projet et strictement serveur. Elle ne doit jamais être exposée dans une variable `EXPO_PUBLIC_*`. La fonction applique une limite persistante par adresse normalisée et un plafond global temporaire. Les protections CAPTCHA natives de Supabase Auth restent recommandées pour l’inscription.

Le rate limit limite temporairement le nombre de vérifications d’existence d’une adresse afin de ralentir les recherches automatisées. Il ne doit pas affecter le parcours normal d’un utilisateur.

`VOTER_HASH_SECRET` doit être distinct de `IP_HASH_SECRET`. L’environnement Supabase Edge actuel ne garantit pas dans le dépôt un header d’IP client fiable. Le vote est donc bloqué par une limite persistante liée au `voter_hash`, pas par l’IP. Si l’infrastructure fournit ultérieurement un header garanti et non falsifiable, documenter précisément cette provenance avant d’activer une limite IP HMAC. Ne jamais stocker l’IP brute.

La configuration locale utilise Expo Web sur `http://localhost:8081`. Aucun secret ne doit porter le préfixe `EXPO_PUBLIC_`.

Les secrets Twilio, `PHONE_ENCRYPTION_KEY`, `HMAC_SECRET` et les variables `OTP_PROVIDER`, `OTP_TEST_PHONE_ALLOWLIST` et `OTP_TEST_CODE` ne sont plus nécessaires après le SCRUB et la suppression contrôlée des anciennes fonctions distantes. Ils doivent être révoqués manuellement seulement après validation de la migration.

## Ordre de validation

1. Utiliser un projet Supabase isolé.
2. Vérifier que toutes les participations historiques ont été backfillées avant le SCRUB :

   ```sql
   select distinct a.user_id, a.poll_id
   from public.user_poll_answers a
   left join public.user_poll_participations p
     on p.user_id = a.user_id and p.poll_id = a.poll_id
   where p.user_id is null;
   ```

3. Appliquer la migration dans ce projet isolé.
4. Configurer les templates et limites Auth.
5. Déployer les Edge Functions dans ce projet isolé.
6. Exécuter les tests fonctionnels et de concurrence.
7. Ne préparer la production qu’après validation complète.
