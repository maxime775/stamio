# Verified Polls

Application Expo + Supabase de sondages interactifs avec comptes confirmés par email et sécurisés par passkeys.

## Architecture

- `app/` contient les écrans Expo Router pour web, iOS et Android.
- `components/` contient l'interface de vote, d'authentification et de résultats.
- `lib/` contient le client Supabase public, les appels aux Edge Functions et la validation côté client.
- `supabase/migrations/` contient le schéma PostgreSQL, RLS, contraintes et fonctions SQL.
- `supabase/functions/verify-passkey-enrollment` vérifie côté serveur la présence réelle d'une passkey Supabase.
- `supabase/functions/submit-vote` vérifie la session, l'email confirmé et la passkey avant l'écriture transactionnelle.
- `supabase/functions/get-results` retourne les résultats agrégés.

Le client n'insère jamais dans `votes` ou `vote_phone_locks`. Les secrets Supabase service role, HMAC et IP HMAC ne sont utilisés que dans les Edge Functions.

## Installation

```bash
npm install
cp .env.example .env
```

Renseignez les variables publiques Expo dans `.env`.

## Supabase

```bash
supabase start
supabase db reset
supabase functions serve verify-passkey-enrollment --env-file .env
supabase functions serve submit-vote --env-file .env
supabase functions serve get-results --env-file .env
```

En production, configurez les secrets Edge Functions :

```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set TURNSTILE_SECRET_KEY=...
supabase secrets set HMAC_SECRET=...
supabase secrets set IP_HASH_SECRET=...
```

Les passkeys doivent être activées dans Supabase Auth avec le RP ID stable `stamio.fr`. Voir `docs/PASSKEY_SETUP.md`.

Puis déployez :

```bash
supabase functions deploy verify-passkey-enrollment
supabase functions deploy submit-vote
supabase functions deploy get-results
```

## Lancer l'app

```bash
npm run web
npm run ios
npm run android
```

La question seedée est :

> Faut-il rendre obligatoire la validation téléphonique pour les sondages en ligne ?

Options : `Oui`, `Non`, `Ne se prononce pas`.

## Flux de sécurité

1. L'utilisateur sélectionne une réponse.
2. Sur web, Cloudflare Turnstile produit un token.
3. `submit-vote` valide la session Supabase et l'adresse email confirmée.
4. L'API admin Supabase confirme qu'au moins une passkey existe réellement.
5. Une clé HMAC serveur dérivée de `user_id` et du sondage alimente le verrou transactionnel historique.
6. `submit_verified_vote` insère d'abord dans `vote_phone_locks`.
7. `UNIQUE(poll_id, phone_poll_hash)` et `UNIQUE(user_id, poll_id)` garantissent un vote unique, y compris en concurrence.
8. Le vote est inséré avec un `receipt_hash` anonyme.

Le numéro de téléphone n'est jamais stocké en clair.

## Convention visuelle des pages de compte et d'authentification

Une nouvelle fonctionnalité ne doit pas être automatiquement présentée dans une carte ou un encart bordé. Utiliser en priorité la hiérarchie typographique, l'espacement, l'alignement, un trait horizontal fin et les listes à plat.

Les cartes bordées sont réservées aux composants du produit qui nécessitent réellement une délimitation, comme certaines cartes de questions ou certains résultats. Elles ne doivent pas être utilisées par défaut pour une étape d'inscription, une confirmation email, une création de passkey, une section de réglage, une ligne de passkey ou une information de compte.

## Vérifications

```bash
npm run typecheck
npm run security:static
npm run security:rls
npm run security:secrets
```

Pour démontrer la contrainte anti-double vote au niveau PostgreSQL, utilisez une base de test Supabase avec les secrets serveur :

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... HMAC_SECRET=... npm run security:concurrency
```

Ce script crée un sondage temporaire, appelle deux fois en parallèle la fonction SQL transactionnelle avec le même hash de téléphone scoped au sondage, vérifie qu'un seul vote existe, puis supprime le sondage temporaire.
