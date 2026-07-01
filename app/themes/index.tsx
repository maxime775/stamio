import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { PollTeaserCard } from "@/components/PollTeaserCard";
import { ThemeTabs } from "@/components/ThemeTabs";
import { THEMES } from "@/lib/product";
import { getPollsByTheme } from "@/lib/api";
import type { PollWithStats, ThemeSlug } from "@/lib/types";

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
      <View style={styles.heading}>
        <Text style={styles.kicker}>Nos thèmes</Text>
        <Text style={styles.title}>Choisissez un sujet, puis donnez votre avis</Text>
        <Text style={styles.intro}>Politique, économie, société ou sport: chaque thème regroupe des questions ouvertes et des résultats agrégés.</Text>
      </View>
      <ThemeTabs active={activeTheme} includeAll onSelect={setActiveTheme} />
      <View style={styles.stats}>
        <Stat label="Sondages affichés" value={polls.length} />
        <Stat label="Votes agrégés" value={totalVotes} />
      </View>
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
  title: { color: "#F8FAFC", fontSize: 42, lineHeight: 48, fontWeight: "900", letterSpacing: 0, maxWidth: 820 },
  intro: { color: "#94A3B8", fontSize: 17, lineHeight: 25, maxWidth: 780 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { minWidth: 170, borderRadius: 18, backgroundColor: "rgba(15, 23, 42, 0.92)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.18)", padding: 18 },
  statValue: { color: "#F8FAFC", fontSize: 30, fontWeight: "900" },
  statLabel: { color: "#94A3B8", fontWeight: "800", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 }
});
