import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAX_POLL_SERIES_SLUG_LENGTH,
  assertPollSeriesSlugAvailable,
  createPollSeriesSlug,
  getHistoricalResultPath,
  getPollPublicPath,
  getQuestionPath,
  keepOrCreatePollSeriesSlug,
  resolveActiveSeriesWave,
  resolveHistoricalSeriesWave,
  resolveLatestPublishedSeriesWave,
  resolveLegacyPollPath,
  resolvePublicQuestionPath,
  validatePollSeriesSlug
} from "../lib/publicPollUrls.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const now = new Date("2026-08-25T12:00:00.000Z");

const productionSeries = [
  {
    seriesId: "a926388b-2958-4d49-8a14-2ec4992027ca",
    question: "Êtes-vous pour ou contre la taxe Zucman ?",
    slug: "taxe-zucman"
  },
  {
    seriesId: "23fedfb0-9be5-4e8c-86ee-a1b5a335f67a",
    question: "Une peine d’inéligibilité constitue-t-elle selon vous une entrave au fonctionnement démocratique ?",
    slug: "peine-ineligibilite-entrave-democratie"
  },
  {
    seriesId: "cd21b620-764b-4713-b707-2a05363103bb",
    question: "Pensez-vous que l’augmentation de la dette publique est un problème ?",
    slug: "dette-publique"
  },
  {
    seriesId: "cd91e59b-e5a5-4f51-b803-d744dc7c87bc",
    question: "Pensez-vous que la France doive sortir complétement du nucléaire ?",
    slug: "sortie-nucleaire-france"
  }
];

for (const series of productionSeries) {
  assert.equal(createPollSeriesSlug(series.question), series.slug);
  assert.equal(validatePollSeriesSlug(series.slug), null);
}

assert.equal(
  createPollSeriesSlug("Pensez-vous qu’une peine d’inéligibilité confirmée par la cour d’appel de Paris à l’encontre de Marine Le Pen constituerait une entrave au fonctionnement démocratique ?"),
  "peine-ineligibilite-entrave-democratie"
);
assert.equal(createPollSeriesSlug("L'œuvre & l’Æther : édition 2026 !"), "loeuvre-laether-edition-2026");
assert.match(validatePollSeriesSlug("Question invalide") ?? "", /minuscules/);
assert.ok(createPollSeriesSlug(`Question ${"très longue ".repeat(20)}`).length <= MAX_POLL_SERIES_SLUG_LENGTH);

const proposed = createPollSeriesSlug("Titre identique");
assert.equal(createPollSeriesSlug("Titre identique"), proposed);
assert.throws(() => assertPollSeriesSlugAvailable(proposed, [proposed]), /slug_already_exists/);
assert.equal(keepOrCreatePollSeriesSlug("slug-editorial-stable", "Titre légèrement retouché"), "slug-editorial-stable");

const seriesSlug = "serie-test";
const waves = [
  {
    id: "uuid-wave-1",
    series_id: "series-a",
    series_slug: seriesSlug,
    wave_number: 1,
    status: "closed",
    closes_at: "2026-07-01T00:00:00.000Z",
    show_in_results: true,
    archived: false,
    launched_at: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "uuid-wave-2",
    series_id: "series-a",
    series_slug: seriesSlug,
    wave_number: 2,
    status: "closed",
    closes_at: "2026-08-01T00:00:00.000Z",
    show_in_results: true,
    archived: false,
    launched_at: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "uuid-wave-3",
    series_id: "series-a",
    series_slug: seriesSlug,
    wave_number: 3,
    status: "open",
    closes_at: "2026-09-01T00:00:00.000Z",
    show_in_results: false,
    archived: false,
    launched_at: "2026-08-20T00:00:00.000Z"
  }
];

assert.equal(resolveActiveSeriesWave(waves, seriesSlug, now)?.id, "uuid-wave-3");
assert.equal(resolvePublicQuestionPath(waves, seriesSlug, now), `/question/${seriesSlug}`);
assert.equal(new Set(waves.map((wave) => wave.series_slug)).size, 1, "a new wave must reuse the existing series slug");
assert.equal(resolveHistoricalSeriesWave(waves, seriesSlug, 1)?.id, "uuid-wave-1");
assert.equal(resolveHistoricalSeriesWave(waves, seriesSlug, 99), null);
assert.equal(resolveActiveSeriesWave(waves, "slug-inexistant", now), null);
assert.equal(resolvePublicQuestionPath(waves, "slug-inexistant", now), null);
assert.equal(resolveLegacyPollPath(waves, "uuid-wave-3", now), `/question/${seriesSlug}`);
assert.equal(resolveLegacyPollPath(waves, "uuid-wave-1", now), `/resultats/${seriesSlug}/vague-1`);
assert.equal(resolveLegacyPollPath(waves, "uuid-inexistant", now), null);
assert.equal(getQuestionPath(seriesSlug), `/question/${seriesSlug}`);
assert.equal(getHistoricalResultPath(seriesSlug, 2), `/resultats/${seriesSlug}/vague-2`);
assert.equal(getPollPublicPath(waves[2], now), `/question/${seriesSlug}`);
assert.equal(getPollPublicPath(waves[0], now), `/resultats/${seriesSlug}/vague-1`);

const noActiveWaves = waves.map((wave) => wave.status === "open"
  ? { ...wave, closes_at: "2026-08-24T00:00:00.000Z" }
  : wave);
assert.equal(resolveActiveSeriesWave(noActiveWaves, seriesSlug, now), null);
assert.equal(resolveLatestPublishedSeriesWave(noActiveWaves, seriesSlug)?.id, "uuid-wave-2");
assert.equal(resolvePublicQuestionPath(noActiveWaves, seriesSlug, now), `/resultats/${seriesSlug}/vague-2`);
assert.equal(resolveLegacyPollPath(noActiveWaves, "uuid-wave-3", now), null);
assert.equal(getPollPublicPath(noActiveWaves[2], now), null);

const multipleActiveWaves = [
  ...waves,
  { ...waves[2], id: "uuid-wave-4", wave_number: 4, launched_at: "2026-08-21T00:00:00.000Z" }
];
assert.equal(resolveActiveSeriesWave(multipleActiveWaves, seriesSlug, now)?.id, "uuid-wave-4");

const expiredThenActiveWaves = [
  { ...waves[2], id: "uuid-expired-wave", closes_at: "2026-08-24T00:00:00.000Z" },
  { ...waves[2], id: "uuid-current-wave", wave_number: 4 }
];
assert.equal(resolveActiveSeriesWave(expiredThenActiveWaves, seriesSlug, now)?.id, "uuid-current-wave");
assert.equal(resolveLegacyPollPath(expiredThenActiveWaves, "uuid-expired-wave", now), null);

const unavailableWaves = noActiveWaves.map((wave) => ({ ...wave, show_in_results: false }));
assert.equal(resolvePublicQuestionPath(unavailableWaves, seriesSlug, now), null);
assert.equal(resolveLegacyPollPath(unavailableWaves, "uuid-wave-1", now), null);
assert.equal(getPollPublicPath(unavailableWaves[0], now), null);

assert.equal(
  resolveLegacyPollPath(waves, "uuid-wave-1", now),
  `/resultats/${seriesSlug}/vague-1`,
  "an answer for an old published wave must not point to the newer active wave"
);

const productionWaves = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    series_id: productionSeries[0].seriesId,
    series_slug: productionSeries[0].slug,
    wave_number: 1,
    status: "open",
    closes_at: "2026-09-01T08:06:10.066Z",
    show_in_results: false,
    archived: false
  },
  {
    id: "11111111-1111-4111-8111-111111111112",
    series_id: productionSeries[1].seriesId,
    series_slug: productionSeries[1].slug,
    wave_number: 1,
    status: "open",
    closes_at: "2026-08-26T19:16:08.473Z",
    show_in_results: false,
    archived: false
  },
  {
    id: "11111111-1111-4111-8111-111111111113",
    series_id: productionSeries[2].seriesId,
    series_slug: productionSeries[2].slug,
    wave_number: 1,
    status: "open",
    closes_at: "2026-08-12T20:29:55.850Z",
    show_in_results: false,
    archived: false
  },
  {
    id: "c4a4dd08-9858-4207-bcd4-f5af68b0da63",
    series_id: productionSeries[3].seriesId,
    series_slug: productionSeries[3].slug,
    wave_number: 1,
    status: "closed",
    closes_at: "2026-08-12T20:29:40.406Z",
    show_in_results: false,
    archived: false
  },
  {
    id: "89fe1044-340b-4c0b-8c55-96fba7eb5f49",
    series_id: productionSeries[3].seriesId,
    series_slug: productionSeries[3].slug,
    wave_number: 2,
    status: "open",
    closes_at: "2026-08-12T20:30:53.853Z",
    show_in_results: false,
    archived: false
  }
];

assert.equal(resolvePublicQuestionPath(productionWaves, "taxe-zucman", now), "/question/taxe-zucman");
assert.equal(resolvePublicQuestionPath(productionWaves, "peine-ineligibilite-entrave-democratie", now), "/question/peine-ineligibilite-entrave-democratie");
assert.equal(resolvePublicQuestionPath(productionWaves, "dette-publique", now), null);
assert.equal(resolvePublicQuestionPath(productionWaves, "sortie-nucleaire-france", now), null);
assert.equal(resolveLegacyPollPath(productionWaves, productionWaves[0].id, now), "/question/taxe-zucman");
assert.equal(resolveLegacyPollPath(productionWaves, productionWaves[1].id, now), "/question/peine-ineligibilite-entrave-democratie");
for (const wave of productionWaves.slice(2)) assert.equal(resolveLegacyPollPath(productionWaves, wave.id, now), null);

const seed = read("supabase/seed.sql");
assert.match(seed, /11111111-1111-4111-8111-111111111113[\s\S]*33333333-3333-4333-8333-333333333333[\s\S]*dette-publique/);
assert.ok(!seed.includes("dette-publique-probleme"));

const migration = read("supabase/migrations/20260825120000_public_poll_series_slugs.sql");
assert.match(migration, /alter table public\.poll_series[\s\S]*add column if not exists slug text/);
assert.match(migration, /alter column slug set not null/);
assert.match(migration, /poll_series_slug_format_check/);
assert.match(migration, /create unique index poll_series_slug_unique_idx/);
assert.match(migration, /poll_series_slug_backfill_incomplete/);
assert.match(migration, /poll_series_slug_collision/);
for (const series of productionSeries) {
  assert.ok(migration.includes(`'${series.seriesId}'::uuid, '${series.slug}'::text`));
}
assert.ok(!migration.includes("33333333-3333-4333-8333-"), "fixture series IDs must not be part of the production backfill");
assert.ok(!/(?:insert|update|delete)\s+(?:into\s+|from\s+)?public\.(?:votes|vote_phone_locks|vote_attempts)\b/i.test(migration));
assert.match(migration, /create or replace function public\.resolve_public_question/);
assert.match(migration, /returns table\(poll_id uuid, series_id uuid, series_slug text, wave_number integer, route_kind text\)/);
assert.match(migration, /case when p\.status = 'open'[\s\S]*then 0 else 1 end,[\s\S]*p\.wave_number desc nulls last/);
assert.match(migration, /create or replace function public\.resolve_public_poll_result/);
assert.match(migration, /create or replace function public\.resolve_legacy_poll_url/);
assert.match(migration, /p\.status = 'closed'[\s\S]*p\.show_in_results = true/);
assert.ok(!migration.includes("random" + "()"), "slug collision handling must not add a random suffix");

const questionRoute = read("app/question/[slug].tsx");
const resultRoute = read("app/resultats/[slug]/[wave].tsx");
const legacyRoute = read("app/poll/[pollId].tsx");
assert.match(questionRoute, /resolvePublicQuestion/);
assert.match(questionRoute, /route_kind === "resultats"/);
assert.match(questionRoute, /router\.replace\(getHistoricalResultPath/);
assert.match(questionRoute, /canonicalPath=\{resolution \? getQuestionPath/);
assert.match(resultRoute, /resolvePublicHistoricalResult/);
assert.match(resultRoute, /canonicalPath=\{resolution \? getHistoricalResultPath/);
assert.match(legacyRoute, /resolveLegacyPollUrl/);
assert.match(legacyRoute, /router\.replace/);
assert.match(legacyRoute, /<PollScreen pollId=\{null\} resolving=\{resolving\} \/>/);
assert.match(legacyRoute, /rel="canonical"/);

for (const path of [
  "components/PollTeaserCard.tsx",
  "components/ResultsPreviewCard.tsx",
  "app/admin/index.tsx"
]) {
  const source = read(path);
  assert.match(source, /getQuestionPath|getHistoricalResultPath/, `${path} must use public URL helpers`);
}

const admin = read("app/admin/index.tsx");
assert.match(admin, /!editingPollId && !slugTouched/);
assert.match(admin, /setSlug\(detail\.series\?\.slug/);
assert.match(admin, /getPollPublicPath\(/);
assert.match(admin, /\?\? `\/poll\/\$\{poll\.id\}`/);
const latestAnswers = read("components/LatestAnswersList.tsx");
assert.match(latestAnswers, /router\.push\(`\/poll\/\$\{answer\.poll_id\}`/);
assert.ok(!latestAnswers.includes('poll.status === "open"'));
const migrationRelaunch = migration.slice(migration.indexOf("create or replace function public.admin_relaunch_poll"));
assert.match(migrationRelaunch, /v_series_id := v_source\.series_id/);
assert.match(migrationRelaunch, /from public\.polls p where p\.series_id = v_series_id/);

const sitemap = read("public/sitemap.xml");
const questionEntries = [...sitemap.matchAll(/<loc>https:\/\/stamio\.fr(\/question\/[^<]+)<\/loc>/g)].map((match) => match[1]);
assert.deepEqual(questionEntries, [
  "/question/taxe-zucman",
  "/question/peine-ineligibilite-entrave-democratie"
]);
assert.ok(!sitemap.includes("/poll/"), "the sitemap must not expose poll UUID URLs");
assert.ok(!sitemap.includes("/resultats/"), "no historical result is currently published");

const deployment = read("DEPLOYMENT_OVH.md");
assert.match(deployment, /initial HTTP response remains `200`; it is not a server-side `301`/);
assert.match(deployment, /sitemap remains deliberately curated/);

console.log("Public question URL routing checks passed.");
