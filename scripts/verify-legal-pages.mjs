import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, ...path.split("/")), "utf8");

const privacy = read("app/confidentialite.tsx");
const terms = read("app/conditions-utilisation.tsx");
const notices = read("app/mentions-legales.tsx");
const signup = read("components/SignupForm.tsx");
const legalPage = read("components/LegalPage.tsx");
const scopedSource = [privacy, terms, notices, signup].join("\n");

for (const expected of [
  "Politique de confidentialité et de protection des données personnelles",
  "Les votes sur Stamio sont anonymes",
  "Le choix exprimé n’est pas enregistré avec le compte utilisateur",
  "1 compte vérifié = 1 vote par vague",
  "privacy@stamio.fr",
  "maxime@stamio.fr"
]) {
  assert.ok(privacy.includes(expected), `Confidentialité : texte manquant : ${expected}`);
}

assert.equal((terms.match(/title: "(?:[1-9]|1[0-9]|2[0-2])\./g) ?? []).length, 22, "CGU : les 22 sections numérotées doivent être présentes");
for (const expected of [
  "1 compte vérifié = 1 vote par vague",
  "Le vote est anonyme",
  "Modération et signalement de contenus",
  "Tout utilisateur ou tiers peut signaler un contenu",
  "Propriété intellectuelle de Stamio",
  "Droit applicable et règlement des différends",
  "Les présentes CGU sont régies par le droit français"
]) {
  assert.ok(terms.includes(expected), `CGU : texte manquant : ${expected}`);
}

for (const expected of [
  "Le site stamio.fr est édité à titre non professionnel par :",
  "Maxime Opinel, personne physique",
  "OVH SAS (OVHcloud)",
  "Supabase, Inc.",
  "Droit de réponse",
  "Signalement d'un contenu illicite ou problématique"
]) {
  assert.ok(notices.includes(expected), `Mentions légales : texte manquant : ${expected}`);
}

for (const forbidden of [
  "[À COMPLÉTER",
  "IMPORTANT - À FINALISER AVANT PUBLICATION",
  "adresse de domicile",
  "téléphone personnel",
  "maxime.opinel@gmail.com"
]) {
  assert.ok(!notices.toLowerCase().includes(forbidden.toLowerCase()), `Mentions légales : contenu interdit présent : ${forbidden}`);
}

assert.equal((notices.match(/Téléphone :/g) ?? []).length, 1, "Mentions légales : seul le téléphone public de l'hébergeur OVH doit être affiché");
assert.match(notices, /Téléphone : 1007 depuis la France ; \+33 9 72 10 10 07 depuis l'étranger/, "Mentions légales : le téléphone conservé doit être celui d'OVH");
for (const inventedStructure of ["Stamio SAS", "Stamio SASU", "Stamio SARL", "SIREN Stamio", "SIRET Stamio", "RCS Stamio", "TVA Stamio", "capital social de Stamio"]) {
  assert.ok(!notices.toLowerCase().includes(inventedStructure.toLowerCase()), `Mentions légales : structure professionnelle inventée : ${inventedStructure}`);
}
assert.ok(!scopedSource.includes("maxime.opinel@gmail.com"), "L'ancienne adresse Gmail ne doit subsister dans aucune page juridique ni dans le signup");

for (const route of ["/confidentialite", "/conditions-utilisation", "/mentions-legales"]) {
  assert.ok(read("components/AppFooter.tsx").includes(route), `Footer : route juridique absente : ${route}`);
}
assert.ok(terms.includes('href="/confidentialite"'), "CGU : la politique doit utiliser la route interne");
assert.ok(notices.includes('href="/confidentialite"') && notices.includes('href="/conditions-utilisation"'), "Mentions légales : les références juridiques doivent utiliser les routes internes");
assert.ok(legalPage.includes("useWindowDimensions().width < 680"), "LegalPage : le tableau doit disposer d'une adaptation mobile");
assert.ok(legalPage.includes('role="table"') && legalPage.includes('role="columnheader"'), "LegalPage : le tableau doit exposer une structure accessible");
assert.ok(legalPage.includes("minWidth: 0"), "LegalPage : les contenus flexibles doivent pouvoir se réduire sans overflow horizontal");

console.log("Legal pages verification passed: final privacy policy, 22-section terms, beta legal notices, internal links, responsive accessible table, and no legacy Gmail.");
