import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ArrowRight, TrendingUp } from "lucide-react-native";
import { getThemeLabel } from "@/lib/product";
import type { PollWithStats } from "@/lib/types";

type Props = {
  poll: PollWithStats;
  compact?: boolean;
};

export function PollTeaserCard({ poll, compact = false }: Props) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/poll/${poll.id}` as Href)}
      style={({ pressed }) => StyleSheet.flatten([styles.card, compact && styles.compact, pressed && styles.pressed])}
    >
      <View style={styles.top}>
        <Text style={styles.theme}>{getThemeLabel(poll.theme)}</Text>
        {poll.trend_label ? (
          <View style={styles.trend}>
            <TrendingUp size={14} color="#A7F3D0" />
            <Text style={styles.trendText}>{poll.trend_label}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.question}>{poll.question}</Text>
      <View style={styles.footer}>
        <Text style={styles.votes}>{poll.totalVotes} participant{poll.totalVotes > 1 ? "s" : ""}</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>J’ai un avis</Text>
          <ArrowRight size={16} color="#06111C" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 320,
    minHeight: 238,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    padding: 20,
    justifyContent: "space-between",
    gap: 18,
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  compact: { width: "100%", minHeight: 190 },
  pressed: { transform: [{ translateY: 2 }] },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  theme: {
    color: "#A7F3D0",
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden"
  },
  trend: { flexDirection: "row", alignItems: "center", gap: 5 },
  trendText: { color: "#A7F3D0", fontSize: 12, fontWeight: "800" },
  question: { color: "#F8FAFC", fontSize: 20, lineHeight: 27, fontWeight: "900", letterSpacing: 0 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  votes: { color: "#94A3B8", fontSize: 13, fontWeight: "800", flex: 1 },
  cta: {
    borderRadius: 999,
    backgroundColor: "#A7F3D0",
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  ctaText: { color: "#06111C", fontWeight: "900", fontSize: 13 }
});
