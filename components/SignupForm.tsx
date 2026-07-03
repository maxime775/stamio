import { useState } from "react";
import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AuthForm } from "@/components/AuthForm";
import { PasswordStrengthRules, isStrongPassword } from "@/components/PasswordStrengthRules";
import { RegionSelect } from "@/components/RegionSelect";
import { ProfessionSelect } from "@/components/ProfessionSelect";
import { REGIONS_FR, SEX_OPTIONS, isSex } from "@/lib/product";
import { signUpUser } from "@/lib/api";
import { normalizePhoneInput } from "@/lib/validation";
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const parsedAge = Number.parseInt(age, 10);
    const normalizedPhone = normalizePhoneInput(phone);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedConfirmEmail = confirmEmail.trim().toLowerCase();

    if (!normalizedEmail.includes("@")) return setError("Adresse email invalide.");
    if (normalizedEmail !== normalizedConfirmEmail) return setError("Les adresses email ne correspondent pas.");
    if (!isStrongPassword(password)) return setError("Le mot de passe ne respecte pas les règles de sécurité.");
    if (password !== confirmPassword) return setError("Les mots de passe ne correspondent pas.");
    if (!sex || !isSex(sex)) return setError("Le champ Sexe est obligatoire.");
    if (!Number.isFinite(parsedAge) || parsedAge < 13 || parsedAge > 120) return setError("Âge invalide.");
    if (!profession) return setError("Sélectionnez un groupe socioprofessionnel.");
    if (!normalizedPhone.ok) return setError("Numéro invalide. Utilisez le format international, par exemple +33612345678.");

    setLoading(true);
    setError(null);
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
      setError(signupError.message);
      return;
    }

    router.replace({ pathname: "/auth/verify-email", params: { email: normalizedEmail } } as Href);
  }

  return (
    <AuthForm
      title="Créer un compte gratuit"
      subtitle="Votre compte débloque la participation au-delà de la limite visiteur et prépare votre réputation citoyenne."
      maxWidth={600}
    >
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="vous@example.com" />
      <Field label="Confirmation de l’email" value={confirmEmail} onChangeText={setConfirmEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Confirmez votre email" />
      <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry placeholder="Votre mot de passe" />
      <PasswordStrengthRules password={password} />
      <Field label="Confirmation du mot de passe" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Confirmez votre mot de passe" />

      <View style={styles.profileBlock}>
        <Text style={styles.blockTitle}>Informations de profil</Text>
        <SexSegmented value={sex} onChange={setSex} />
        <View style={styles.twoCols}>
          <Field label="Âge" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="34" />
          <ProfessionSelect value={profession} onChange={setProfession} />
        </View>
        <RegionSelect value={region} onChange={setRegion} />
        <Field label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+33612345678" />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable disabled={loading} onPress={handleSubmit} style={({ pressed }) => ({ ...styles.primary, ...(pressed ? styles.primaryPressed : {}) })}>
        {loading ? <ActivityIndicator color="#06111C" /> : <Text style={styles.primaryText}>Créer mon compte</Text>}
      </Pressable>
      <Pressable onPress={() => router.push("/auth/login" as Href)} style={styles.link}>
        <Text style={styles.linkText}>J’ai déjà un compte</Text>
      </Pressable>
    </AuthForm>
  );
}

function SexSegmented({ value, onChange }: { value: Sex | null; onChange: (value: Sex) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Sexe</Text>
      <View style={styles.segmented}>
        {SEX_OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={{ ...styles.segment, ...(active ? styles.segmentActive : {}) }}
            >
              <Text style={{ ...styles.segmentText, ...(active ? styles.segmentTextActive : {}) }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Field(props: ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#64748B" style={styles.input} {...inputProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7, flex: 1 },
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
  error: { color: "#FCA5A5", backgroundColor: "rgba(127, 29, 29, 0.26)", borderRadius: radius.sm, padding: 12 },
  primary: { minHeight: 52, borderRadius: radius.sm, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  primaryPressed: { transform: [{ translateY: 1 }], backgroundColor: "#315CC2" },
  primaryText: { color: "#FFFFFF", fontFamily: fontFamilySemibold, fontSize: 15 },
  link: { alignItems: "center", padding: 8 },
  linkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold }
});
