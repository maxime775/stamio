import { useState, type ComponentProps } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AuthForm } from "@/components/AuthForm";
import { requestPasswordReset } from "@/lib/api";
import { getVisibleAuthEmailError, normalizeAuthEmail, validateAuthEmail } from "@/lib/authValidation";
import { authField, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const values = { email };
  const fieldError = getVisibleAuthEmailError(values, { email: touched }, { email: submitted });

  function edit(value: string) {
    setEmail(value);
    setTouched(false);
    setSubmitted(false);
    setStatus(null);
    setError(null);
  }

  async function handleSubmit() {
    if (loading) return;
    setTouched(true);
    setSubmitted(true);
    if (Object.keys(validateAuthEmail(values)).length > 0) {
      setStatus(null);
      setError(null);
      return;
    }

    setLoading(true);
    setStatus(null);
    setError(null);
    const { error: resetError } = await requestPasswordReset(normalizeAuthEmail(email), getResetRedirectTo());
    setLoading(false);

    if (resetError) {
      setError("Impossible d'envoyer le lien pour le moment. Réessayez dans quelques instants.");
      return;
    }

    setStatus("Si un compte est associé à cette adresse, un lien sécurisé de réinitialisation vient d'être envoyé.");
  }

  return (
    <AuthForm
      title="Réinitialisez votre mot de passe"
      subtitle="Vous avez oublié votre mot de passe ? Saisissez l'adresse e-mail que vous utilisez habituellement pour vous connecter à Sayit."
      maxWidth={390}
      compact
    >
      <EmailInput
        error={fieldError}
        value={email}
        onBlur={() => setTouched(true)}
        onChangeText={edit}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
        placeholder="vous@example.com"
      />
      {status ? <Text accessibilityLiveRegion="polite" style={styles.success}>{status}</Text> : null}
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={loading} onPress={handleSubmit} style={({ pressed }) => StyleSheet.flatten([styles.primary, pressed && !loading && styles.primaryPressed, loading && styles.primaryDisabled])}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Réinitialiser le mot de passe</Text>}
      </Pressable>
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

function EmailInput({ error, style, onFocus, onBlur, ...props }: ComponentProps<typeof TextInput> & { error?: string }) {
  const [focused, setFocused] = useState(false);
  const errorId = "forgot-password-email-error";
  const webAccessibilityProps = Platform.OS === "web"
    ? ({ "aria-invalid": Boolean(error), "aria-describedby": error ? errorId : undefined } as ComponentProps<typeof TextInput>)
    : {};
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Adresse e-mail</Text>
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
        style={StyleSheet.flatten([styles.input, webInputReset, focused && styles.inputFocused, error && styles.inputInvalid, style])}
      />
      {error ? <Text nativeID={errorId} accessibilityLiveRegion="polite" style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function getResetRedirectTo() {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/auth/reset-password`;
  }
  return undefined;
}

const styles = StyleSheet.create({
  field: { width: "100%", gap: 6 },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  input: {
    width: "100%",
    minHeight: 48,
    borderRadius: authField.borderRadius,
    borderWidth: authField.borderWidth,
    borderColor: "transparent",
    backgroundColor: authField.background,
    paddingHorizontal: 14,
    color: "#F8FAFC",
    fontSize: 15,
    fontFamily: fontFamilyMedium
  },
  inputFocused: { borderColor: authField.focusBorderColor, backgroundColor: authField.backgroundFocused },
  inputInvalid: { borderColor: authField.invalidBorderColor, backgroundColor: authField.backgroundInvalid },
  fieldError: { color: "#F08A95", fontSize: 11, lineHeight: 15 },
  success: {
    color: "#A7F3D0",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(167, 243, 208, 0.22)",
    borderRadius: radius.sm,
    padding: 11,
    fontSize: 13,
    lineHeight: 19
  },
  error: {
    color: "#FCA5A5",
    backgroundColor: "rgba(127, 29, 29, 0.26)",
    borderRadius: radius.sm,
    padding: 11,
    fontSize: 13,
    lineHeight: 19
  },
  primary: {
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryPressed: { transform: [{ translateY: 1 }], backgroundColor: "#315CC2" },
  primaryDisabled: { opacity: 0.72 },
  primaryText: { color: "#FFFFFF", fontFamily: fontFamilySemibold, fontSize: 14 },
  separator: { height: 1, width: "100%", backgroundColor: authField.separatorColor, marginTop: 6, marginBottom: 2 },
  loginPrompt: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, flexWrap: "wrap", paddingTop: 2 },
  loginPromptText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  loginPromptLink: { paddingVertical: 3 },
  loginPromptLinkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13 }
});

const webInputReset = Platform.OS === "web"
  ? ({ outlineStyle: "none" } as unknown as ComponentProps<typeof TextInput>["style"])
  : null;
