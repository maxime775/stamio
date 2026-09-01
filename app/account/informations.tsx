import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AccountSummary } from "@/components/AccountSummary";
import { AuthSexSegmented, AuthTextField } from "@/components/AuthFields";
import { PageShell } from "@/components/PageShell";
import { PasskeyManagementSection } from "@/components/PasskeyManagementSection";
import { ProfessionSelect } from "@/components/ProfessionSelect";
import { RegionSelect } from "@/components/RegionSelect";
import { useAuth } from "@/components/AuthProvider";
import { checkUsernameAvailability, getCurrentUserProfile, updateCurrentUserEmail, updateMyCommunicationsEmailPreference, updateMyProfileField } from "@/lib/api";
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [communicationsPreferenceSaving, setCommunicationsPreferenceSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login" as Href); return; }
    if (!emailVerified) { router.replace({ pathname: "/auth/verify-email", params: { email: user.email ?? "" } } as Href); return; }
    let active = true;
    getCurrentUserProfile()
      .then((next) => {
        if (!active) return;
        if (next?.passkey_required_at && !next.passkey_enrolled_at) {
          router.replace("/auth/passkey-enrollment" as Href);
          return;
        }
        setProfile(next);
      })
      .catch(() => {
        if (active) setProfile(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, emailVerified, router, user?.email, user?.id]);

  async function toggleCommunicationsPreference() {
    if (communicationsPreferenceSaving) return;
    const nextOptIn = profile?.communications_email_opt_in !== true;
    setCommunicationsPreferenceSaving(true);
    setNotice(null);
    const result = await updateMyCommunicationsEmailPreference(nextOptIn);
    setCommunicationsPreferenceSaving(false);
    if (result.error || !result.profile) {
      setNotice("La préférence de communications n’a pas pu être enregistrée.");
      return;
    }
    setProfile(result.profile);
    setNotice(nextOptIn ? "Les communications par e-mail sont activées." : "Les communications par e-mail sont désactivées.");
  }

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
        <Text style={styles.kicker}>MON COMPTE</Text>
        <Text style={styles.title}>Mes informations</Text>
        <Text style={styles.subtitle}>Gérez les informations associées à votre compte Stamio.</Text>
      </View>
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
      <View style={styles.content}>
        <AccountSummary
          profile={profile}
          email={profile?.email ?? user?.email ?? ""}
          onEdit={(field) => {
            setNotice(null);
            setEditingField(field);
          }}
          communicationsPreferenceSaving={communicationsPreferenceSaving}
          onToggleCommunications={toggleCommunicationsPreference}
        />
      </View>
      <PasskeyManagementSection />
      <ProfileEditModal
        field={editingField}
        profile={profile}
        email={profile?.email ?? user?.email ?? ""}
        onClose={() => setEditingField(null)}
        onSaved={(nextProfile, message) => {
          if (nextProfile) setProfile(nextProfile);
          setNotice(message);
          setEditingField(null);
        }}
      />
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
      if (availability.available === null) {
        setSaving(false);
        setError("La disponibilité du pseudo n'a pas pu être vérifiée.");
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
        <Pressable accessibilityLabel="Fermer la modification" style={styles.scrim} onPress={saving ? undefined : onClose} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{field ? FIELD_TITLES[field] : ""}</Text>
          {field ? (
            <View style={styles.formBody}>
              {field === "username" ? <AuthTextField field="account-username" label="Pseudo" error={error ?? undefined} value={value} onChangeText={(next) => { setValue(next); setError(null); }} autoCapitalize="none" placeholder="Choisissez votre pseudo" /> : null}
              {field === "email" ? <AuthTextField field="account-email" label="Adresse e-mail" error={error ?? undefined} value={value} onChangeText={(next) => { setValue(next); setError(null); }} keyboardType="email-address" autoCapitalize="none" placeholder="Saisissez votre adresse e-mail" /> : null}
              {field === "age" ? <AuthTextField field="account-age" label="Âge" error={error ?? undefined} value={value} onChangeText={(next) => { setValue(next); setError(null); }} keyboardType="number-pad" placeholder="34" /> : null}
              {field === "sex" ? <AuthSexSegmented value={sex} error={error ?? undefined} onBlur={() => undefined} onChange={(next) => { setSex(next); setError(null); }} /> : null}
              {field === "profession" ? <ProfessionSelect value={value} error={error ?? undefined} onChange={(next) => { setValue(next); setError(null); }} /> : null}
              {field === "region" ? <RegionSelect value={value} error={error ?? undefined} onChange={(next) => { setValue(next); setError(null); }} /> : null}
            </View>
          ) : null}
          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={({ pressed }) => StyleSheet.flatten([styles.secondaryButton, pressed && !saving && styles.buttonPressed])}>
              <Text style={styles.secondaryText}>Annuler</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSave, busy: saving }} disabled={!canSave} onPress={handleSave} style={({ pressed }) => StyleSheet.flatten([styles.primaryButton, (!canSave || saving) && styles.primaryDisabled, pressed && canSave && styles.primaryPressed])}>
              {saving ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.primaryText}>Enregistrer</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function validateEdit(field: EditableField, value: string | Sex | null) {
  if (field === "email") return typeof value === "string" && isValidEmail(value) ? null : "Veuillez saisir une adresse email valide.";
  if (field === "username") return typeof value === "string" && isValidSignupUsername(normalizeSignupUsername(value)) ? null : "Le pseudo doit contenir entre 3 et 20 caractères, sans espace.";
  if (field === "age") { const age = Number(value); return Number.isInteger(age) && age >= 13 && age <= 120 ? null : "Veuillez saisir un âge valide entre 13 et 120 ans."; }
  if (field === "sex") return value === "homme" || value === "femme" ? null : "Veuillez sélectionner votre sexe.";
  if (field === "profession") return typeof value === "string" && (CSP_PROFESSIONS as readonly string[]).includes(value) ? null : "Veuillez sélectionner une profession.";
  return typeof value === "string" && REGIONS_FR.includes(value) ? null : "Veuillez sélectionner une région.";
}

const styles = StyleSheet.create({
  heading: { gap: 7, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: palette.line },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 36, lineHeight: 43 },
  subtitle: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 14 },
  notice: { color: palette.positiveText, backgroundColor: palette.positiveSoft, borderWidth: 1, borderColor: palette.positiveLine, padding: 12, borderRadius: radius.sm },
  content: { width: "100%", maxWidth: 720 },
  loading: { padding: 24, alignItems: "center", gap: 10 },
  loadingText: { color: palette.muted, fontFamily: fontFamilyMedium },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 6, 23, 0.68)" },
  modalCard: { width: "100%", maxWidth: 430, borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, padding: 22, gap: 16, ...shadows.panel },
  modalTitle: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 22, lineHeight: 28 },
  formBody: { gap: 13 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  primaryButton: { minHeight: 44, minWidth: 120, paddingHorizontal: 16, backgroundColor: palette.primary, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  primaryDisabled: { opacity: 0.56 },
  primaryPressed: { transform: [{ translateY: 1 }], backgroundColor: palette.primaryPressed },
  primaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold },
  secondaryButton: { minHeight: 44, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.lineStrong, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: palette.inkSecondary, fontFamily: fontFamilySemibold },
  buttonPressed: { opacity: 0.72 }
});
