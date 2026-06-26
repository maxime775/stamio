import { useEffect, useMemo, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ShieldCheck, Sparkles } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PollCard } from "@/components/PollCard";
import { ResultsBars } from "@/components/ResultsBars";
import { VotePanel } from "@/components/VotePanel";
import { SecurityBadge } from "@/components/SecurityBadge";
import { SkeletonPoll } from "@/components/SkeletonPoll";
import { fetchPoll, getResults } from "@/lib/api";
import type { Poll, PollResult, VoteStatus } from "@/lib/types";

export default function PollScreen() {
  const { pollId } = useLocalSearchParams<{ pollId: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [results, setResults] = useState<PollResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelVisible, setPanelVisible] = useState(false);
  const [voteState, setVoteState] = useState<VoteStatus | null>(null);
  const fade = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!pollId) return;
      setLoading(true);
      const [pollData, resultData] = await Promise.all([fetchPoll(pollId), getResults(pollId)]);
      if (!active) return;
      setPoll(pollData);
      setResults(resultData);
      setLoading(false);
      Animated.timing(fade, { toValue: 1, duration: 480, useNativeDriver: true }).start();
    }
    load();
    const timer = setInterval(async () => {
      if (pollId) setResults(await getResults(pollId));
    }, 4500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [fade, pollId]);

  const selectedChoice = poll?.choices.find((choice) => choice.id === selectedChoiceId) ?? null;

  function handleVoteFinished(status: VoteStatus, nextResults?: PollResult[]) {
    setVoteState(status);
    if (nextResults) setResults(nextResults);
    if (status.status === "accepted" || status.status === "duplicate") {
      setPanelVisible(false);
    }
  }

  return (
    <LinearGradient colors={["#07111F", "#0C1428", "#101827"]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>Verified Polls</Text>
              <Text style={styles.subtitle}>Sondages vérifiés par SMS, résultats auditables.</Text>
            </View>
            <View style={styles.brandMark}>
              <ShieldCheck size={24} color="#DFFCF2" />
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>Vote unique par numéro</Text>
              <Text style={styles.title}>Un sondage fiable sans exposer votre téléphone.</Text>
            </View>
            <View style={styles.badges}>
              <SecurityBadge icon="lock" label="OTP Twilio" />
              <SecurityBadge icon="hash" label="Hash par sondage" />
              <SecurityBadge icon="shield" label="RLS active" />
            </View>
          </View>

          {loading ? (
            <SkeletonPoll />
          ) : poll ? (
            <Animated.View style={[styles.contentGrid, { opacity: fade }]}>
              <View style={styles.mainColumn}>
                <PollCard
                  poll={poll}
                  selectedChoiceId={selectedChoiceId}
                  onSelectChoice={setSelectedChoiceId}
                />
                <Pressable
                  disabled={!selectedChoiceId}
                  onPress={() => setPanelVisible(true)}
                  style={({ pressed }) => [
                    styles.voteButton,
                    !selectedChoiceId && styles.voteButtonDisabled,
                    pressed && selectedChoiceId && styles.voteButtonPressed
                  ]}
                >
                  <Sparkles size={18} color="#06111C" />
                  <Text style={styles.voteButtonText}>Valider mon vote</Text>
                </Pressable>
                {voteState?.status === "duplicate" ? (
                  <Text style={styles.duplicate}>Ce numéro a déjà été utilisé pour cette question.</Text>
                ) : null}
                {voteState?.status === "accepted" && voteState.receipt_hash ? (
                  <View style={styles.receiptBox}>
                    <Text style={styles.receiptLabel}>Reçu anonyme</Text>
                    <Text selectable style={styles.receiptHash}>{voteState.receipt_hash}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.sideColumn}>
                <ResultsBars results={results} />
              </View>
            </Animated.View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Sondage introuvable</Text>
              <Text style={styles.emptyText}>La question demandée n'est pas ouverte ou n'existe pas.</Text>
            </View>
          )}
        </ScrollView>

        {poll && selectedChoice ? (
          <VotePanel
            visible={panelVisible}
            pollId={poll.id}
            choiceId={selectedChoice.id}
            choiceLabel={selectedChoice.label}
            platform={Platform.OS === "web" ? "web" : "native"}
            onClose={() => setPanelVisible(false)}
            onFinished={handleVoteFinished}
          />
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 22,
    width: "100%",
    maxWidth: 1160,
    alignSelf: "center"
  },
  header: {
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brand: { color: "#F8FAFC", fontSize: 22, fontWeight: "800", letterSpacing: 0 },
  subtitle: { color: "#93A4B8", marginTop: 4, fontSize: 14 },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(45, 212, 191, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(153, 246, 228, 0.24)"
  },
  hero: {
    gap: 18,
    paddingTop: 18,
    paddingBottom: 8
  },
  heroCopy: { gap: 8 },
  eyebrow: { color: "#7DD3FC", fontWeight: "700", textTransform: "uppercase", fontSize: 12, letterSpacing: 1 },
  title: {
    color: "#F8FAFC",
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900",
    maxWidth: 760,
    letterSpacing: 0
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  contentGrid: {
    gap: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap"
  },
  mainColumn: { flex: 1, minWidth: 320, gap: 14 },
  sideColumn: { width: 360, minWidth: 300, flexGrow: 1 },
  voteButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#A7F3D0",
    shadowColor: "#34D399",
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 }
  },
  voteButtonPressed: { transform: [{ scale: 0.99 }] },
  voteButtonDisabled: { backgroundColor: "rgba(148, 163, 184, 0.28)", shadowOpacity: 0 },
  voteButtonText: { color: "#06111C", fontSize: 16, fontWeight: "800" },
  duplicate: {
    color: "#FCA5A5",
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(252, 165, 165, 0.22)",
    borderRadius: 14,
    padding: 14
  },
  receiptBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(167, 243, 208, 0.28)",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: 14,
    gap: 6
  },
  receiptLabel: { color: "#A7F3D0", fontSize: 12, textTransform: "uppercase", fontWeight: "800" },
  receiptHash: { color: "#E2E8F0", fontSize: 12, lineHeight: 18 },
  emptyState: {
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    backgroundColor: "rgba(15, 23, 42, 0.78)"
  },
  emptyTitle: { color: "#F8FAFC", fontSize: 22, fontWeight: "800" },
  emptyText: { color: "#94A3B8", marginTop: 8 },
});
