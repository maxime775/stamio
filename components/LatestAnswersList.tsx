import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { EmptyState } from "@/components/EmptyState";
import { getThemeLabel } from "@/lib/product";
import type { UserPollAnswer } from "@/lib/types";

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
  card: { borderRadius: 20, backgroundColor: "rgba(15, 23, 42, 0.92)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.18)", padding: 20, gap: 12 },
  title: { color: "#F8FAFC", fontSize: 22, fontWeight: "900", marginBottom: 4 },
  row: {
    borderRadius: 16,
    backgroundColor: "rgba(2, 6, 23, 0.42)",
    padding: 14,
    gap: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  pressed: { transform: [{ scale: 0.99 }] },
  rowMain: { flex: 1, gap: 5 },
  theme: { color: "#A7F3D0", fontSize: 12, fontWeight: "900" },
  question: { color: "#F8FAFC", fontSize: 15, lineHeight: 21, fontWeight: "800" },
  date: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  choice: { color: "#CBD5E1", fontWeight: "900" }
});
