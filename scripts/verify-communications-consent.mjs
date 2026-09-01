import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, ...path.split("/")), "utf8");

const signup = read("components/SignupForm.tsx");
const api = read("lib/api.ts");
const types = read("lib/types.ts");
const account = read("app/account/informations.tsx");
const accountSummary = read("components/AccountSummary.tsx");
const migration = read("supabase/migrations/20260831120000_communications_email_consent.sql");
const productMigration = read("supabase/migrations/20260626090000_product_v1.sql");
const verifiedPhoneMigration = read("supabase/migrations/20260724120000_verified_phone_signup.sql");
const passkeyMigration = read("supabase/migrations/20260727120000_passkey_auth.sql");
const privacy = read("app/confidentialite.tsx");
const terms = read("app/conditions-utilisation.tsx");
const notices = read("app/mentions-legales.tsx");
const legalPage = read("components/LegalPage.tsx");
const packageJson = JSON.parse(read("package.json"));

const signupWording = "Je souhaite recevoir par e-mail les nouveaux sujets et les analyses publiées sur Stamio.";
const accountWording = "Recevoir par e-mail les nouveaux sujets et les analyses publiées sur Stamio";

assert.match(signup, /const \[communicationsEmailOptIn, setCommunicationsEmailOptIn\] = useState\(false\)/, "La préférence signup doit être décochée par défaut");
assert.ok(signup.includes(signupWording), "Le wording facultatif exact doit être présent à l'inscription");
assert.match(signup, /accessibilityState=\{\{ checked: communicationsEmailOptIn \}\}/, "La checkbox facultative doit exposer son état");
assert.match(signup, /communicationsEmailOptIn\s*\}/, "La préférence doit être transmise au payload signup");
assert.match(signup, /disabled=\{loading \|\| !legalAccepted\}/, "Seule l'acceptation juridique obligatoire doit bloquer l'inscription");
assert.doesNotMatch(signup, /disabled=\{[^}]*communicationsEmailOptIn|if \(!communicationsEmailOptIn\)/, "Le refus des communications ne doit jamais bloquer l'inscription");
assert.match(types, /communicationsEmailOptIn: boolean/, "Le payload signup doit typer explicitement la préférence");
assert.match(api, /communications_email_opt_in: payload\.communicationsEmailOptIn/, "La préférence doit être transmise aux métadonnées de création du profil");
assert.doesNotMatch(api, /communications_email_consent_version\s*:/, "Le client ne doit jamais transmettre une version de consentement");

assert.match(migration, /add column communications_email_opt_in boolean not null default false/, "Aucun compte ne doit être consentant par défaut");
assert.match(migration, /add column communications_email_opted_in_at timestamptz/, "La date du consentement positif doit être persistée");
assert.match(migration, /add column communications_email_consent_version text/, "La version exacte du consentement positif doit être persistée");
assert.match(migration, /add column communications_email_preference_updated_at timestamptz;/, "La date du dernier changement doit être nullable");
assert.doesNotMatch(migration, /communications_email_preference_updated_at timestamptz\s+(?:not null|default)/i, "Aucun timestamp ne doit être fabriqué pour les comptes historiques ou sans action");
assert.match(migration, /not communications_email_opt_in[\s\S]*communications_email_opted_in_at is not null[\s\S]*communications_email_consent_version is not null/, "Un opt-in actif doit toujours avoir un timestamp et une version");
assert.match(migration, /coalesce\(new\.raw_user_meta_data->>'communications_email_opt_in', 'false'\) = 'true'/, "Le trigger doit normaliser une metadata absente vers false");
assert.match(migration, /case when v_communications_email_opt_in then statement_timestamp\(\) end/, "Le consentement positif doit être horodaté côté serveur");
assert.equal((migration.match(/v_communications_email_consent_version constant text := '2026-08-31'/g) ?? []).length, 2, "Le trigger et le RPC doivent chacun fixer la version initiale côté serveur");
assert.doesNotMatch(migration, /raw_user_meta_data->>'communications_email_consent_version'/, "Une version arbitraire des métadonnées client ne doit jamais être lue");
assert.match(migration, /create or replace function public\.update_my_communications_email_preference\(\s*p_opt_in boolean/, "Un RPC authentifié dédié doit permettre le retrait");
assert.match(migration, /v_user_id uuid := auth\.uid\(\)/, "Le RPC doit être strictement lié au compte authentifié");
assert.match(migration, /communications_email_opt_in = p_opt_in/, "Le RPC doit accepter true comme false");
assert.match(migration, /when p_opt_in then v_communications_email_consent_version\s+else communications_email_consent_version/, "Le retrait doit conserver la version et l'activation doit utiliser la version serveur");
assert.match(migration, /when p_opt_in then statement_timestamp\(\)\s+else communications_email_opted_in_at/, "Le retrait doit conserver la preuve temporelle positive");
assert.match(migration, /communications_email_opt_in is distinct from p_opt_in/, "Les timestamps ne doivent changer que lors d'un véritable changement de préférence");
assert.match(migration, /grant execute on function public\.update_my_communications_email_preference\(boolean\)\s*to authenticated/, "Seul le RPC dédié doit être exécutable par l'utilisateur authentifié");
assert.doesNotMatch(migration, /grant update[\s\S]*communications_email_opt_in[\s\S]*to authenticated/i, "Aucun UPDATE direct de la préférence ne doit être accordé");
assert.doesNotMatch(migration, /public\.votes|choice_id|public\.ballot_permits|public\.user_poll_participations/, "Le consentement ne doit toucher aucune donnée de vote ou de participation");

assert.match(types, /communications_email_consent_version\?: string \| null/, "Le profil retourné doit typer la version de consentement");
assert.match(api, /select\("[^"]*communications_email_opt_in[^"]*communications_email_opted_in_at[^"]*communications_email_consent_version[^"]*communications_email_preference_updated_at/, "Le profil doit charger toute la preuve de consentement");
assert.match(api, /updateMyCommunicationsEmailPreference\(optIn: boolean\)[\s\S]*?rpc\("update_my_communications_email_preference", \{[\s\S]*?p_opt_in: optIn/, "Le compte doit modifier la préférence via le RPC dédié");
assert.ok(accountSummary.includes(accountWording), "Mon compte doit présenter le wording prévu");
assert.match(accountSummary, /communicationsPreferenceSaving \? "Enregistrement…" : profile\?\.communications_email_opt_in \? "Désactiver" : "Activer"/, "Le retrait doit être directement accessible dans Mes informations");
assert.match(account, /updateMyCommunicationsEmailPreference\(nextOptIn\)/, "Mes informations doit persister chaque changement");
assert.match(account, /nextOptIn = profile\?\.communications_email_opt_in !== true/, "La valeur absente ou historique doit rester false par défaut");

const historicalPreference = {
  optIn: false,
  optedInAt: null,
  consentVersion: null,
  preferenceUpdatedAt: null
};
const applyServerPreference = (profile, optIn, now) => {
  if (profile.optIn === optIn) return profile;
  return {
    optIn,
    optedInAt: optIn ? now : profile.optedInAt,
    consentVersion: optIn ? "2026-08-31" : profile.consentVersion,
    preferenceUpdatedAt: now
  };
};
assert.deepEqual(historicalPreference, {
  optIn: false,
  optedInAt: null,
  consentVersion: null,
  preferenceUpdatedAt: null
}, "Un compte historique ne doit contenir aucune preuve de consentement artificielle");
const optedIn = applyServerPreference(historicalPreference, true, "2026-09-01T10:00:00Z");
assert.deepEqual(optedIn, {
  optIn: true,
  optedInAt: "2026-09-01T10:00:00Z",
  consentVersion: "2026-08-31",
  preferenceUpdatedAt: "2026-09-01T10:00:00Z"
}, "Une activation doit créer la preuve versionnée côté serveur");
const optedOut = applyServerPreference(optedIn, false, "2026-09-02T10:00:00Z");
assert.equal(optedOut.optIn, false, "Un retrait doit désactiver les communications");
assert.equal(optedOut.optedInAt, optedIn.optedInAt, "Un retrait doit conserver le dernier timestamp positif");
assert.equal(optedOut.consentVersion, optedIn.consentVersion, "Un retrait doit conserver la version acceptée");
assert.equal(optedOut.preferenceUpdatedAt, "2026-09-02T10:00:00Z", "Un retrait doit dater le changement réel");
const reactivated = applyServerPreference(optedOut, true, "2026-09-03T10:00:00Z");
assert.equal(reactivated.optedInAt, "2026-09-03T10:00:00Z", "Une réactivation doit remplacer le timestamp positif");
assert.equal(reactivated.consentVersion, "2026-08-31", "Une réactivation doit prendre la version serveur alors en vigueur");
assert.equal(reactivated.preferenceUpdatedAt, "2026-09-03T10:00:00Z", "Une réactivation doit dater le changement réel");
assert.strictEqual(applyServerPreference(reactivated, true, "2026-09-04T10:00:00Z"), reactivated, "Un appel sans changement ne doit pas réécrire la preuve");

assert.match(productMigration, /revoke all on public\.profiles from anon, authenticated/, "Les privilèges profiles doivent partir d'un état révoqué");
assert.match(productMigration, /grant update \(sex, age, profession, region, updated_at\) on public\.profiles to authenticated/, "L'UPDATE direct doit rester limité aux colonnes historiques autorisées");
assert.match(productMigration, /for select\s+to authenticated\s+using \(auth\.uid\(\) = id\)/, "La lecture RLS doit rester limitée au profil propre");
assert.match(productMigration, /for update\s+to authenticated\s+using \(auth\.uid\(\) = id\)\s+with check \(auth\.uid\(\) = id\)/, "L'écriture RLS doit rester limitée au profil propre");
assert.match(verifiedPhoneMigration, /revoke select on public\.profiles from authenticated/, "Le SELECT table-level historique doit être révoqué");
assert.doesNotMatch([productMigration, verifiedPhoneMigration, passkeyMigration, migration].join("\n"), /grant update\s+on public\.profiles\s+to authenticated/i, "Aucun privilège UPDATE au niveau table ne doit neutraliser les REVOKE de colonnes");

const previousProfileHandler = passkeyMigration.match(/create or replace function public\.handle_new_user_profile\(\)[\s\S]*?as \$\$([\s\S]*?)\$\$;/i)?.[1];
const currentProfileHandler = migration.match(/create or replace function public\.handle_new_user_profile\(\)[\s\S]*?as \$\$([\s\S]*?)\$\$;/i)?.[1];
assert.ok(previousProfileHandler && currentProfileHandler, "Les définitions précédente et actuelle de handle_new_user_profile doivent être disponibles");
for (const preserved of [
  "v_age int;",
  "v_username text := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');",
  "v_username_normalized text := public.normalize_username(new.raw_user_meta_data->>'username');",
  "v_username_normalized !~ '^[a-z0-9_]{3,20}$'",
  "raise exception 'invalid_username' using errcode = '23514';",
  "raise exception 'username_taken' using errcode = '23505';",
  "new.raw_user_meta_data->>'sex'",
  "nullif(new.raw_user_meta_data->>'profession', '')",
  "nullif(new.raw_user_meta_data->>'region', '')",
  "passkey_required_at",
  "username = coalesce(public.profiles.username, excluded.username)",
  "username_normalized = coalesce(public.profiles.username_normalized, excluded.username_normalized)",
  "set search_path = pg_catalog, public"
]) {
  assert.ok(passkeyMigration.includes(preserved) && migration.includes(preserved), `handle_new_user_profile doit préserver la baseline : ${preserved}`);
}

for (const expected of [
  "Envoi aux utilisateurs ayant choisi cette option de communications par e-mail concernant notamment les nouveaux sujets et les analyses publiées sur Stamio",
  "Consentement de l’utilisateur — article 6(1)(a) du RGPD",
  "Son refus ou son retrait n’empêche ni la création d’un compte, ni l’utilisation de Stamio, ni la participation aux sujets",
  "retiré à tout moment depuis les préférences du compte",
  "l’adresse e-mail associée au compte",
  "l’état actuel de la préférence de communications par e-mail",
  "la date du consentement positif",
  "Cette information ne révèle pas le choix de vote : aucun bulletin n’est relié durablement au compte"
]) {
  assert.ok(privacy.includes(expected), `Politique de confidentialité : ajout ciblé manquant : ${expected}`);
}
assert.equal((privacy.match(/title: "(?:[1-9]|1[0-9]|2[01])\./g) ?? []).length, 21, "Aucune section de la politique de confidentialité ne doit disparaître");
assert.equal((terms.match(/title: "(?:[1-9]|1[0-9]|2[0-2])\./g) ?? []).length, 22, "Aucune section des CGU ne doit disparaître");
assert.equal((notices.match(/title: "(?:[1-9]|1[0-6])\./g) ?? []).length, 16, "Aucune section des mentions légales ne doit disparaître");
assert.ok(privacy.includes("privacy@stamio.fr") && terms.includes("privacy@stamio.fr") && notices.includes("privacy@stamio.fr"), "L'adresse RGPD dédiée doit rester présente dans toutes les politiques pertinentes");
assert.match(legalPage, /"contact@stamio\.fr" \| "maxime@stamio\.fr" \| "privacy@stamio\.fr"/, "Le composant légal doit accepter les trois contacts contrôlés");
assert.match(notices, /E-mail : <LegalEmailLink email="contact@stamio\.fr"/, "Le contact de l'éditeur doit utiliser contact@stamio.fr");
assert.match(notices, /Contact du directeur de la publication : <LegalEmailLink email="contact@stamio\.fr"/, "Le contact du directeur de la publication doit utiliser contact@stamio.fr");
assert.match(notices, /demandes de droit de réponse doivent être adressées au directeur de la publication à <LegalEmailLink email="contact@stamio\.fr"/, "Le canal de réception du droit de réponse doit utiliser contact@stamio.fr");
assert.match(privacy, /E-mail professionnel : <LegalEmailLink email="privacy@stamio\.fr"/, "Le contact du responsable du traitement doit utiliser privacy@stamio.fr");
assert.match(notices, /Pour toute question générale relative au site : <LegalEmailLink email="contact@stamio\.fr"/, "Le contact général doit utiliser contact@stamio.fr");
assert.match(terms, /signalement d'un contenu ou contestation d'une décision de modération : <LegalEmailLink email="contact@stamio\.fr"/, "Le contact générique de modération doit utiliser contact@stamio.fr");

const dependencyNames = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies });
for (const provider of ["resend", "@sendgrid/mail", "mailchimp", "sib-api-v3-sdk", "nodemailer"]) {
  assert.ok(!dependencyNames.includes(provider), `Aucun fournisseur email ne doit être ajouté : ${provider}`);
}
assert.doesNotMatch(migration, /pg_cron|cron\.|http_post|net\.http|webhook|send_email|email_queue|campaign/i, "Aucun mécanisme d'envoi ou d'automatisation ne doit être créé");

const changedFiles = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.slice(3).replaceAll("\\", "/"));
assert.ok(!changedFiles.some((path) => path.startsWith("supabase/functions/")), "Aucune Edge Function ne doit être modifiée");
assert.ok(!changedFiles.some((path) => /(?:vote|ballot|permit|participation)/i.test(path)), "Le vote dissocié doit rester hors périmètre");

console.log("Communications consent verification passed: optional signup choice, private persistence, simple account withdrawal, preserved legal baselines, and no sending infrastructure.");
