import { StyleSheet, Text, View } from "react-native";
import { getSexLabel } from "@/lib/product";
import type { Profile } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

type Props = {
  profile: Profile | null;
  email?: string | null;
};

export function AccountSummary({ profile, email }: Props) {
  const phone = profile?.phone_last4 ? `••••••${profile.phone_last4}` : "Non renseigné";

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Profil</Text>
      <View style={styles.grid}>
        <Field label="Email" value={profile?.email ?? email ?? "Non renseigné"} />
        <Field label="Sexe" value={getSexLabel(profile?.sex)} />
        <Field label="Âge" value={profile?.age ? `${profile.age} ans` : "Non renseigné"} />
        <Field label="Profession" value={profile?.profession ?? "Non renseigné"} />
        <Field label="Région" value={profile?.region ?? "Non renseigné"} />
        <Field label="Téléphone" value={phone} />
      </View>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, padding: 20, gap: 18 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  field: { minWidth: 190, flex: 1, borderRadius: radius.sm, backgroundColor: palette.surfaceSubtle, padding: 14, gap: 5 },
  label: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" },
  value: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 14 }
});
