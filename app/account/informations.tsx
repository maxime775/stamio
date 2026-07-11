import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AccountSummary } from "@/components/AccountSummary";
import { AuthSexSegmented, AuthTextField } from "@/components/AuthFields";
import { PageShell } from "@/components/PageShell";
import { ProfessionSelect } from "@/components/ProfessionSelect";
import { RegionSelect } from "@/components/RegionSelect";
import { useAuth } from "@/components/AuthProvider";
import { checkUsernameAvailability, getCurrentUserProfile, updateCurrentUserEmail, updateMyProfileField } from "@/lib/api";
import { isValidEmail, normalizeAuthEmail } from "@/lib/authValidation";
import { CSP_PROFESSIONS, REGIONS_FR } from "@/lib/product";
import { isValidSignupUsername, normalizeSignupUsername } from "@/lib/signupValidation";
import type { Profile, ProfileUpdateField, Sex } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius, shadows } from "@/lib/design";

type EditableField = ProfileUpdateField | "email";

const FIELD_TITLES: Record<EditableField, string> = {
  username: "Modifier le pseudo",
  email: "Modifier l'email",
  sex: "Modifier le sexe",
  age: "Modifier l'âge",
  profession: "Modifier la profession",
  region: "Modifier la région"
};

export default function AccountInformationsPage() {
  const router = useRouter();
  const { user, loading: authLoading, emailVerified } = useAuth();
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? "";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [phoneInfoVisible, setPhoneInfoVisible] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      router.replace("/auth/login" as Href);
      return;
    }
    if (!emailVerified) {
      router.replace({ pathname: "/auth/verify-email", params: { email: userEmail } } as Href);
      return;
    }

    let active = true;
    getCurrentUserProfile()
      .then((nextProfile) => {
        if (active) setProfile(nextProfile);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, emailVerified, router, userEmail, userId]);

  const email = profile?.email ?? userEmail;

  if (authLoading || loading) {
    return (
      <PageShell compact>
        <View style={styles.loading}>
          <ActivityIndicator color={palette.primaryStrong} />
          <Text style={styles.loadingText}>Chargement des informations</Text>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <View style={styles.heading}>
        <Text style={styles.kicker}>Mon compte</Text>
        <Text style={styles.title}>Mes informations</Text>
        <Text style={styles.subtitle}>Gérez les informations associées à votre compte Stamio.</Text>
      </View>

      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}

      <View style={styles.content}>
        <AccountSummary
          profile={profile}
          email={email}
          onEdit={(field) => {
            setNotice(null);
            setEditingField(field);
          }}
          onPhoneInfo={() => setPhoneInfoVisible(true)}
        />
      </View>

      <ProfileEditModal
        field={editingField}
        profile={profile}
        email={email}
        onClose={() => setEditingField(null)}
        onSaved={(nextProfile, message) => {
          if (nextProfile) setProfile(nextProfile);
          setNotice(message);
          setEditingField(null);
        }}
      />
      <PhoneInfoModal visible={phoneInfoVisible} onClose={() => setPhoneInfoVisible(false)} />
    </PageShell>
  );
}

function ProfileEditModal({
  field,
  profile,
  email,
  onClose,
  onSaved
}: {
  field: EditableField | null;
  profile: Profile | null;
  email: string;
  onClose: () => void;
  onSaved: (profile: Profile | null, message: string) => void;
}) {
  const [value, setValue] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!field) return;
    setError(null);
    setSaving(false);
    if (field === "email") setValue(email);
    else if (field === "username") setValue(profile?.username ?? "");
    else if (field === "age") setValue(profile?.age ? String(profile.age) : "");
    else if (field === "profession") setValue(profile?.profession ?? "");
    else if (field === "region") setValue(profile?.region ?? REGIONS_FR[0]);
    else if (field === "sex") setSex(profile?.sex ?? null);
  }, [email, field, profile]);

  const title = field ? FIELD_TITLES[field] : "";
  const canSave = useMemo(() => Boolean(field) && !saving, [field, saving]);

  async function handleSave() {
    if (!field || saving) return;
    const validation = validateEdit(field, field === "sex" ? sex : value);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError(null);

    if (field === "email") {
      const { error: emailError } = await updateCurrentUserEmail(normalizeAuthEmail(value));
      setSaving(false);
      if (emailError) {
        setError("La modification de l'email n'a pas pu être demandée.");
        return;
      }
      onSaved(null, "Un email de confirmation vous a été envoyé.");
      return;
    }

    const normalizedValue = field === "username"
      ? normalizeSignupUsername(value)
      : field === "sex"
        ? sex ?? ""
        : value.trim();

    if (field === "username") {
      const availability = await checkUsernameAvailability(normalizedValue);
      if (availability.available === false) {
        setSaving(false);
        setError("Ce pseudo est déjà utilisé.");
        return;
      }
    }

    const result = await updateMyProfileField(field, normalizedValue);
    setSaving(false);
    if (result.error) {
      setError("La modification n'a pas pu être enregistrée.");
      return;
    }
    onSaved(result.profile, "Vos informations ont été mises à jour.");
  }

  return (
    <Modal transparent visible={Boolean(field)} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.scrim} onPress={saving ? undefined : onClose} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          {field ? (
            <View style={styles.formBody}>
              {field === "username" ? (
                <AuthTextField field="account-username" label="Pseudo" error={error ?? undefined} value={value} onChangeText={(next) => { setValue(next); setError(null); }} autoCapitalize="none" placeholder="Choisissez votre pseudo" />
              ) : null}
              {field === "email" ? (
                <AuthTextField field="account-email" label="Adresse e-mail" error={error ?? undefined} value={value} onChangeText={(next) => { setValue(next); setError(null); }} keyboardType="email-address" autoCapitalize="none" placeholder="Saisissez votre adresse e-mail" />
              ) : null}
              {field === "age" ? (
                <AuthTextField field="account-age" label="Âge" error={error ?? undefined} value={value} onChangeText={(next) => { setValue(next); setError(null); }} keyboardType="number-pad" placeholder="34" />
              ) : null}
              {field === "sex" ? (
                <AuthSexSegmented value={sex} error={error ?? undefined} onBlur={() => undefined} onChange={(next) => { setSex(next); setError(null); }} />
              ) : null}
              {field === "profession" ? (
                <ProfessionSelect value={value} error={error ?? undefined} onChange={(next) => { setValue(next); setError(null); }} />
              ) : null}
              {field === "region" ? (
                <RegionSelect value={value} error={error ?? undefined} onChange={(next) => { setValue(next); setError(null); }} />
              ) : null}
            </View>
          ) : null}
          <View style={styles.modalActions}>
            <Pressable disabled={saving} onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Annuler</Text>
            </Pressable>
            <Pressable disabled={!canSave} onPress={handleSave} style={({ pressed }) => StyleSheet.flatten([styles.primaryButton, (!canSave || saving) && styles.primaryDisabled, pressed && canSave && styles.primaryPressed])}>
              {saving ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.primaryText}>Enregistrer</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PhoneInfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Modifier le téléphone</Text>
          <Text style={styles.modalText}>La modification du téléphone nécessitera une vérification par code.</Text>
          <Text style={styles.modalText}>Cette action sera limitée à une fois par mois lorsque le flux sécurisé dédié sera activé.</Text>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Compris</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function validateEdit(field: EditableField, value: string | Sex | null) {
  if (field === "email") {
    return typeof value === "string" && isValidEmail(value) ? null : "Veuillez saisir une adresse email valide.";
  }
  if (field === "username") {
    if (typeof value !== "string" || !value.trim()) return "Le pseudo est obligatoire.";
    return isValidSignupUsername(value) ? null : "Le pseudo doit contenir entre 3 et 20 caractères, sans espace.";
  }
  if (field === "age") {
    if (typeof value !== "string" || !value.trim()) return "L'âge est obligatoire.";
    const age = Number(value);
    return /^\d{1,3}$/.test(value.trim()) && Number.isInteger(age) && age >= 13 && age <= 120
      ? null
      : "Veuillez saisir un âge valide entre 13 et 120 ans.";
  }
  if (field === "sex") return value === "homme" || value === "femme" ? null : "Veuillez sélectionner votre sexe.";
  if (field === "profession") return typeof value === "string" && (CSP_PROFESSIONS as readonly string[]).includes(value) ? null : "Veuillez sélectionner une profession.";
  if (field === "region") return typeof value === "string" && REGIONS_FR.includes(value) ? null : "Veuillez sélectionner une région.";
  return null;
}

const styles = StyleSheet.create({
  heading: { gap: 7, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: palette.line },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 36, lineHeight: 43, letterSpacing: -0.8 },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 21 },
  content: { width: "100%", maxWidth: 720 },
  notice: { color: palette.positiveText, backgroundColor: palette.positiveSoft, borderWidth: 1, borderColor: palette.positiveLine, borderRadius: radius.sm, padding: 12 },
  loading: { padding: 24, alignItems: "center", gap: 10 },
  loadingText: { color: palette.muted, fontFamily: fontFamilyMedium },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 6, 23, 0.72)" },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    padding: 20,
    gap: 14,
    ...shadows.panel
  },
  modalTitle: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 21, lineHeight: 27 },
  modalText: { color: palette.inkSecondary, fontSize: 14, lineHeight: 21 },
  formBody: { gap: 12 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  secondaryButton: { minHeight: 44, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.lineStrong, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium },
  primaryButton: { minHeight: 44, borderRadius: radius.sm, backgroundColor: palette.primary, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  primaryDisabled: { opacity: 0.58 },
  primaryPressed: { transform: [{ translateY: 1 }], backgroundColor: palette.primaryPressed },
  primaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold }
});
