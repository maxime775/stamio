import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, ...path.split("/")), "utf8");

const signup = read("components/SignupForm.tsx");
const api = read("lib/api.ts");
const versions = read("lib/legalVersions.ts");
const migration = read("supabase/migrations/20260827120000_user_legal_acceptances.sql");

assert.match(signup, /const \[legalAccepted, setLegalAccepted\] = useState\(false\)/, "Signup : la checkbox doit être false par défaut");
assert.match(signup, /accessibilityRole="checkbox"/, "Signup : le contrôle doit exposer le rôle checkbox");
assert.match(signup, /accessibilityState=\{\{ checked: legalAccepted \}\}/, "Signup : l'état checked doit être exposé aux technologies d'assistance");
assert.match(signup, /accessibilityLabelledBy="signup-legal-acceptance-label"/, "Signup : la checkbox doit être associée à son libellé");
assert.match(signup, /legalFocused && styles\.checkboxFocused/, "Signup : le focus clavier visible doit être appliqué");
assert.match(signup, /disabled=\{loading \|\| !legalAccepted\}/, "Signup : le bouton doit être désactivé sans acceptation");
assert.match(signup, /if \(!legalAccepted\)/, "Signup : la soumission doit aussi refuser défensivement l'absence d'acceptation");
assert.match(signup, /termsAccepted: true/, "Signup : l'acceptation explicite doit être transmise au parcours d'inscription");

const exactText = "J’ai lu et j’accepte les conditions d’utilisation et je reconnais avoir pris connaissance de la politique de confidentialité applicable au traitement de mes données personnelles.";
assert.ok(signup.includes(exactText), "Signup : le texte juridique exact doit servir de libellé accessible");
assert.ok(signup.includes('router.push("/conditions-utilisation" as Href)') && signup.includes('router.push("/confidentialite" as Href)'), "Signup : les deux liens juridiques doivent être fonctionnels");
assert.ok(!/consent(?:ement|ir)[^\n]{0,80}politique de confidentialité/i.test(signup), "Signup : la politique doit être portée à connaissance, sans consentement RGPD général");

assert.match(versions, /CGU_VERSION = "2026-08-27"/, "Version CGU incorrecte");
assert.match(versions, /PRIVACY_VERSION = "2026-08-27"/, "Version privacy incorrecte");
for (const expected of [
  "legal_terms_accepted: payload.termsAccepted",
  "legal_terms_version: CGU_VERSION",
  "legal_privacy_version: PRIVACY_VERSION"
]) {
  assert.ok(api.includes(expected), `API signup : metadata manquante : ${expected}`);
}

for (const expected of [
  "create table public.user_legal_acceptances",
  "user_id uuid not null references auth.users(id) on delete cascade",
  "terms_version text not null",
  "privacy_version text not null",
  "accepted_at timestamptz not null default statement_timestamp()",
  "unique (user_id, terms_version)",
  "alter table public.user_legal_acceptances enable row level security",
  "revoke all on public.user_legal_acceptances from public, anon, authenticated",
  "after insert on auth.users",
  "legal_terms_accepted"
]) {
  assert.ok(migration.includes(expected), `Migration juridique : garantie manquante : ${expected}`);
}
const triggerBody = migration.match(/create or replace function public\.handle_new_user_legal_acceptance\(\)[\s\S]*?as \$\$([\s\S]*?)\$\$;/i)?.[1];
assert.ok(triggerBody, "Migration juridique : fonction de preuve d'acceptation introuvable");
assert.doesNotMatch(
  triggerBody,
  /if\s+coalesce\(new\.raw_user_meta_data->>'legal_terms_accepted',\s*'false'\)\s*<>\s*'true'\s+then\s+return new;/i,
  "Migration juridique : une acceptation absente ou fausse ne doit pas laisser créer le compte"
);
assert.match(
  triggerBody,
  /if\s+coalesce\(new\.raw_user_meta_data->>'legal_terms_accepted',\s*'false'\)\s*<>\s*'true'\s+then\s+raise exception 'legal_terms_acceptance_required'/i,
  "Migration juridique : une acceptation absente ou fausse doit lever une exception explicite"
);
assert.match(triggerBody, /v_expected_terms_version constant text := '2026-08-27'/i, "Migration juridique : la version CGU attendue doit être fixée côté serveur");
assert.match(triggerBody, /v_expected_privacy_version constant text := '2026-08-27'/i, "Migration juridique : la version privacy attendue doit être fixée côté serveur");
assert.match(
  triggerBody,
  /if\s+v_terms_version\s+is distinct from\s+v_expected_terms_version\s+or\s+v_privacy_version\s+is distinct from\s+v_expected_privacy_version\s+then\s+raise exception 'legal_acceptance_version_mismatch'/i,
  "Migration juridique : toute version client différente doit être rejetée"
);
assert.match(
  triggerBody,
  /insert into public\.user_legal_acceptances\s*\(user_id, terms_version, privacy_version\)\s*values\s*\(new\.id, v_expected_terms_version, v_expected_privacy_version\)/i,
  "Migration juridique : l'enregistrement durable doit utiliser les versions serveur"
);
assert.doesNotMatch(
  triggerBody,
  /values\s*\(new\.id,\s*v_terms_version,\s*v_privacy_version\)/i,
  "Migration juridique : les versions client ne doivent pas être insérées directement"
);
assert.doesNotMatch(triggerBody, /accepted_at/i, "Migration juridique : accepted_at doit rester omis de l'INSERT et utiliser son default serveur");
assert.doesNotMatch(migration, /insert into public\.user_legal_acceptances[\s\S]*?select[\s\S]*?from auth\.users/i, "Migration juridique : aucun backfill des comptes existants ne doit être ajouté");
assert.ok(!/\b(?:ip(?:_address)?|fingerprint|credential(?:_id)?|passkey|choice_id|poll_id|vote(?:_id)?)\b/i.test(migration), "Migration juridique : donnée non nécessaire détectée");
assert.ok(!/grant\s+(?:all|update)[^;]*user_legal_acceptances[^;]*authenticated/is.test(migration), "Migration juridique : l'utilisateur ne doit pas pouvoir modifier la preuve");

console.log("Signup legal acceptance verification passed: explicit unchecked checkbox, blocked submit, versioned metadata, server timestamp, immutable client access, and minimal stored data.");
