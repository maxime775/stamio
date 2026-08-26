# Verified Polls

Application Expo + Supabase de sondages interactifs avec comptes confirmés par email et sécurisés par passkeys.

## Architecture

- `app/` contient les écrans Expo Router pour web, iOS et Android.
- `components/` contient l'interface de vote, d'authentification et de résultats.
- `lib/` contient le client Supabase public, les appels aux Edge Functions et la validation côté client.
- `supabase/migrations/` contient le schéma PostgreSQL, RLS, contraintes et fonctions SQL.
- `supabase/functions/verify-passkey-enrollment` vérifie côté serveur la présence réelle d'une passkey Supabase.
- `supabase/functions/authorize-vote` vérifie la session, l'email confirmé et la passkey sans recevoir le choix.
- `supabase/functions/submit-ballot` consomme un permit opaque sans JWT utilisateur et écrit uniquement le bulletin.
- `supabase/functions/finalize-vote` matérialise la participation sans consulter le choix.
- `supabase/functions/get-results` retourne les résultats agrégés.

Le client n'insère jamais directement dans les tables de vote, de participation ou de permits. Les secrets Supabase service role et HMAC restent exclusivement côté serveur.

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
supabase functions serve authorize-vote --env-file .env
supabase functions serve submit-ballot --env-file .env
supabase functions serve finalize-vote --env-file .env
supabase functions serve get-results --env-file .env
```

En production, configurez les secrets Edge Functions :

```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set TURNSTILE_SECRET_KEY=...
supabase secrets set VOTER_HASH_SECRET=...
```

Les passkeys doivent être activées dans Supabase Auth avec le RP ID stable `stamio.fr`. Voir `docs/PASSKEY_SETUP.md`.

Puis déployez :

```bash
supabase functions deploy verify-passkey-enrollment
supabase functions deploy authorize-vote
supabase functions deploy submit-ballot
supabase functions deploy finalize-vote
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
2. `authorize-vote` valide la session, l'adresse email confirmée et l'état Passkey, puis émet un permit opaque sans recevoir le choix.
3. `submit-ballot`, appelé sans JWT utilisateur, consomme atomiquement le permit et écrit uniquement `poll_id + choice_id`.
4. `finalize-vote` ou la reconciliation serveur écrit `user_id + poll_id` dans `user_poll_participations`, sans consulter le bulletin.
5. `UNIQUE(user_id, poll_id)` et le permit à usage unique garantissent une participation par compte et par poll, y compris en concurrence.
6. Le bulletin ne conserve ni compte, ni lock, ni permit, ni reçu corrélable.

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

Pour vérifier les scénarios de concurrence et de recovery du protocole dissocié :

```bash
npm run security:concurrency
npm run test:anonymous-voting-scrub
```

Ces contrôles sont locaux et ne contactent pas la production.
