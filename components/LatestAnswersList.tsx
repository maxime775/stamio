import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { EmptyState } from "@/components/EmptyState";
import { getThemeLabel } from "@/lib/product";
import type { UserPollAnswer } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, getThemeTagStyle, palette } from "@/lib/design";

type Props = {
  answers: UserPollAnswer[];
  showTitle?: boolean;
};

export function LatestAnswersList({ answers, showTitle = true }: Props) {
  const router = useRouter();

  if (answers.length === 0) {
    return (
      <EmptyState
        title="Aucune réponse enregistrée"
        message="Vos réponses aux différents sujets apparaîtront ici. N’attendez pas, prenez part aux débats."
        actionLabel="Découvrir les sondages"
        onAction={() => router.push("/themes" as Href)}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      {showTitle ? <Text style={styles.title}>Mes dernières réponses</Text> : null}
      {answers.map((answer) => (
        <Pressable
          key={answer.id}
          onPress={() => router.push(`/poll/${answer.poll_id}` as Href)}
          style={({ pressed }) => StyleSheet.flatten([styles.row, pressed && styles.pressed])}
        >
          <View style={styles.rowMain}>
            <Text style={StyleSheet.flatten([styles.theme, getThemeTagStyle(answer.polls?.theme ?? undefined)])}>{getThemeLabel(answer.polls?.theme ?? undefined)}</Text>
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
  wrap: { gap: 0 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 20, lineHeight: 26, marginBottom: 10 },
  row: {
    borderRadius: 0,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingVertical: 15,
    paddingHorizontal: 0,
    gap: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  pressed: { transform: [{ scale: 0.99 }] },
  rowMain: { flex: 1, gap: 5 },
  theme: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, textTransform: "uppercase", alignSelf: "flex-start", paddingVertical: 2 },
  question: { color: palette.ink, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 21 },
  date: { color: palette.muted, fontSize: 11 },
  choice: { color: palette.inkSecondary, fontFamily: fontFamilySemibold }
});
