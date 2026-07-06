import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { PollTeaserCard } from "@/components/PollTeaserCard";
import { ThemeTabs } from "@/components/ThemeTabs";
import { VotesMetric } from "@/components/VotesMetric";
import { THEMES } from "@/lib/product";
import { getPollsByTheme } from "@/lib/api";
import type { PollWithStats, ThemeSlug } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

export default function ThemesIndex() {
  const [activeTheme, setActiveTheme] = useState<ThemeSlug | "all">("all");
  const [polls, setPolls] = useState<PollWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setPolls([]);

    async function load() {
      try {
        const items = activeTheme === "all"
          ? (await Promise.all(THEMES.map((theme) => getPollsByTheme(theme.slug)))).flat()
          : await getPollsByTheme(activeTheme);
        if (active) setPolls(items);
      } catch {
        if (active) setPolls([]);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();

    return () => {
      active = false;
    };
  }, [activeTheme]);

  const totalVotes = polls.reduce((sum, poll) => sum + poll.totalVotes, 0);

  return (
    <PageShell>
      <View style={styles.hero}>
        <View style={styles.heading}>
          <Text style={styles.kicker}>Nos thèmes</Text>
          <Text style={styles.title}>Choisissez un sujet, puis donnez votre avis</Text>
          <Text style={styles.intro}>Politique, économie, société ou sport : chaque thème regroupe des questions ouvertes et des résultats agrégés.</Text>
        </View>
        {isLoading ? <View style={styles.metricPlaceholder} /> : <VotesMetric value={totalVotes} animationKey={activeTheme} />}
      </View>
      <ThemeTabs active={activeTheme} includeAll onSelect={setActiveTheme} />
      <View style={styles.grid}>
        {isLoading ? (
          <ThemeGridSkeleton />
        ) : polls.length > 0 ? (
          polls.map((poll) => <PollTeaserCard key={poll.id} poll={poll} compact />)
        ) : (
          <EmptyState title="Aucun sondage ouvert" message="Aucune question n’est disponible pour ce filtre." />
        )}
      </View>
    </PageShell>
  );
}

function ThemeGridSkeleton() {
  return <>
    {[0, 1, 2, 3].map((index) => <View key={index} style={styles.loadingCard}>
      <View style={styles.loadingLabel} />
      <View style={styles.loadingTitle} />
      <View style={styles.loadingTitleShort} />
      <View style={styles.loadingFooter} />
    </View>)}
  </>;
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 },
  heading: { gap: 8, flex: 1, minWidth: 280 },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 40, lineHeight: 47, letterSpacing: -1, maxWidth: 820 },
  intro: { color: palette.muted, fontSize: 16, lineHeight: 25, maxWidth: 780 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  metricPlaceholder: { width: 108, height: 108, borderRadius: 54, borderWidth: 8, borderColor: palette.line, opacity: 0.72 },
  loadingCard: { width: "100%", minWidth: 280, flexBasis: 320, flexGrow: 1, minHeight: 190, borderRadius: radius.md, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, padding: 20, gap: 12 },
  loadingLabel: { width: 72, height: 8, borderRadius: radius.xs, backgroundColor: palette.lineStrong },
  loadingTitle: { width: "88%", height: 15, borderRadius: radius.xs, backgroundColor: palette.lineStrong, marginTop: 8 },
  loadingTitleShort: { width: "58%", height: 15, borderRadius: radius.xs, backgroundColor: palette.lineStrong },
  loadingFooter: { width: 116, height: 10, borderRadius: radius.xs, backgroundColor: palette.line, marginTop: "auto" }
});
