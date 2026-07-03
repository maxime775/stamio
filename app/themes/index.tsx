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

  useEffect(() => {
    let active = true;

    if (activeTheme === "all") {
      Promise.all(THEMES.map((theme) => getPollsByTheme(theme.slug))).then((groups) => {
        if (active) setPolls(groups.flat());
      });
    } else {
      getPollsByTheme(activeTheme).then((items) => {
        if (active) setPolls(items);
      });
    }

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
        <VotesMetric value={totalVotes} />
      </View>
      <ThemeTabs active={activeTheme} includeAll onSelect={setActiveTheme} />
      <View style={styles.grid}>
        {polls.length > 0 ? (
          polls.map((poll) => <PollTeaserCard key={poll.id} poll={poll} compact />)
        ) : (
          <EmptyState title="Aucun sondage ouvert" message="Aucune question n’est disponible pour ce filtre." />
        )}
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 },
  heading: { gap: 8, flex: 1, minWidth: 280 },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 40, lineHeight: 47, letterSpacing: -1, maxWidth: 820 },
  intro: { color: palette.muted, fontSize: 16, lineHeight: 25, maxWidth: 780 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 }
});
