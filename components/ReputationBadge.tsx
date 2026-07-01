import { StyleSheet, Text, View } from "react-native";
import { Award } from "lucide-react-native";

type Props = {
  score: number;
};

export function reputationLevel(score: number) {
  if (score >= 50) return "Référent";
  if (score >= 20) return "Voix active";
  if (score >= 5) return "Contributeur";
  return "Observateur";
}

export function ReputationBadge({ score }: Props) {
  const level = reputationLevel(score);
  const next = score >= 50 ? 50 : score >= 20 ? 50 : score >= 5 ? 20 : 5;
  const progress = Math.min(score / next, 1);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Award size={22} color="#A7F3D0" />
        </View>
        <View>
          <Text style={styles.score}>{score} point{score > 1 ? "s" : ""}</Text>
          <Text style={styles.level}>{level}</Text>
        </View>
      </View>
      <View style={styles.track}>
        <View style={StyleSheet.flatten([styles.fill, { width: `${progress * 100}%` }])} />
      </View>
      <Text style={styles.note}>+1 point par question répondue via le parcours vérifié.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, backgroundColor: "rgba(15, 23, 42, 0.92)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.18)", padding: 20, gap: 14 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "rgba(20, 184, 166, 0.12)", alignItems: "center", justifyContent: "center" },
  score: { color: "#F8FAFC", fontSize: 24, fontWeight: "900" },
  level: { color: "#A7F3D0", fontWeight: "900", marginTop: 2 },
  track: { height: 10, borderRadius: 999, backgroundColor: "rgba(148, 163, 184, 0.18)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999, backgroundColor: "#A7F3D0" },
  note: { color: "#94A3B8", fontSize: 13, lineHeight: 19, fontWeight: "700" }
});
