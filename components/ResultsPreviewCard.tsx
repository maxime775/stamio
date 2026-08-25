import { memo, useCallback, useMemo, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, type Href } from "expo-router";
import { ArrowRight } from "@/lib/icons";
import { ResultsDonutSummary } from "@/components/ResultsDonutSummary";
import { getThemeLabel } from "@/lib/product";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, getAnswerColor, getThemeTagStyle, getThemeVisual, palette, radius } from "@/lib/design";
import { PollTimer } from "@/components/PollTimer";
import { prefetchPollDetail } from "@/lib/api";
import type { PollWithStats } from "@/lib/types";
import { getHistoricalResultPath } from "@/lib/publicPollUrls";

type Props = {
  poll: PollWithStats;
};

export const ResultsPreviewCard = memo(function ResultsPreviewCard({ poll }: Props) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const [ctaPressed, setCtaPressed] = useState(false);
  const ctaHover = useMemo(() => new Animated.Value(0), []);
  const date = poll.created_at ? new Date(poll.created_at).toLocaleDateString("fr-FR") : "Date non disponible";
  const visual = getThemeVisual(poll.theme);
  const warmPoll = useCallback(() => prefetchPollDetail(poll.id), [poll.id]);
  const hasResults = Boolean(poll.results && poll.results.length > 0);
  const resultHref = poll.series_slug
    ? getHistoricalResultPath(poll.series_slug, poll.wave_number ?? 1)
    : `/poll/${poll.id}`;
  const tooltipRows = useMemo(() => {
    const results = poll.results ?? [];
    const total = results.reduce((sum, result) => sum + result.votes, 0);
    return results.map((result, index) => ({
      ...result,
      color: getAnswerColor(index, result.label),
      percentage: total > 0 ? Math.round((result.votes / total) * 100) : 0
    }));
  }, [poll.results]);
  const ctaFillOpacity = ctaHover.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const arrowTranslateX = ctaHover.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });

  function animateCta(toValue: number) {
    Animated.timing(ctaHover, {
      toValue,
      duration: toValue ? 170 : 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }

  return (
    <View style={styles.card}>
      <View style={StyleSheet.flatten([styles.topRule, { backgroundColor: visual.accent }])} />
      <View style={styles.metaRow}>
        <Text style={StyleSheet.flatten([styles.theme, getThemeTagStyle(poll.theme)])}>{getThemeLabel(poll.theme)}</Text>
        <View style={styles.dates}><PollTimer poll={poll} style={styles.timer} /><Text style={styles.date}>{date}</Text></View>
      </View>
      <Text style={styles.question}>{poll.question}</Text>
      <View style={styles.editorialRow}>
        <View
          onPointerEnter={() => setTooltipVisible(true)}
          onPointerLeave={() => setTooltipVisible(false)}
          style={styles.donutColumn}
        >
          {hasResults ? (
            <ResultsDonutSummary choices={poll.choices} results={poll.results ?? []} />
          ) : (
            <View style={styles.emptyDonut}>
              <Text style={styles.emptyDonutText}>Aucun résultat disponible</Text>
            </View>
          )}
          {tooltipVisible && hasResults ? (
            <View pointerEvents="none" style={styles.tooltip}>
              <Text style={styles.tooltipDate}>Répartition</Text>
              <View style={styles.tooltipRule} />
              {tooltipRows.map((result) => (
                <View key={result.choice_id} style={styles.tooltipRow}>
                  <View style={StyleSheet.flatten([styles.tooltipDot, { backgroundColor: result.color }])} />
                  <Text numberOfLines={1} style={styles.tooltipLabel}>{result.label}</Text>
                  <Text style={styles.tooltipValue}>{result.percentage}%</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.separator} />
        <View style={styles.analysis}>
          <Text style={styles.analysisKicker}>Analyse Stamio</Text>
          <Text style={styles.analysisText}>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere nuance les enseignements du vote et met en perspective les principaux points de débat.</Text>
        </View>
      </View>
      <Link href={resultHref as Href} asChild>
        <Pressable
          onPressIn={() => {
            setCtaPressed(true);
            warmPoll();
          }}
          onPressOut={() => setCtaPressed(false)}
          onFocus={warmPoll}
          onHoverIn={() => {
            warmPoll();
            setCtaHovered(true);
            animateCta(1);
          }}
          onHoverOut={() => {
            setCtaHovered(false);
            animateCta(0);
          }}
          style={StyleSheet.flatten([styles.link, ctaHovered && styles.linkHovered, ctaPressed && styles.linkPressed])}
        >
          <Animated.View pointerEvents="none" style={StyleSheet.flatten([styles.linkFill, { opacity: ctaFillOpacity }])} />
          <Text style={styles.linkText}>Voir le détail</Text>
          <Animated.View style={{ transform: [{ translateX: arrowTranslateX }] }}><ArrowRight size={15} color={palette.primaryStrong} /></Animated.View>
        </Pressable>
      </Link>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    position: "relative",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(143, 184, 198, 0.18)",
    backgroundColor: "#0E151F",
    padding: 20,
    gap: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 }
  },
  topRule: { position: "absolute", top: 0, left: 0, right: 0, height: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  theme: {
    color: palette.primaryStrong,
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingVertical: 2,
    fontSize: 11,
    fontFamily: fontFamilySemibold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    overflow: "hidden"
  },
  date: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 12 },
  dates: { alignItems: "flex-end", gap: 2 },
  timer: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 12 },
  question: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 20, lineHeight: 27, letterSpacing: -0.3 },
  editorialRow: { flexDirection: "row", alignItems: "stretch", gap: 18, flexWrap: "wrap" },
  donutColumn: { position: "relative", justifyContent: "center", minWidth: 280, maxWidth: 320 },
  separator: { width: 2, minHeight: 138, backgroundColor: "rgba(143, 184, 198, 0.22)" },
  analysis: { flex: 1, minWidth: 260, justifyContent: "center", gap: 8 },
  analysisKicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase" },
  analysisText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 22, maxWidth: 620 },
  emptyDonut: { width: 300, maxWidth: "100%", minHeight: 122, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surfaceSubtle, alignItems: "center", justifyContent: "center", padding: 16 },
  emptyDonutText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 12, textAlign: "center" },
  tooltip: {
    position: "absolute",
    left: 10,
    top: 8,
    minWidth: 176,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    backgroundColor: "rgba(8, 11, 16, 0.96)",
    padding: 10,
    gap: 6,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  tooltipDate: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 10, textAlign: "center" },
  tooltipRule: { width: 34, height: 1, backgroundColor: palette.lineStrong, alignSelf: "center", marginBottom: 2 },
  tooltipRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  tooltipDot: { width: 5, height: 5, borderRadius: 1, flexShrink: 0 },
  tooltipLabel: { color: palette.inkSecondary, maxWidth: 116, fontSize: 10 },
  tooltipValue: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 11, fontVariant: ["tabular-nums"] },
  link: { minHeight: 30, borderRadius: radius.sm, borderWidth: 1, borderColor: "transparent", paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", overflow: "hidden" },
  linkHovered: { borderColor: "rgba(28, 110, 140, 0.32)" },
  linkPressed: { opacity: 0.72 },
  linkFill: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(28, 110, 140, 0.12)" },
  linkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 12 }
});
