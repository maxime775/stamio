import { StyleSheet, Text, View } from "react-native";
import { PageShell } from "@/components/PageShell";
import { fontFamilyBold, fontFamilySemibold, palette, radius } from "@/lib/design";

export default function AboutPage() {
  return (
    <PageShell>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Qui sommes-nous</Text>
        <Text style={styles.title}>Une plateforme de sondages interactifs vérifiés.</Text>
        <Text style={styles.subtitle}>
          Stamio vise à rendre les résultats de sondages web plus fiables grâce à une validation de participation, un anti-doublon par question et des résultats transparents.
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
  hero: { borderRadius: radius.md, backgroundColor: palette.surfaceSubtle, borderWidth: 1, borderColor: palette.line, padding: 30, gap: 12 },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 40, lineHeight: 47, letterSpacing: -1, maxWidth: 760 },
  subtitle: { color: palette.inkSecondary, fontSize: 16, lineHeight: 26, maxWidth: 820 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  section: { flex: 1, minWidth: 300, borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, padding: 22, gap: 14 },
  sectionTitle: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 21 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 5, height: 5, borderRadius: 1, backgroundColor: palette.primaryStrong, marginTop: 8 },
  item: { color: palette.inkSecondary, fontSize: 14, lineHeight: 22, flex: 1 }
});
