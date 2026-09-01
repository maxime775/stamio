import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AuthSexSegmented, AuthTextField } from "@/components/AuthFields";
import { AuthForm } from "@/components/AuthForm";
import { HeroActionButton } from "@/components/HeroActionButton";
import { PasswordStrengthRules } from "@/components/PasswordStrengthRules";
import { RegionSelect } from "@/components/RegionSelect";
import { ProfessionSelect } from "@/components/ProfessionSelect";
import { REGIONS_FR } from "@/lib/product";
import { Check } from "@/lib/icons";
import { checkSignupEmail, checkUsernameAvailability, resendSignupConfirmation, signUpUser } from "@/lib/api";
import { markPendingSignup } from "@/lib/auth/pendingSignup";
import { createSignupResumeChallenge, createSignupResumeToken, rememberSignupCredentials } from "@/lib/auth/signupResume";
import { getVisibleSignupError, isValidSignupUsername, normalizeSignupEmail, normalizeSignupUsername, touchAllSignupFields, validateSignup, type SignupField, type SignupTouched, type SignupValues } from "@/lib/signupValidation";
import type { Sex } from "@/lib/types";
import { authField, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

type UsernameAvailability = "idle" | "checking" | "available" | "taken" | "invalid";
type ExistingEmailState = "existing_confirmed" | "existing_unconfirmed";

export function SignupForm() {
  const router = useRouter();
  const compact = useWindowDimensions().width < 600;
  const focusEmailAfterReturn = useRef(false);
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameAvailability>("idle");
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState("");
  const [profession, setProfession] = useState("");
  const [region, setRegion] = useState(REGIONS_FR[0]);
  const [touched, setTouched] = useState<SignupTouched>({});
  const [submitted, setSubmitted] = useState<SignupTouched>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingEmailState, setExistingEmailState] = useState<ExistingEmailState | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalTouched, setLegalTouched] = useState(false);
  const [legalFocused, setLegalFocused] = useState(false);
  const [communicationsEmailOptIn, setCommunicationsEmailOptIn] = useState(false);
  const [communicationsFocused, setCommunicationsFocused] = useState(false);

  const values: SignupValues = { email, confirmEmail, password, confirmPassword, username, sex, age, profession, region };
  const validationErrors = validateSignup(values);

  useEffect(() => {
    let active = true;
    const normalizedUsername = normalizeSignupUsername(username);
    if (!username.trim()) {
      setUsernameStatus("idle");
      return () => {
        active = false;
      };
    }
    if (!isValidSignupUsername(username)) {
      setUsernameStatus("invalid");
      return () => {
        active = false;
      };
    }

    setUsernameStatus("checking");
    const timer = setTimeout(() => {
      checkUsernameAvailability(normalizedUsername).then((result) => {
        if (!active) return;
        if (result.available === true) setUsernameStatus("available");
        else if (result.available === false) setUsernameStatus("taken");
        else setUsernameStatus("idle");
      });
    }, 500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [username]);

  useEffect(() => {
    if (existingEmailState !== null || !focusEmailAfterReturn.current || Platform.OS !== "web") return;
    focusEmailAfterReturn.current = false;
    const frame = window.requestAnimationFrame(() => {
      (document.getElementById("email") as HTMLInputElement | null)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [existingEmailState]);

  function touch(field: SignupField) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function edit(field: SignupField, action: () => void) {
    action();
    setSubmitted((current) => ({ ...current, [field]: false }));
    setTouched((current) => ({ ...current, [field]: false }));
    setGlobalError(null);
  }

  function fieldError(field: SignupField) {
    return getVisibleSignupError(field, values, touched, submitted);
  }

  function usernameError() {
    if (usernameStatus === "taken") return "Ce pseudo est déjà utilisé.";
    if (username.trim() && usernameStatus === "invalid") return "Le pseudo doit contenir entre 3 et 20 caractères, sans espace.";
    return fieldError("username");
  }

  async function handleSubmit() {
    if (!legalAccepted) {
      setLegalTouched(true);
      setGlobalError(null);
      return;
    }
    setTouched(touchAllSignupFields());
    setSubmitted(touchAllSignupFields());
    if (Object.keys(validationErrors).length > 0) {
      setGlobalError(null);
      return;
    }

    if (!sex) return;
    const normalizedEmail = normalizeSignupEmail(email);
    const normalizedUsername = normalizeSignupUsername(username);
    const parsedAge = Number(age);

    if (usernameStatus !== "available") {
      setUsernameStatus("checking");
      const availability = await checkUsernameAvailability(normalizedUsername);
      if (availability.available === false) {
        setUsernameStatus("taken");
        setGlobalError(null);
        return;
      }
    }

    setLoading(true);
    setGlobalError(null);
    const emailStatus = await checkSignupEmail(normalizedEmail);
    if (emailStatus.status === "existing_confirmed" || emailStatus.status === "existing_unconfirmed") {
      setLoading(false);
      setExistingEmailState(emailStatus.status);
      return;
    }
    if (emailStatus.status !== "available") {
      setLoading(false);
      setGlobalError(emailStatus.status === "rate_limited"
        ? "Trop de tentatives ont été effectuées. Réessayez un peu plus tard."
        : "Impossible de vérifier cette adresse pour le moment. Réessayez dans quelques instants.");
      return;
    }
    const resumeChallenge = await createSignupResumeChallenge();
    const { data: signupData, error: signupError } = await signUpUser({
      email: normalizedEmail,
      password,
      username: username.trim(),
      sex,
      age: parsedAge,
      profession,
      region,
      termsAccepted: true,
      communicationsEmailOptIn
    }, resumeChallenge);
    setLoading(false);

    if (signupError) {
      const availability = await checkUsernameAvailability(normalizedUsername);
      if (availability.available === false) {
        setUsernameStatus("taken");
        setGlobalError(null);
        return;
      }
      setGlobalError(signupError.message);
      return;
    }

    const resumeToken = signupData.user?.id && resumeChallenge
      ? createSignupResumeToken(signupData.user.id, resumeChallenge.secret)
      : null;
    rememberSignupCredentials(normalizedEmail, password);
    markPendingSignup(resumeToken);
    router.replace({ pathname: "/auth/verify-email", params: { email: normalizedEmail } } as Href);
  }

  function useAnotherEmail() {
    focusEmailAfterReturn.current = true;
    setExistingEmailState(null);
    setEmail("");
    setConfirmEmail("");
    setPassword("");
    setConfirmPassword("");
    setTouched((current) => resetCredentialFieldFlags(current));
    setSubmitted((current) => resetCredentialFieldFlags(current));
    setResendMessage(null);
    setGlobalError(null);
  }

  async function resendExistingConfirmation() {
    if (loading) return;
    setLoading(true);
    setResendMessage(null);
    const { error } = await resendSignupConfirmation(normalizeSignupEmail(email));
    setLoading(false);
    setResendMessage(error
      ? "Impossible de renvoyer l’email pour le moment."
      : "Si cette inscription est valide, un nouvel email de confirmation vient d’être envoyé.");
  }

  if (existingEmailState) {
    const confirmed = existingEmailState === "existing_confirmed";
    return (
      <View style={styles.existingContent}>
        <Text style={styles.existingEyebrow}>INSCRIPTION</Text>
        <Text style={[styles.existingTitle, compact && styles.existingTitleCompact]}>
          {confirmed ? "Cette adresse email est déjà utilisée" : "Cette adresse attend déjà une confirmation"}
        </Text>
        <Text style={styles.existingText}>
          {confirmed
            ? "Un compte est déjà associé à cette adresse. Utilisez une autre adresse pour vous inscrire ou connectez-vous à votre compte."
            : "Un compte a déjà été créé avec cette adresse. Vous pouvez renvoyer l’email de confirmation ou utiliser une autre adresse."}
        </Text>
        <View style={styles.existingDivider} />
        {resendMessage ? <Text accessibilityLiveRegion="polite" style={styles.existingMessage}>{resendMessage}</Text> : null}
        <View style={styles.existingActions}>
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={confirmed ? () => router.push("/auth/login" as Href) : resendExistingConfirmation}
            style={[styles.existingPrimary, compact && styles.existingActionCompact]}
          >
            {loading ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.primaryText}>{confirmed ? "Se connecter" : "Renvoyer l’email de confirmation"}</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={useAnotherEmail} style={[styles.existingSecondary, compact && styles.existingActionCompact]}>
            <Text style={styles.existingSecondaryText}>Utiliser une autre adresse</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="link" onPress={() => router.push((confirmed ? "/auth/reset-password" : "/auth/login") as Href)} style={styles.existingLink}>
          <Text style={styles.existingLinkText}>{confirmed ? "Mot de passe oublié ?" : "Se connecter"}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <AuthForm
      title="S'inscrire"
      subtitle="Créer un compte permet de participer à tous les sujets et prendre part aux débats"
      maxWidth={390}
      compact
    >
      <Field field="email" label="Adresse e-mail" error={fieldError("email")} value={email} onBlur={() => touch("email")} onChangeText={(value) => edit("email", () => setEmail(value))} keyboardType="email-address" autoCapitalize="none" placeholder="Saisissez votre adresse e-mail" />
      <Field field="confirmEmail" label="Confirmation de l'email" error={fieldError("confirmEmail")} value={confirmEmail} onBlur={() => touch("confirmEmail")} onChangeText={(value) => edit("confirmEmail", () => setConfirmEmail(value))} keyboardType="email-address" autoCapitalize="none" placeholder="Confirmez votre adresse e-mail" />
      <Field field="password" label="Mot de passe" error={fieldError("password")} value={password} onBlur={() => touch("password")} onChangeText={(value) => edit("password", () => setPassword(value))} secureTextEntry placeholder="Choisissez votre mot de passe" />
      {!fieldError("password") ? <PasswordStrengthRules password={password} /> : null}
      <Field field="confirmPassword" label="Confirmation du mot de passe" error={fieldError("confirmPassword")} value={confirmPassword} onBlur={() => touch("confirmPassword")} onChangeText={(value) => edit("confirmPassword", () => setConfirmPassword(value))} secureTextEntry placeholder="Confirmez votre mot de passe" />

      <View style={styles.profileBlock}>
        <Text style={styles.blockTitle}>Informations de profil</Text>
        <Field field="username" label="Pseudo" error={usernameError()} value={username} onBlur={() => touch("username")} onChangeText={(value) => edit("username", () => setUsername(value))} autoCapitalize="none" placeholder="Choisissez votre pseudo" />
        {usernameStatus === "checking" ? <Text accessibilityLiveRegion="polite" style={styles.availabilityPending}>Vérification en cours...</Text> : null}
        {usernameStatus === "available" && !usernameError() ? <Text accessibilityLiveRegion="polite" style={styles.availabilityOk}>Ce pseudo est disponible.</Text> : null}
        <AuthSexSegmented error={fieldError("sex")} value={sex} onBlur={() => touch("sex")} onChange={(value) => { edit("sex", () => setSex(value)); touch("sex"); }} />
        <View style={styles.twoCols}>
          <Field field="age" label="Âge" error={fieldError("age")} value={age} onBlur={() => touch("age")} onChangeText={(value) => edit("age", () => setAge(value))} keyboardType="number-pad" placeholder="34" containerStyle={styles.ageField} />
          <ProfessionSelect error={fieldError("profession")} value={profession} onBlur={() => touch("profession")} onChange={(value) => edit("profession", () => setProfession(value))} />
        </View>
        <RegionSelect error={fieldError("region")} value={region} onBlur={() => touch("region")} onChange={(value) => edit("region", () => setRegion(value))} />
      </View>

      {globalError ? <Text accessibilityLiveRegion="polite" style={styles.globalError}>{globalError}</Text> : null}
      <View style={styles.legalAcceptanceRow}>
        <Pressable
          accessibilityHint="Cochez cette case pour pouvoir vous inscrire."
          accessibilityLabel="J’ai lu et j’accepte les conditions d’utilisation et je reconnais avoir pris connaissance de la politique de confidentialité applicable au traitement de mes données personnelles."
          accessibilityLabelledBy="signup-legal-acceptance-label"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: legalAccepted }}
          onBlur={() => setLegalFocused(false)}
          onFocus={() => setLegalFocused(true)}
          onPress={() => {
            setLegalAccepted((current) => !current);
            setLegalTouched(true);
          }}
          style={styles.checkboxHitTarget}
        >
          <View style={[
            styles.checkbox,
            legalAccepted && styles.checkboxChecked,
            legalFocused && styles.checkboxFocused,
            legalTouched && !legalAccepted && styles.checkboxInvalid
          ]}>
            {legalAccepted ? <Check aria-hidden size={10} strokeWidth={3} color={palette.onPrimary} /> : null}
          </View>
        </Pressable>
        <Text nativeID="signup-legal-acceptance-label" style={styles.privacyText}>
          J’ai lu et j’accepte les <Text accessibilityRole="link" onPress={() => router.push("/conditions-utilisation" as Href)} style={styles.privacyLink}>conditions d’utilisation</Text> et je reconnais avoir pris connaissance de la <Text accessibilityRole="link" onPress={() => router.push("/confidentialite" as Href)} style={styles.privacyLink}>politique de confidentialité</Text> applicable au traitement de mes données personnelles.
        </Text>
      </View>
      {legalTouched && !legalAccepted ? <Text accessibilityLiveRegion="polite" style={styles.legalError}>Vous devez accepter les conditions d’utilisation pour vous inscrire.</Text> : null}
      <View style={styles.legalAcceptanceRow}>
        <Pressable
          accessibilityHint="Cette préférence est facultative et peut être modifiée depuis votre compte."
          accessibilityLabel="Je souhaite recevoir par e-mail les nouveaux sujets et les analyses publiées sur Stamio."
          accessibilityLabelledBy="signup-communications-email-label"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: communicationsEmailOptIn }}
          onBlur={() => setCommunicationsFocused(false)}
          onFocus={() => setCommunicationsFocused(true)}
          onPress={() => setCommunicationsEmailOptIn((current) => !current)}
          style={styles.checkboxHitTarget}
        >
          <View style={[
            styles.checkbox,
            communicationsEmailOptIn && styles.checkboxChecked,
            communicationsFocused && styles.checkboxFocused
          ]}>
            {communicationsEmailOptIn ? <Check aria-hidden size={10} strokeWidth={3} color={palette.onPrimary} /> : null}
          </View>
        </Pressable>
        <Text nativeID="signup-communications-email-label" style={styles.privacyText}>
          Je souhaite recevoir par e-mail les nouveaux sujets et les analyses publiées sur Stamio.
        </Text>
      </View>
      <HeroActionButton
        compact
        disabled={loading || !legalAccepted}
        disabledOpacity={0.52}
        elevated={false}
        fullWidth
        label="S'inscrire"
        loading={loading}
        onPress={handleSubmit}
        showArrow={false}
        variant="primary"
      />
      <View style={styles.separator} />
      <View style={styles.loginPrompt}>
        <Text style={styles.loginPromptText}>Vous avez déjà un compte ?</Text>
        <Pressable accessibilityRole="link" onPress={() => router.push("/auth/login" as Href)} style={styles.loginPromptLink}>
          <Text style={styles.loginPromptLinkText}>Connectez-vous</Text>
        </Pressable>
      </View>
    </AuthForm>
  );
}

const Field = AuthTextField;

function resetCredentialFieldFlags(current: SignupTouched): SignupTouched {
  return {
    ...current,
    email: false,
    confirmEmail: false,
    password: false,
    confirmPassword: false
  };
}

const styles = StyleSheet.create({
  existingContent: { width: "100%", maxWidth: 720, alignSelf: "center", gap: 18 },
  existingEyebrow: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, letterSpacing: 1.2 },
  existingTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 32, lineHeight: 39, maxWidth: 620 },
  existingTitleCompact: { fontSize: 29, lineHeight: 35 },
  existingText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 24, maxWidth: 660 },
  existingDivider: { width: "100%", height: 1, backgroundColor: palette.line },
  existingMessage: { color: palette.positiveText, fontFamily: fontFamilyMedium, lineHeight: 22 },
  existingActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  existingPrimary: { minHeight: 44, borderRadius: radius.sm, backgroundColor: palette.primary, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  existingSecondary: { minHeight: 44, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.lineStrong, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  existingSecondaryText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium },
  existingActionCompact: { width: "100%" },
  existingLink: { alignSelf: "flex-start", paddingVertical: 4 },
  existingLinkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13 },
  profileBlock: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 16,
    gap: 13
  },
  blockTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 15 },
  twoCols: { flexDirection: "row", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  ageField: { flexGrow: 0, flexShrink: 1, flexBasis: "30%", minWidth: 104 },
  availabilityPending: { color: palette.muted, fontSize: 11, lineHeight: 15, marginTop: -8 },
  availabilityOk: { color: palette.positiveText, fontSize: 11, lineHeight: 15, marginTop: -8 },
  globalError: { color: palette.dangerText, backgroundColor: palette.dangerSoft, borderRadius: radius.sm, padding: 12 },
  legalAcceptanceRow: { flexDirection: "row", alignItems: "flex-start", gap: 0, marginTop: -2 },
  checkboxHitTarget: { width: 44, minWidth: 44, height: 44, marginRight: -16, alignItems: "flex-start", justifyContent: "flex-start" },
  checkbox: { width: 16, height: 16, marginTop: 2, borderRadius: radius.xs, borderWidth: 1, borderColor: palette.lineStrong, backgroundColor: palette.surfaceSubtle, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { borderColor: palette.primaryStrong, backgroundColor: palette.primary },
  checkboxFocused: Platform.OS === "web" ? ({ outlineStyle: "solid", outlineWidth: 2, outlineColor: palette.primaryStrong, outlineOffset: 3 } as unknown as ViewStyle) : { borderWidth: 2, borderColor: palette.primaryStrong },
  checkboxInvalid: { borderColor: palette.dangerText },
  privacyText: { color: palette.muted, fontSize: 11, lineHeight: 17, flex: 1, minWidth: 0 },
  privacyLink: { color: palette.primaryStrong, fontFamily: fontFamilySemibold },
  legalError: { color: palette.dangerText, fontSize: 11, lineHeight: 17, marginTop: -8, paddingLeft: 28 },
  primaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold, fontSize: 15 },
  separator: { height: 1, width: "100%", backgroundColor: authField.separatorColor, marginTop: 6, marginBottom: 2 },
  loginPrompt: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, flexWrap: "wrap", paddingTop: 2 },
  loginPromptText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  loginPromptLink: { paddingVertical: 3 },
  loginPromptLinkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13 }
});
