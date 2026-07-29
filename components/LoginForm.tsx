import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUserProfile, signInUser } from "@/lib/api";
import { getPasskeyErrorMessage, signInWithPasskey } from "@/lib/auth/passkeys";
import { getVisibleLoginError, normalizeAuthEmail, validateLogin, type LoginField } from "@/lib/authValidation";
import { authField, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Partial<Record<LoginField, boolean>>>({});
  const [submitted, setSubmitted] = useState<Partial<Record<LoginField, boolean>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const submittingRef = useRef(false);
  const values = { email, password };
  const validationErrors = validateLogin(values);

  function fieldError(field: LoginField) {
    return getVisibleLoginError(field, values, touched, submitted);
  }

  function edit(field: LoginField, value: string) {
    if (field === "email") setEmail(value);
    else setPassword(value);
    setTouched((current) => ({ ...current, [field]: false }));
    setSubmitted((current) => ({ ...current, [field]: false }));
    setGlobalError(null);
  }

  async function handleSubmit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTouched({ email: true, password: true });
    setSubmitted({ email: true, password: true });
    if (Object.keys(validationErrors).length > 0) {
      setGlobalError(null);
      submittingRef.current = false;
      return;
    }

    setLoading(true);
    setGlobalError(null);
    const normalizedEmail = normalizeAuthEmail(email);
    const { data, error: loginError } = await signInUser(normalizedEmail, password);
    void data;
    setLoading(false);

    if (loginError) {
      setGlobalError("Les identifiants saisis sont invalides.");
      submittingRef.current = false;
      return;
    }

    const profile = await getCurrentUserProfile();
    router.replace((profile?.passkey_required_at && !profile.passkey_enrolled_at ? "/auth/passkey-enrollment" : "/") as Href);
  }

  async function handlePasskeySignIn() {
    if (passkeyLoading) return;
    setPasskeyLoading(true);
    setGlobalError(null);
    try {
      await signInWithPasskey();
      router.replace("/" as Href);
    } catch (error) {
      setGlobalError(getPasskeyErrorMessage(error, "signin"));
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <AuthForm title="Se connecter" subtitle="Utilisez Face ID, votre empreinte, Windows Hello ou le code de votre appareil." maxWidth={390} compact>
      <Pressable accessibilityRole="button" disabled={passkeyLoading} onPress={handlePasskeySignIn} style={({ pressed }) => StyleSheet.flatten([styles.primary, pressed && !passkeyLoading && styles.primaryPressed, passkeyLoading && styles.primaryDisabled])}>
        {passkeyLoading ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.primaryText}>Se connecter avec une clé d’accès</Text>}
      </Pressable>
      <View accessibilityRole="none" style={styles.alternative}>
        <View aria-hidden style={styles.alternativeLine} />
        <Text style={styles.alternativeText}>ou</Text>
        <View aria-hidden style={styles.alternativeLine} />
      </View>
      <LoginInput
        field="email"
        label="Adresse e-mail"
        error={fieldError("email")}
        value={email}
        onBlur={() => setTouched((current) => ({ ...current, email: true }))}
        onChangeText={(value) => edit("email", value)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        placeholder="Saisissez votre adresse e-mail"
      />
      <LoginInput
        field="password"
        label="Mot de passe"
        error={fieldError("password")}
        value={password}
        onBlur={() => setTouched((current) => ({ ...current, password: true }))}
        onChangeText={(value) => edit("password", value)}
        secureTextEntry={!passwordVisible}
        autoComplete="password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        onKeyPress={(event) => {
          if (Platform.OS === "web" && event.nativeEvent.key === "Enter") void handleSubmit();
        }}
        placeholder="Entrez votre mot de passe"
        rightElement={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            onPress={() => setPasswordVisible((value) => !value)}
            style={({ pressed }) => StyleSheet.flatten([styles.eyeButton, pressed && styles.eyeButtonPressed])}
          >
            {passwordVisible ? <EyeOff size={18} color={palette.muted} /> : <Eye size={18} color={palette.muted} />}
          </Pressable>
        }
      />
      <Pressable accessibilityRole="link" onPress={() => router.push("/auth/forgot-password" as Href)} style={styles.forgotLink}>
        <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
      </Pressable>
      {globalError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{globalError}</Text> : null}
      <Pressable accessibilityRole="button" disabled={loading} onPress={handleSubmit} style={({ pressed }) => StyleSheet.flatten([styles.primary, pressed && !loading && styles.primaryPressed, loading && styles.primaryDisabled])}>
        {loading ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.primaryText}>Se connecter</Text>}
      </Pressable>
      <View style={styles.separator} />
      <View style={styles.signupPrompt}>
        <Text style={styles.signupPromptText}>Pas encore de compte ?</Text>
        <Pressable accessibilityRole="link" onPress={() => router.push("/auth/signup" as Href)} style={styles.signupPromptLink}>
          <Text style={styles.signupPromptLinkText}>Inscrivez-vous</Text>
        </Pressable>
      </View>
    </AuthForm>
  );
}

function LoginInput({
  field,
  label,
  error,
  rightElement,
  style,
  onFocus,
  onBlur,
  ...props
}: ComponentProps<typeof TextInput> & { field: LoginField; label: string; error?: string; rightElement?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  const errorId = `login-${field}-error`;
  const webAccessibilityProps = Platform.OS === "web"
    ? ({ "aria-invalid": Boolean(error), "aria-describedby": error ? errorId : undefined } as ComponentProps<typeof TextInput>)
    : {};
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={StyleSheet.flatten([styles.inputShell, focused && styles.inputFocused, error && styles.inputInvalid])}>
        <TextInput
          {...webAccessibilityProps}
          {...props}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          accessibilityHint={error}
          placeholderTextColor={authField.placeholderColor}
          style={StyleSheet.flatten([styles.input, webInputReset, rightElement ? styles.inputWithAction : null, style])}
        />
        {rightElement}
      </View>
      {error ? <Text nativeID={errorId} accessibilityLiveRegion="polite" style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { width: "100%", gap: 6 },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  inputShell: {
    width: "100%",
    minHeight: 48,
    borderRadius: authField.borderRadius,
    borderWidth: authField.borderWidth,
    borderColor: "transparent",
    backgroundColor: authField.background,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden"
  },
  input: {
    minHeight: 46,
    flex: 1,
    paddingHorizontal: 14,
    borderWidth: 0,
    color: palette.ink,
    fontSize: 15,
    fontFamily: fontFamilyMedium
  },
  inputWithAction: { paddingRight: 6 },
  inputFocused: { borderColor: authField.focusBorderColor, backgroundColor: authField.backgroundFocused },
  inputInvalid: { borderColor: authField.invalidBorderColor, backgroundColor: authField.backgroundInvalid },
  fieldError: { color: palette.fieldError, fontSize: 11, lineHeight: 15 },
  error: {
    color: palette.dangerText,
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontFamily: fontFamilySemibold,
    fontSize: 13,
    lineHeight: 19,
    marginVertical: 2
  },
  primary: {
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2
  },
  primaryPressed: { transform: [{ translateY: 1 }], backgroundColor: palette.primaryPressed },
  primaryDisabled: { opacity: 0.72 },
  primaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold, fontSize: 15 },
  eyeButton: { width: 40, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.xs, borderWidth: 0, backgroundColor: "transparent" },
  eyeButtonPressed: { backgroundColor: "rgba(148, 163, 184, 0.1)" },
  forgotLink: { alignSelf: "flex-end", paddingVertical: 2, paddingHorizontal: 2, marginTop: -4 },
  forgotText: { color: palette.primaryStrong, fontFamily: fontFamilyMedium, fontSize: 12 },
  alternative: { width: "100%", flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 },
  alternativeLine: { flex: 1, height: 1, backgroundColor: authField.separatorColor },
  alternativeText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 12, lineHeight: 18, textAlign: "center" },
  separator: { height: 1, width: "100%", backgroundColor: authField.separatorColor, marginTop: 6, marginBottom: 2 },
  signupPrompt: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, flexWrap: "wrap", paddingTop: 2 },
  signupPromptText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  signupPromptLink: { paddingVertical: 3 },
  signupPromptLinkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13 }
});

const webInputReset = Platform.OS === "web"
  ? ({ outlineStyle: "none" } as unknown as ComponentProps<typeof TextInput>["style"])
  : null;
