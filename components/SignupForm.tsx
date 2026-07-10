import { useEffect, useState, type ComponentProps } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AuthForm } from "@/components/AuthForm";
import { PasswordStrengthRules } from "@/components/PasswordStrengthRules";
import { RegionSelect } from "@/components/RegionSelect";
import { ProfessionSelect } from "@/components/ProfessionSelect";
import { REGIONS_FR, SEX_OPTIONS } from "@/lib/product";
import { checkUsernameAvailability, signUpUser } from "@/lib/api";
import { formatFrenchMobilePhoneDisplay, normalizeFrenchMobilePhoneInput } from "@/lib/validation";
import { getVisibleSignupError, isValidSignupUsername, normalizeSignupEmail, normalizeSignupUsername, touchAllSignupFields, validateSignup, type SignupField, type SignupTouched, type SignupValues } from "@/lib/signupValidation";
import type { Sex } from "@/lib/types";
import { authField, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

type UsernameAvailability = "idle" | "checking" | "available" | "taken" | "invalid";

export function SignupForm() {
  const router = useRouter();
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
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState<SignupTouched>({});
  const [submitted, setSubmitted] = useState<SignupTouched>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const values: SignupValues = { email, confirmEmail, password, confirmPassword, username, sex, age, profession, region, phone };
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
    setTouched(touchAllSignupFields());
    setSubmitted(touchAllSignupFields());
    if (Object.keys(validationErrors).length > 0) {
      setGlobalError(null);
      return;
    }

    const normalizedPhone = normalizeFrenchMobilePhoneInput(phone);
    if (!normalizedPhone.ok || !sex) return;
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
    const { error: signupError } = await signUpUser({
      email: normalizedEmail,
      password,
      username: username.trim(),
      sex,
      phoneLast4: normalizedPhone.value.replace(/\D/g, "").slice(-4),
      age: parsedAge,
      profession,
      region
    });
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

    router.replace({ pathname: "/auth/verify-email", params: { email: normalizedEmail } } as Href);
  }

  return (
    <AuthForm
      title="S'inscrire"
      subtitle="Votre compte débloque la participation au-delà de la limite visiteur et prépare votre réputation citoyenne."
      maxWidth={460}
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
        <SexSegmented error={fieldError("sex")} value={sex} onBlur={() => touch("sex")} onChange={(value) => { edit("sex", () => setSex(value)); touch("sex"); }} />
        <View style={styles.twoCols}>
          <Field field="age" label="Âge" error={fieldError("age")} value={age} onBlur={() => touch("age")} onChangeText={(value) => edit("age", () => setAge(value))} keyboardType="number-pad" placeholder="34" containerStyle={styles.twoColField} />
          <ProfessionSelect error={fieldError("profession")} value={profession} onBlur={() => touch("profession")} onChange={(value) => edit("profession", () => setProfession(value))} />
        </View>
        <RegionSelect error={fieldError("region")} value={region} onBlur={() => touch("region")} onChange={(value) => edit("region", () => setRegion(value))} />
        <Field field="phone" label="Téléphone" error={fieldError("phone")} value={phone} onBlur={() => touch("phone")} onChangeText={(value) => edit("phone", () => setPhone(formatFrenchMobilePhoneDisplay(value)))} keyboardType="phone-pad" placeholder="+33 06 12 34 56 78" />
      </View>

      {globalError ? <Text accessibilityLiveRegion="polite" style={styles.globalError}>{globalError}</Text> : null}
      <Text style={styles.privacyText}>
        En continuant, vous acceptez notre <Text accessibilityRole="link" onPress={() => router.push("/confidentialite" as Href)} style={styles.privacyLink}>politique de confidentialité</Text> applicable au traitement de vos données personnelles.
      </Text>
      <Pressable accessibilityRole="button" disabled={loading} onPress={handleSubmit} style={({ pressed }) => ({ ...styles.primary, ...(pressed ? styles.primaryPressed : {}) })}>
        {loading ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.primaryText}>S'inscrire</Text>}
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

function SexSegmented({ value, error, onBlur, onChange }: { value: Sex | null; error?: string; onBlur: () => void; onChange: (value: Sex) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Sexe</Text>
      <View accessibilityRole="radiogroup" style={StyleSheet.flatten([styles.segmented, focused && styles.controlFocused, error && styles.controlInvalid])}>
        {SEX_OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                onBlur();
              }}
              onPress={() => onChange(option.value)}
              style={{ ...styles.segment, ...(active ? styles.segmentActive : {}) }}
            >
              <Text style={{ ...styles.segmentText, ...(active ? styles.segmentTextActive : {}) }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <ErrorSlot message={error} /> : null}
    </View>
  );
}

function Field(props: ComponentProps<typeof TextInput> & { field: SignupField; label: string; error?: string; containerStyle?: StyleProp<ViewStyle> }) {
  const { field, label, error, style, containerStyle, onFocus, onBlur, ...inputProps } = props;
  const [focused, setFocused] = useState(false);
  const errorId = `signup-${field}-error`;
  const webAccessibilityProps = Platform.OS === "web"
    ? ({ "aria-invalid": Boolean(error), "aria-describedby": error ? errorId : undefined } as ComponentProps<typeof TextInput>)
    : {};
  return (
    <View style={StyleSheet.flatten([styles.field, containerStyle])}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...webAccessibilityProps}
        accessibilityHint={error}
        nativeID={`signup-${field}`}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        placeholderTextColor={authField.placeholderColor}
        style={StyleSheet.flatten([styles.input, webInputReset, focused && styles.controlFocused, error && styles.controlInvalid, style])}
        {...inputProps}
      />
      {error ? <ErrorSlot nativeID={errorId} message={error} /> : null}
    </View>
  );
}

function ErrorSlot({ message, nativeID }: { message?: string; nativeID?: string }) {
  return <View style={styles.errorSlot}>{message ? <Text nativeID={nativeID} accessibilityLiveRegion="polite" style={styles.fieldError}>{message}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  field: { gap: 6, flex: 1, minWidth: 0 },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  input: {
    minHeight: 48,
    borderRadius: authField.borderRadius,
    borderWidth: authField.borderWidth,
    borderColor: "transparent",
    backgroundColor: authField.background,
    paddingHorizontal: 14,
    color: palette.ink,
    fontSize: 15,
    fontFamily: fontFamilyMedium
  },
  controlFocused: { borderColor: authField.focusBorderColor, backgroundColor: authField.backgroundFocused },
  controlInvalid: { borderColor: authField.invalidBorderColor, backgroundColor: authField.backgroundInvalid },
  errorSlot: { justifyContent: "center" },
  fieldError: { color: palette.fieldError, fontSize: 11, lineHeight: 15 },
  profileBlock: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 16,
    gap: 13
  },
  blockTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 15 },
  twoCols: { flexDirection: "row", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  twoColField: { flexGrow: 1, flexBasis: 0, minWidth: 150 },
  segmented: {
    minHeight: 48,
    borderRadius: authField.borderRadius,
    backgroundColor: authField.background,
    borderWidth: authField.borderWidth,
    borderColor: "transparent",
    padding: 4,
    flexDirection: "row",
    gap: 4
  },
  segment: {
    flex: 1,
    borderRadius: radius.xs,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10
  },
  segmentActive: { backgroundColor: palette.primary },
  segmentText: { color: palette.muted, fontFamily: fontFamilyMedium },
  segmentTextActive: { color: palette.onPrimary },
  availabilityPending: { color: palette.muted, fontSize: 11, lineHeight: 15, marginTop: -8 },
  availabilityOk: { color: palette.positiveText, fontSize: 11, lineHeight: 15, marginTop: -8 },
  globalError: { color: palette.dangerText, backgroundColor: palette.dangerSoft, borderRadius: radius.sm, padding: 12 },
  privacyText: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: -2 },
  privacyLink: { color: palette.primaryStrong, fontFamily: fontFamilySemibold },
  primary: { minHeight: 44, borderRadius: radius.sm, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  primaryPressed: { transform: [{ translateY: 1 }], backgroundColor: palette.primaryPressed },
  primaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold, fontSize: 15 },
  separator: { height: 1, width: "100%", backgroundColor: authField.separatorColor, marginTop: 6, marginBottom: 2 },
  loginPrompt: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, flexWrap: "wrap", paddingTop: 2 },
  loginPromptText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  loginPromptLink: { paddingVertical: 3 },
  loginPromptLinkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13 }
});

const webInputReset = Platform.OS === "web"
  ? ({ outlineStyle: "none" } as unknown as ComponentProps<typeof TextInput>["style"])
  : null;
