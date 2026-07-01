# Verified Polls

V1 Expo + Supabase d'une plateforme de sondages interactifs avec vote unique vérifié par OTP SMS Twilio.

## Architecture

- `app/` contient les écrans Expo Router pour web, iOS et Android.
- `components/` contient l'interface de vote, OTP, résultats animés et Turnstile web.
- `lib/` contient le client Supabase public, les appels aux Edge Functions et la validation côté client.
- `supabase/migrations/` contient le schéma PostgreSQL, RLS, contraintes et fonctions SQL.
- `supabase/functions/start-verification` envoie l'OTP via Twilio Verify après validation Turnstile sur web.
- `supabase/functions/submit-vote` vérifie l'OTP auprès de Twilio, calcule le hash, puis appelle la fonction SQL transactionnelle.
- `supabase/functions/get-results` retourne les résultats agrégés.

Le client n'insère jamais dans `votes` ou `vote_phone_locks`. Les secrets Supabase service role, Twilio et HMAC ne sont utilisés que dans les Edge Functions.

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
supabase functions serve start-verification --env-file .env
supabase functions serve submit-vote --env-file .env
supabase functions serve get-results --env-file .env
```

En production, configurez les secrets Edge Functions :

```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set TWILIO_ACCOUNT_SID=...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_VERIFY_SERVICE_SID=...
supabase secrets set TURNSTILE_SECRET_KEY=...
supabase secrets set HMAC_SECRET=...
```

Le provider OTP est configuré uniquement dans les secrets des Edge Functions. En production, utilisez
`APP_ENV=production` et `OTP_PROVIDER=twilio`; toute autre combinaison est refusée côté serveur.
Pour une instance Supabase locale ou un projet staging séparé, `OTP_PROVIDER=local_test` exige
`OTP_TEST_PHONE_ALLOWLIST` et `OTP_TEST_CODE`. Ce mode ne doit jamais pointer vers les données de production.

Puis déployez :

```bash
supabase functions deploy start-verification
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
3. `start-verification` valide Turnstile si nécessaire, vérifie que le sondage est ouvert, puis appelle Twilio Verify pour envoyer le SMS.
4. `submit-vote` appelle Twilio Verify Check.
5. Le vote n'est poursuivi que si Twilio retourne `approved`.
6. Le téléphone est normalisé en E.164 puis transformé en `HMAC_SHA256(HMAC_SECRET, poll_id + ":" + phone_e164)`.
7. `submit_verified_vote` insère d'abord dans `vote_phone_locks`.
8. `UNIQUE(poll_id, phone_poll_hash)` garantit qu'un même numéro ne peut voter qu'une fois pour une même question, y compris en concurrence.
9. Le vote est inséré avec un `receipt_hash` anonyme.

Le numéro de téléphone n'est jamais stocké en clair.

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
