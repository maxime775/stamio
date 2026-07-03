import { useState } from "react";
import type { ComponentProps } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AuthForm } from "@/components/AuthForm";
import { signInUser } from "@/lib/api";
import { getVisibleLoginError, normalizeAuthEmail, validateLogin, type LoginField } from "@/lib/authValidation";
import { fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Partial<Record<LoginField, boolean>>>({});
  const [submitted, setSubmitted] = useState<Partial<Record<LoginField, boolean>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const values = { email, password };
  const validationErrors = validateLogin(values);

  function fieldError(field: LoginField) {
    return getVisibleLoginError(field, values, touched, submitted);
  }

  function edit(field: LoginField, value: string) {
    if (field === "email") setEmail(value);
    else setPassword(value);
    setSubmitted((current) => ({ ...current, [field]: false }));
  }

  async function handleSubmit() {
    setTouched({ email: true, password: true });
    setSubmitted({ email: true, password: true });
    if (Object.keys(validationErrors).length > 0) {
      setGlobalError(null);
      return;
    }

    setLoading(true);
    setGlobalError(null);
    const normalizedEmail = normalizeAuthEmail(email);
    const { data, error: loginError } = await signInUser(normalizedEmail, password);
    setLoading(false);

    if (loginError) {
      setGlobalError(loginError.message);
      return;
    }

    if (!data.user?.email_confirmed_at) {
      router.replace({ pathname: "/auth/verify-email", params: { email: normalizedEmail } } as Href);
      return;
    }

    router.replace("/account" as Href);
  }

  return (
    <AuthForm title="Se connecter" subtitle="Accédez à votre profil, votre historique et votre réputation." maxWidth={460}>
      <LoginInput field="email" label="Email" error={fieldError("email")} value={email} onBlur={() => setTouched((current) => ({ ...current, email: true }))} onChangeText={(value) => edit("email", value)} keyboardType="email-address" autoCapitalize="none" placeholder="vous@example.com" />
      <LoginInput field="password" label="Mot de passe" error={fieldError("password")} value={password} onBlur={() => setTouched((current) => ({ ...current, password: true }))} onChangeText={(value) => edit("password", value)} secureTextEntry placeholder="Votre mot de passe" />
      {globalError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{globalError}</Text> : null}
      <Pressable accessibilityRole="button" disabled={loading} onPress={handleSubmit} style={({ pressed }) => ({ ...styles.primary, ...(pressed ? styles.primaryPressed : {}) })}>
        {loading ? <ActivityIndicator color="#06111C" /> : <Text style={styles.primaryText}>Se connecter</Text>}
      </Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push("/auth/signup" as Href)} style={styles.link}>
        <Text style={styles.linkText}>S’inscrire</Text>
      </Pressable>
    </AuthForm>
  );
}

function LoginInput({ field, label, error, ...props }: ComponentProps<typeof TextInput> & { field: LoginField; label: string; error?: string }) {
  const errorId = `login-${field}-error`;
  const webAccessibilityProps = Platform.OS === "web"
    ? ({ "aria-invalid": Boolean(error), "aria-describedby": error ? errorId : undefined } as ComponentProps<typeof TextInput>)
    : {};
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput {...webAccessibilityProps} {...props} accessibilityHint={error} placeholderTextColor="#64748B" style={StyleSheet.flatten([styles.input, error && styles.inputInvalid])} />
    {error ? <Text nativeID={errorId} accessibilityLiveRegion="polite" style={styles.fieldError}>{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  input: {
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.26)",
    backgroundColor: palette.surfaceSubtle,
    paddingHorizontal: 14,
    color: "#F8FAFC",
    fontSize: 16,
    fontFamily: fontFamilyMedium
  },
  inputInvalid: { borderColor: "rgba(227, 93, 106, 0.68)", backgroundColor: "rgba(91, 24, 33, 0.12)" },
  fieldError: { color: "#F08A95", fontSize: 11, lineHeight: 15 },
  error: {
    color: "#FCA5A5",
    backgroundColor: "rgba(127, 29, 29, 0.26)",
    borderRadius: radius.sm,
    padding: 12,
    fontFamily: fontFamilyMedium
  },
  primary: {
    minHeight: 52,
    borderRadius: radius.sm,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryPressed: { transform: [{ translateY: 1 }], backgroundColor: "#315CC2" },
  primaryText: { color: "#FFFFFF", fontFamily: fontFamilySemibold, fontSize: 15 },
  link: { alignItems: "center", padding: 8 },
  linkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold }
});
