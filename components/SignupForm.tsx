import { useState } from "react";
import type { ComponentProps } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AuthForm } from "@/components/AuthForm";
import { PasswordStrengthRules } from "@/components/PasswordStrengthRules";
import { RegionSelect } from "@/components/RegionSelect";
import { ProfessionSelect } from "@/components/ProfessionSelect";
import { REGIONS_FR, SEX_OPTIONS } from "@/lib/product";
import { signUpUser } from "@/lib/api";
import { normalizeFrenchMobilePhoneInput } from "@/lib/validation";
import { getVisibleSignupError, normalizeSignupEmail, touchAllSignupFields, validateSignup, type SignupField, type SignupTouched, type SignupValues } from "@/lib/signupValidation";
import type { Sex } from "@/lib/types";
import { fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState("");
  const [profession, setProfession] = useState("");
  const [region, setRegion] = useState(REGIONS_FR[0]);
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState<SignupTouched>({});
  const [submitted, setSubmitted] = useState<SignupTouched>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const values: SignupValues = { email, confirmEmail, password, confirmPassword, sex, age, profession, region, phone };
  const validationErrors = validateSignup(values);

  function touch(field: SignupField) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function edit(field: SignupField, action: () => void) {
    action();
    setSubmitted((current) => ({ ...current, [field]: false }));
  }

  function fieldError(field: SignupField) {
    return getVisibleSignupError(field, values, touched, submitted);
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
    const parsedAge = Number(age);

    setLoading(true);
    setGlobalError(null);
    const { error: signupError } = await signUpUser({
      email: normalizedEmail,
      password,
      sex,
      phoneLast4: normalizedPhone.value.replace(/\D/g, "").slice(-4),
      age: parsedAge,
      profession,
      region
    });
    setLoading(false);

    if (signupError) {
      setGlobalError(signupError.message);
      return;
    }

    router.replace({ pathname: "/auth/verify-email", params: { email: normalizedEmail } } as Href);
  }

  return (
    <AuthForm
      title="S’inscrire"
      subtitle="Votre compte débloque la participation au-delà de la limite visiteur et prépare votre réputation citoyenne."
      maxWidth={600}
    >
      <Field field="email" label="Email" error={fieldError("email")} value={email} onBlur={() => touch("email")} onChangeText={(value) => edit("email", () => setEmail(value))} keyboardType="email-address" autoCapitalize="none" placeholder="vous@example.com" />
      <Field field="confirmEmail" label="Confirmation de l’email" error={fieldError("confirmEmail")} value={confirmEmail} onBlur={() => touch("confirmEmail")} onChangeText={(value) => edit("confirmEmail", () => setConfirmEmail(value))} keyboardType="email-address" autoCapitalize="none" placeholder="Confirmez votre email" />
      <Field field="password" label="Mot de passe" error={fieldError("password")} value={password} onBlur={() => touch("password")} onChangeText={(value) => edit("password", () => setPassword(value))} secureTextEntry placeholder="Votre mot de passe" />
      {!fieldError("password") ? <PasswordStrengthRules password={password} /> : null}
      <Field field="confirmPassword" label="Confirmation du mot de passe" error={fieldError("confirmPassword")} value={confirmPassword} onBlur={() => touch("confirmPassword")} onChangeText={(value) => edit("confirmPassword", () => setConfirmPassword(value))} secureTextEntry placeholder="Confirmez votre mot de passe" />

      <View style={styles.profileBlock}>
        <Text style={styles.blockTitle}>Informations de profil</Text>
        <SexSegmented error={fieldError("sex")} value={sex} onBlur={() => touch("sex")} onChange={(value) => { edit("sex", () => setSex(value)); touch("sex"); }} />
        <View style={styles.twoCols}>
          <Field field="age" label="Âge" error={fieldError("age")} value={age} onBlur={() => touch("age")} onChangeText={(value) => edit("age", () => setAge(value))} keyboardType="number-pad" placeholder="34" />
          <ProfessionSelect error={fieldError("profession")} value={profession} onBlur={() => touch("profession")} onChange={(value) => edit("profession", () => setProfession(value))} />
        </View>
        <RegionSelect error={fieldError("region")} value={region} onBlur={() => touch("region")} onChange={(value) => edit("region", () => setRegion(value))} />
        <Field field="phone" label="Téléphone" error={fieldError("phone")} value={phone} onBlur={() => touch("phone")} onChangeText={(value) => edit("phone", () => setPhone(value))} keyboardType="phone-pad" placeholder="+33612345678" />
      </View>

      {globalError ? <Text accessibilityLiveRegion="polite" style={styles.globalError}>{globalError}</Text> : null}
      <Pressable accessibilityRole="button" disabled={loading} onPress={handleSubmit} style={({ pressed }) => ({ ...styles.primary, ...(pressed ? styles.primaryPressed : {}) })}>
        {loading ? <ActivityIndicator color="#06111C" /> : <Text style={styles.primaryText}>S’inscrire</Text>}
      </Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push("/auth/login" as Href)} style={styles.link}>
        <Text style={styles.linkText}>J’ai déjà un compte</Text>
      </Pressable>
    </AuthForm>
  );
}

function SexSegmented({ value, error, onBlur, onChange }: { value: Sex | null; error?: string; onBlur: () => void; onChange: (value: Sex) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Sexe</Text>
      <View accessibilityRole="radiogroup" style={StyleSheet.flatten([styles.segmented, error && styles.controlInvalid])}>
        {SEX_OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onBlur={onBlur}
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

function Field(props: ComponentProps<typeof TextInput> & { field: SignupField; label: string; error?: string }) {
  const { field, label, error, ...inputProps } = props;
  const errorId = `signup-${field}-error`;
  const webAccessibilityProps = Platform.OS === "web"
    ? ({ "aria-invalid": Boolean(error), "aria-describedby": error ? errorId : undefined } as ComponentProps<typeof TextInput>)
    : {};
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...webAccessibilityProps}
        accessibilityHint={error}
        nativeID={`signup-${field}`}
        placeholderTextColor="#64748B"
        style={StyleSheet.flatten([styles.input, error && styles.controlInvalid])}
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
  field: { gap: 6, flex: 1 },
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
  controlInvalid: { borderColor: "rgba(227, 93, 106, 0.68)", backgroundColor: "rgba(91, 24, 33, 0.12)" },
  errorSlot: { justifyContent: "center" },
  fieldError: { color: "#F08A95", fontSize: 11, lineHeight: 15 },
  profileBlock: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 16,
    gap: 13
  },
  blockTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 15 },
  twoCols: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  segmented: {
    minHeight: 48,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceSubtle,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.26)",
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
  segmentTextActive: { color: "#FFFFFF" },
  globalError: { color: "#FCA5A5", backgroundColor: "rgba(127, 29, 29, 0.26)", borderRadius: radius.sm, padding: 12 },
  primary: { minHeight: 52, borderRadius: radius.sm, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  primaryPressed: { transform: [{ translateY: 1 }], backgroundColor: "#315CC2" },
  primaryText: { color: "#FFFFFF", fontFamily: fontFamilySemibold, fontSize: 15 },
  link: { alignItems: "center", padding: 8 },
  linkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold }
});
