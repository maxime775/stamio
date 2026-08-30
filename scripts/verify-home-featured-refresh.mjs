import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const home = read("app/index.tsx");
const api = read("lib/api.ts");

const focusStart = home.indexOf("useFocusEffect(useCallback");
const focusEnd = home.indexOf("useEffect(() => {", focusStart);
assert.ok(focusStart >= 0 && focusEnd > focusStart, "L'accueil doit utiliser le lifecycle de focus Expo Router");
const featuredFocusEffect = home.slice(focusStart, focusEnd);

assert.match(home, /import \{ useFocusEffect \} from "expo-router";/, "Le lifecycle doit venir d'Expo Router");
assert.match(
  featuredFocusEffect,
  /getFeaturedPolls\(\{ force: true, label: "homeFeaturedRefresh" \}\)/,
  "Chaque activation de l'accueil doit relire la collection featured depuis sa source"
);
assert.match(featuredFocusEffect, /setPolls\(items\)/, "Le résultat complet du fetch featured doit remplacer le state");
assert.doesNotMatch(featuredFocusEffect, /setPolls\(\[\]\)/, "Les cartes existantes ne doivent pas être vidées pendant le refresh");
assert.doesNotMatch(featuredFocusEffect, /setIsLoadingPolls\(true\)/, "Le refocus ne doit pas réafficher le loader initial");
assert.match(featuredFocusEffect, /let active = true[\s\S]*?if \(!active\) return[\s\S]*?active = false/, "Les réponses tardives ne doivent pas écrire après blur ou unmount");
assert.equal((home.match(/getFeaturedPolls\(/g) ?? []).length, 1, "Le chargement initial et les refocus doivent partager une seule logique");
assert.doesNotMatch(home, /trend_label/, "Le refresh de l'accueil ne doit pas être spécifique au sous-thème");

assert.match(
  api,
  /export async function getFeaturedPolls\(options: CacheOptions = \{\}\): Promise<PollWithStats\[]> \{\s+return fetchPollCollection\(\{ featuredOnly: true, limit: 10 \}, options\);/,
  "Le helper featured existant doit accepter le refresh forcé"
);
assert.match(api, /async function fetchPollCollection\([\s\S]*?cacheOptions: CacheOptions = \{\}\)[\s\S]*?cached\(cacheKeys\.collection\(options\)/, "Le même fetch de collection doit servir le chargement et le refresh");
assert.match(api, /\{ \.\.\.cacheOptions, label: cacheOptions\.label \?\? "fetchPollCollection" \}/, "Les options de fraîcheur doivent parvenir au cache existant");
assert.match(api, /const BASE_POLL_SELECT = "[^"]*question[^"]*description[^"]*theme[^"]*featured[^"]*trend_label[^"]*status|const BASE_POLL_SELECT = "[^"]*status[^"]*theme[^"]*featured[^"]*trend_label/, "Le refetch doit récupérer la question featured complète, pas patcher trend_label");

assert.doesNotMatch(featuredFocusEffect, /setInterval|setTimeout|window\.location\.reload|router\.replace|Date\.now\(\).*query|[?&](?:ts|timestamp)=/i, "Le refresh ne doit utiliser ni polling, ni reload, ni cache-busting d'URL");
assert.doesNotMatch(home, /window\.location\.reload/, "L'accueil ne doit jamais déclencher de hard refresh");

const changedFiles = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.slice(3).replaceAll("\\", "/"));
const allowedFiles = new Set([
  "app/index.tsx",
  "lib/api.ts",
  "package.json",
  "scripts/verify-home-featured-refresh.mjs",
  "scripts/verify-poll-subtheme.mjs"
]);
assert.deepEqual(changedFiles.filter((path) => !allowedFiles.has(path)), [], "Le correctif doit rester limité au lifecycle frontend de l'accueil");
assert.ok(!changedFiles.some((path) => path.includes("Hero") || path === "components/PollTeaserCard.tsx"), "La Hero et PollTeaserCard doivent rester inchangées");
assert.ok(!changedFiles.some((path) => path.startsWith("supabase/")), "Aucun backend, RPC ou migration ne doit être modifié");

console.log("Home featured refresh verification passed: focus refetches the full collection, preserves visible state, and leaves Hero/backend untouched.");
