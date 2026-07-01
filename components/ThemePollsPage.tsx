import { useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { PollTeaserCard } from "@/components/PollTeaserCard";
import { ThemeTabs } from "@/components/ThemeTabs";
import { THEMES, getThemeLabel } from "@/lib/product";
import { getPollsByTheme } from "@/lib/api";
import type { PollWithStats, ThemeSlug } from "@/lib/types";

type Props = {
  activeTheme: ThemeSlug;
};

export function ThemePollsPage({ activeTheme }: Props) {
  const [polls, setPolls] = useState<PollWithStats[]>([]);
  const fade = useMemo(() => new Animated.Value(0), []);
  const theme = THEMES.find((item) => item.slug === activeTheme);
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
      <View style={styles.heading}>
        <Text style={styles.kicker}>Nos thèmes</Text>
        <Text style={styles.title}>{getThemeLabel(activeTheme)}</Text>
        <Text style={styles.intro}>{theme?.intro}</Text>
      </View>
      <ThemeTabs active={activeTheme} />
      <View style={styles.stats}>
        <Stat label="Sondages" value={polls.length} />
        <Stat label="Votes agrégés" value={totalVotes} />
      </View>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 8 },
  kicker: { color: "#0F766E", fontWeight: "900", textTransform: "uppercase", fontSize: 13 },
  title: { color: "#F8FAFC", fontSize: 42, lineHeight: 48, fontWeight: "900", letterSpacing: 0 },
  intro: { color: "#94A3B8", fontSize: 17, lineHeight: 25, maxWidth: 720 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { minWidth: 160, borderRadius: 18, backgroundColor: "rgba(15, 23, 42, 0.92)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.18)", padding: 18 },
  statValue: { color: "#F8FAFC", fontSize: 30, fontWeight: "900" },
  statLabel: { color: "#94A3B8", fontWeight: "800", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 }
});
