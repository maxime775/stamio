import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Pencil } from "lucide-react-native";
import { getSexLabel } from "@/lib/product";
import type { Profile, ProfileUpdateField } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

type Props = {
  profile: Profile | null;
  email?: string | null;
  onEdit?: (field: ProfileUpdateField | "email") => void;
  onPhoneInfo?: () => void;
};

export function AccountSummary({ profile, email, onEdit, onPhoneInfo }: Props) {
  const phone = profile?.phone_last4 ? `••••••${profile.phone_last4}` : "Non renseigné";

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Mes informations</Text>
      <View style={styles.grid}>
        <Field label="Pseudo" value={profile?.username ?? "Non renseigné"} onEdit={onEdit ? () => onEdit("username") : undefined} />
        <Field label="Email" value={profile?.email ?? email ?? "Non renseigné"} onEdit={onEdit ? () => onEdit("email") : undefined} />
        <Field label="Sexe" value={getSexLabel(profile?.sex)} onEdit={onEdit ? () => onEdit("sex") : undefined} />
        <Field label="Âge" value={profile?.age ? `${profile.age} ans` : "Non renseigné"} onEdit={onEdit ? () => onEdit("age") : undefined} />
        <Field label="Profession" value={profile?.profession ?? "Non renseigné"} onEdit={onEdit ? () => onEdit("profession") : undefined} />
        <Field label="Région" value={profile?.region ?? "Non renseigné"} onEdit={onEdit ? () => onEdit("region") : undefined} />
        <Field label="Téléphone" value={phone} onEdit={onPhoneInfo} />
      </View>
    </View>
  );
}

function Field({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldMain}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {onEdit ? <EditButton onPress={onEdit} /> : null}
    </View>
  );
}

function EditButton({ onPress }: { onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <View style={styles.editWrap}>
      <Pressable
        accessibilityLabel="Modifier"
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={onPress}
        style={({ pressed }) => StyleSheet.flatten([styles.editButton, hovered && styles.editButtonHovered, pressed && styles.editButtonPressed])}
      >
        <Pencil size={14} color={palette.inkSecondary} />
      </Pressable>
      {hovered ? <Text style={styles.tooltip}>Modifier</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", gap: 16 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 24, lineHeight: 30 },
  grid: { gap: 8 },
  field: {
    minHeight: 58,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  fieldMain: { flex: 1, minWidth: 0, gap: 3 },
  label: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" },
  value: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 14, lineHeight: 20 },
  editWrap: { position: "relative", alignItems: "center", justifyContent: "center" },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent"
  },
  editButtonHovered: { backgroundColor: palette.primarySoft, borderColor: palette.lineStrong },
  editButtonPressed: { opacity: 0.72 },
  tooltip: {
    position: "absolute",
    bottom: 36,
    right: 0,
    borderRadius: radius.xs,
    backgroundColor: palette.surfaceRaised,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    color: palette.inkSecondary,
    fontFamily: fontFamilyMedium,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 5
  }
});
