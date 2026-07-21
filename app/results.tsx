import { useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { ResultsPreviewCard } from "@/components/ResultsPreviewCard";
import { ThemeTabs } from "@/components/ThemeTabs";
import { getLatestResults } from "@/lib/api";
import type { PollWithStats, ThemeSlug } from "@/lib/types";
import { fontFamilyBold, fontFamilySemibold, palette } from "@/lib/design";

export default function ResultsPage() {
  const [polls, setPolls] = useState<PollWithStats[]>([]);
  const [filter, setFilter] = useState<ThemeSlug | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const fade = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getLatestResults()
      .then((items) => {
        if (!active) return;
        setPolls(items);
        setHasLoaded(true);
        fade.setValue(0);
        Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
      })
      .catch(() => {
        if (!active) return;
        setPolls([]);
        setHasLoaded(true);
        fade.setValue(1);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fade]);

  const filtered = useMemo(() => filter === "all" ? polls : polls.filter((poll) => poll.theme === filter), [filter, polls]);

  return (
    <PageShell>
      <View style={styles.heading}>
        <Text style={styles.kicker}>Résultats agrégés</Text>
        <Text style={styles.title}>Les derniers résultats</Text>
        <Text style={styles.intro}>Retrouvez les résultats des sujets clôturés, accompagnés d’une analyse Stamio pour éclairer les débats avec nuance.</Text>
      </View>
      <ThemeTabs active={filter} includeAll onSelect={setFilter} />
      <Animated.View style={StyleSheet.flatten([styles.list, { opacity: isLoading && !hasLoaded ? 1 : fade as unknown as number }])}>
        {isLoading && !hasLoaded ? (
          <ResultsListSkeleton />
        ) : filtered.length > 0 ? (
          filtered.map((poll) => <ResultsPreviewCard key={poll.id} poll={poll} />)
        ) : (
          <EmptyState title="Aucun résultat disponible" message={filter === "all" ? "Aucun résultat n’est disponible pour le moment." : "Aucun sujet n’a encore été clôturé pour ce thème. On vous tient informés dès que de nouvelles analyses sont disponibles."} />
        )}
      </Animated.View>
    </PageShell>
  );
}

function ResultsListSkeleton() {
  return <>
    {[0, 1, 2].map((index) => <View key={index} style={styles.loadingCard}>
      <View style={styles.loadingMeta} />
      <View style={styles.loadingQuestion} />
      <View style={styles.loadingQuestionShort} />
      <View style={styles.loadingBars}>
        <View style={styles.loadingBar} />
        <View style={styles.loadingBarShort} />
      </View>
    </View>)}
  </>;
}

const styles = StyleSheet.create({
  heading: { gap: 8 },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 40, lineHeight: 47, letterSpacing: -1 },
  intro: { color: palette.muted, fontSize: 16, lineHeight: 25, maxWidth: 760 },
  list: { gap: 16 },
  loadingCard: { borderRadius: 8, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, padding: 20, gap: 14 },
  loadingMeta: { width: 150, height: 10, borderRadius: 3, backgroundColor: palette.lineStrong },
  loadingQuestion: { width: "82%", height: 18, borderRadius: 3, backgroundColor: palette.lineStrong, marginTop: 8 },
  loadingQuestionShort: { width: "52%", height: 18, borderRadius: 3, backgroundColor: palette.lineStrong },
  loadingBars: { gap: 9, marginTop: 8 },
  loadingBar: { width: "100%", height: 13, borderRadius: 3, backgroundColor: palette.line },
  loadingBarShort: { width: "70%", height: 13, borderRadius: 3, backgroundColor: palette.line }
});
