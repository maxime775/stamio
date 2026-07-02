import { StyleSheet, Text, View } from "react-native";
import { Award } from "lucide-react-native";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

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
          <Award size={21} color={palette.primaryStrong} />
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
  card: { borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, padding: 20, gap: 14 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: palette.primarySoft, alignItems: "center", justifyContent: "center" },
  score: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 22 },
  level: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, marginTop: 2 },
  track: { height: 5, borderRadius: radius.xs, backgroundColor: palette.lineStrong, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.xs, backgroundColor: palette.primaryStrong },
  note: { color: palette.muted, fontSize: 12, lineHeight: 19 }
});
