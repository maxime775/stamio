import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const scrub = readFileSync(join(root, "supabase/migrations/20260826160000_anonymous_vote_scrub.sql"), "utf8");
const changed = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
  cwd: root,
  encoding: "utf8"
}).split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).replaceAll("\\", "/"));

const protectedFiles = new Set([
  "components/VotePanel.tsx",
  "components/PollCard.tsx",
  "components/PollTeaserCard.tsx",
  "components/TrendingPollsCarousel.tsx",
  "components/ThemePollsPage.tsx",
  "lib/decisionTrees.ts",
  "lib/pollDescription.ts",
  "lib/publicPollUrls.ts",
  "public/sitemap.xml",
  "supabase/seed.sql"
]);
const protectedPrefixes = [
  "app/poll/", "app/question/", "app/resultats/", "components/decision-tree/",
  "components/PollResources", "components/Resources", "public/images/"
];

for (const path of changed) {
  assert.ok(!protectedFiles.has(path), `protected content file changed: ${path}`);
  assert.ok(!protectedPrefixes.some((prefix) => path.startsWith(prefix)), `protected content path changed: ${path}`);
}

assert.doesNotMatch(scrub, /\b(?:drop|alter|truncate)\s+table\s+public\.(?:polls|poll_series|choices|poll_resources)\b/i);
assert.doesNotMatch(scrub, /\b(?:insert\s+into|delete\s+from)\s+public\.(?:poll_series|choices|poll_resources)\b/i);
assert.doesNotMatch(scrub, /\bset\s+(?:question|description|theme|slug|series_id|wave_number)\s*=/i);
assert.doesNotMatch(scrub, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
assert.match(scrub, /anonymous_vote_scrub_changed_editorial_cardinality/);

console.log("SCRUB diff preserves questions, public URLs, resources and decision-tree files.");
