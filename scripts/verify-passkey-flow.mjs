import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const failures = [];
const signup = read("components/SignupForm.tsx");
const signupEmailCheck = read("supabase/functions/check-signup-email/index.ts");
const verifyEmail = read("app/auth/verify-email.tsx");
const callback = read("app/auth/callback.tsx");
const enrollment = read("app/auth/passkey-enrollment.tsx");
const login = read("components/LoginForm.tsx");
const votePanel = read("components/VotePanel.tsx");
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
if (!signupEmailCheck.includes("consume_rate_limit") || !signupEmailCheck.includes("EMAIL_LOOKUP_SECRET")) failures.push("signup email lookup must use persistent server-side rate limiting");
if (!callback.includes("token_hash") || !callback.includes('type: "email"') || !callback.includes("onPress={confirmEmail}")) failures.push("email callback must verify token_hash only after a click");
if (callback.includes("exchangeCodeForSession") || /useEffect[\s\S]{0,500}verifyOtp/.test(callback)) failures.push("email callback must not auto-consume or use PKCE");
if (!enrollment.includes("onPress={enroll}") || enrollment.includes("useEffect(() => registerPasskey")) failures.push("passkey registration must require a click");
if (!enrollment.includes('Platform.OS !== "web"')) failures.push("native binary limitation must be explicit");
for (const [name, source] of [["verify-email", verifyEmail], ["callback", callback], ["passkey-enrollment", enrollment]]) {
  const contentStyle = /content:\s*\{([^}]+)\}/s.exec(source)?.[1] ?? "";
  if (!contentStyle || /borderWidth|borderColor|borderRadius|backgroundColor|boxShadow|shadows\./.test(contentStyle)) {
    failures.push(`${name} must use a flat, card-free outer content container`);
  }
}
if (verifyEmail.includes("MailCheck") || verifyEmail.includes("styles.card") || callback.includes("styles.card")) failures.push("email confirmation screens must not render decorative or outer cards");
if (enrollment.includes("<AuthForm") || !enrollment.includes("styles.divider")) failures.push("passkey enrollment must use the flat editorial layout with a divider");
if (!login.includes("signInWithPasskey") || !login.includes("passkey_required_at")) failures.push("login must support passkeys and progressive enrollment");
for (const state of ["visitor", "email", "passkey", "confirm", "success", "duplicate", "closed"]) {
  if (!votePanel.includes(`"${state}"`)) failures.push(`VotePanel state missing: ${state}`);
}
if (!informations.includes("ProfileEditModal") || !informations.includes("checkUsernameAvailability")) failures.push("account information modal or username availability missing");
if (!vote.includes("consume_rate_limit") || !vote.includes("submit_authenticated_vote") || vote.includes("new Map")) failures.push("vote must use persistent rate limiting and one atomic RPC");
if (!vote.includes('rpc("get_poll_results"') || !vote.includes("results_unavailable")) failures.push("accepted votes must return canonical aggregate results or an explicit unavailable state");
if (!migration.includes("unique (poll_id, voter_hash)") || !migration.includes("insert into public.user_poll_answers")) failures.push("database anti-double-vote or atomic history missing");
if (!passkeyManagement.includes("confirmDelete") || !read("lib/auth/passkeys.ts").includes('"delete-passkey"')) failures.push("server-side passkey deletion confirmation missing");
if (!informations.includes("<PasskeyManagementSection />")) failures.push("passkey management must be integrated in account information");
if (!security.includes("<Redirect") || !security.includes("/account/informations?section=security")) failures.push("legacy security route must redirect to account information");
if (account.includes("/account/security") || account.includes("securityLink")) failures.push("account landing page must not expose a competing security entry");
const pollScreen = read("app/poll/[pollId].tsx");
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

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Passkey flow checks passed.");
