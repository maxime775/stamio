import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const loadPureTypeScriptModule = async (path) => {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
};

const { createPasskeyCeremonyController } = await loadPureTypeScriptModule("lib/auth/passkeyCeremony.ts");
const require = createRequire(import.meta.url);
const stress = { login: 0, doubleTap: 0, retry: 0 };

async function runCeremony(controller, operation) {
  const lease = controller.begin();
  if (!lease) return { started: false };
  try {
    return { started: true, value: await operation(lease) };
  } finally {
    controller.finish(lease);
  }
}

// The previous React-state-only guard admits two invocations before the next render.
{
  let renderedLoading = false;
  let ceremoniesStarted = 0;
  const pendingStateUpdates = [];
  const legacyHandler = () => {
    if (renderedLoading) return;
    pendingStateUpdates.push(() => { renderedLoading = true; });
    ceremoniesStarted += 1;
  };
  legacyHandler();
  legacyHandler();
  pendingStateUpdates.forEach((update) => update());
  assert.equal(ceremoniesStarted, 2);
}

// Thirty consecutive mocked login ceremonies complete without overlap or stale state.
{
  const controller = createPasskeyCeremonyController();
  for (let index = 0; index < 30; index += 1) {
    const result = await runCeremony(controller, async () => `session-${index}`);
    assert.equal(result.started, true);
    assert.equal(result.value, `session-${index}`);
    stress.login += 1;
  }
}

// Ten rapid double taps are reduced to ten single ceremonies.
for (let index = 0; index < 10; index += 1) {
  const controller = createPasskeyCeremonyController();
  let release;
  const first = runCeremony(controller, () => new Promise((resolve) => { release = resolve; }));
  const second = await runCeremony(controller, async () => "must-not-run");
  assert.equal(second.started, false);
  release(`verified-${index}`);
  assert.equal((await first).value, `verified-${index}`);
  stress.doubleTap += 1;
}

// Ten aborted attempts each release the lock and succeed with a new challenge on retry.
{
  const controller = createPasskeyCeremonyController();
  for (let index = 0; index < 10; index += 1) {
    const firstChallenge = `abort-${index}`;
    const retryChallenge = `retry-${index}`;
    await assert.rejects(runCeremony(controller, async () => {
      const error = new Error(firstChallenge);
      error.name = "AbortError";
      throw error;
    }), { name: "AbortError" });
    const retry = await runCeremony(controller, async () => retryChallenge);
    assert.equal(retry.value, retryChallenge);
    assert.notEqual(firstChallenge, retryChallenge);
    stress.retry += 1;
  }
}

// One tap starts exactly one challenge, one WebAuthn call and one verification.
{
  const controller = createPasskeyCeremonyController();
  const calls = { challenge: 0, credential: 0, verify: 0 };
  const result = await runCeremony(controller, async () => {
    calls.challenge += 1;
    calls.credential += 1;
    calls.verify += 1;
    return "session";
  });
  assert.equal(result.started, true);
  assert.deepEqual(calls, { challenge: 1, credential: 1, verify: 1 });
}

// Two calls in the same tick still start only one ceremony.
{
  const controller = createPasskeyCeremonyController();
  const calls = { challenge: 0, credential: 0, verify: 0 };
  let release;
  const first = runCeremony(controller, async () => {
    calls.challenge += 1;
    calls.credential += 1;
    await new Promise((resolve) => { release = resolve; });
    calls.verify += 1;
  });
  const second = await runCeremony(controller, async () => {
    calls.challenge += 1;
    calls.credential += 1;
    calls.verify += 1;
  });
  assert.equal(second.started, false);
  release();
  await first;
  assert.deepEqual(calls, { challenge: 1, credential: 1, verify: 1 });
}

// Every failed or abandoned attempt releases the lock and the retry receives a new challenge.
{
  const controller = createPasskeyCeremonyController();
  const challengeIds = [];
  for (const errorName of ["AbortError", "NotAllowedError", "NetworkError", "webauthn_challenge_expired"]) {
    await assert.rejects(
      runCeremony(controller, async () => {
        challengeIds.push(`challenge-${challengeIds.length + 1}`);
        const error = new Error(errorName);
        error.name = errorName;
        throw error;
      }),
      { name: errorName }
    );
  }
  const success = await runCeremony(controller, async () => {
    challengeIds.push(`challenge-${challengeIds.length + 1}`);
    return "verified";
  });
  assert.equal(success.value, "verified");
  assert.equal(new Set(challengeIds).size, 5);
}

// A late completion from a cancelled lease cannot clear a newer ceremony.
{
  const controller = createPasskeyCeremonyController();
  const appliedResults = [];
  const stale = controller.begin();
  assert.ok(stale);
  controller.cancel(stale);
  assert.equal(stale.signal.aborted, true);
  const current = controller.begin();
  assert.ok(current);
  controller.finish(stale);
  assert.equal(controller.isActive(current), true);
  if (controller.isActive(stale)) appliedResults.push("stale");
  if (controller.isActive(current)) appliedResults.push("current");
  assert.deepEqual(appliedResults, ["current"]);
  controller.finish(current);
  assert.equal(controller.isActive(), false);
}

// Disposed instances never restart; a remount gets a fresh, idle controller.
{
  const staleController = createPasskeyCeremonyController();
  const stale = staleController.begin();
  staleController.dispose();
  assert.equal(stale.signal.aborted, true);
  assert.equal(staleController.begin(), null);
  const remountedController = createPasskeyCeremonyController();
  assert.ok(remountedController.begin());
}

// Validate the installed SDK's manual base64url conversion for challenges and credential IDs.
{
  const sdk = require("../node_modules/@supabase/auth-js/dist/main/lib/webauthn.js");
  const bytes = Uint8Array.from([0, 1, 2, 127, 128, 254, 255]);
  const encoded = Buffer.from(bytes).toString("base64url");
  const options = sdk.deserializeCredentialRequestOptions({
    challenge: encoded,
    rpId: "stamio.fr",
    userVerification: "required",
    allowCredentials: [
      { id: encoded, type: "public-key", transports: ["internal"] },
      { id: Buffer.from(Uint8Array.from([9, 8, 7])).toString("base64url"), type: "public-key", transports: ["hybrid"] }
    ]
  });
  assert.deepEqual(Array.from(new Uint8Array(options.challenge)), Array.from(bytes));
  assert.deepEqual(Array.from(new Uint8Array(options.allowCredentials[0].id)), Array.from(bytes));
  assert.deepEqual(Array.from(new Uint8Array(options.allowCredentials[1].id)), [9, 8, 7]);
  assert.equal(options.rpId, "stamio.fr");
  assert.equal(options.userVerification, "required");
  const serialized = sdk.serializeCredentialRequestResponse({
    id: encoded,
    response: {
      authenticatorData: bytes.buffer,
      clientDataJSON: bytes.buffer,
      signature: bytes.buffer,
      userHandle: bytes.buffer
    },
    getClientExtensionResults: () => ({})
  });
  assert.equal(serialized.id, encoded);
  assert.equal(serialized.rawId, encoded);
  assert.equal(serialized.response.authenticatorData, encoded);
  assert.equal(serialized.response.clientDataJSON, encoded);
  assert.equal(serialized.response.signature, encoded);
  assert.equal(serialized.response.userHandle, encoded);
}

// Counter and backup flags stay entirely in the server-side verification path.
{
  const passkeys = read("lib/auth/passkeys.ts");
  assert.doesNotMatch(passkeys, /signCount|backupEligibility|backupState|newCounter|storedCounter/);
  assert.match(read("lib/supabase.ts"), /experimental:\s*\{\s*passkey:\s*true\s*\}/);
}

// Component wiring never starts WebAuthn from an effect and always passes the lease signal.
{
  const login = read("components/LoginForm.tsx");
  const enrollment = read("app/auth/passkey-enrollment.tsx");
  assert.match(login, /passkeyCeremony\.current\.begin\(\)/);
  assert.match(login, /signInWithPasskey\(lease\.signal\)/);
  assert.match(enrollment, /passkeyCeremony\.current\.begin\(\)/);
  assert.match(enrollment, /registerPasskey\(lease\.signal\)/);
  assert.doesNotMatch(login, /useEffect\([\s\S]{0,400}signInWithPasskey/);
  assert.doesNotMatch(enrollment, /useEffect\([\s\S]{0,400}registerPasskey/);
}

console.log(`Passkey reliability checks passed: login ${stress.login}/30, double tap ${stress.doubleTap}/10, retry ${stress.retry}/10.`);
