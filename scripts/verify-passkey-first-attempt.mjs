import assert from "node:assert/strict";
import { GoTrueClient } from "@supabase/auth-js";

const AUTH_URL = "https://example.supabase.co/auth/v1";
const STORAGE_KEY = "passkey-first-attempt-test";
const encoder = new TextEncoder();
let storageSequence = 0;

class MockPublicKeyCredential {
  constructor() {
    this.id = "mock-credential";
    this.rawId = encoder.encode("mock-credential").buffer;
    this.type = "public-key";
    this.authenticatorAttachment = "platform";
    this.response = {
      authenticatorData: encoder.encode("authenticator-data").buffer,
      clientDataJSON: encoder.encode("client-data").buffer,
      signature: encoder.encode("signature").buffer,
      userHandle: null
    };
  }

  getClientExtensionResults() {
    return {};
  }
}

globalThis.PublicKeyCredential = MockPublicKeyCredential;
globalThis.window = {
  PublicKeyCredential: MockPublicKeyCredential,
  location: { href: "https://stamio.fr/auth/login" },
  addEventListener() {},
  removeEventListener() {}
};
globalThis.document = { visibilityState: "visible" };

function deferred() {
  let resolve;
  const promise = new Promise((value) => { resolve = value; });
  return { promise, resolve };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "X-Supabase-Api-Version": "2024-01-01" }
  });
}

function createStorage(initialSession = null) {
  const storageKey = `${STORAGE_KEY}-${++storageSequence}`;
  const values = new Map();
  if (initialSession) values.set(storageKey, JSON.stringify(initialSession));
  return {
    storageKey,
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
    hasSession() { return values.has(storageKey); }
  };
}

function sessionFor(index) {
  return {
    access_token: `access-${index}`,
    refresh_token: `refresh-${index}`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: {
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      aud: "authenticated",
      role: "authenticated",
      email: "redacted@example.invalid",
      app_metadata: {},
      user_metadata: {},
      identities: [],
      created_at: "2026-01-01T00:00:00.000Z"
    }
  };
}

function staleSession() {
  return {
    ...sessionFor(0),
    access_token: "expired-access",
    refresh_token: "expired-refresh",
    expires_at: Math.floor(Date.now() / 1000) - 60
  };
}

function installCredentialGet(handler) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      credentials: {
        create: async () => new MockPublicKeyCredential(),
        get: handler
      }
    }
  });
}

function createClient({ storage, fetch, autoInitialize = false }) {
  return new GoTrueClient({
    url: AUTH_URL,
    headers: { apikey: "public-anon-test-key" },
    storageKey: storage.storageKey,
    storage,
    persistSession: true,
    autoRefreshToken: autoInitialize,
    detectSessionInUrl: false,
    skipAutoInitialize: !autoInitialize,
    experimental: { passkey: true },
    fetch
  });
}

async function settle() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

// Exact installed-SDK regression: an obsolete initialization refresh must not
// delete a newer Passkey session that completed while the refresh was in flight.
{
  const storage = createStorage(staleSession());
  const refreshStarted = deferred();
  const finishRefresh = deferred();
  const events = [];
  const calls = { options: 0, get: 0, verify: 0, refresh: 0 };

  installCredentialGet(async ({ signal }) => {
    calls.get += 1;
    assert.equal(signal?.aborted, false);
    return new MockPublicKeyCredential();
  });

  const client = createClient({
    storage,
    autoInitialize: true,
    fetch: async (url) => {
      if (url.includes("grant_type=refresh_token")) {
        calls.refresh += 1;
        refreshStarted.resolve();
        await finishRefresh.promise;
        return jsonResponse({ code: "refresh_token_not_found", message: "Invalid Refresh Token" }, 400);
      }
      if (url.endsWith("/passkeys/authentication/options")) {
        calls.options += 1;
        return jsonResponse({ challenge_id: "challenge-first", options: { challenge: "AQ", userVerification: "required" } });
      }
      if (url.endsWith("/passkeys/authentication/verify")) {
        calls.verify += 1;
        return jsonResponse(sessionFor(1));
      }
      throw new Error(`Unexpected request: ${url}`);
    }
  });
  client.onAuthStateChange((event) => { events.push(event); });

  await refreshStarted.promise;
  const first = await client.signInWithPasskey({ options: { signal: new AbortController().signal } });
  assert.equal(first.error, null);
  assert.ok(first.data.session);
  assert.equal(storage.hasSession(), true, "verify must persist the returned session before stale refresh completes");

  finishRefresh.resolve();
  await client.initialize();
  await settle();
  const afterFirst = await client.getSession();
  await client.stopAutoRefresh();

  assert.ok(events.includes("SIGNED_IN"));
  if (!afterFirst.data.session) {
    const second = await client.signInWithPasskey({ options: { signal: new AbortController().signal } });
    const afterSecond = await client.getSession();
    assert.equal(second.error, null);
    assert.ok(second.data.session);
    assert.ok(afterSecond.data.session);
    assert.fail("FIRST ATTEMPT LOST, SECOND ATTEMPT SUCCEEDED: stale refresh removed the first Passkey session");
  }
  assert.deepEqual(calls, { options: 1, get: 1, verify: 1, refresh: 1 });
  assert.ok(afterFirst.data.session, "a stale refresh must not remove the newer Passkey session");
  await client.dispose();
}

// Thirty independent logged-out cycles: one call, one ceremony, one verify,
// a persisted session, then a complete local logout back to session=null.
{
  const storage = createStorage();
  const calls = { options: 0, get: 0, verify: 0 };
  const authUpdates = new Set();
  let cycle = 0;
  installCredentialGet(async ({ signal }) => {
    calls.get += 1;
    assert.equal(signal?.aborted, false);
    if (cycle % 3 === 0) await settle();
    return new MockPublicKeyCredential();
  });
  const client = createClient({
    storage,
    fetch: async (url) => {
      if (url.endsWith("/passkeys/authentication/options")) {
        calls.options += 1;
        if (cycle % 5 === 0) await settle();
        return jsonResponse({ challenge_id: `challenge-${cycle}`, options: { challenge: "AQ", userVerification: "required" } });
      }
      if (url.endsWith("/passkeys/authentication/verify")) {
        calls.verify += 1;
        if (cycle % 7 === 0) await settle();
        return jsonResponse(sessionFor(cycle));
      }
      if (url.includes("/logout?scope=local")) return new Response(null, { status: 204 });
      throw new Error(`Unexpected request: ${url}`);
    }
  });
  client.onAuthStateChange((event) => {
    if (event !== "SIGNED_IN") return;
    if (cycle % 2 === 0) {
      setImmediate(() => authUpdates.add(cycle));
    } else {
      authUpdates.add(cycle);
    }
  });

  for (cycle = 1; cycle <= 30; cycle += 1) {
    const before = await client.getSession();
    assert.equal(before.data.session, null);
    const result = await client.signInWithPasskey({ options: { signal: new AbortController().signal } });
    assert.equal(result.error, null);
    assert.ok(result.data.session);
    if (cycle % 2 === 0) assert.equal(authUpdates.has(cycle), false);
    await settle();
    assert.equal(authUpdates.has(cycle), true);
    const persisted = await client.getSession();
    assert.ok(persisted.data.session);
    const logout = await client.signOut({ scope: "local" });
    assert.equal(logout.error, null);
    const afterLogout = await client.getSession();
    assert.equal(afterLogout.data.session, null);
  }

  assert.deepEqual(calls, { options: 30, get: 30, verify: 30 });
  await client.dispose();
}

// Abort timing contract of the installed high-level wrapper.
// Options in flight -> abort: options is not cancelled by the external signal,
// but get() receives the already-aborted signal and verify is never sent.
{
  const storage = createStorage();
  const optionsStarted = deferred();
  const finishOptions = deferred();
  let getCalls = 0;
  let verifyCalls = 0;
  installCredentialGet(async ({ signal }) => {
    getCalls += 1;
    assert.equal(signal.aborted, true);
    throw new DOMException("Aborted", "AbortError");
  });
  const client = createClient({
    storage,
    fetch: async (url) => {
      if (url.endsWith("/passkeys/authentication/options")) {
        optionsStarted.resolve();
        await finishOptions.promise;
        return jsonResponse({ challenge_id: "abort-options", options: { challenge: "AQ" } });
      }
      if (url.endsWith("/passkeys/authentication/verify")) { verifyCalls += 1; return jsonResponse(sessionFor(39)); }
      throw new Error(`Unexpected request: ${url}`);
    }
  });
  const controller = new AbortController();
  const pending = client.signInWithPasskey({ options: { signal: controller.signal } });
  await optionsStarted.promise;
  controller.abort();
  finishOptions.resolve();
  const result = await pending;
  assert.ok(result.error);
  assert.equal(getCalls, 1);
  assert.equal(verifyCalls, 0);
  assert.equal((await client.getSession()).data.session, null);
  await client.dispose();
}

// get() in flight -> abort.
{
  const storage = createStorage();
  let verifyCalls = 0;
  const getStarted = deferred();
  installCredentialGet(({ signal }) => new Promise((resolve, reject) => {
    getStarted.resolve();
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  }));
  const client = createClient({
    storage,
    fetch: async (url) => {
      if (url.endsWith("/passkeys/authentication/options")) return jsonResponse({ challenge_id: "abort-get", options: { challenge: "AQ" } });
      if (url.endsWith("/passkeys/authentication/verify")) { verifyCalls += 1; return jsonResponse(sessionFor(40)); }
      throw new Error(`Unexpected request: ${url}`);
    }
  });
  const controller = new AbortController();
  const pending = client.signInWithPasskey({ options: { signal: controller.signal } });
  await getStarted.promise;
  controller.abort();
  const result = await pending;
  assert.ok(result.error);
  assert.equal(verifyCalls, 0);
  assert.equal((await client.getSession()).data.session, null);
  await client.dispose();
}

// get() has resolved -> abort synchronously during serialization: the signal
// cannot cancel serialization or the following verify request.
{
  const storage = createStorage();
  const controller = new AbortController();
  let verifyCalls = 0;
  installCredentialGet(async () => {
    const credential = new MockPublicKeyCredential();
    credential.getClientExtensionResults = () => {
      controller.abort();
      return {};
    };
    return credential;
  });
  const client = createClient({
    storage,
    fetch: async (url) => {
      if (url.endsWith("/passkeys/authentication/options")) return jsonResponse({ challenge_id: "abort-after-resolve", options: { challenge: "AQ" } });
      if (url.endsWith("/passkeys/authentication/verify")) { verifyCalls += 1; return jsonResponse(sessionFor(40)); }
      throw new Error(`Unexpected request: ${url}`);
    }
  });
  const result = await client.signInWithPasskey({ options: { signal: controller.signal } });
  assert.equal(controller.signal.aborted, true);
  assert.equal(verifyCalls, 1);
  assert.equal(result.error, null);
  assert.ok((await client.getSession()).data.session);
  await client.dispose();
}

// Verify in flight -> abort: verify has no external signal and completes.
{
  const storage = createStorage();
  const verifyStarted = deferred();
  const finishVerify = deferred();
  installCredentialGet(async () => new MockPublicKeyCredential());
  const client = createClient({
    storage,
    fetch: async (url) => {
      if (url.endsWith("/passkeys/authentication/options")) return jsonResponse({ challenge_id: "abort-after-get", options: { challenge: "AQ" } });
      if (url.endsWith("/passkeys/authentication/verify")) {
        verifyStarted.resolve();
        await finishVerify.promise;
        return jsonResponse(sessionFor(41));
      }
      throw new Error(`Unexpected request: ${url}`);
    }
  });
  const controller = new AbortController();
  const pending = client.signInWithPasskey({ options: { signal: controller.signal } });
  await verifyStarted.promise;
  controller.abort();
  finishVerify.resolve();
  const result = await pending;
  assert.equal(result.error, null);
  assert.ok(result.data.session);
  controller.abort();
  assert.ok((await client.getSession()).data.session);
  await client.dispose();
}

// Enrollment uses the same bounded WebAuthn signal, but not the stale-refresh
// session replacement path. Its first create + verify remains successful.
{
  const storage = createStorage(sessionFor(50));
  const calls = { options: 0, create: 0, verify: 0 };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      credentials: {
        get: async () => new MockPublicKeyCredential(),
        create: async ({ signal }) => {
          calls.create += 1;
          assert.equal(signal.aborted, false);
          return new MockPublicKeyCredential();
        }
      }
    }
  });
  const client = createClient({
    storage,
    fetch: async (url) => {
      if (url.endsWith("/passkeys/registration/options")) {
        calls.options += 1;
        return jsonResponse({
          challenge_id: "registration-first",
          options: {
            challenge: "AQ",
            rp: { name: "Stamio", id: "stamio.fr" },
            user: { id: "AQ", name: "redacted", displayName: "redacted" },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }]
          }
        });
      }
      if (url.endsWith("/passkeys/registration/verify")) {
        calls.verify += 1;
        return jsonResponse({ id: "passkey-record", friendly_name: "iCloud Keychain", created_at: "2026-01-01T00:00:00.000Z" });
      }
      throw new Error(`Unexpected request: ${url}`);
    }
  });
  const controller = new AbortController();
  const result = await client.registerPasskey({ options: { signal: controller.signal } });
  controller.abort();
  assert.equal(result.error, null);
  assert.equal(result.data?.id, "passkey-record");
  assert.deepEqual(calls, { options: 1, create: 1, verify: 1 });
  assert.ok((await client.getSession()).data.session);
  await client.dispose();
}

console.log("Passkey first-attempt checks passed: 30/30 FIRST ATTEMPT SUCCESS.");
