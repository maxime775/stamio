# AGENTS.md

## Architecture

Stamio is an Expo / React Native / TypeScript app using Expo Router and Supabase. The client displays open polls, authenticates confirmed accounts with Passkeys, submits dissociated ballots through Supabase Edge Functions, and reads aggregated results.

Voting is split into three paths: authenticated `authorize-vote` issues an opaque permit without receiving a choice, identity-free `submit-ballot` consumes that permit and writes only `poll_id + choice_id`, and authenticated `finalize-vote` records only account participation. Server reconciliation completes consumed permits independently of the browser.

## Important Directories

- `app/`: Expo Router screens for web, iOS, and Android.
- `components/`: vote UI, authentication UI, result bars, and Turnstile web component.
- `lib/`: public Supabase client, Edge Function API calls, shared client types, and validation helpers.
- `scripts/`: local security and verification scripts.
- `supabase/migrations/`: PostgreSQL schema, RLS policies, grants, constraints, and SQL functions.
- `supabase/functions/`: Supabase Edge Functions and shared server helpers.

## Useful Commands

```bash
npm run typecheck
npm run security:static
npm run security:concurrency
npm run security:rls
npm run security:secrets
npm run web
npm run ios
npm run android
```

`security:concurrency` runs the local dissociated-vote recovery model. `security:rls` reads only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `.env`.

## Non-Negotiable Security Rules

- The client must never insert directly into `votes`, `user_poll_participations`, `ballot_permits`, or `vote_authorization_bindings`.
- Phase A must never receive a choice; Phase B must never receive or resolve an account identity or user JWT.
- `votes` may contain only ballot data and must never reference an account, participation, lock, permit, or receipt.
- Server secrets must never be exposed to client code, `app.json`, or committed examples with real values.
- Supabase service-role credentials, HMAC material, and Turnstile server secrets belong only in server-side Edge Function secret configuration.
- No development shortcut, mock path, or bypass mode may insert a real vote.
- One confirmed account may create at most one ballot per poll, regardless of how many Passkeys belong to it.
- Poll state is stored in `polls.status`; do not introduce or rely on `polls.is_open`.
- RLS and grants must keep public clients from inserting into sensitive vote tables.
