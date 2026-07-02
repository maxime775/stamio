import { useEffect, useMemo, useState } from "react";
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, MessagesSquare } from "lucide-react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PollCard } from "@/components/PollCard";
import { PollTimer } from "@/components/PollTimer";
import { ResultsDonutSummary } from "@/components/ResultsDonutSummary";
import { ResultsHistoryChart } from "@/components/ResultsHistoryChart";
import { PollDiscussion } from "@/components/PollDiscussion";
import { AppFooter } from "@/components/AppFooter";
import { VotePanel } from "@/components/VotePanel";
import { SkeletonPoll } from "@/components/SkeletonPoll";
import { useAuth } from "@/components/AuthProvider";
import { fetchPoll, getResults, getResultsHistory } from "@/lib/api";
import { getPollDescription, getThemeLabel, VISITOR_VOTE_LIMIT } from "@/lib/product";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, getThemeVisual, palette, radius, shadows } from "@/lib/design";
import { getVisitorVoteCount, incrementVisitorVoteCount } from "@/lib/visitorLimit";
import type { Poll, PollHistoryPoint, PollResult, VoteStatus } from "@/lib/types";

export default function PollScreen() {
  const { pollId } = useLocalSearchParams<{ pollId: string }>();
  const compact = useWindowDimensions().width < 760;
  const router = useRouter();
  const { user, emailVerified } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [results, setResults] = useState<PollResult[]>([]);
  const [history, setHistory] = useState<PollHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelVisible, setPanelVisible] = useState(false);
  const [limitVisible, setLimitVisible] = useState(false);
  const [visitorCount, setVisitorCount] = useState(0);
  const [voteState, setVoteState] = useState<VoteStatus | null>(null);
  const fade = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!pollId) return;
      setLoading(true);
      const [pollData, resultData, historyData] = await Promise.all([fetchPoll(pollId), getResults(pollId), getResultsHistory(pollId)]);
      if (!active) return;
      setPoll(pollData);
      setResults(resultData);
      setHistory(historyData);
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

  useEffect(() => {
    getVisitorVoteCount().then(setVisitorCount);
  }, []);

  const selectedChoice = poll?.choices.find((choice) => choice.id === selectedChoiceId) ?? null;
  const isVerifiedUser = Boolean(user && emailVerified);

  async function handleOpenVotePanel() {
    if (!isVerifiedUser && visitorCount >= VISITOR_VOTE_LIMIT) {
      setLimitVisible(true);
      return;
    }
    setPanelVisible(true);
  }

  async function handleVoteFinished(status: VoteStatus, nextResults?: PollResult[]) {
    setVoteState(status);
    if (nextResults) setResults(nextResults);
    if (status.status === "accepted" && pollId) setHistory(await getResultsHistory(pollId));
    if (status.status === "duplicate") {
      setPanelVisible(false);
    }
    if (!isVerifiedUser && status.status === "accepted") {
      setVisitorCount(await incrementVisitorVoteCount());
    }
  }

  return (
    <LinearGradient colors={[palette.canvas, "#0A0E14", palette.canvas]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {loading ? (
            <SkeletonPoll />
          ) : poll ? (
            <Animated.View style={StyleSheet.flatten([styles.contentStack, { opacity: fade as unknown as number }])}>
              <View style={styles.hero}>
                <View style={styles.metaRow}>
                  <Text style={StyleSheet.flatten([styles.theme, { color: getThemeVisual(poll.theme).accent }])}>{getThemeLabel(poll.theme)}</Text>
                  <PollTimer poll={poll} style={styles.timer} />
                </View>
                <Text style={StyleSheet.flatten([styles.title, compact && styles.titleCompact])}>{poll.question}</Text>
                <View style={StyleSheet.flatten([styles.overview, compact && styles.overviewCompact])}>
                  <View style={styles.contextBlock}>
                    <Text style={styles.contextKicker}>Enjeux</Text>
                    <Text style={styles.contextText}>{poll.description ?? getPollDescription(poll.id)}</Text>
                  </View>
                  <ResultsDonutSummary choices={poll.choices} results={results} />
                </View>
              </View>
              <View style={styles.contentGrid}>
                <View style={styles.mainColumn}>
                <PollCard
                  poll={poll}
                  selectedChoiceId={selectedChoiceId}
                  onSelectChoice={setSelectedChoiceId}
                />
                <Pressable
                  disabled={!selectedChoiceId}
                  onPress={handleOpenVotePanel}
                  style={({ pressed }) =>
                    StyleSheet.flatten([
                      styles.voteButton,
                      !selectedChoiceId && styles.voteButtonDisabled,
                      pressed && selectedChoiceId && styles.voteButtonPressed
                    ])
                  }
                >
                  <Check size={17} color="#FFFFFF" />
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

                <View style={styles.analyticsColumn}>
                  <ResultsHistoryChart history={history} />
                </View>
              </View>
              <View style={styles.discussionBreak}>
                <View style={styles.discussionAccent} />
                <MessagesSquare size={17} color={palette.primaryStrong} />
                <View style={styles.discussionCopy}>
                  <Text style={styles.discussionLabelText}>Espace de discussion</Text>
                  <Text style={styles.discussionIntro}>Confrontez les arguments et complétez la lecture des résultats.</Text>
                </View>
              </View>
              <View style={styles.discussionColumn}>
                <PollDiscussion pollId={poll.id} />
              </View>
            </Animated.View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Sondage introuvable</Text>
              <Text style={styles.emptyText}>La question demandée n'est pas ouverte ou n'existe pas.</Text>
            </View>
          )}
          <AppFooter />
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
        <VisitorLimitModal
          visible={limitVisible}
          onClose={() => setLimitVisible(false)}
          onSignup={() => router.push("/auth/signup" as Href)}
          onLogin={() => router.push("/auth/login" as Href)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

function VisitorLimitModal({
  visible,
  onClose,
  onSignup,
  onLogin
}: {
  visible: boolean;
  onClose: () => void;
  onSignup: () => void;
  onLogin: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.limitOverlay}>
        <Pressable style={styles.limitScrim} onPress={onClose} />
        <View style={styles.limitCard}>
          <Text style={styles.limitTitle}>Vous avez atteint la limite visiteur</Text>
          <Text style={styles.limitText}>
            Créez un compte gratuit pour continuer à participer. Cette limite est une règle produit locale; l’unicité réelle du vote reste assurée par le serveur.
          </Text>
          <View style={styles.limitActions}>
            <Pressable onPress={onSignup} style={styles.limitPrimary}>
              <Text style={styles.limitPrimaryText}>Créer mon compte</Text>
            </Pressable>
            <Pressable onPress={onLogin} style={styles.limitSecondary}>
              <Text style={styles.limitSecondaryText}>J’ai déjà un compte</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  hero: {
    gap: 18,
    paddingTop: 26,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.line
  },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  theme: { fontFamily: fontFamilySemibold, textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2 },
  timer: { color: palette.ink, fontSize: 13, letterSpacing: 0.35 },
  title: {
    color: palette.ink,
    fontFamily: fontFamilyBold,
    fontSize: 42,
    lineHeight: 49,
    maxWidth: 940,
    letterSpacing: -1.1
  },
  titleCompact: { fontSize: 34, lineHeight: 41, letterSpacing: -0.8 },
  overview: { flexDirection: "row", alignItems: "stretch", justifyContent: "space-between", gap: 24 },
  overviewCompact: { flexDirection: "column-reverse" },
  contextBlock: { flex: 1, minWidth: 280, borderLeftWidth: 2, borderLeftColor: palette.primary, paddingVertical: 12, paddingHorizontal: 16, alignSelf: "stretch", justifyContent: "center", gap: 7 },
  contextKicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  contextText: { color: palette.inkSecondary, fontSize: 14, lineHeight: 22, maxWidth: 720 },
  contentStack: { gap: 28 },
  contentGrid: {
    gap: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap"
  },
  mainColumn: { flexGrow: 0.72, flexBasis: 320, minWidth: 300, gap: 10 },
  analyticsColumn: { flexGrow: 1.55, flexBasis: 600, minWidth: 300 },
  discussionBreak: { position: "relative", flexDirection: "row", alignItems: "center", gap: 11, marginTop: 28, paddingHorizontal: 16, paddingVertical: 20, backgroundColor: palette.surfaceSubtle, borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.lineStrong, overflow: "hidden" },
  discussionAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 2, backgroundColor: palette.primary },
  discussionCopy: { gap: 4, flex: 1 },
  discussionLabelText: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.1 },
  discussionIntro: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  discussionColumn: { width: "100%" },
  voteButton: {
    minHeight: 48,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: palette.primary,
    ...shadows.panel
  },
  voteButtonPressed: { transform: [{ translateY: 1 }] },
  voteButtonDisabled: { backgroundColor: "rgba(148, 163, 184, 0.28)", shadowOpacity: 0 },
  voteButtonText: { color: "#FFFFFF", fontFamily: fontFamilySemibold, fontSize: 14 },
  duplicate: {
    color: "#FCA5A5",
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(252, 165, 165, 0.22)",
    borderRadius: radius.sm,
    padding: 14
  },
  receiptBox: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(167, 243, 208, 0.28)",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: 14,
    gap: 6
  },
  receiptLabel: { color: palette.positive, fontFamily: fontFamilySemibold, fontSize: 11, textTransform: "uppercase" },
  receiptHash: { color: "#E2E8F0", fontSize: 12, lineHeight: 18 },
  emptyState: {
    padding: 28,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    backgroundColor: palette.surface
  },
  emptyTitle: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 21 },
  emptyText: { color: "#94A3B8", marginTop: 8 },
  limitOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  limitScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 6, 23, 0.62)" },
  limitCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    padding: 24,
    gap: 14,
    ...shadows.panel
  },
  limitTitle: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 23, lineHeight: 30 },
  limitText: { color: palette.inkSecondary, fontSize: 15, lineHeight: 23 },
  limitActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  limitPrimary: { minHeight: 46, borderRadius: radius.sm, backgroundColor: palette.primary, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  limitPrimaryText: { color: "#FFFFFF", fontFamily: fontFamilySemibold },
  limitSecondary: { minHeight: 46, borderRadius: radius.sm, backgroundColor: "transparent", borderWidth: 1, borderColor: palette.lineStrong, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  limitSecondaryText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium }
});
