import { StyleSheet, Text, View } from "react-native";
import { getSexLabel } from "@/lib/product";
import type { Profile } from "@/lib/types";

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
  card: { borderRadius: 20, backgroundColor: "rgba(15, 23, 42, 0.92)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.18)", padding: 20, gap: 18 },
  title: { color: "#F8FAFC", fontSize: 22, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  field: { minWidth: 190, flex: 1, borderRadius: 14, backgroundColor: "rgba(2, 6, 23, 0.42)", padding: 14, gap: 5 },
  label: { color: "#94A3B8", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  value: { color: "#F8FAFC", fontSize: 15, fontWeight: "800" }
});
