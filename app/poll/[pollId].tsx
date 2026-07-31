import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, ChevronDown, ExternalLink, MessagesSquare } from "lucide-react-native";
import { Link, useLocalSearchParams, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PollCard } from "@/components/PollCard";
import { PollTimer } from "@/components/PollTimer";
import { ResultsDonutSummary } from "@/components/ResultsDonutSummary";
import { ResultsHistoryChart } from "@/components/ResultsHistoryChart";
import { PollDiscussion } from "@/components/PollDiscussion";
import { MarkdownContent } from "@/components/MarkdownContent";
import { AppFooter } from "@/components/AppFooter";
import { HeaderTextAction } from "@/components/AppHeader";
import { VotePanel } from "@/components/VotePanel";
import { SkeletonPoll } from "@/components/SkeletonPoll";
import { siteContainerStyle } from "@/components/SiteContainer";
import { useAuth } from "@/components/AuthProvider";
import { fetchPoll, getCachedPoll, getCachedResults, getCachedResultsHistory, getResults, getResultsHistory, getUserPollAnswer } from "@/lib/api";
import { getPollDescription, getThemeLabel, getThemeRoute } from "@/lib/product";
import { STAMIO_CORE_COLORS, fontFamilyBold, fontFamilyMedium, fontFamilySemibold, getColorWithOpacity, getThemeTagStyle, palette, radius } from "@/lib/design";
import type { Poll, PollHistoryPoint, PollResource, PollResult, VoteStatus } from "@/lib/types";

export default function PollScreen() {
  const { pollId } = useLocalSearchParams<{ pollId: string }>();
  const { user, loading: authLoading } = useAuth();
  const compact = useWindowDimensions().width < 760;
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [serverAnswerChoiceId, setServerAnswerChoiceId] = useState<string | null>(null);
  const [serverAnswerLoading, setServerAnswerLoading] = useState(false);
  const [results, setResults] = useState<PollResult[]>([]);
  const [resultsSnapshotAt, setResultsSnapshotAt] = useState<string | null>(null);
  const [history, setHistory] = useState<PollHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelVisible, setPanelVisible] = useState(false);
  const [voteState, setVoteState] = useState<VoteStatus | null>(null);
  const [voteColumnHeight, setVoteColumnHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const overviewAnchorY = useRef(0);
  const contextOffsetY = useRef(0);
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
        if (cachedResults) {
          setResults(cachedResults);
          setResultsSnapshotAt(new Date().toISOString());
        }
        if (cachedHistory) setHistory(cachedHistory);
        setLoading(false);
        fade.setValue(1);
      } else {
        setPoll(null);
        setResults([]);
        setResultsSnapshotAt(null);
        setHistory([]);
        setLoading(true);
        fade.setValue(0);
      }
      setSelectedChoiceId(null);
      setVoteState(null);
      const [pollData, resultData, historyData] = await Promise.all([fetchPoll(pollId), getResults(pollId), getResultsHistory(pollId)]);
      if (!active) return;
      setPoll(pollData);
      setResults(resultData);
      setResultsSnapshotAt(new Date().toISOString());
      setHistory(historyData);
      setLoading(false);
      if (!cachedPoll) Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    }
    load();
    const timer = setInterval(async () => {
      if (pollId) {
        setResults(await getResults(pollId, { force: true, label: "pollResultsRefresh" }));
        setResultsSnapshotAt(new Date().toISOString());
      }
    }, 4500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [fade, pollId]);

  useEffect(() => {
    let active = true;

    async function loadServerAnswer() {
      setServerAnswerChoiceId(null);
      if (authLoading) return;
      if (!pollId || !user) {
        setServerAnswerLoading(false);
        return;
      }

      setServerAnswerLoading(true);
      const answer = await getUserPollAnswer(pollId);
      if (!active) return;
      setServerAnswerChoiceId(answer?.choice_id ?? null);
      if (answer?.choice_id) setSelectedChoiceId(answer.choice_id);
      setServerAnswerLoading(false);
    }

    void loadServerAnswer();
    return () => {
      active = false;
    };
  }, [authLoading, pollId, user?.id]);

  const selectedChoice = poll?.choices.find((choice) => choice.id === selectedChoiceId) ?? null;
  const isPollOpen = Boolean(poll && poll.status === "open" && (!poll.closes_at || new Date(poll.closes_at).getTime() > Date.now()));
  const voteAccepted = voteState?.status === "accepted";
  const voteDuplicate = voteState?.status === "duplicate";
  const alreadyParticipated = Boolean((serverAnswerChoiceId || voteDuplicate) && !voteAccepted);
  const participationStatusLoading = authLoading || serverAnswerLoading;
  const answerSelectionLocked = alreadyParticipated || voteAccepted || participationStatusLoading;
  const voteButtonDisabled = !selectedChoiceId || voteAccepted || alreadyParticipated || participationStatusLoading;
  const answerColumnWidth = compact ? undefined : estimateAnswerColumnWidth(poll?.choices ?? []);
  const displayedHistory = useMemo(
    () => mergeCurrentResultsIntoHistory(history, results, resultsSnapshotAt),
    [history, results, resultsSnapshotAt]
  );
  const voteButtonLabel = voteAccepted
    ? "Vote comptabilisé"
    : alreadyParticipated
      ? "Vous avez déjà participé"
      : "Valider mon vote";
  const voteButtonStatus: VoteSubmitButtonStatus = voteAccepted
    ? "accepted"
    : alreadyParticipated
      ? "alreadyParticipated"
      : participationStatusLoading
        ? "loading"
        : selectedChoiceId
          ? "ready"
          : "empty";

  async function handleOpenVotePanel() {
    if (!isPollOpen || alreadyParticipated || voteAccepted || participationStatusLoading) return;
    setPanelVisible(true);
  }

  async function handleVoteFinished(status: VoteStatus, nextResults?: PollResult[]) {
    setVoteState(status);
    if (nextResults) {
      setResults(nextResults);
      setResultsSnapshotAt(new Date().toISOString());
    }
    if (status.status === "accepted" && pollId) setHistory(await getResultsHistory(pollId, { force: true, label: "getResultsHistoryAfterVote" }));
    if (status.status === "duplicate") {
      if (pollId && user) {
        const answer = await getUserPollAnswer(pollId);
        setServerAnswerChoiceId(answer?.choice_id ?? null);
        if (answer?.choice_id) setSelectedChoiceId(answer.choice_id);
      }
    }
  }

  function scrollToDiscussion() {
    scrollRef.current?.scrollTo({ y: Math.max(0, discussionAnchorY.current - 18), animated: true });
  }

  function scrollToContext() {
    const contextY = overviewAnchorY.current + contextOffsetY.current;
    scrollRef.current?.scrollTo({ y: Math.max(0, contextY - 18), animated: true });
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
                  {poll.theme ? <Link href={getThemeRoute(poll.theme) as Href} asChild>
                    <Pressable
                      accessibilityRole="link"
                      style={({ hovered, pressed }) => StyleSheet.flatten([styles.themeLink, hovered && styles.themeLinkHighlighted, pressed && styles.themeLinkPressed])}
                    >
                      <Text style={StyleSheet.flatten([styles.theme, getThemeTagStyle(poll.theme)])}>{getThemeLabel(poll.theme)}</Text>
                    </Pressable>
                  </Link> : <View style={styles.themeLink}>
                    <Text style={StyleSheet.flatten([styles.theme, getThemeTagStyle(poll.theme)])}>{getThemeLabel(poll.theme)}</Text>
                  </View>}
                  <View style={styles.timerGroup}>
                    <Text style={styles.timerLabel}>Clôture dans</Text>
                    <PollTimer poll={poll} style={styles.timer} />
                  </View>
                </View>
                <Text style={StyleSheet.flatten([styles.title, compact && styles.titleCompact])}>{poll.question}</Text>
                <View
                  onLayout={(event) => { overviewAnchorY.current = event.nativeEvent.layout.y; }}
                  style={StyleSheet.flatten([styles.overview, compact && styles.overviewCompact])}
                >
                  <View
                    nativeID="poll-context"
                    onLayout={(event) => { contextOffsetY.current = event.nativeEvent.layout.y; }}
                    style={styles.contextBlock}
                  >
                    <Text style={styles.contextKicker}>Enjeux</Text>
                    <MarkdownContent value={poll.description ?? getPollDescription(poll.id)} compact />
                    {poll.resources && poll.resources.length > 0 ? <ResourceSection resources={poll.resources} /> : null}
                  </View>
                  <ResultsDonutSummary choices={poll.choices} results={results} />
                </View>
              </View>
              <View style={styles.contentGrid}>
                <View
                  onLayout={(event) => setVoteColumnHeight(event.nativeEvent.layout.height)}
                  style={StyleSheet.flatten([styles.mainColumn, answerColumnWidth ? { flexBasis: answerColumnWidth, maxWidth: answerColumnWidth } : null, compact && styles.mainColumnCompact])}
                >
                {isPollOpen ? (
                  <>
                    <PollCard
                      poll={poll}
                      selectedChoiceId={selectedChoiceId}
                      onSelectChoice={setSelectedChoiceId}
                      locked={answerSelectionLocked}
                      footer={
                        <VoteSubmitButton
                          disabled={voteButtonDisabled}
                          label={voteButtonLabel}
                          status={voteButtonStatus}
                          onPress={handleOpenVotePanel}
                        />
                      }
                    />
                  </>
                ) : (
                  <View style={styles.closedBox}>
                    <Text style={styles.closedTitle}>Sondage cloture</Text>
                    <Text style={styles.closedText}>Cette vague est consultable pour ses resultats. Pour revoter sur cette question, une nouvelle vague doit etre creee.</Text>
                  </View>
                )}
                </View>

                {!compact ? <View style={styles.columnDivider} /> : null}

                <View style={StyleSheet.flatten([styles.analyticsColumn, compact && styles.analyticsColumnCompact])}>
                  <ResultsHistoryChart history={displayedHistory} containerHeight={!compact && voteColumnHeight > 0 ? voteColumnHeight : undefined} />
                </View>
              </View>
              <View style={styles.discussionBreak}>
                <View style={styles.discussionAccent} />
                <View style={styles.discussionIcon}><MessagesSquare size={18} color={palette.primaryStrong} /></View>
                <View style={styles.discussionCopy}>
                  <Text style={styles.discussionEyebrow}>Après les chiffres</Text>
                  <Text style={styles.discussionLabelText}>Le débat commence ici</Text>
                  <Text style={styles.discussionIntro}>Comparez les arguments, nuancez votre position et complétez la lecture des résultats.</Text>
                </View>
                <HeaderTextAction
                  label="LIRE LE DÉBAT"
                  accessibilityLabel="Lire le débat"
                  accessibilityHint="Fait défiler la page jusqu’aux commentaires"
                  onPress={scrollToDiscussion}
                  icon={<ChevronDown size={16} color={palette.ink} />}
                  iconPosition="end"
                />
              </View>
              <View nativeID="poll-discussion" onLayout={(event) => { discussionAnchorY.current = event.nativeEvent.layout.y; }} style={styles.discussionColumn}>
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
            onExploreContext={scrollToContext}
            onJoinDiscussion={scrollToDiscussion}
          />
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

function ResourceSection({ resources }: { resources: PollResource[] }) {
  const [hoveredResourceId, setHoveredResourceId] = useState<string | null>(null);

  return (
    <View style={styles.resources}>
      <Text style={styles.resourcesTitle}>Les ressources utiles</Text>
      <View style={styles.resourceList}>
      {resources.map((resource, index) => (
        <Pressable
          key={resource.id}
          accessibilityRole="link"
          onHoverIn={() => setHoveredResourceId(resource.id)}
          onHoverOut={() => setHoveredResourceId(null)}
          onPress={() => void Linking.openURL(resource.url)}
          style={({ pressed }) => StyleSheet.flatten([
            styles.resourceLink,
            index === resources.length - 1 && styles.resourceLinkLast,
            hoveredResourceId === resource.id && styles.resourceLinkHovered,
            pressed && styles.resourceLinkPressed
          ])}
        >
          <View style={styles.resourceCopy}>
            <View style={styles.resourceMetaRow}>
              <Text style={styles.resourceType}>{getResourceTypeLabel(resource.resource_type)}</Text>
              <Text numberOfLines={1} style={styles.resourceSource}>{getResourceSourceLabel(resource.url)}</Text>
            </View>
            <Text style={styles.resourceTitle}>{resource.title}</Text>
            {resource.description ? <Text style={styles.resourceDescription}>{resource.description}</Text> : null}
          </View>
          <ExternalLink size={13} color={hoveredResourceId === resource.id ? palette.primaryStrong : palette.muted} />
        </Pressable>
      ))}
      </View>
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

function getResourceSourceLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
}

function estimateAnswerColumnWidth(choices: Poll["choices"]) {
  const longestLabelLength = choices.reduce((longest, choice) => Math.max(longest, Array.from(choice.label).length), 0);
  return Math.min(430, Math.max(320, Math.round(longestLabelLength * 8.4 + 150)));
}

function mergeCurrentResultsIntoHistory(history: PollHistoryPoint[], results: PollResult[], capturedAt: string | null) {
  if (!capturedAt) return history;
  const totalVotes = results.reduce((sum, result) => sum + Number(result.votes ?? 0), 0);
  if (results.length === 0) return history;

  const latestTimestamp = history.reduce<string | null>((latest, point) => {
    if (!latest || point.captured_at.localeCompare(latest) > 0) return point.captured_at;
    return latest;
  }, null);
  const latestRows = latestTimestamp ? history.filter((point) => point.captured_at === latestTimestamp) : [];
  const latestByChoice = new Map(latestRows.map((point) => [point.choice_id, point]));
  const currentPoints = results.map((result) => ({
    choice_id: result.choice_id,
    label: result.label,
    captured_at: capturedAt,
    votes: Number(result.votes ?? 0),
    percentage: totalVotes > 0 ? Number(((Number(result.votes ?? 0) * 100) / totalVotes).toFixed(2)) : 0
  }));
  const latestMatchesCurrent = currentPoints.length > 0 && currentPoints.every((point) => {
    const latest = latestByChoice.get(point.choice_id);
    return latest && Number(latest.votes) === point.votes && Math.abs(Number(latest.percentage) - point.percentage) < 0.01;
  });

  if (latestMatchesCurrent) return history;
  const withoutSameTimestamp = history.filter((point) => point.captured_at !== capturedAt);
  return [...withoutSameTimestamp, ...currentPoints].sort((a, b) => a.captured_at.localeCompare(b.captured_at));
}

type VoteSubmitButtonStatus = "empty" | "ready" | "loading" | "accepted" | "alreadyParticipated";

const VOTE_CTA_ACCENT = STAMIO_CORE_COLORS.editorialAmber;
const VOTE_CTA_BORDER = getColorWithOpacity(VOTE_CTA_ACCENT, 0.56);
const VOTE_CTA_FILL = VOTE_CTA_ACCENT;

function VoteSubmitButton({ disabled, label, status, onPress }: {
  disabled: boolean;
  label: string;
  status: VoteSubmitButtonStatus;
  onPress: () => void;
}) {
  const fill = useMemo(() => new Animated.Value(0), []);
  const actionable = status === "ready" && !disabled;
  const terminal = status === "accepted" || status === "alreadyParticipated";
  const iconColor = actionable ? palette.ink : "rgba(251, 252, 255, 0.45)";

  function animate(toValue: number) {
    if (!actionable) return;
    fill.stopAnimation(() => {
      Animated.timing(fill, {
        toValue,
        duration: 230,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
    });
  }

  useEffect(() => {
    if (!actionable) {
      fill.setValue(0);
    }
  }, [actionable, fill]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: status === "loading" }}
      disabled={disabled}
      onHoverIn={() => animate(1)}
      onHoverOut={() => animate(0)}
      onPress={onPress}
      style={() =>
        StyleSheet.flatten([
          styles.voteButton,
          status === "empty" && styles.voteButtonInactive,
          status === "loading" && styles.voteButtonInactive,
          terminal && styles.voteButtonTerminal
        ])
      }
    >
      {actionable ? (
        <Animated.View
          pointerEvents="none"
          style={StyleSheet.flatten([
            styles.voteButtonFill,
            { transform: [{ translateY: fill.interpolate({ inputRange: [0, 1], outputRange: [53, 0] }) }] }
          ])}
        />
      ) : null}
      <View pointerEvents="none" style={styles.voteButtonContent}>
        <View style={styles.voteButtonLoaderSlot}>
          <ActivityIndicator animating={status === "loading"} size="small" color={palette.inkSecondary} style={status !== "loading" && styles.voteButtonLoaderHidden} />
        </View>
        <View style={styles.voteButtonIcon}>
          <Check size={16} color={iconColor} />
        </View>
        <Text style={StyleSheet.flatten([
          styles.voteButtonText,
          !actionable && styles.voteButtonDisabledText
        ])}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    ...siteContainerStyle,
    paddingBottom: 36,
    gap: 22,
  },
  hero: {
    gap: 18,
    paddingTop: 26,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.line
  },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", columnGap: 18, rowGap: 10 },
  themeLink: { alignSelf: "flex-start", borderRadius: radius.sm },
  themeLinkHighlighted: { opacity: 0.82 },
  themeLinkPressed: { opacity: 0.66 },
  theme: { fontFamily: fontFamilySemibold, textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2 },
  timerGroup: { alignItems: "flex-end", justifyContent: "center", gap: 3 },
  timerLabel: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 },
  timer: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 13, letterSpacing: 0.35 },
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
  resources: { marginTop: 11, paddingTop: 14, borderTopWidth: 1, borderTopColor: palette.line, gap: 9, maxWidth: 760 },
  resourcesTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 14, lineHeight: 20 },
  resourceList: { borderTopWidth: 1, borderTopColor: palette.line, marginTop: 2 },
  resourceLink: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    paddingVertical: 12,
    paddingHorizontal: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 13
  },
  resourceLinkLast: { borderBottomWidth: 0 },
  resourceLinkHovered: { paddingLeft: 6, borderBottomColor: palette.lineStrong },
  resourceLinkPressed: { opacity: 0.72 },
  resourceCopy: { flex: 1, minWidth: 0, gap: 4 },
  resourceMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  resourceType: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8 },
  resourceSource: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 10, flex: 1 },
  resourceTitle: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 13, lineHeight: 18 },
  resourceDescription: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  contentStack: { gap: 28 },
  contentGrid: {
    gap: 20,
    flexDirection: "row",
    alignItems: "stretch",
    flexWrap: "wrap"
  },
  mainColumn: { flexGrow: 0, flexShrink: 0, flexBasis: 360, maxWidth: 430, minWidth: 320, gap: 10 },
  mainColumnCompact: { flexBasis: "100%", maxWidth: "100%", minWidth: 0 },
  columnDivider: {
    width: 1,
    alignSelf: "stretch",
    marginVertical: 4,
    backgroundColor: "rgba(72, 166, 184, 0.26)"
  },
  analyticsColumn: { flexGrow: 1, flexShrink: 1, flexBasis: 560, minWidth: 300, paddingLeft: 2 },
  analyticsColumnCompact: { flexBasis: "100%", minWidth: 0, paddingLeft: 0 },
  discussionBreak: { position: "relative", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 14, marginTop: 24, paddingHorizontal: 4, paddingTop: 20, paddingBottom: 4, borderTopWidth: 1, borderTopColor: palette.lineStrong },
  discussionAccent: { position: "absolute", left: 4, top: -1, width: 52, height: 2, backgroundColor: palette.primary },
  discussionIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: palette.primarySoft },
  discussionCopy: { gap: 4, flex: 1 },
  discussionEyebrow: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 9, textTransform: "uppercase", letterSpacing: 1.1 },
  discussionLabelText: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 20, lineHeight: 25 },
  discussionIntro: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  discussionColumn: { width: "100%" },
  voteButton: {
    alignSelf: "center",
    width: 286,
    maxWidth: "100%",
    minHeight: 51,
    marginTop: 0,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: VOTE_CTA_BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101821",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 6 }
  },
  voteButtonFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 53,
    backgroundColor: VOTE_CTA_FILL
  },
  voteButtonContent: { zIndex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 },
  voteButtonLoaderSlot: { position: "absolute", left: 12, width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  voteButtonLoaderHidden: { opacity: 0 },
  voteButtonIcon: { width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  voteButtonInactive: { backgroundColor: "rgba(16, 24, 33, 0.42)", borderColor: "rgba(143, 184, 198, 0.14)", shadowOpacity: 0 },
  voteButtonTerminal: { backgroundColor: "rgba(16, 24, 33, 0.5)", borderColor: "rgba(251, 252, 255, 0.15)", shadowOpacity: 0 },
  voteButtonText: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 14, lineHeight: 18, letterSpacing: 0.15, flexShrink: 0, flexWrap: "nowrap" },
  voteButtonDisabledText: { color: "rgba(251, 252, 255, 0.45)" },
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
  emptyText: { color: palette.muted, marginTop: 8 }
});
