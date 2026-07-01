import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { ResultsBars } from "@/components/ResultsBars";
import { getThemeLabel } from "@/lib/product";
import type { PollWithStats } from "@/lib/types";

type Props = {
  poll: PollWithStats;
};

export function ResultsPreviewCard({ poll }: Props) {
  const router = useRouter();
  const date = poll.created_at ? new Date(poll.created_at).toLocaleDateString("fr-FR") : "Date non disponible";

  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <Text style={styles.theme}>{getThemeLabel(poll.theme)}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      <Text style={styles.question}>{poll.question}</Text>
      {poll.results && poll.results.length > 0 ? (
        <ResultsBars results={poll.results} />
      ) : (
        <Text style={styles.empty}>Aucun vote comptabilisé pour le moment.</Text>
      )}
      <Pressable onPress={() => router.push(`/poll/${poll.id}` as Href)} style={styles.link}>
        <Text style={styles.linkText}>Voir le détail</Text>
        <ArrowRight size={16} color="#A7F3D0" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    padding: 20,
    gap: 16
  },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  theme: {
    color: "#A7F3D0",
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden"
  },
  date: { color: "#94A3B8", fontWeight: "800", fontSize: 13 },
  question: { color: "#F8FAFC", fontSize: 21, lineHeight: 28, fontWeight: "900" },
  empty: { color: "#94A3B8", backgroundColor: "rgba(2, 6, 23, 0.42)", borderRadius: 14, padding: 14, fontWeight: "700" },
  link: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  linkText: { color: "#A7F3D0", fontWeight: "900" }
});
