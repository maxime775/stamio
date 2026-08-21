import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import ts from "typescript";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const loadPureTypeScriptModule = async (path) => {
  const output = ts.transpileModule(read(path), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
};
const failures = [];
const signup = read("components/SignupForm.tsx");
const signupEmailCheck = read("supabase/functions/check-signup-email/index.ts");
const verifyEmail = read("app/auth/verify-email.tsx");
const callback = read("app/auth/callback.tsx");
const enrollment = read("app/auth/passkey-enrollment.tsx");
const passkeyEnrollmentSync = read("lib/auth/passkeyEnrollmentSync.ts");
const setupComplete = read("app/auth/setup-complete.tsx");
const heroActionButton = read("components/HeroActionButton.tsx");
const home = read("app/index.tsx");
const login = read("components/LoginForm.tsx");
const authFields = read("components/AuthFields.tsx");
const authForm = read("components/AuthForm.tsx");
const professionSelect = read("components/ProfessionSelect.tsx");
const regionSelect = read("components/RegionSelect.tsx");
const votePanel = read("components/VotePanel.tsx");
const modalCloseButton = read("components/ModalCloseButton.tsx");
const pollScreen = read("app/poll/[pollId].tsx");
const appHeader = read("components/AppHeader.tsx");
const signupCompletion = read("lib/auth/signupCompletion.ts");
const pendingSignup = read("lib/auth/pendingSignup.ts");
const signupCompletionPolicy = read("lib/auth/signupCompletionPolicy.ts");
const votePanelState = read("lib/votePanelState.ts");
const api = read("lib/api.ts");
const informations = read("app/account/informations.tsx");
const vote = read("supabase/functions/submit-vote/index.ts");
const migration = read("supabase/migrations/20260727120000_passkey_auth.sql");
const security = read("app/account/security.tsx");
const passkeyManagement = read("components/PasskeyManagementSection.tsx");
const account = read("app/account/index.tsx");
const themes = read("app/themes/index.tsx");
const themePolls = read("components/ThemePollsPage.tsx");

for (const field of ["email", "confirmEmail", "password", "confirmPassword", "username", "sex", "age", "profession", "region"]) {
  if (!signup.includes(field)) failures.push(`signup field missing: ${field}`);
}
if (!signup.includes("checkSignupEmail") || !signup.includes("existing_confirmed") || !signup.includes("existing_unconfirmed")) failures.push("signup must check the server email status before signUp");
if (signup.indexOf("checkSignupEmail(normalizedEmail)") > signup.indexOf("signUpUser({")) failures.push("email availability must be checked before signUp");
if (!signup.includes("setEmail(\"\")") || !signup.includes("setPassword(\"\")") || !signup.includes("setUsername")) failures.push("existing-email return must preserve profile fields and clear credentials only");
for (const field of ["email", "confirmEmail", "password", "confirmPassword"]) {
  if (!signup.includes(`${field}: false`)) failures.push(`existing-email return must reset validation state for ${field}`);
}
if (!signup.includes("focusEmailAfterReturn.current = true") || !signup.includes("focus({ preventScroll: true })")) failures.push("existing-email return must focus email after render without scrolling");
if (/params:\s*\{[^}]*existingEmailState/s.test(signup)) failures.push("existing email state must never be placed in the URL");
if (!signup.includes("markPendingSignup()") || signup.indexOf("markPendingSignup()") < signup.indexOf("if (signupError)") || signup.indexOf("markPendingSignup()") > signup.indexOf('router.replace({ pathname: "/auth/verify-email"')) {
  failures.push("pending signup marker must be created only after accepted signup and immediately before verify-email");
}
if (!signupEmailCheck.includes("consume_rate_limit") || !signupEmailCheck.includes("EMAIL_LOOKUP_SECRET")) failures.push("signup email lookup must use persistent server-side rate limiting");
if (!callback.includes("token_hash") || !callback.includes('type: "email"') || !callback.includes("onPress={confirmEmail}")) failures.push("email callback must verify token_hash only after a click");
if (callback.includes("exchangeCodeForSession") || /useEffect[\s\S]{0,500}verifyOtp/.test(callback)) failures.push("email callback must not auto-consume or use PKCE");
if (!callback.includes("/auth/passkey-enrollment?flow=signup")) failures.push("email callback must preserve the signup flow through passkey enrollment");
if (verifyEmail.includes("/auth/login")) failures.push("verified-email action must not redirect to login");
for (const check of ["getSession()", "getUser()", "email_confirmed_at", "visibilitychange", "onAuthStateChange", "subscription.unsubscribe()", "/auth/passkey-enrollment?flow=signup"]) {
  if (!verifyEmail.includes(check)) failures.push(`verified-email session check missing: ${check}`);
}
for (const check of ["announceAfterCheckRef", "navigateAfterCheckRef", "navigatedRef", "if (checkingRef.current) return"]) {
  if (!verifyEmail.includes(check)) failures.push(`verified-email single-flight coordination missing: ${check}`);
}
if (!verifyEmail.includes("La confirmation de votre adresse n’est pas encore détectée. Ouvrez le lien reçu par email, puis réessayez dans quelques instants.")) {
  failures.push("verified-email pending confirmation message is missing");
}
if (!enrollment.includes("onPress={enroll}") || enrollment.includes("useEffect(() => registerPasskey")) failures.push("passkey registration must require a click");
if (!enrollment.includes('Platform.OS !== "web"')) failures.push("native binary limitation must be explicit");
if (!enrollment.includes("HeroActionButton") || !enrollment.includes('alignItems: "center"') || !enrollment.includes('textAlign: "center"')) failures.push("passkey enrollment must match the centered auth tunnel and shared hero CTA");
if (!enrollment.includes('flow === "signup"') || !enrollment.includes("markSignupEnrollmentComplete(user.id)") || !enrollment.includes('"/auth/setup-complete"') || !enrollment.includes("router.replace(safeNext(next))")) {
  failures.push("passkey enrollment must route signup to setup completion while preserving existing enrollment destinations");
}
for (const check of [
  "createPasskeyEnrollmentTabId()",
  "subscribeToPasskeyEnrollmentSync(",
  "syncSubscription.current?.publishSuccess()",
  "verifyExternalEnrollment",
  'router.replace("/" as Href)',
  'document.addEventListener("visibilitychange"',
  'document.removeEventListener("visibilitychange"',
  "subscription.cleanup()"
]) {
  if (!enrollment.includes(check)) failures.push(`signup passkey cross-tab coordination missing: ${check}`);
}
if (enrollment.indexOf("if (!result.enrolled)") > enrollment.indexOf("syncSubscription.current?.publishSuccess()")) {
  failures.push("passkey completion must be verified before a cross-tab success event is published");
}
if (enrollment.indexOf("completedInThisTab.current = true") > enrollment.indexOf("syncSubscription.current?.publishSuccess()")) {
  failures.push("the initiating passkey tab must become terminal before publishing success");
}
if ((enrollment.match(/publishSuccess\(\)/g) ?? []).length !== 1) failures.push("cross-tab success must be published only by the verified enrollment path");
if (!enrollment.includes('flow !== "signup"') || /setInterval|setTimeout/.test(enrollment)) {
  failures.push("passkey cross-tab verification must remain signup-only and must not poll");
}
const externalVerifierStart = enrollment.indexOf("const verifyExternalEnrollment");
const externalVerifierEnd = enrollment.indexOf("}, [flow, router]);", externalVerifierStart);
const externalVerifier = externalVerifierStart >= 0 && externalVerifierEnd > externalVerifierStart
  ? enrollment.slice(externalVerifierStart, externalVerifierEnd)
  : "";
if (
  !externalVerifier.includes("await verifyPasskeyEnrollment()")
  || externalVerifier.indexOf("await verifyPasskeyEnrollment()") > externalVerifier.indexOf('router.replace("/" as Href)')
  || externalVerifier.includes("/auth/setup-complete")
  || externalVerifier.includes("/account")
  || externalVerifier.includes("/auth/login")
) {
  failures.push("a non-initiating signup tab must verify the real passkey and replace only to the homepage");
}
if (!enrollment.includes("completedInThisTab.current") || !enrollment.includes("externallyCompleted") || !enrollment.includes("verifyExternalEnrollment")) {
  failures.push("passkey enrollment must become terminal after local success or a reconciled concurrent enrollment");
}
if (!enrollment.includes("localEnrollmentAttempt.current && !allowDuringLocalAttempt") || !enrollment.includes("await verifyExternalEnrollment(true)")) {
  failures.push("visibility changes must not misclassify the active passkey creator, while concurrent already-enrolled outcomes remain reconcilable");
}
for (const copy of [
  "INSCRIPTION TERMINÉE",
  "Tout est prêt, bienvenue chez Stamio",
  "Votre compte est désormais sécurisé. Vous pouvez prendre part aux débats, exprimer votre point de vue et suivre les résultats en toute sérénité.",
  "Si votre appareil vous a demandé Face ID, une empreinte digitale ou son code de déverrouillage, cette vérification est restée entièrement gérée par votre appareil. Stamio n’a jamais accès à vos données biométriques.",
  "La clé d’accès sert uniquement à protéger votre compte et à renforcer la fiabilité des participations et des résultats publiés sur Stamio.",
  "Accéder à mon espace",
  "Découvrir les débats"
]) {
  if (!setupComplete.includes(copy)) failures.push(`setup completion copy missing: ${copy}`);
}
if (!setupComplete.includes('leave("/account"') || !setupComplete.includes('leave("/themes"')) failures.push("setup completion destinations are missing");
for (const check of [
  "supabase.auth.getSession()",
  "supabase.auth.getUser()",
  "email_confirmed_at",
  "verifyPasskeyEnrollment()",
  "hasRecentSignupEnrollmentCompletion",
  "getSetupCompleteDestination",
  "if (!ready)",
  "Vérification de votre inscription"
]) {
  if (!setupComplete.includes(check)) failures.push(`setup completion guard missing: ${check}`);
}
if (setupComplete.indexOf("if (!ready)") > setupComplete.indexOf("INSCRIPTION TERMINÉE")) failures.push("setup completion must gate success copy before rendering it");
if (!signupCompletion.includes("sessionStorage") || !signupCompletion.includes("SHA-256") || !signupCompletion.includes("completedAt") || !signupCompletion.includes('flow: "signup"')) {
  failures.push("signup completion marker must be short-lived, account-bound, and signup-specific");
}
if (!pendingSignup.includes("localStorage") || !pendingSignup.includes('"stamio_pending_signup_v1"') || !pendingSignup.includes('flow: "pending-signup"') || !pendingSignup.includes("startedAt: Date.now()")) {
  failures.push("pending signup marker must be a distinct local, timestamp-only marker");
}
const pendingMarkerLiteral = /const marker:[\s\S]*?\n    \};/.exec(pendingSignup)?.[0]?.toLowerCase() ?? "";
for (const forbidden of ["email", "password", "userid", "user_id", "token", "secret", "supabase", "credential", "challenge", "webauthn"]) {
  if (pendingMarkerLiteral.includes(forbidden)) failures.push(`pending signup marker must not store ${forbidden}`);
}
if (!enrollment.includes("clearPendingSignup()") || !setupComplete.includes("clearPendingSignup()") || !api.includes("if (!result.error) clearPendingSignup()")) {
  failures.push("pending signup marker must be cleared after passkey enrollment, legitimate completion, and sign-out");
}
for (const forbidden of ["token", "credential", "challenge", "webauthn", "email"]) {
  const markerLiteral = /const marker:[\s\S]*?\n    \};/.exec(signupCompletion)?.[0]?.toLowerCase() ?? "";
  if (markerLiteral.includes(forbidden)) failures.push(`signup completion marker must not store ${forbidden}`);
}
for (const source of [home, verifyEmail, callback, setupComplete]) {
  if (!source.includes("HeroActionButton")) failures.push("home and auth completion screens must reuse HeroActionButton");
}
for (const style of ["minHeight: 48", "paddingHorizontal: 18", "duration: 190", "translateY", "primaryPressed", "secondaryPressed", "onFocus", "onBlur"]) {
  if (!heroActionButton.includes(style)) failures.push(`shared hero action style or state missing: ${style}`);
}
for (const [name, source] of [["verify-email", verifyEmail], ["callback", callback], ["passkey-enrollment", enrollment]]) {
  const contentStyle = /content:\s*\{([^}]+)\}/s.exec(source)?.[1] ?? "";
  if (!contentStyle || /borderWidth|borderColor|borderRadius|backgroundColor|boxShadow|shadows\./.test(contentStyle)) {
    failures.push(`${name} must use a flat, card-free outer content container`);
  }
}
if (verifyEmail.includes("MailCheck") || verifyEmail.includes("styles.card") || callback.includes("styles.card")) failures.push("email confirmation screens must not render decorative or outer cards");
if (enrollment.includes("<AuthForm") || !enrollment.includes("styles.divider")) failures.push("passkey enrollment must use the flat editorial layout with a divider");
if (!login.includes("signInWithPasskey") || !login.includes("passkey_required_at")) failures.push("login must support passkeys and progressive enrollment");
const loginErrorStyle = /error:\s*\{([\s\S]*?)\n  \},/.exec(login)?.[1] ?? "";
if (
  !login.includes("Les identifiants saisis sont invalides.")
  || !loginErrorStyle.includes("palette.dangerText")
  || !loginErrorStyle.includes('backgroundColor: "transparent"')
  || !loginErrorStyle.includes("borderWidth: 0")
  || /dangerSoft|borderRadius|shadow|padding:\s*\d/.test(loginErrorStyle)
) {
  failures.push("invalid login credentials must remain accessible red text without an alert box");
}
if (!login.includes('accessibilityLiveRegion="polite" style={styles.error}')) failures.push("login error live-region must be preserved");
for (const state of ["visitor", "email", "passkey", "confirm", "success", "duplicate", "closed"]) {
  if (!votePanel.includes(`"${state}"`)) failures.push(`VotePanel state missing: ${state}`);
}
for (const copy of [
  "Une seule participation par question possible.",
  "Comme disait Nietzsche : « Ce n'est pas le doute, c'est la certitude qui rend fou. »",
  "explorer les ressources",
  "et le fil de discussion pour mieux cerner les enjeux.",
  "Merci d’avoir exprimé votre point de vue, votre participation a bien été comptabilisée.",
  "Vous pouvez maintenant suivre l’évolution des résultats.",
  "prendre part au débat",
  ", exposer vos arguments et partager vos interrogations."
]) {
  if (!votePanel.includes(copy)) failures.push(`vote modal editorial copy missing: ${copy}`);
}
for (const check of ["onExploreContext", "onJoinDiscussion", "goToPollSection", "EDITORIAL_AMBER"]) {
  if (!votePanel.includes(check)) failures.push(`vote modal internal navigation or premium interaction missing: ${check}`);
}
if (!modalCloseButton.includes("closeVisualActive")) failures.push("shared modal close interaction is missing");
if (!/<X size=\{16\}/.test(modalCloseButton) || !/closeHitArea:[\s\S]*?width: 40,[\s\S]*?height: 40/.test(modalCloseButton) || !/closeVisual:[\s\S]*?width: 28,[\s\S]*?height: 28/.test(modalCloseButton) || !votePanel.includes('width: "auto"')) {
  failures.push("vote modal close control or compact action sizing is missing");
}
if (!modalCloseButton.includes("active ? palette.ink : palette.inkSecondary") || !modalCloseButton.includes("closeVisualActive")) {
  failures.push("vote modal close glyph must turn white over the compact active background");
}
const closeHitAreaStyle = /closeHitArea:\s*\{([\s\S]*?)\n  \},/.exec(modalCloseButton)?.[1] ?? "";
if (/shadowColor|shadowOpacity|shadowRadius|shadowOffset|elevation|filter|outline|boxShadow/.test(closeHitAreaStyle)) failures.push("close hit area must not define any visible shadow, filter, elevation, or outline");
if (!modalCloseButton.includes('boxShadow: "none"') || !modalCloseButton.includes('filter: "none"') || !modalCloseButton.includes('outlineStyle: "none"') || !modalCloseButton.includes("closeHitAreaWebReset")) {
  failures.push("web close hit area must explicitly suppress its native outline, filter, and box shadow");
}
if (!modalCloseButton.includes('matches?.(":focus-visible")') || !modalCloseButton.includes("closeVisualFocused")) failures.push("close focus must use a compact focus-visible treatment on the inner box");
const closeActiveStyle = /closeVisualActive:\s*\{([^}]+)\}/s.exec(modalCloseButton)?.[1] ?? "";
const closeVisualStyle = /closeVisual:\s*\{([\s\S]*?)\n  \},/.exec(modalCloseButton)?.[1] ?? "";
const closePressedStyle = /closeVisualPressed:\s*\{([^}]+)\}/s.exec(modalCloseButton)?.[1] ?? "";
for (const [name, style] of [["visual", closeVisualStyle], ["hover", closeActiveStyle], ["pressed", closePressedStyle]]) {
  if (/shadowColor|shadowOpacity|shadowRadius|shadowOffset|elevation|filter|drop-shadow|boxShadow/i.test(style)) {
    failures.push(`close ${name} style must not produce an exterior hover halo`);
  }
}
if (modalCloseButton.includes("closeHoverShadow") || modalCloseButton.includes("0 3px 8px rgba(0, 0, 0, 0.58)")) failures.push("the rejected diffuse close-button hover shadow must be removed");
if (!closeActiveStyle.includes('backgroundColor: "rgba(2, 6, 15, 0.52)"')) failures.push("close hover must retain its compact dark background");
const closeFocusStyle = /closeVisualFocused:\s*\{([^}]+)\}/s.exec(modalCloseButton)?.[1] ?? "";
if (!closeFocusStyle.includes("borderWidth: 1") || /shadow|elevation|filter/i.test(closeFocusStyle)) failures.push("close keyboard focus must remain compact without a halo");
const leadStyle = /editorialLead:\s*\{([^}]+)\}/s.exec(votePanel)?.[1] ?? "";
const quoteStyle = /editorialQuote:\s*\{([^}]+)\}/s.exec(votePanel)?.[1] ?? "";
if (!leadStyle.includes("palette.inkSecondary")) failures.push("vote confirmation lead must use the secondary editorial color");
if (!quoteStyle.includes("palette.ink") || quoteStyle.includes("fontStyle")) failures.push("vote confirmation quote must be white and non-italic");
if (!votePanel.includes('cursor: "pointer"')) failures.push("vote modal editorial links must expose a web link cursor");
if (!/<Text[\s\S]*?style=\{styles\.editorialLink\}[\s\S]*?>\s*explorer les ressources\s*<\/Text>/m.test(votePanel)) failures.push("only the resource phrase must be the first amber link");
if (!/<Text[\s\S]*?style=\{styles\.editorialLink\}[\s\S]*?>\s*prendre part au débat\s*<\/Text>/m.test(votePanel)) failures.push("only the discussion phrase must be the second amber link");
if (!/label="Comptabiliser mon vote" onPress=\{handleSubmit\}/.test(votePanel) || !/label="Découvrir les autres sujets"\s+onPress=/.test(votePanel)) {
  failures.push("both vote actions must reuse the same animated modal button");
}
if (votePanel.includes('variant="filled"') || /primary(Button|Fill|Text)Filled/.test(votePanel)) failures.push("success action must not retain a filled resting variant");
if (!votePanel.includes("duration: 220") || !votePanel.includes("Easing.out(Easing.cubic)")) failures.push("vote modal actions must retain their shared 220 ms cubic animation");
const modalPanelStyle = /panel:\s*\{([\s\S]*?)\n  \},/.exec(votePanel)?.[1] ?? "";
if (!modalPanelStyle || /borderWidth|borderColor/.test(modalPanelStyle) || !modalPanelStyle.includes("shadowOpacity") || !modalPanelStyle.includes("elevation")) failures.push("vote modal panel must use borderless elevated depth");
if (!informations.includes("ProfileEditModal") || !informations.includes("checkUsernameAvailability")) failures.push("account information modal or username availability missing");
if (!vote.includes("consume_rate_limit") || !vote.includes("submit_authenticated_vote") || vote.includes("new Map")) failures.push("vote must use persistent rate limiting and one atomic RPC");
if (!vote.includes('rpc("get_poll_results"') || !vote.includes("results_unavailable")) failures.push("accepted votes must return canonical aggregate results or an explicit unavailable state");
if (!migration.includes("unique (poll_id, voter_hash)") || !migration.includes("insert into public.user_poll_answers")) failures.push("database anti-double-vote or atomic history missing");
if (!passkeyManagement.includes("confirmDelete") || !read("lib/auth/passkeys.ts").includes('"delete-passkey"')) failures.push("server-side passkey deletion confirmation missing");
if (!informations.includes("<PasskeyManagementSection />")) failures.push("passkey management must be integrated in account information");
if (!security.includes("<Redirect") || !security.includes("/account/informations?section=security")) failures.push("legacy security route must redirect to account information");
if (account.includes("/account/security") || account.includes("securityLink")) failures.push("account landing page must not expose a competing security entry");
for (const check of ['nativeID="poll-context"', 'nativeID="poll-discussion"', "scrollToContext", "scrollToDiscussion", "onExploreContext={scrollToContext}", "onJoinDiscussion={scrollToDiscussion}", "animated: true"]) {
  if (!pollScreen.includes(check)) failures.push(`poll internal navigation anchor missing: ${check}`);
}
if (!appHeader.includes("export function HeaderTextAction") || !appHeader.includes('<HeaderTextAction\n                  label="Se connecter"')) {
  failures.push("the header login action must use the shared text-action primitive");
}
if (!pollScreen.includes('import { HeaderTextAction } from "@/components/AppHeader"') || !pollScreen.includes('label="LIRE LE DÉBAT"') || !pollScreen.includes("<ChevronDown")) {
  failures.push("Lire le débat must reuse the header text action with its directional icon");
}
const headerSecondaryStyle = /secondaryButton:\s*\{([\s\S]*?)\n  \},/.exec(appHeader)?.[1] ?? "";
const headerSecondaryTextStyle = /secondaryText:\s*\{([^}]+)\}/s.exec(appHeader)?.[1] ?? "";
for (const required of ['minHeight: 40', 'paddingHorizontal: 13', 'backgroundColor: "transparent"', "borderWidth: 0"]) {
  if (!headerSecondaryStyle.includes(required)) failures.push(`shared header text action style missing: ${required}`);
}
if (/boxShadow|shadowColor|shadowOpacity|shadowRadius|elevation/.test(headerSecondaryStyle) || !headerSecondaryTextStyle.includes("palette.ink") || !headerSecondaryTextStyle.includes("fontFamilyMedium")) {
  failures.push("shared header text action must remain borderless, shadowless, and use the login text treatment");
}
if (!appHeader.includes("hovered && styles.actionHovered") || !appHeader.includes("pressed && styles.actionPressed") || !appHeader.includes("actionHovered: { backgroundColor: palette.surfaceRaised }") || !appHeader.includes("actionPressed: { opacity: 0.78 }")) {
  failures.push("Lire le débat and Se connecter must share identical hover and pressed behavior");
}
if (/discussionAction|discussionCtaHovered/.test(pollScreen)) failures.push("Lire le débat must not retain its former boxed local button styles");
if (!pollScreen.includes('accessibilityLabel="Lire le débat"') || !pollScreen.includes("onPress={scrollToDiscussion}")) failures.push("Lire le débat must preserve its accessible scroll action");
if (pollScreen.includes('"Vérification en cours"')) failures.push("vote CTA label must remain stable while participation status loads");
if (!pollScreen.includes("voteButtonText: { color: palette.ink")) failures.push("active vote CTA text must use the white ink token");
if (!pollScreen.includes('busy: status === "loading"') || !pollScreen.includes("voteButtonLoaderSlot")) failures.push("vote CTA must expose busy state and reserve stable loader space");
if (!themes.includes("useFocusEffect") || !themePolls.includes("useFocusEffect")) failures.push("theme counters must refresh when their route regains focus");
if (!signup.includes("existingContent: { width: \"100%\", maxWidth: 720") || /existingContent:\s*\{[^}]*border/s.test(signup)) failures.push("existing-email state must remain flat and card-free");
const rowStyle = /passkeyRow:\s*\{([^}]+)\}/s.exec(passkeyManagement)?.[1] ?? "";
if (/backgroundColor|borderRadius|borderWidth(?!Bottom)/.test(rowStyle)) failures.push("passkey rows must remain flat and card-free");
const sectionStyle = /section:\s*\{([^}]+)\}/s.exec(passkeyManagement)?.[1] ?? "";
if (/backgroundColor|borderRadius|borderWidth/.test(sectionStyle) || !passkeyManagement.includes("styles.divider")) failures.push("passkey management section must remain flat with a horizontal divider");
for (const copy of ["Sécurité", "Clés d’accès", "Ajouter une clé d’accès", "Toutes vos clés d’accès donnent accès au même compte"]) {
  if (!passkeyManagement.includes(copy)) failures.push(`passkey management copy missing: ${copy}`);
}

const setupPolicy = await loadPureTypeScriptModule("lib/auth/signupCompletionPolicy.ts");
const setupCases = [
  [{ hasSession: false, userValidated: false, emailConfirmed: false, passkeyEnrolled: false, markerValid: false, pendingSignupValid: false }, "/auth/login"],
  [{ hasSession: false, userValidated: false, emailConfirmed: false, passkeyEnrolled: false, markerValid: false, pendingSignupValid: true }, "/auth/verify-email"],
  [{ hasSession: true, userValidated: true, emailConfirmed: false, passkeyEnrolled: false, markerValid: false, pendingSignupValid: true }, "/auth/verify-email"],
  [{ hasSession: true, userValidated: true, emailConfirmed: true, passkeyEnrolled: false, markerValid: false, pendingSignupValid: true }, "/auth/passkey-enrollment?flow=signup"],
  [{ hasSession: true, userValidated: true, emailConfirmed: true, passkeyEnrolled: true, markerValid: false, pendingSignupValid: true }, "/account"],
  [{ hasSession: true, userValidated: true, emailConfirmed: true, passkeyEnrolled: true, markerValid: true, pendingSignupValid: true }, null]
];
for (const [state, expected] of setupCases) {
  const actual = setupPolicy.getSetupCompleteDestination(state);
  if (actual !== expected) failures.push(`setup completion guard returned ${String(actual)} instead of ${String(expected)}`);
}
const markerNow = 2_000_000;
if (!setupPolicy.isRecentSignupCompletionMarker({ version: 1, flow: "signup", completedAt: markerNow, accountBinding: "account-a" }, "account-a", markerNow)) failures.push("fresh signup completion marker must be accepted");
if (setupPolicy.isRecentSignupCompletionMarker({ version: 1, flow: "signup", completedAt: markerNow - setupPolicy.SIGNUP_COMPLETION_TTL_MS - 1, accountBinding: "account-a" }, "account-a", markerNow)) failures.push("expired signup completion marker must be rejected");
if (setupPolicy.isRecentSignupCompletionMarker({ version: 1, flow: "signup", completedAt: markerNow, accountBinding: "account-b" }, "account-a", markerNow)) failures.push("signup completion marker must be bound to the current account");
if (!setupPolicy.isRecentPendingSignupMarker({ version: 1, flow: "pending-signup", startedAt: markerNow }, markerNow)) failures.push("fresh pending signup marker must be accepted");
if (setupPolicy.isRecentPendingSignupMarker({ version: 1, flow: "pending-signup", startedAt: markerNow - setupPolicy.PENDING_SIGNUP_TTL_MS - 1 }, markerNow)) failures.push("expired pending signup marker must be rejected");
if (setupPolicy.isRecentPendingSignupMarker({ version: 1, flow: "signup", startedAt: markerNow }, markerNow)) failures.push("pending signup marker must use its dedicated flow");

const passkeySyncPolicy = await loadPureTypeScriptModule("lib/auth/passkeyEnrollmentSync.ts");
const firstTabId = passkeySyncPolicy.createPasskeyEnrollmentTabId();
const secondTabId = passkeySyncPolicy.createPasskeyEnrollmentTabId();
if (firstTabId === secondTabId || !firstTabId.startsWith("tab-") || !secondTabId.startsWith("tab-")) {
  failures.push("each passkey enrollment page instance must receive a distinct non-sensitive tab id");
}
const syncNow = 3_000_000;
const syncEvent = passkeySyncPolicy.createPasskeyEnrollmentSyncEvent(firstTabId, syncNow);
if (passkeySyncPolicy.shouldHandlePasskeyEnrollmentSyncEvent(syncEvent, firstTabId, syncNow)) failures.push("the initiating passkey tab must ignore its own completion event");
if (!passkeySyncPolicy.shouldHandlePasskeyEnrollmentSyncEvent(syncEvent, secondTabId, syncNow)) failures.push("another passkey tab must accept a fresh completion event");
if (passkeySyncPolicy.shouldHandlePasskeyEnrollmentSyncEvent(syncEvent, secondTabId, syncNow + passkeySyncPolicy.PASSKEY_ENROLLMENT_EVENT_TTL_MS + 1)) {
  failures.push("expired passkey enrollment events must be ignored");
}
const syncEventKeys = Object.keys(syncEvent).sort().join(",");
if (syncEventKeys !== "nonce,sourceTabId,timestamp,type") failures.push(`passkey sync event exposes unexpected fields: ${syncEventKeys}`);
for (const forbidden of ["email", "user", "credential", "challenge", "attestation", "token", "session", "supabase", "webauthn"]) {
  if (JSON.stringify(syncEvent).toLowerCase().includes(forbidden)) failures.push(`passkey sync event must not contain ${forbidden}`);
}
for (const check of [
  '"stamio_passkey_enrollment"',
  '"stamio_passkey_enrollment_event_v1"',
  "new BroadcastChannel(",
  'window.addEventListener("storage"',
  'window.removeEventListener("storage"',
  "channel.removeEventListener(",
  "channel?.close()",
  "window.localStorage.removeItem("
]) {
  if (!passkeyEnrollmentSync.includes(check)) failures.push(`passkey sync transport or cleanup missing: ${check}`);
}
if (/setInterval|setTimeout/.test(passkeyEnrollmentSync)) failures.push("passkey enrollment synchronization must not poll or retain timers");

const originalWindow = globalThis.window;
const originalBroadcastChannel = globalThis.BroadcastChannel;
const fakeSessionValues = new Map();
const fakeLocalValues = new Map();
const fakeStorageListeners = new Set();
let closedChannelCount = 0;
class FakeBroadcastChannel {
  static instances = new Set();
  constructor(name) {
    this.name = name;
    this.listeners = new Set();
    FakeBroadcastChannel.instances.add(this);
  }
  addEventListener(type, listener) {
    if (type === "message") this.listeners.add(listener);
  }
  removeEventListener(type, listener) {
    if (type === "message") this.listeners.delete(listener);
  }
  postMessage(data) {
    for (const instance of FakeBroadcastChannel.instances) {
      if (instance.name !== this.name) continue;
      for (const listener of instance.listeners) listener({ data });
    }
  }
  close() {
    this.listeners.clear();
    FakeBroadcastChannel.instances.delete(this);
    closedChannelCount += 1;
  }
}
const fakeWindow = {
  sessionStorage: {
    setItem(key, value) { fakeSessionValues.set(key, value); },
    getItem(key) { return fakeSessionValues.get(key) ?? null; },
    removeItem(key) { fakeSessionValues.delete(key); }
  },
  localStorage: {
    setItem(key, value) {
      fakeLocalValues.set(key, value);
      for (const listener of fakeStorageListeners) listener({ key, newValue: value });
    },
    getItem(key) { return fakeLocalValues.get(key) ?? null; },
    removeItem(key) { fakeLocalValues.delete(key); }
  },
  addEventListener(type, listener) {
    if (type === "storage") fakeStorageListeners.add(listener);
  },
  removeEventListener(type, listener) {
    if (type === "storage") fakeStorageListeners.delete(listener);
  }
};
try {
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: fakeWindow });
  Object.defineProperty(globalThis, "BroadcastChannel", { configurable: true, writable: true, value: FakeBroadcastChannel });
  const broadcastReceipts = [];
  const broadcastA = passkeySyncPolicy.subscribeToPasskeyEnrollmentSync("tab-broadcast-a", () => broadcastReceipts.push("a"));
  const broadcastB = passkeySyncPolicy.subscribeToPasskeyEnrollmentSync("tab-broadcast-b", () => broadcastReceipts.push("b"));
  broadcastA.publishSuccess();
  if (broadcastReceipts.join(",") !== "b") failures.push("BroadcastChannel must notify only the other passkey tab");
  broadcastA.cleanup();
  broadcastB.cleanup();
  if (closedChannelCount !== 2 || FakeBroadcastChannel.instances.size !== 0) failures.push("BroadcastChannel instances and listeners must be cleaned up");

  Object.defineProperty(globalThis, "BroadcastChannel", { configurable: true, writable: true, value: undefined });
  const storageReceipts = [];
  const storageA = passkeySyncPolicy.subscribeToPasskeyEnrollmentSync("tab-storage-a", () => storageReceipts.push("a"));
  const storageB = passkeySyncPolicy.subscribeToPasskeyEnrollmentSync("tab-storage-b", () => storageReceipts.push("b"));
  storageA.publishSuccess();
  if (storageReceipts.join(",") !== "b") failures.push("localStorage fallback must notify only the other passkey tab");
  if (fakeLocalValues.has(passkeySyncPolicy.PASSKEY_ENROLLMENT_STORAGE_KEY)) failures.push("localStorage fallback event must be removed immediately after publication");
  storageA.cleanup();
  storageB.cleanup();
  if (fakeStorageListeners.size !== 0) failures.push("localStorage fallback listeners must be cleaned up");
} finally {
  if (originalWindow === undefined) delete globalThis.window;
  else Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: originalWindow });
  if (originalBroadcastChannel === undefined) delete globalThis.BroadcastChannel;
  else Object.defineProperty(globalThis, "BroadcastChannel", { configurable: true, writable: true, value: originalBroadcastChannel });
}

const voteStatePolicy = await loadPureTypeScriptModule("lib/votePanelState.ts");
if (voteStatePolicy.canTransitionVotePanel("success", "confirm")) failures.push("vote panel must forbid success -> confirm");
if (voteStatePolicy.canTransitionVotePanel("success", "submitting")) failures.push("vote panel must forbid success -> submitting");
if (voteStatePolicy.canTransitionVotePanel("submitting", "confirm")) failures.push("vote panel must forbid submitting -> confirm");
if (!voteStatePolicy.canTransitionVotePanel("submitting", "success")) failures.push("vote panel must allow submitting -> success");
if (!voteStatePolicy.canTransitionVotePanel("success", "checking", true)) failures.push("closing the success modal must allow an explicit reset");
if (!votePanel.includes("user?.id, visible") || !votePanel.includes("if (terminal.current) return") || !votePanel.includes("terminal.current = true")) failures.push("vote success must remain terminal across auth visibility refreshes");
if (pollScreen.includes("setPanelVisible(false);\n    }") || !pollScreen.includes("voteState?.status === \"duplicate\"")) failures.push("already-voted response must remain a stable terminal modal state");
if (!votePanelState.includes('step === "success" || step === "duplicate"')) failures.push("vote panel terminal states must be explicit");
if (!signupCompletionPolicy.includes("SIGNUP_COMPLETION_TTL_MS")) failures.push("signup completion policy must expose a finite marker lifetime");

const authFieldStyle = /field:\s*\{([^}]+)\}/s.exec(authFields)?.[1] ?? "";
const authErrorSlotStyle = /errorSlot:\s*\{([^}]+)\}/s.exec(authFields)?.[1] ?? "";
const authFieldErrorStyle = /fieldError:\s*\{([^}]+)\}/s.exec(authFields)?.[1] ?? "";
if (!authFieldStyle.includes("flexGrow: 0") || !authFieldStyle.includes("flexShrink: 0") || !authFieldStyle.includes('flexBasis: "auto"')) {
  failures.push("signup field groups must preserve their intrinsic content height");
}
for (const [name, style] of [["field group", authFieldStyle], ["error slot", authErrorSlotStyle], ["error text", authFieldErrorStyle]]) {
  if (/position:\s*"absolute"|height:\s*\d|maxHeight|marginTop:\s*-/.test(style)) failures.push(`signup ${name} must remain in normal document flow without a fixed height`);
}
if (!authFieldErrorStyle.includes("flexShrink: 1") || !authFieldErrorStyle.includes("lineHeight: 15")) failures.push("signup field errors must support natural multiline wrapping");
if (!authForm.includes("gap: 12") || !authFields.includes('gap: 6')) failures.push("signup field groups must keep compact 6 px internal and 12 px inter-group spacing");
if (!authFields.includes('"aria-invalid"') || !authFields.includes('"aria-describedby"') || !authFields.includes("nativeID={errorId}")) failures.push("signup text fields must preserve accessible error associations");
for (const [name, source] of [["profession", professionSelect], ["region", regionSelect]]) {
  const errorStyle = /error:\s*\{([^}]+)\}/s.exec(source)?.[1] ?? "";
  if (!errorStyle.includes("flexShrink: 1") || !errorStyle.includes("lineHeight: 15") || /position:\s*"absolute"|height:\s*\d|maxHeight/.test(errorStyle)) {
    failures.push(`${name} inline errors must wrap naturally inside their field group`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Passkey flow checks passed.");
