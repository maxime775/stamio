import { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { ResultsBars } from "@/components/ResultsBars";
import { getThemeLabel } from "@/lib/product";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, getThemeVisual, palette, radius } from "@/lib/design";
import { PollTimer } from "@/components/PollTimer";
import { prefetchPollDetail } from "@/lib/api";
import type { PollWithStats } from "@/lib/types";

type Props = {
  poll: PollWithStats;
};

export const ResultsPreviewCard = memo(function ResultsPreviewCard({ poll }: Props) {
  const router = useRouter();
  const date = poll.created_at ? new Date(poll.created_at).toLocaleDateString("fr-FR") : "Date non disponible";
  const visual = getThemeVisual(poll.theme);
  const warmPoll = useCallback(() => prefetchPollDetail(poll.id), [poll.id]);
  const openPoll = useCallback(() => router.push(`/poll/${poll.id}` as Href), [poll.id, router]);

  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <Text style={StyleSheet.flatten([styles.theme, { color: visual.accent }])}>{getThemeLabel(poll.theme)}</Text>
        <View style={styles.dates}><PollTimer poll={poll} style={styles.timer} /><Text style={styles.date}>{date}</Text></View>
      </View>
      <Text style={styles.question}>{poll.question}</Text>
      {poll.results && poll.results.length > 0 ? (
        <ResultsBars results={poll.results} />
      ) : (
        <Text style={styles.empty}>Aucun vote comptabilisé pour le moment.</Text>
      )}
      <Pressable onPress={openPoll} onPressIn={warmPoll} onFocus={warmPoll} onHoverIn={warmPoll} style={styles.link}>
        <Text style={styles.linkText}>Voir le détail</Text>
        <ArrowRight size={16} color={palette.primaryStrong} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    padding: 20,
    gap: 16
  },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  theme: {
    color: palette.primaryStrong,
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingVertical: 2,
    fontSize: 11,
    fontFamily: fontFamilySemibold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    overflow: "hidden"
  },
  date: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 12 },
  dates: { alignItems: "flex-end", gap: 2 },
  timer: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 12 },
  question: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 20, lineHeight: 27, letterSpacing: -0.3 },
  empty: { color: palette.muted, backgroundColor: palette.surfaceSubtle, borderRadius: radius.sm, padding: 14 },
  link: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  linkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold }
});
