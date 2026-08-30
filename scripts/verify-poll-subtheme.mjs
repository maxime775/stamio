import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  MAX_POLL_SUBTHEME_LENGTH,
  normalizePollSubtheme,
  validatePollSubtheme
} from "../lib/pollSubtheme.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const admin = read("app/admin/index.tsx");
const api = read("lib/api.ts");
const types = read("lib/types.ts");
const card = read("components/PollTeaserCard.tsx");
const seed = read("supabase/seed.sql");
const migrationPath = "supabase/migrations/20260830120000_admin_poll_subtheme.sql";
const migration = read(migrationPath);

assert.equal(MAX_POLL_SUBTHEME_LENGTH, 60);
assert.equal(normalizePollSubtheme("  Fiscalité  "), "Fiscalité", "Le sous-thème doit être trimé sans changer sa casse");
assert.equal(normalizePollSubtheme("   "), null, "Une valeur vide doit devenir NULL");
assert.equal(normalizePollSubtheme(null), null);
assert.equal(validatePollSubtheme("Fiscalité"), null);
assert.match(validatePollSubtheme("a".repeat(61)) ?? "", /60 caractères/);

assert.match(
  admin,
  /<Field label="Theme">[\s\S]*?<Field label="Sous-thème">[\s\S]*?<Field label="Question">/,
  "Le champ Sous-thème doit suivre immédiatement le thème dans le formulaire commun création/modification"
);
assert.match(admin, /<Field label="Sous-thème">[\s\S]*?value=\{subtheme\}[\s\S]*?onChangeText=\{setSubtheme\}[\s\S]*?maxLength=\{MAX_POLL_SUBTHEME_LENGTH\}[\s\S]*?placeholder="Ex\. Fiscalité"[\s\S]*?style=\{styles\.input\}/, "Le sous-thème doit réutiliser exactement l'input Admin");
assert.equal((admin.match(/trend_label: normalizePollSubtheme\(subtheme\)/g) ?? []).length, 2, "Création et modification doivent transmettre une valeur normalisée");
assert.match(admin, /setSubtheme\(detail\.poll\.trend_label \?\? poll\.trend_label \?\? ""\)/, "L'édition doit préremplir la valeur persistée");
assert.match(admin, /function resetForm\(\)[\s\S]*?setSubtheme\(""\)/, "Le reset doit restaurer un sous-thème optionnel vide");
assert.match(admin, /validatePollSubtheme\(subtheme\)/, "La limite courte doit être validée avant enregistrement");

assert.match(types, /export type AdminCreatePollInput[\s\S]*?trend_label\?: string \| null/);
assert.match(types, /export type AdminUpdatePollInput[\s\S]*?trend_label: string \| null/, "L'update doit exiger une valeur explicite, NULL compris");
assert.equal((api.match(/p_trend_label: input\.trend_label/g) ?? []).length, 2, "Les deux RPC Admin doivent recevoir p_trend_label");
const updateApi = api.slice(api.indexOf("export async function adminUpdatePoll"), api.indexOf("export async function adminClosePoll"));
assert.match(updateApi, /p_trend_label: input\.trend_label/);
assert.doesNotMatch(updateApi, /\.from\("polls"\)[\s\S]*?\.update\(/, "Le client ne doit jamais obtenir un UPDATE direct sur polls");

const oldSignature = "public.admin_update_poll(uuid, text, text, text, timestamptz, text, boolean, boolean, text[], text[], jsonb)";
const newSignature = "public.admin_update_poll(uuid, text, text, text, timestamptz, text, boolean, boolean, text, text[], text[], jsonb)";
assert.ok(migration.includes(`drop function if exists ${oldSignature};`), "L'ancienne signature doit être supprimée pour éviter un overload PostgREST");
assert.match(migration, /create function public\.admin_update_poll\([\s\S]*?p_show_in_results boolean,\s+p_trend_label text,\s+p_choices text\[\] default null/, "La nouvelle signature doit rendre p_trend_label explicite avant les paramètres optionnels");
assert.match(migration, /security definer\s+set search_path = public/);
assert.match(migration, /if auth\.uid\(\) is null then raise exception 'authentication_required'/);
assert.match(migration, /if not public\.is_admin\(\) then raise exception 'admin_required'/);
assert.match(migration, /v_trend_label text := nullif\(btrim\(coalesce\(p_trend_label, ''\)\), ''\)/, "Espaces seuls et NULL doivent devenir SQL NULL");
assert.match(migration, /if length\(v_trend_label\) > 60 then raise exception 'trend_label_too_long'/);
assert.match(migration, /show_in_results = case[\s\S]*?trend_label = v_trend_label\s+where id = p_poll_id/, "L'update doit écrire la valeur normalisée, y compris NULL pour une suppression");
assert.ok(migration.includes(`revoke all on function ${newSignature} from public, anon, authenticated;`));
assert.ok(migration.includes(`grant execute on function ${newSignature} to authenticated, service_role;`));
assert.doesNotMatch(migration, /alter table|add column|grant\s+update|Fiscalité/i, "La migration RPC ne doit ajouter aucune colonne, aucun backfill et aucun droit UPDATE direct");
assert.equal((migration.match(/create function public\.admin_update_poll/g) ?? []).length, 1, "La migration ne doit créer qu'une signature RPC");

assert.match(seed, /'Fiscalité'/, "La valeur locale existante Fiscalité doit rester intacte");
assert.match(card, /\{poll\.trend_label \? \([\s\S]*?<TrendingUp size=\{12\} color="#C7B58B" \/>[\s\S]*?<Text style=\{styles\.trendText\}>\{poll\.trend_label\}<\/Text>/, "La carte doit continuer à afficher trend_label avec son pictogramme existant");
assert.match(card, /trend: \{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 5, flexShrink: 1 \}/);
assert.match(card, /trendText: \{ color: "#C7B58B", fontSize: 11, fontFamily: fontFamilyMedium, textAlign: "right" \}/);
assert.doesNotMatch(card, /Sans sous-thème|Sous-thème non défini/, "L'absence de sous-thème ne doit produire aucun placeholder public");

const changedFiles = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.slice(3).replaceAll("\\", "/"));
assert.ok(!changedFiles.includes("components/PollTeaserCard.tsx"), "Le composant de carte validé ne doit pas être redessiné");
assert.deepEqual(changedFiles.filter((path) => path.startsWith("supabase/migrations/")), [migrationPath], "Une seule migration RPC locale est autorisée");

console.log("Poll subtheme verification passed: existing trend_label reused, Admin create/update wired, NULL deletion explicit, card design untouched, and RPC security preserved.");
