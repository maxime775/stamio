import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { EmptyState } from "@/components/EmptyState";
import { getThemeLabel } from "@/lib/product";
import type { UserPollAnswer } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

type Props = {
  answers: UserPollAnswer[];
};

export function LatestAnswersList({ answers }: Props) {
  const router = useRouter();

  if (answers.length === 0) {
    return (
      <EmptyState
        title="Aucune réponse enregistrée"
        message="Vos réponses associées au compte apparaîtront ici une fois le suivi serveur activé."
        actionLabel="Découvrir les sondages"
        onAction={() => router.push("/themes" as Href)}
      />
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Mes dernières réponses</Text>
      {answers.map((answer) => (
        <Pressable
          key={answer.id}
          onPress={() => router.push(`/poll/${answer.poll_id}` as Href)}
          style={({ pressed }) => StyleSheet.flatten([styles.row, pressed && styles.pressed])}
        >
          <View style={styles.rowMain}>
            <Text style={styles.theme}>{getThemeLabel(answer.polls?.theme ?? undefined)}</Text>
            <Text style={styles.question}>{answer.polls?.question ?? "Question indisponible"}</Text>
            <Text style={styles.date}>{new Date(answer.created_at).toLocaleDateString("fr-FR")}</Text>
          </View>
          <Text style={styles.choice}>{answer.choices?.label ?? "Choix non disponible"}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, padding: 20, gap: 0 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 20, marginBottom: 10 },
  row: {
    borderRadius: 0,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: palette.line,
    padding: 14,
    gap: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  pressed: { transform: [{ scale: 0.99 }] },
  rowMain: { flex: 1, gap: 5 },
  theme: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, textTransform: "uppercase" },
  question: { color: palette.ink, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 21 },
  date: { color: palette.muted, fontSize: 11 },
  choice: { color: palette.inkSecondary, fontFamily: fontFamilySemibold }
});
