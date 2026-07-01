import { StyleSheet, Text, View } from "react-native";
import { PageShell } from "@/components/PageShell";

export default function AboutPage() {
  return (
    <PageShell>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Qui sommes-nous</Text>
        <Text style={styles.title}>Une plateforme de sondages interactifs vérifiés.</Text>
        <Text style={styles.subtitle}>
          Sayit vise à rendre les résultats de sondages web plus fiables grâce à une validation de participation, un anti-doublon par question et des résultats transparents.
        </Text>
      </View>

      <View style={styles.grid}>
        <Section
          title="Notre méthode"
          items={[
            "Un vote comptabilisé uniquement via le flux sécurisé côté serveur.",
            "Un anti-doublon technique par question.",
            "Aucun numéro en clair dans les tables de vote.",
            "Des résultats affichés uniquement sous forme agrégée."
          ]}
        />
        <Section
          title="Ce que nous ne sommes pas"
          items={[
            "Pas une solution de vote politique officiel.",
            "Pas un institut de sondage représentatif au sens statistique.",
            "Pas une plateforme de pari, de conseil financier ou de prédiction rémunérée."
          ]}
        />
      </View>
    </PageShell>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.row}>
          <View style={styles.dot} />
          <Text style={styles.item}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 26, backgroundColor: "#0F172A", padding: 28, gap: 12 },
  kicker: { color: "#A7F3D0", fontWeight: "900", textTransform: "uppercase", fontSize: 13 },
  title: { color: "#FFFFFF", fontSize: 42, lineHeight: 48, fontWeight: "900", letterSpacing: 0, maxWidth: 760 },
  subtitle: { color: "#CBD5E1", fontSize: 17, lineHeight: 26, maxWidth: 820 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  section: { flex: 1, minWidth: 300, borderRadius: 20, backgroundColor: "rgba(15, 23, 42, 0.92)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.18)", padding: 22, gap: 14 },
  sectionTitle: { color: "#F8FAFC", fontSize: 23, fontWeight: "900" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#A7F3D0", marginTop: 7 },
  item: { color: "#CBD5E1", fontSize: 15, lineHeight: 22, flex: 1, fontWeight: "700" }
});
