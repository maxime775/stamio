import { useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { PollTeaserCard } from "@/components/PollTeaserCard";
import { ThemeTabs } from "@/components/ThemeTabs";
import { VotesMetric } from "@/components/VotesMetric";
import { THEMES, getThemeLabel } from "@/lib/product";
import { getPollsByTheme } from "@/lib/api";
import type { PollWithStats, ThemeSlug } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, getThemeVisual, palette, radius } from "@/lib/design";

type Props = {
  activeTheme: ThemeSlug;
};

export function ThemePollsPage({ activeTheme }: Props) {
  const [polls, setPolls] = useState<PollWithStats[]>([]);
  const fade = useMemo(() => new Animated.Value(0), []);
  const theme = THEMES.find((item) => item.slug === activeTheme);
  const visual = getThemeVisual(activeTheme);
  const totalVotes = polls.reduce((sum, poll) => sum + poll.totalVotes, 0);

  useEffect(() => {
    let active = true;
    getPollsByTheme(activeTheme).then((items) => {
      if (!active) return;
      setPolls(items);
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 360, useNativeDriver: true }).start();
    });
    return () => {
      active = false;
    };
  }, [activeTheme, fade]);

  return (
    <PageShell>
      <View style={styles.hero}>
        <View style={styles.heading}>
          <Text style={StyleSheet.flatten([styles.kicker, { color: visual.accent }])}>Nos thèmes</Text>
          <Text style={styles.title}>{getThemeLabel(activeTheme)}</Text>
          <Text style={styles.intro}>{theme?.intro}</Text>
        </View>
        <VotesMetric value={totalVotes} accent={visual.accent} />
      </View>
      <ThemeTabs active={activeTheme} />
      <Animated.View style={StyleSheet.flatten([styles.grid, { opacity: fade as unknown as number }])}>
        {polls.length > 0 ? (
          polls.map((poll) => <PollTeaserCard key={poll.id} poll={poll} compact />)
        ) : (
          <EmptyState title="Aucun sondage ouvert" message="Ce thème n’a pas encore de question active." />
        )}
      </Animated.View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 },
  heading: { gap: 8, flex: 1, minWidth: 280 },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 40, lineHeight: 47, letterSpacing: -1 },
  intro: { color: palette.muted, fontSize: 16, lineHeight: 25, maxWidth: 720 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 }
});
