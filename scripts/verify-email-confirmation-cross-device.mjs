import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  SIGNUP_CONFIRMATION_ACTIVE_WINDOW_MS,
  SIGNUP_CONFIRMATION_POLL_INTERVAL_MS,
  SIGNUP_RESUME_TOKEN_TTL_MS,
  clearSignupCredentials,
  createSignupResumeChallenge,
  createSignupResumeToken,
  getSignupCredentials,
  readSignupResumeUserId,
  rememberSignupCredentials
} from "../lib/auth/signupResume.ts";
import { PENDING_SIGNUP_TTL_MS, getSetupCompleteDestination } from "../lib/auth/signupCompletionPolicy.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const signup = read("components/SignupForm.tsx");
const verifyEmail = read("app/auth/verify-email.tsx");
const callback = read("app/auth/callback.tsx");
const enrollment = read("app/auth/passkey-enrollment.tsx");
const api = read("lib/api.ts");
const pendingSignup = read("lib/auth/pendingSignup.ts");
const resume = read("lib/auth/signupResume.ts");
const edge = read("supabase/functions/check-signup-email/index.ts");
const template = read("emails/auth/confirmation.html");
const preview = read("emails/previews/confirmation-preview.html");

const edgeSyntax = ts.transpileModule(edge, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true
});
assert.deepEqual(
  (edgeSyntax.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error),
  [],
  "L'Edge Function doit rester syntaxiquement valide"
);

assert.equal(SIGNUP_CONFIRMATION_POLL_INTERVAL_MS, 4_000, "Le polling doit rester à quatre secondes");
assert.equal(SIGNUP_CONFIRMATION_ACTIVE_WINDOW_MS, 15 * 60 * 1000, "La vérification automatique doit être bornée");
assert.equal(SIGNUP_RESUME_TOKEN_TTL_MS, 24 * 60 * 60 * 1000, "Le token opaque doit rester valable 24 heures");
assert.equal(PENDING_SIGNUP_TTL_MS, 24 * 60 * 60 * 1000, "Le contexte pending signup doit rester valable 24 heures");
const challenge = await createSignupResumeChallenge();
assert.ok(challenge, "Un navigateur Web Crypto doit pouvoir créer un challenge de reprise");
assert.match(challenge.secret, /^[a-f0-9]{64}$/);
assert.match(challenge.secretHash, /^[a-f0-9]{64}$/);
assert.notEqual(challenge.secret, challenge.secretHash, "Le secret brut ne doit jamais être placé dans les métadonnées Auth");
const testUserId = "11111111-1111-4111-8111-111111111111";
const resumeToken = createSignupResumeToken(testUserId, challenge.secret);
assert.ok(resumeToken);
assert.equal(readSignupResumeUserId(resumeToken), testUserId);
assert.equal(readSignupResumeUserId(`${testUserId}.secret-court`), null);

rememberSignupCredentials(" PERSONNE@EXAMPLE.COM ", "mot-de-passe-volatil");
assert.equal(getSignupCredentials("personne@example.com")?.password, "mot-de-passe-volatil");
clearSignupCredentials();
assert.equal(getSignupCredentials("personne@example.com"), null);
assert.doesNotMatch(resume, /localStorage|sessionStorage|AsyncStorage|indexedDB|document\.cookie/i, "Le mot de passe doit rester uniquement en mémoire de module");

assert.match(signup, /createSignupResumeChallenge\(\)[\s\S]*?signUpUser\([\s\S]*?resumeChallenge\)/, "Le challenge doit être lié à la création Auth");
assert.match(signup, /createSignupResumeToken\(signupData\.user\.id, resumeChallenge\.secret\)/, "Le token doit combiner l'identité créée et un secret haute entropie");
assert.match(signup, /rememberSignupCredentials\(normalizedEmail, password\)/, "La reprise automatique peut garder les credentials uniquement en mémoire");
assert.match(signup, /markPendingSignup\(resumeToken\)[\s\S]*?router\.replace\(\{ pathname: "\/auth\/verify-email", params: \{ email: normalizedEmail \} \}/, "Le token ne doit pas entrer dans l'URL de reprise");
assert.doesNotMatch(signup, /params:\s*\{[^}]*resume|localStorage[^\n]*password|sessionStorage[^\n]*password/i);
assert.match(api, /signup_resume_secret_hash: resumeChallenge\.secretHash/);
assert.doesNotMatch(api, /signup_resume_secret:\s*resumeChallenge\.secret/, "Le secret brut ne doit pas être envoyé comme metadata");
assert.match(api, /checkSignupConfirmation\(resumeToken: string\)[\s\S]*?body: \{ resume_token: resumeToken \}/, "Le status cross-device ne doit recevoir que le token opaque");
assert.match(pendingSignup, /resumeToken\?: string[\s\S]*?localStorage|resumeToken/, "Le navigateur initiateur doit conserver seulement le token opaque");

assert.match(verifyEmail, /setTimeout\(poll, SIGNUP_CONFIRMATION_POLL_INTERVAL_MS\)/, "Le polling doit être séquentiel et non concurrent");
assert.match(verifyEmail, /if \(checkingRef\.current\) return/, "Une seule vérification doit être active à la fois");
assert.match(verifyEmail, /terminalRef\.current = true[\s\S]*?clearSignupCredentials\(\)/, "Le polling et les credentials doivent devenir terminaux après confirmation ou expiration");
assert.match(verifyEmail, /Date\.now\(\) - pollingStartedAtRef\.current >= SIGNUP_CONFIRMATION_ACTIVE_WINDOW_MS/);
const permanentExpiryStart = verifyEmail.indexOf('confirmation.status === "expired" || confirmation.status === "invalid"');
const permanentExpiryEnd = verifyEmail.indexOf('if (confirmation.status !== "confirmed")', permanentExpiryStart);
const permanentExpiryBranch = verifyEmail.slice(permanentExpiryStart, permanentExpiryEnd);
assert.match(permanentExpiryBranch, /terminalRef\.current = true[\s\S]*?clearSignupCredentials\(\)[\s\S]*?clearPendingSignup\(\)/, "Un token réellement expiré ou invalide doit supprimer tout le contexte inutilisable");
assert.doesNotMatch(permanentExpiryBranch, /restartPendingSignupWindow/, "Un challenge définitivement invalide ne doit jamais être réactivé");
assert.match(permanentExpiryBranch, /setRequiresRestart\(true\)/, "L'utilisateur doit recevoir une sortie claire vers inscription ou connexion");
const activeExpiryStart = verifyEmail.indexOf("Date.now() - pollingStartedAtRef.current >= SIGNUP_CONFIRMATION_ACTIVE_WINDOW_MS");
const activeExpiryEnd = verifyEmail.indexOf("await checkConfirmation", activeExpiryStart);
const activeExpiryBranch = verifyEmail.slice(activeExpiryStart, activeExpiryEnd);
assert.match(activeExpiryBranch, /terminalRef\.current = true[\s\S]*?clearSignupCredentials\(\)/, "La fin des 15 minutes doit arrêter le polling et effacer le mot de passe");
assert.doesNotMatch(activeExpiryBranch, /clearPendingSignup(?:ResumeToken)?\(\)/, "La fin de la fenêtre active ne doit pas supprimer le contexte opaque 24 h");
assert.equal(
  getSetupCompleteDestination({ hasSession: false, userValidated: false, emailConfirmed: false, passkeyEnrolled: false, markerValid: false, pendingSignupValid: true }),
  "/auth/verify-email",
  "Un marker résiduel sans session provoquerait une redirection vers verify-email et doit donc être supprimé après invalidation définitive"
);
assert.match(verifyEmail, /document\.addEventListener\("visibilitychange", recheckWhenVisible\)/);
assert.match(verifyEmail, /document\.removeEventListener\("visibilitychange", recheckWhenVisible\)/);
assert.match(verifyEmail, /window\.addEventListener\("focus", recheckWhenVisible\)/);
assert.match(verifyEmail, /window\.removeEventListener\("focus", recheckWhenVisible\)/);
assert.match(verifyEmail, /if \(timer\) clearTimeout\(timer\)/, "Le timer doit être nettoyé à l'unmount");
assert.match(verifyEmail, /label=\{requiresRestart \? "Se connecter" : requiresLogin \? "Se connecter pour continuer" : "J’ai vérifié mon email"\}/, "Le bouton manuel doit rester disponible tant que la reprise est valide");

const remoteStatusIndex = verifyEmail.indexOf("await checkSignupConfirmation(resumeToken)");
const localSignInIndex = verifyEmail.indexOf("await signInUser(credentials.email, credentials.password)");
const remoteUserCheckIndex = verifyEmail.indexOf("await supabase.auth.getUser()", localSignInIndex);
const passkeyAfterRemoteIndex = verifyEmail.indexOf('router.replace("/auth/passkey-enrollment?flow=signup"', localSignInIndex);
assert.ok(remoteStatusIndex >= 0 && localSignInIndex > remoteStatusIndex, "La confirmation distante doit précéder une authentification locale légitime");
assert.ok(remoteUserCheckIndex > localSignInIndex && passkeyAfterRemoteIndex > remoteUserCheckIndex, "La session et l'utilisateur confirmé doivent être revérifiés avant Passkey");
assert.match(verifyEmail, /setRequiresLogin\(true\)[\s\S]*?router\.replace\("\/auth\/login"/, "Sans session ou credentials en mémoire, une connexion locale doit être exigée");
assert.match(enrollment, /if \(!user \|\| !emailVerified\)[\s\S]*?router\.replace\("\/auth\/login"/, "L'enrôlement Passkey doit toujours exiger une session confirmée");

assert.match(callback, /verifyOtp\(\{ token_hash: token, type: "email" \}\)/, "Le fast path token_hash sans PKCE doit rester présent");
assert.match(callback, /hasPendingSignupForUser\(data\.user\.id\)[\s\S]*?router\.replace\("\/auth\/passkey-enrollment\?flow=signup"/, "Le navigateur initiateur doit conserver son fast path");
const sameBrowserStart = callback.indexOf("if (hasPendingSignupForUser(data.user.id))");
const sameBrowserEnd = callback.indexOf("await supabase.auth.signOut", sameBrowserStart);
const sameBrowserBranch = callback.slice(sameBrowserStart, sameBrowserEnd);
assert.match(sameBrowserBranch, /clearSignupCredentials\(\)[\s\S]*?clearPendingSignupResumeToken\(\)[\s\S]*?router\.replace\("\/auth\/passkey-enrollment\?flow=signup"/, "Le fast path doit effacer password et token tout en conservant le marker d'onboarding");
assert.doesNotMatch(sameBrowserBranch, /clearPendingSignup\(\)/, "Le marker d'onboarding doit survivre jusqu'à la fin de la Passkey");
assert.match(callback, /signOut\(\{ scope: "local" \}\)[\s\S]*?setConfirmedElsewhere\(true\)/, "Le navigateur secondaire doit fermer seulement sa session locale temporaire");
assert.match(callback, /Vous pouvez revenir sur l’appareil où vous avez commencé votre inscription\./);
assert.doesNotMatch(callback, /BroadcastChannel|postMessage|localStorage\.setItem|sessionStorage\.setItem/, "Le navigateur secondaire ne doit transférer aucun token ou session");

const resumeBranchStart = edge.indexOf("if (resumeToken)");
const resumeBranchEnd = edge.indexOf("const email =", resumeBranchStart);
const resumeBranch = edge.slice(resumeBranchStart, resumeBranchEnd);
assert.match(resumeBranch, /parseResumeToken\(resumeToken\)/);
assert.match(resumeBranch, /admin\.auth\.admin\.getUserById\(parsed\.userId\)/);
assert.match(resumeBranch, /sha256Hex\(parsed\.secret\)[\s\S]*?constantTimeEqual\(expectedHash, presentedHash\)/);
assert.match(resumeBranch, /email_confirmed_at \? "confirmed" : "pending"/);
assert.match(resumeBranch, /consume_rate_limit/);
assert.doesNotMatch(resumeBranch, /body\?\.email|p_email|get_signup_email_status/, "Le status de reprise ne doit permettre aucun lookup arbitraire par email");
assert.doesNotMatch(resumeBranch, /access_token|refresh_token|session:/, "Le status ne doit jamais renvoyer une session");

for (const emailHtml of [template, preview]) {
  assert.doesNotMatch(emailHtml, /même navigateur|mÃªme navigateur/i, "L'ancienne contrainte même navigateur doit disparaître");
  assert.match(emailHtml, /<strong[^>]*>Important :<\/strong> ce lien est valable pendant 15 minutes\./, "La durée Email OTP vérifiée doit être annoncée exactement");
  assert.match(emailHtml, /Confirmer mon adresse email/);
  assert.match(emailHtml, /v:roundrect[\s\S]*?height:48px[\s\S]*?v-text-anchor:middle[\s\S]*?fillcolor="#1C6E8C"/, "Outlook desktop doit recevoir un bouton VML de 48 px");
  assert.match(emailHtml, /\[if !mso\][\s\S]*?padding:16px 0/, "Le fallback Gmail et Apple Mail validé doit rester intact");
}
assert.match(template, /\{\{ \.SiteURL \}\}\/auth\/callback\?token_hash=\{\{ \.TokenHash \}\}&amp;type=email/, "L'URL dynamique token_hash doit rester intacte");
assert.doesNotMatch(template, /preview-token|token_hash=[A-Za-z0-9_-]{20,}/, "Aucun token réel ne doit être hardcodé");

const changedFiles = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.slice(3).replaceAll("\\", "/"));
assert.ok(!changedFiles.some((path) => path.startsWith("supabase/migrations/")), "Aucune migration n'est nécessaire");
assert.ok(!changedFiles.some((path) => /(?:Vote|Poll|Discussion|Home|Hero|admin)/i.test(path)), "Le correctif doit rester strictement Auth/email");

console.log("Cross-device email confirmation verification passed: opaque resume status, bounded polling, local-session gate, secondary callback, and Outlook-safe email are preserved.");
