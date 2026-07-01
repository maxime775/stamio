import { useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { ResultsPreviewCard } from "@/components/ResultsPreviewCard";
import { ThemeTabs } from "@/components/ThemeTabs";
import { getLatestResults } from "@/lib/api";
import type { PollWithStats, ThemeSlug } from "@/lib/types";

export default function ResultsPage() {
  const [polls, setPolls] = useState<PollWithStats[]>([]);
  const [filter, setFilter] = useState<ThemeSlug | "all">("all");
  const fade = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let active = true;
    getLatestResults().then((items) => {
      if (!active) return;
      setPolls(items);
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    });
    return () => {
      active = false;
    };
  }, [fade]);

  const filtered = filter === "all" ? polls : polls.filter((poll) => poll.theme === filter);

  return (
    <PageShell>
      <View style={styles.heading}>
        <Text style={styles.kicker}>Résultats agrégés</Text>
        <Text style={styles.title}>Les derniers résultats</Text>
        <Text style={styles.intro}>Suivez les tendances récentes sans donnée personnelle, numéro de téléphone ou identifiant sensible.</Text>
      </View>
      <ThemeTabs active={filter} includeAll onSelect={setFilter} />
      <Animated.View style={StyleSheet.flatten([styles.list, { opacity: fade as unknown as number }])}>
        {filtered.length > 0 ? (
          filtered.map((poll) => <ResultsPreviewCard key={poll.id} poll={poll} />)
        ) : (
          <EmptyState title="Aucun résultat disponible" message="Aucun vote n’a encore été comptabilisé pour ce filtre." />
        )}
      </Animated.View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 8 },
  kicker: { color: "#0F766E", fontWeight: "900", textTransform: "uppercase", fontSize: 13 },
  title: { color: "#F8FAFC", fontSize: 42, lineHeight: 48, fontWeight: "900", letterSpacing: 0 },
  intro: { color: "#94A3B8", fontSize: 17, lineHeight: 25, maxWidth: 760 },
  list: { gap: 16 }
});
