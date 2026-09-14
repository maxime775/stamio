import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  computeAdminPollClosesAt,
  resolveAdminPollClosesAt
} from "../lib/adminPollClosesAt.ts";

const poll = {
  id: "11111111-1111-4111-8111-111111111111",
  question: "Question avant correction",
  closes_at: "2026-09-25T08:56:16.511352+00:00"
};
const editedPoll = { ...poll, question: "Question apres correction" };
const simulatedNow = Date.parse("2026-09-14T15:30:00.000Z");

const editorialOnlyClosesAt = resolveAdminPollClosesAt({
  editing: true,
  originalClosesAt: editedPoll.closes_at,
  closesAtTouched: false,
  rawDays: "7",
  now: simulatedNow
});
assert.equal(editedPoll.id, poll.id, "Le test doit editer le poll de lancement cible");
assert.notEqual(editedPoll.question, poll.question, "Le test doit simuler une correction editoriale");
assert.strictEqual(
  editorialOnlyClosesAt,
  "2026-09-25T08:56:16.511352+00:00",
  "Une edition editoriale doit conserver la chaine closes_at exacte, microsecondes comprises"
);

const explicitlyChangedClosesAt = resolveAdminPollClosesAt({
  editing: true,
  originalClosesAt: poll.closes_at,
  closesAtTouched: true,
  rawDays: "5",
  now: simulatedNow
});
assert.strictEqual(
  explicitlyChangedClosesAt,
  new Date(simulatedNow + 5 * 24 * 60 * 60 * 1000).toISOString(),
  "Un changement explicite de duree doit conserver le calcul existant"
);

const createdClosesAt = resolveAdminPollClosesAt({
  editing: false,
  originalClosesAt: null,
  closesAtTouched: false,
  rawDays: "7",
  now: simulatedNow
});
assert.strictEqual(
  createdClosesAt,
  computeAdminPollClosesAt("7", simulatedNow),
  "La creation doit conserver le calcul existant"
);

assert.strictEqual(resolveAdminPollClosesAt({
  editing: true,
  originalClosesAt: null,
  closesAtTouched: false,
  rawDays: "7",
  now: simulatedNow
}), null, "Une cloture NULL doit rester NULL lors d'une edition non temporelle");

const adminSource = readFileSync(new URL("../app/admin/index.tsx", import.meta.url), "utf8");
assert.match(adminSource, /setOriginalClosesAt\(detail\.poll\.closes_at\)/, "L'edition doit memoriser closes_at directement depuis la reponse DB");
assert.match(adminSource, /setOriginalClosesAt\(detail\.poll\.closes_at\);\s+setClosesAtTouched\(false\)/, "Le chargement d'une edition doit reinitialiser le marqueur temporel");
assert.match(adminSource, /setDuration\(item\.value\);\s+setClosesAtTouched\(true\)/, "Une selection explicite de duree doit marquer la cloture comme modifiee");
assert.match(adminSource, /setCustomDays\(value\);\s+setClosesAtTouched\(true\)/, "Une duree personnalisee doit marquer la cloture comme modifiee");
assert.doesNotMatch(adminSource, /new Date\(originalClosesAt\)/, "La cloture originale ne doit jamais etre parsee par Date");

console.log("Admin poll closes_at verification passed: editorial edits preserve the raw deadline, explicit duration changes and creation keep their existing calculation, and null remains null.");
