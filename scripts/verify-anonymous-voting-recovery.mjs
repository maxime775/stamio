import assert from "node:assert/strict";

class AnonymousVoteModel {
  bindings = new Map();
  permits = new Map();
  participations = new Set();
  reputation = new Set();
  ballots = [];
  sequence = 0;

  key(userId, pollId) {
    return `${userId}:${pollId}`;
  }

  authorize(userId, pollId) {
    const key = this.key(userId, pollId);
    if (this.participations.has(key)) return { status: "already_participated" };
    const previousDigest = this.bindings.get(key);
    if (previousDigest) {
      const previous = this.permits.get(previousDigest);
      if (previous?.status === "consumed") {
        this.finalize(userId, pollId, previousDigest);
        return { status: "already_participated" };
      }
      if (previous?.status === "active") previous.status = "revoked";
    }
    const permit = `permit-${++this.sequence}`;
    this.permits.set(permit, { pollId, status: "active", expired: false });
    this.bindings.set(key, permit);
    return { status: "authorized", permit };
  }

  submit(permit, pollId, choiceId, { pollOpen = true, choiceValid = true } = {}) {
    const row = this.permits.get(permit);
    if (!row || row.pollId !== pollId) return "invalid_permit";
    if (row.status === "consumed") return "already_consumed";
    if (row.status === "revoked") return "revoked";
    if (row.expired) return "expired";
    if (!pollOpen) return "poll_closed";
    if (!choiceValid) return "invalid_choice";
    this.ballots.push({ pollId, choiceId });
    row.status = "consumed";
    return "accepted";
  }

  finalize(userId, pollId, permit) {
    const key = this.key(userId, pollId);
    if (this.participations.has(key)) return "already_participated";
    if (this.bindings.get(key) !== permit || this.permits.get(permit)?.status !== "consumed") return "pending";
    this.participations.add(key);
    this.reputation.add(key);
    this.bindings.delete(key);
    return "finalized";
  }

  reconcileServer() {
    let completed = 0;
    for (const [key, permit] of [...this.bindings.entries()]) {
      if (this.permits.get(permit)?.status !== "consumed") continue;
      const separator = key.indexOf(":");
      const userId = key.slice(0, separator);
      const pollId = key.slice(separator + 1);
      if (this.finalize(userId, pollId, permit) === "finalized") completed += 1;
    }
    return completed;
  }

  cleanupExpiredBindings() {
    let cleaned = 0;
    for (const [key, permit] of [...this.bindings.entries()]) {
      const row = this.permits.get(permit);
      if (!row || (row.status !== "revoked" && !row.expired)) continue;
      if (row.status === "active") row.status = "revoked";
      this.bindings.delete(key);
      cleaned += 1;
    }
    return cleaned;
  }

}
normalVoteAndReplay();
lostPermitIsRevoked();
lostResponseReconcilesOnAuthorize();
clientDisappearanceReconcilesServerSide();
expiredPermitBindingIsCleanedServerSide();
revocationConsumptionRacesAreSafe();
invalidInputsDoNotConsume();
expiredAlteredAndWrongPollPermitsFail();
accountsAndPasskeysRespectAccountScope();
console.log("Anonymous voting concurrency and recovery model verified.");

function normalVoteAndReplay() {
  const model = new AnonymousVoteModel();
  const auth = model.authorize("user-a", "poll-a");
  assert.equal(model.submit(auth.permit, "poll-a", "yes"), "accepted");
  assert.equal(model.submit(auth.permit, "poll-a", "no"), "already_consumed");
  assert.equal(model.finalize("user-a", "poll-a", auth.permit), "finalized");
  assert.equal(model.finalize("user-a", "poll-a", auth.permit), "already_participated");
  assert.equal(model.ballots.length, 1);
  assert.equal(model.participations.size, 1);
  assert.equal(model.reputation.size, 1);
}

function lostPermitIsRevoked() {
  const model = new AnonymousVoteModel();
  const lost = model.authorize("user-a", "poll-a");
  const replacement = model.authorize("user-a", "poll-a");
  assert.equal(model.submit(lost.permit, "poll-a", "yes"), "revoked");
  assert.equal(model.submit(replacement.permit, "poll-a", "yes"), "accepted");
  assert.equal(model.finalize("user-a", "poll-a", replacement.permit), "finalized");
  assert.equal(model.ballots.length, 1);
}

function lostResponseReconcilesOnAuthorize() {
  const model = new AnonymousVoteModel();
  const auth = model.authorize("user-a", "poll-a");
  assert.equal(model.submit(auth.permit, "poll-a", "yes"), "accepted");
  assert.equal(model.authorize("user-a", "poll-a").status, "already_participated");
  assert.equal(model.ballots.length, 1);
  assert.equal(model.participations.size, 1);
  assert.equal(model.bindings.size, 0);
}

function clientDisappearanceReconcilesServerSide() {
  const model = new AnonymousVoteModel();
  const auth = model.authorize("user-a", "poll-a");
  assert.equal(model.submit(auth.permit, "poll-a", "yes"), "accepted");

  // The browser disappears permanently: no client finalization or later authorize.
  assert.equal(model.participations.size, 0);
  assert.equal(model.bindings.size, 1);

  assert.equal(model.reconcileServer(), 1);
  assert.equal(model.reconcileServer(), 0);
  assert.equal(model.ballots.length, 1);
  assert.equal(model.participations.size, 1);
  assert.equal(model.reputation.size, 1);
  assert.equal(model.bindings.size, 0);
}

function expiredPermitBindingIsCleanedServerSide() {
  const model = new AnonymousVoteModel();
  const auth = model.authorize("user-a", "poll-a");
  model.permits.get(auth.permit).expired = true;
  assert.equal(model.cleanupExpiredBindings(), 1);
  assert.equal(model.bindings.size, 0);
  assert.equal(model.permits.get(auth.permit).status, "revoked");
  assert.equal(model.ballots.length, 0);
  assert.equal(model.participations.size, 0);
}

function revocationConsumptionRacesAreSafe() {
  const consumedFirst = new AnonymousVoteModel();
  const first = consumedFirst.authorize("user-a", "poll-a");
  assert.equal(consumedFirst.submit(first.permit, "poll-a", "yes"), "accepted");
  assert.equal(consumedFirst.authorize("user-a", "poll-a").status, "already_participated");
  assert.equal(consumedFirst.ballots.length, 1);

  const revokedFirst = new AnonymousVoteModel();
  const oldPermit = revokedFirst.authorize("user-a", "poll-a");
  const newPermit = revokedFirst.authorize("user-a", "poll-a");
  assert.equal(revokedFirst.submit(oldPermit.permit, "poll-a", "yes"), "revoked");
  assert.equal(revokedFirst.submit(newPermit.permit, "poll-a", "no"), "accepted");
  assert.equal(revokedFirst.ballots.length, 1);
}

function invalidInputsDoNotConsume() {
  for (const [options, expected] of [
    [{ pollOpen: false }, "poll_closed"],
    [{ choiceValid: false }, "invalid_choice"]
  ]) {
    const model = new AnonymousVoteModel();
    const auth = model.authorize("user-a", "poll-a");
    assert.equal(model.submit(auth.permit, "poll-a", "yes", options), expected);
    assert.equal(model.ballots.length, 0);
    assert.equal(model.participations.size, 0);
  }
}

function expiredAlteredAndWrongPollPermitsFail() {
  const model = new AnonymousVoteModel();
  const auth = model.authorize("user-a", "poll-a");
  model.permits.get(auth.permit).expired = true;
  assert.equal(model.submit(auth.permit, "poll-a", "yes"), "expired");
  assert.equal(model.submit(`${auth.permit}-altered`, "poll-a", "yes"), "invalid_permit");
  assert.equal(model.submit(auth.permit, "poll-b", "yes"), "invalid_permit");
  assert.equal(model.ballots.length, 0);
  assert.equal(model.participations.size, 0);
}

function accountsAndPasskeysRespectAccountScope() {
  const model = new AnonymousVoteModel();
  const applePasskey = model.authorize("same-user", "poll-a");
  const windowsPasskey = model.authorize("same-user", "poll-a");
  assert.equal(model.submit(applePasskey.permit, "poll-a", "yes"), "revoked");
  assert.equal(model.submit(windowsPasskey.permit, "poll-a", "yes"), "accepted");
  assert.equal(model.finalize("same-user", "poll-a", windowsPasskey.permit), "finalized");

  const otherAccount = model.authorize("other-user", "poll-a");
  assert.equal(model.submit(otherAccount.permit, "poll-a", "no"), "accepted");
  assert.equal(model.finalize("other-user", "poll-a", otherAccount.permit), "finalized");
  assert.equal(model.ballots.length, 2);
  assert.equal(model.participations.size, 2);
}
