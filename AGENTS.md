# AGENTS.md

## Architecture

Verified Polls is an Expo / React Native / TypeScript app using Expo Router and Supabase. The client displays open polls, starts phone verification through Supabase Edge Functions, submits OTP codes to the server, and reads aggregated results.

Real votes are recorded only by the server-side `submit-vote` Edge Function after Twilio Verify returns `approved`. The function computes a poll-scoped phone hash and calls the `submit_verified_vote` SQL function, which creates the phone lock and vote transactionally.

## Important Directories

- `app/`: Expo Router screens for web, iOS, and Android.
- `components/`: vote UI, OTP UI, result bars, and Turnstile web component.
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

`security:concurrency` requires server-side Supabase secrets in the shell environment. `security:rls` reads only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `.env`.

## Non-Negotiable Security Rules

- The client must never insert directly into `votes`, `vote_phone_locks`, or `vote_attempts`.
- The client must never write directly to `votes` or `vote_phone_locks`; only trusted server code may do that.
- Server secrets must never be exposed to client code, `app.json`, or committed examples with real values.
- Supabase service-role credentials, Twilio credentials, HMAC material, and Turnstile server secrets belong only in server-side Edge Function secret configuration.
- No development shortcut, mock path, or bypass mode may insert a real vote.
- A real vote may be counted only after Twilio Verify returns `approved` on the server.
- Phone numbers must not be stored in clear text. Store only the poll-scoped HMAC hash.
- Poll state is stored in `polls.status`; do not introduce or rely on `polls.is_open`.
- RLS and grants must keep public clients from inserting into sensitive vote tables.
