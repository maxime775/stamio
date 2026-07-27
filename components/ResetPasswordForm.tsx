import { useState, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { AuthForm } from "@/components/AuthForm";
import { PasswordStrengthRules } from "@/components/PasswordStrengthRules";
import { updateCurrentUserPassword } from "@/lib/api";
import { isStrongSignupPassword } from "@/lib/signupValidation";
import { authField, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

type Field = "password" | "confirmPassword";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState<Partial<Record<Field, boolean>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState<Partial<Record<Field, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  function fieldError(field: Field) {
    const error = validateField(field, password, confirmPassword);
    if (!error) return undefined;
    const value = field === "password" ? password : confirmPassword;
    if (!value) return submitted[field] ? error : undefined;
    return touched[field] || submitted[field] ? error : undefined;
  }

  function edit(field: Field, value: string) {
    if (field === "password") setPassword(value);
    else setConfirmPassword(value);
    setTouched((current) => ({ ...current, [field]: false }));
    setSubmitted((current) => ({ ...current, [field]: false }));
    setStatus(null);
    setGlobalError(null);
  }

  async function handleSubmit() {
    if (loading) return;
    setTouched({ password: true, confirmPassword: true });
    setSubmitted({ password: true, confirmPassword: true });
    if (validateField("password", password, confirmPassword) || validateField("confirmPassword", password, confirmPassword)) {
      setStatus(null);
      setGlobalError(null);
      return;
    }

    setLoading(true);
    setStatus(null);
    setGlobalError(null);
    const { error } = await updateCurrentUserPassword(password);
    setLoading(false);

    if (error) {
      setGlobalError("Le lien de réinitialisation est invalide ou expiré. Demandez un nouveau lien.");
      return;
    }

    setStatus("Votre mot de passe a été mis à jour.");
    router.replace("/auth/passkey-enrollment" as Href);
  }

  return (
    <AuthForm title="Nouveau mot de passe" subtitle="Choisissez un mot de passe robuste pour sécuriser votre compte Stamio." maxWidth={390} compact>
      <PasswordInput
        field="password"
        label="Nouveau mot de passe"
        error={fieldError("password")}
        value={password}
        onBlur={() => setTouched((current) => ({ ...current, password: true }))}
        onChangeText={(value) => edit("password", value)}
        secureTextEntry={!visible.password}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        placeholder="Votre nouveau mot de passe"
        rightElement={<PasswordEye visible={Boolean(visible.password)} onPress={() => setVisible((current) => ({ ...current, password: !current.password }))} />}
      />
      {!fieldError("password") ? <PasswordStrengthRules password={password} /> : null}
      <PasswordInput
        field="confirmPassword"
        label="Confirmation"
        error={fieldError("confirmPassword")}
        value={confirmPassword}
        onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
        onChangeText={(value) => edit("confirmPassword", value)}
        secureTextEntry={!visible.confirmPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        onKeyPress={(event) => {
          if (Platform.OS === "web" && event.nativeEvent.key === "Enter") void handleSubmit();
        }}
        placeholder="Confirmez le mot de passe"
        rightElement={<PasswordEye visible={Boolean(visible.confirmPassword)} onPress={() => setVisible((current) => ({ ...current, confirmPassword: !current.confirmPassword }))} />}
      />
      {status ? <Text accessibilityLiveRegion="polite" style={styles.success}>{status}</Text> : null}
      {globalError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{globalError}</Text> : null}
      <Pressable accessibilityRole="button" disabled={loading} onPress={handleSubmit} style={({ pressed }) => StyleSheet.flatten([styles.primary, pressed && !loading && styles.primaryPressed, loading && styles.primaryDisabled])}>
        {loading ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.primaryText}>Mettre à jour le mot de passe</Text>}
      </Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.replace("/auth/login" as Href)} style={styles.link}>
        <Text style={styles.linkText}>Retour à la connexion</Text>
      </Pressable>
    </AuthForm>
  );
}

function validateField(field: Field, password: string, confirmPassword: string) {
  if (field === "password") {
    if (!password) return "Le mot de passe est obligatoire.";
    return isStrongSignupPassword(password)
      ? null
      : "Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.";
  }
  if (!confirmPassword) return "La confirmation du mot de passe est obligatoire.";
  return password === confirmPassword ? null : "Les mots de passe ne correspondent pas.";
}

function PasswordEye({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      onPress={onPress}
      style={({ pressed }) => StyleSheet.flatten([styles.eyeButton, pressed && styles.eyeButtonPressed])}
    >
      {visible ? <EyeOff size={18} color={palette.muted} /> : <Eye size={18} color={palette.muted} />}
    </Pressable>
  );
}

function PasswordInput({
  field,
  label,
  error,
  rightElement,
  style,
  onFocus,
  onBlur,
  ...props
}: ComponentProps<typeof TextInput> & { field: Field; label: string; error?: string; rightElement?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  const errorId = `reset-password-${field}-error`;
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
          style={StyleSheet.flatten([styles.input, webInputReset, styles.inputWithAction, style])}
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
  success: {
    color: palette.positiveText,
    backgroundColor: palette.positiveSoft,
    borderWidth: 1,
    borderColor: palette.positiveLine,
    borderRadius: radius.sm,
    padding: 11,
    fontSize: 13,
    lineHeight: 19
  },
  error: {
    color: palette.dangerText,
    backgroundColor: palette.dangerSoft,
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
  primaryPressed: { transform: [{ translateY: 1 }], backgroundColor: palette.primaryPressed },
  primaryDisabled: { opacity: 0.72 },
  primaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold, fontSize: 14 },
  eyeButton: { width: 40, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.xs, borderWidth: 0, backgroundColor: "transparent" },
  eyeButtonPressed: { backgroundColor: "rgba(148, 163, 184, 0.1)" },
  link: { alignItems: "center", padding: 7 },
  linkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13 }
});

const webInputReset = Platform.OS === "web"
  ? ({ outlineStyle: "none" } as unknown as ComponentProps<typeof TextInput>["style"])
  : null;
