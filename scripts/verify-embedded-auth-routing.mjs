import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

async function loadPureTypeScriptModule(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const {
  detectEmbeddedBrowser,
  ensurePasskeyCeremonyAllowed,
  getAuthContinueHref,
  getAuthDestination,
  getPasskeyEnrollmentResumeHref
} = await loadPureTypeScriptModule("lib/auth/embeddedBrowser.ts");

const userAgents = {
  instagramIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.0.0",
  instagramAndroid: "Mozilla/5.0 (Linux; Android 15; Pixel 9 Build/AP3A; wv) AppleWebKit/537.36 Chrome/138.0.0.0 Mobile Safari/537.36 Instagram 390.0.0.0.0 Android",
  twitterIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Twitter for iPhone",
  twitterAndroid: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/138.0.0.0 Mobile Safari/537.36 TwitterAndroid",
  tiktokIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 TikTok 40.0.0",
  tiktokAndroid: "Mozilla/5.0 (Linux; Android 15; Pixel 9; wv) AppleWebKit/537.36 Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36 musical_ly_202400",
  facebookIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/525.0.0.0.0]",
  facebookAndroid: "Mozilla/5.0 (Linux; Android 15; Pixel 9; wv) AppleWebKit/537.36 Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/525.0.0.0.0]",
  androidWebView: "Mozilla/5.0 (Linux; Android 15; Pixel 9 Build/AP3A; wv) AppleWebKit/537.36 Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36",
  iosWebView: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  safariIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
  chromeIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.156 Mobile/15E148 Safari/604.1",
  chromeDesktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
};

for (const key of ["instagramIos", "instagramAndroid"]) {
  assert.deepEqual(detectEmbeddedBrowser(userAgents[key]), { isEmbedded: true, app: "instagram" });
}
for (const key of ["twitterIos", "twitterAndroid"]) {
  assert.deepEqual(detectEmbeddedBrowser(userAgents[key]), { isEmbedded: true, app: "twitter" });
}
for (const key of ["tiktokIos", "tiktokAndroid"]) {
  assert.deepEqual(detectEmbeddedBrowser(userAgents[key]), { isEmbedded: true, app: "tiktok" });
}
for (const key of ["facebookIos", "facebookAndroid"]) {
  assert.deepEqual(detectEmbeddedBrowser(userAgents[key]), { isEmbedded: true, app: "facebook" });
}
assert.deepEqual(detectEmbeddedBrowser(userAgents.androidWebView), { isEmbedded: true, app: "android-webview" });
assert.deepEqual(detectEmbeddedBrowser(userAgents.iosWebView), { isEmbedded: true, app: "ios-webview" });
for (const key of ["safariIos", "chromeIos", "chromeDesktop"]) {
  assert.deepEqual(detectEmbeddedBrowser(userAgents[key]), { isEmbedded: false, app: null });
}

assert.equal(getAuthContinueHref("signup"), "/auth/continue?next=signup");
assert.equal(getAuthContinueHref("signin"), "/auth/continue?next=signin");
assert.equal(getAuthDestination("signup"), "/auth/signup");
assert.equal(getAuthDestination("signin"), "/auth/login");
assert.equal(getPasskeyEnrollmentResumeHref({}), "/auth/passkey-enrollment");
assert.equal(
  getPasskeyEnrollmentResumeHref({ flow: "signup", next: "/poll/question-1" }),
  "/auth/passkey-enrollment?flow=signup&next=%2Fpoll%2Fquestion-1"
);

let createCalls = 0;
assert.throws(() => {
  ensurePasskeyCeremonyAllowed(userAgents.instagramIos);
  createCalls += 1;
}, /embedded_browser_blocked/);
assert.equal(createCalls, 0, "Instagram ne doit jamais atteindre navigator.credentials.create");

let getCalls = 0;
assert.throws(() => {
  ensurePasskeyCeremonyAllowed(userAgents.twitterAndroid);
  getCalls += 1;
}, /embedded_browser_blocked/);
assert.equal(getCalls, 0, "X/Twitter ne doit jamais atteindre navigator.credentials.get");

const faceIdCancellation = Object.assign(new Error("The operation was cancelled"), { name: "NotAllowedError" });
assert.throws(() => {
  ensurePasskeyCeremonyAllowed(userAgents.safariIos);
  throw faceIdCancellation;
}, (error) => error === faceIdCancellation, "Safari doit laisser remonter l'annulation WebAuthn inchangée");

const signupRoute = read("app/auth/signup.tsx");
const loginRoute = read("app/auth/login.tsx");
const continueRoute = read("app/auth/continue.tsx");
const enrollmentRoute = read("app/auth/passkey-enrollment.tsx");
const interstitial = read("components/AuthBrowserGate.tsx");
const passkeys = read("lib/auth/passkeys.ts");

assert.match(signupRoute, /<AuthBrowserGate next="signup">[\s\S]*?<SignupForm \/>/);
assert.match(loginRoute, /<AuthBrowserGate next="signin">[\s\S]*?<LoginForm \/>/);
assert.match(continueRoute, /normalizeAuthDestination\(rawNext\)[\s\S]*?<Redirect href=\{getAuthDestination\(next\)\}/);
assert.match(enrollmentRoute, /<AuthBrowserGate resumeHref=\{getPasskeyEnrollmentResumeHref\(\{ flow, next \}\)\}>[\s\S]*?<PasskeyEnrollmentContent \/>/);
assert.doesNotMatch(enrollmentRoute, /<AuthBrowserGate next="signin">/);
assert.match(interstitial, /if \(!detection\.isEmbedded\) return <>\{props\.children\}<\/>;/);
assert.match(interstitial, /"resumeHref" in props[\s\S]*?props\.resumeHref[\s\S]*?getAuthContinueHref\(props\.next\)/);
for (const text of [
  "Continuez dans votre navigateur",
  "Pour créer votre clé d'accès avec Face ID ou votre appareil, ouvrez Stamio dans Safari, Chrome ou votre navigateur habituel.",
  "Continuer dans mon navigateur",
  "Si rien ne s'ouvre, touchez ••• puis « Ouvrir dans le navigateur ».",
  "Si Stamio reste ouvert dans Instagram, touchez ••• puis « Ouvrir dans le navigateur »."
]) {
  assert.ok(interstitial.includes(text), `Texte interstitiel manquant : ${text}`);
}
assert.match(interstitial, /window\.open\(url\.toString\(\), "_blank", "noopener,noreferrer"\)/);
assert.ok(interstitial.indexOf("setOpenAttempted(true)") < interstitial.indexOf("window.open("));
assert.doesNotMatch(interstitial, /x-safari-https|custom scheme|location\.(?:assign|replace)|useEffect/);
assert.doesNotMatch(signupRoute, /Redirect|getAuthContinueHref/);
assert.doesNotMatch(loginRoute, /Redirect|getAuthContinueHref/);

const registerGuard = passkeys.indexOf("ensurePasskeyCeremonyAllowed();", passkeys.indexOf("export async function registerPasskey"));
const registerCall = passkeys.indexOf("supabase.auth.registerPasskey", passkeys.indexOf("export async function registerPasskey"));
const signinGuard = passkeys.indexOf("ensurePasskeyCeremonyAllowed();", passkeys.indexOf("export async function signInWithPasskey"));
const signinCall = passkeys.indexOf("supabase.auth.signInWithPasskey", passkeys.indexOf("export async function signInWithPasskey"));
assert.ok(registerGuard >= 0 && registerGuard < registerCall, "Le garde doit précéder la création Passkey");
assert.ok(signinGuard >= 0 && signinGuard < signinCall, "Le garde doit précéder la connexion Passkey");

console.log("Embedded auth routing verification passed: social WebViews are gated, normal browsers resume existing auth, and WebAuthn is protected.");
