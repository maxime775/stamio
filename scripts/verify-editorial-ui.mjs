import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { formatAggregatedVotes } from "../lib/aggregatedVotes.ts";

const [about, approach, votesMetric] = await Promise.all([
  readFile(new URL("../app/about.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/ApproachSection.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/VotesMetric.tsx", import.meta.url), "utf8")
]);

const passkeySentence = "Pour chaque question, un système d’authentification avec clé d’accès unique permet de préserver la qualité du signal recueilli.";
assert.ok(approach.includes(passkeySentence), "La phrase Passkey attendue est absente de la section Notre approche.");
assert.ok(!approach.includes("un même numéro vérifié"), "L’ancienne phrase de vérification téléphonique subsiste.");

assert.match(about, /<HeroActionButton\s+[\s\S]*?label="Découvrir les questions"[\s\S]*?variant="primary"[\s\S]*?href="\/themes"/);
assert.ok(!about.includes("styles.cta"), "Le CTA local cassé subsiste sur la page Qui sommes-nous.");

assert.equal(formatAggregatedVotes(0), "0 votes agrégés");
assert.equal(formatAggregatedVotes(1), "1 vote agrégé");
assert.equal(formatAggregatedVotes(2), "2 votes agrégés");
assert.ok(votesMetric.includes("formatAggregatedVotes(value)"), "Le donut n’utilise pas le formateur partagé.");
assert.ok(votesMetric.includes("accessibilityLabel={formattedValue}"), "Le libellé accessible n’utilise pas le formateur partagé.");

console.log("Editorial UI checks passed.");
