import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, ExternalLink, MessagesSquare } from "lucide-react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PollCard } from "@/components/PollCard";
import { PollTimer } from "@/components/PollTimer";
import { ResultsDonutSummary } from "@/components/ResultsDonutSummary";
import { ResultsHistoryChart } from "@/components/ResultsHistoryChart";
import { PollDiscussion } from "@/components/PollDiscussion";
import { MarkdownContent } from "@/components/MarkdownContent";
import { AppFooter } from "@/components/AppFooter";
import { VotePanel } from "@/components/VotePanel";
import { SkeletonPoll } from "@/components/SkeletonPoll";
import { useAuth } from "@/components/AuthProvider";
import { fetchPoll, getCachedPoll, getCachedResults, getCachedResultsHistory, getResults, getResultsHistory } from "@/lib/api";
import { getPollDescription, getThemeLabel, VISITOR_VOTE_LIMIT } from "@/lib/product";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, getThemeVisual, palette, radius, shadows } from "@/lib/design";
import { getVisitorVoteCount, incrementVisitorVoteCount } from "@/lib/visitorLimit";
import type { Poll, PollHistoryPoint, PollResource, PollResult, VoteStatus } from "@/lib/types";

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
  const [voteColumnHeight, setVoteColumnHeight] = useState(0);
  const [discussionCtaHovered, setDiscussionCtaHovered] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const discussionAnchorY = useRef(0);
  const fade = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!pollId) return;
      const cachedPoll = getCachedPoll(pollId);
      const cachedResults = getCachedResults(pollId);
      const cachedHistory = getCachedResultsHistory(pollId);
      fade.stopAnimation();
      if (cachedPoll) {
        setPoll(cachedPoll);
        if (cachedResults) setResults(cachedResults);
        if (cachedHistory) setHistory(cachedHistory);
        setLoading(false);
        fade.setValue(1);
      } else {
        setPoll(null);
        setResults([]);
        setHistory([]);
        setLoading(true);
        fade.setValue(0);
      }
      setSelectedChoiceId(null);
      const [pollData, resultData, historyData] = await Promise.all([fetchPoll(pollId), getResults(pollId), getResultsHistory(pollId)]);
      if (!active) return;
      setPoll(pollData);
      setResults(resultData);
      setHistory(historyData);
      setLoading(false);
      if (!cachedPoll) Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    }
    load();
    const timer = setInterval(async () => {
      if (pollId) setResults(await getResults(pollId, { force: true, label: "pollResultsRefresh" }));
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
  const isPollOpen = Boolean(poll && poll.status === "open" && (!poll.closes_at || new Date(poll.closes_at).getTime() > Date.now()));

  async function handleOpenVotePanel() {
    if (!isPollOpen) return;
    if (!isVerifiedUser && visitorCount >= VISITOR_VOTE_LIMIT) {
      setLimitVisible(true);
      return;
    }
    setPanelVisible(true);
  }

  async function handleVoteFinished(status: VoteStatus, nextResults?: PollResult[]) {
    setVoteState(status);
    if (nextResults) setResults(nextResults);
    if (status.status === "accepted" && pollId) setHistory(await getResultsHistory(pollId, { force: true, label: "getResultsHistoryAfterVote" }));
    if (status.status === "duplicate") {
      setPanelVisible(false);
    }
    if (!isVerifiedUser && status.status === "accepted") {
      setVisitorCount(await incrementVisitorVoteCount());
    }
  }

  function scrollToDiscussion() {
    scrollRef.current?.scrollTo({ y: Math.max(0, discussionAnchorY.current - 18), animated: true });
  }

  return (
    <LinearGradient colors={[palette.canvas, "#0A0E14", palette.canvas]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
                    <MarkdownContent value={poll.description ?? getPollDescription(poll.id)} compact />
                    {poll.resources && poll.resources.length > 0 ? <ResourceSection resources={poll.resources} /> : null}
                  </View>
                  <ResultsDonutSummary choices={poll.choices} results={results} />
                </View>
              </View>
              <View style={styles.contentGrid}>
                <View onLayout={(event) => setVoteColumnHeight(event.nativeEvent.layout.height)} style={styles.mainColumn}>
                {isPollOpen ? (
                  <>
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
                      <Check size={17} color={palette.onPrimary} />
                      <Text style={styles.voteButtonText}>Valider mon vote</Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.closedBox}>
                    <Text style={styles.closedTitle}>Sondage cloture</Text>
                    <Text style={styles.closedText}>Cette vague est consultable pour ses resultats. Pour revoter sur cette question, une nouvelle vague doit etre creee.</Text>
                  </View>
                )}
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
                  <ResultsHistoryChart history={history} containerHeight={!compact && voteColumnHeight > 0 ? voteColumnHeight : undefined} />
                </View>
              </View>
              <View style={styles.discussionBreak}>
                <View style={styles.discussionAccent} />
                <View style={styles.discussionIcon}><MessagesSquare size={18} color={palette.primaryStrong} /></View>
                <View style={styles.discussionCopy}>
                  <Text style={styles.discussionEyebrow}>Après les chiffres</Text>
                  <Text style={styles.discussionLabelText}>Entrez dans la discussion</Text>
                  <Text style={styles.discussionIntro}>Comparez les arguments, nuancez votre position et complétez la lecture des résultats.</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint="Fait défiler la page jusqu’aux commentaires"
                  onHoverIn={() => setDiscussionCtaHovered(true)}
                  onHoverOut={() => setDiscussionCtaHovered(false)}
                  onPress={scrollToDiscussion}
                  style={({ pressed }) => StyleSheet.flatten([styles.discussionAction, discussionCtaHovered && styles.discussionActionHovered, pressed && styles.discussionActionPressed])}
                >
                  <Text style={styles.discussionActionText}>Lire le débat ↓</Text>
                </Pressable>
              </View>
              <View onLayout={(event) => { discussionAnchorY.current = event.nativeEvent.layout.y; }} style={styles.discussionColumn}>
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

        {poll && selectedChoice && isPollOpen ? (
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

function ResourceSection({ resources }: { resources: PollResource[] }) {
  return (
    <View style={styles.resources}>
      <Text style={styles.resourcesTitle}>Pour aller plus loin</Text>
      {resources.map((resource) => (
        <Pressable key={resource.id} accessibilityRole="link" onPress={() => void Linking.openURL(resource.url)} style={styles.resourceLink}>
          <View style={styles.resourceCopy}>
            <View style={styles.resourceMetaRow}>
              <Text style={styles.resourceType}>{getResourceTypeLabel(resource.resource_type)}</Text>
              <ExternalLink size={12} color={palette.muted} />
            </View>
            <Text style={styles.resourceTitle}>{resource.title}</Text>
            {resource.description ? <Text style={styles.resourceDescription}>{resource.description}</Text> : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function getResourceTypeLabel(type: PollResource["resource_type"]) {
  if (type === "pdf") return "PDF";
  if (type === "article") return "Article";
  if (type === "report") return "Rapport";
  if (type === "other") return "Ressource";
  return "Lien";
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
            Inscrivez-vous gratuitement pour continuer à participer. Cette limite est une règle produit locale; l’unicité réelle du vote reste assurée par le serveur.
          </Text>
          <View style={styles.limitActions}>
            <Pressable onPress={onSignup} style={styles.limitPrimary}>
              <Text style={styles.limitPrimaryText}>S’inscrire</Text>
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
    letterSpacing: 0
  },
  titleCompact: { fontSize: 34, lineHeight: 41, letterSpacing: 0 },
  overview: { flexDirection: "row", alignItems: "stretch", justifyContent: "space-between", gap: 24 },
  overviewCompact: { flexDirection: "column-reverse" },
  contextBlock: { flex: 1, minWidth: 280, borderLeftWidth: 2, borderLeftColor: palette.primary, paddingVertical: 12, paddingHorizontal: 16, alignSelf: "stretch", justifyContent: "center", gap: 7 },
  contextKicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  contextText: { color: palette.inkSecondary, fontSize: 14, lineHeight: 22, maxWidth: 720 },
  resources: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: palette.line, gap: 8, maxWidth: 760 },
  resourcesTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 13 },
  resourceLink: { borderRadius: radius.sm, backgroundColor: palette.surfaceSubtle, borderWidth: 1, borderColor: palette.line, padding: 11 },
  resourceCopy: { gap: 4 },
  resourceMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  resourceType: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8 },
  resourceTitle: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 13, lineHeight: 18 },
  resourceDescription: { color: palette.muted, fontSize: 12, lineHeight: 17 },
  contentStack: { gap: 28 },
  contentGrid: {
    gap: 18,
    flexDirection: "row",
    alignItems: "stretch",
    flexWrap: "wrap"
  },
  mainColumn: { flexGrow: 0.72, flexBasis: 320, minWidth: 300, gap: 10 },
  analyticsColumn: { flexGrow: 1.55, flexBasis: 600, minWidth: 300 },
  discussionBreak: { position: "relative", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 14, marginTop: 24, paddingHorizontal: 4, paddingTop: 20, paddingBottom: 4, borderTopWidth: 1, borderTopColor: palette.lineStrong },
  discussionAccent: { position: "absolute", left: 4, top: -1, width: 52, height: 2, backgroundColor: palette.primary },
  discussionIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: palette.primarySoft },
  discussionCopy: { gap: 4, flex: 1 },
  discussionEyebrow: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 9, textTransform: "uppercase", letterSpacing: 1.1 },
  discussionLabelText: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 16 },
  discussionIntro: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  discussionAction: { minHeight: 34, paddingHorizontal: 10, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent" },
  discussionActionHovered: { backgroundColor: palette.primarySoft, borderColor: palette.lineStrong },
  discussionActionPressed: { opacity: 0.72 },
  discussionActionText: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 },
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
  voteButtonText: { color: palette.onPrimary, fontFamily: fontFamilySemibold, fontSize: 14 },
  duplicate: {
    color: palette.dangerText,
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    backgroundColor: palette.dangerSoft,
    borderWidth: 1,
    borderColor: palette.dangerLine,
    borderRadius: radius.sm,
    padding: 14
  },
  receiptBox: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.positiveLine,
    backgroundColor: palette.positiveSoft,
    padding: 14,
    gap: 6
  },
  receiptLabel: { color: palette.positiveText, fontFamily: fontFamilySemibold, fontSize: 11, textTransform: "uppercase" },
  receiptHash: { color: palette.inkSecondary, fontSize: 12, lineHeight: 18 },
  closedBox: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    backgroundColor: palette.surface,
    padding: 16,
    gap: 7
  },
  closedTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 16 },
  closedText: { color: palette.inkSecondary, fontSize: 14, lineHeight: 21 },
  emptyState: {
    padding: 28,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    backgroundColor: palette.surface
  },
  emptyTitle: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 21 },
  emptyText: { color: palette.muted, marginTop: 8 },
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
  limitPrimaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold },
  limitSecondary: { minHeight: 46, borderRadius: radius.sm, backgroundColor: "transparent", borderWidth: 1, borderColor: palette.lineStrong, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  limitSecondaryText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium }
});
