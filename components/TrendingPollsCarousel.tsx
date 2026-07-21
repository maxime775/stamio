import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from "react-native";
import { PollTeaserCard } from "@/components/PollTeaserCard";
import type { PollWithStats } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Props = {
  polls: PollWithStats[];
  loading?: boolean;
};

const SCROLL_SPEED_PX_PER_SECOND = 36;

export const TrendingPollsCarousel = memo(function TrendingPollsCarousel({ polls, loading = false }: Props) {
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const translateX = useMemo(() => new Animated.Value(0), []);
  const segmentWidthRef = useRef(1);
  const offsetRef = useRef(0);
  const hoverPausedRef = useRef(false);
  const touchPausedRef = useRef(false);
  const lastFrameRef = useRef(0);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (polls.length < 2) return undefined;

    let frame = 0;
    function tick(timestamp: number) {
      if (lastFrameRef.current === 0) lastFrameRef.current = timestamp;
      const delta = Math.min(timestamp - lastFrameRef.current, 32);
      lastFrameRef.current = timestamp;
      const segment = segmentWidthRef.current;
      if (!reducedMotion && !hoverPausedRef.current && !touchPausedRef.current && segment > 1) {
        let next = offsetRef.current + (SCROLL_SPEED_PX_PER_SECOND * delta) / 1000;
        if (next >= segment * 2) next -= segment;
        offsetRef.current = next;
        translateX.setValue(-next);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [polls.length, reducedMotion, translateX]);

  const pauseTemporarily = useCallback(() => {
    touchPausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      touchPausedRef.current = false;
    }, 2600);
  }, []);

  const handleCardHover = useCallback((value: boolean) => {
    hoverPausedRef.current = value;
    lastFrameRef.current = 0;
  }, []);

  const handleCardHoverStart = useCallback(() => handleCardHover(true), [handleCardHover]);
  const handleCardHoverEnd = useCallback(() => handleCardHover(false), [handleCardHover]);
  const compact = width < 640;
  const cardWidth = compact ? Math.min(320, Math.max(276, width - 48)) : 344;

  function handleSegmentLayout(event: LayoutChangeEvent) {
    if (event.nativeEvent.layout.x !== 0) return;
    const segment = Math.max(1, event.nativeEvent.layout.width);
    if (segmentWidthRef.current === segment) return;
    segmentWidthRef.current = segment;
    const initial = polls.length > 1 ? segment : 0;
    offsetRef.current = initial;
    translateX.setValue(-initial);
  }

  const segments = useMemo(() => polls.length > 1 ? [0, 1, 2] : [0], [polls.length]);
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Les sujets qui font l’actu</Text>
          <Text style={styles.subtitle}>Des questions ouvertes pour suivre les signaux d’opinion du moment, répondre simplement et lire les résultats sous forme agrégée.</Text>
        </View>
        <View style={styles.counterPill}>
          <Text style={styles.counter}>{loading ? "Chargement" : `${polls.length} questions ouvertes`}</Text>
        </View>
      </View>
      {loading ? (
        <View style={styles.skeletonRail}>
          {[0, 1, 2].map((index) => <View key={index} style={StyleSheet.flatten([styles.skeletonCard, { width: cardWidth }])}>
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonTitleShort} />
            <View style={styles.skeletonFooter} />
          </View>)}
        </View>
      ) : null}
      {!loading ? <View style={styles.scroller} onTouchStart={pauseTemporarily}>
        <Animated.View style={StyleSheet.flatten([styles.rail, { transform: [{ translateX }] }])}>
        {segments.map((segment) => (
          <View key={segment} onLayout={handleSegmentLayout} style={styles.segment}>
            {polls.map((poll) => <PollTeaserCard
              key={`${poll.id}-${segment}`}
              poll={poll}
              cardWidth={cardWidth}
              compact={compact}
              onHoverStart={handleCardHoverStart}
              onHoverEnd={handleCardHoverEnd}
            />)}
          </View>
        ))}
        </Animated.View>
      </View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: "100%",
    gap: 20,
    overflow: "hidden",
    paddingTop: 18,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(208, 204, 208, 0.12)"
  },
  scroller: { width: "100%", maxWidth: "100%", overflow: "hidden" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 18, flexWrap: "wrap" },
  headerCopy: { gap: 8, flex: 1, minWidth: 260 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 31, lineHeight: 37, letterSpacing: 0 },
  subtitle: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 21, maxWidth: 660 },
  counterPill: {
    minHeight: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(28, 110, 140, 0.36)",
    backgroundColor: "rgba(16, 24, 33, 0.58)",
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center"
  },
  counter: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 11 },
  rail: { flexDirection: "row", paddingTop: 4, paddingBottom: 10 },
  segment: { flexDirection: "row", gap: 18, paddingRight: 18 },
  skeletonRail: { flexDirection: "row", gap: 18, paddingTop: 4, paddingBottom: 10 },
  skeletonCard: { width: 344, minHeight: 248, borderRadius: radius.md, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, padding: 20, gap: 14 },
  skeletonLabel: { width: 86, height: 9, borderRadius: 3, backgroundColor: palette.lineStrong },
  skeletonTitle: { width: "86%", height: 18, borderRadius: 3, backgroundColor: palette.lineStrong, marginTop: 18 },
  skeletonTitleShort: { width: "62%", height: 18, borderRadius: 3, backgroundColor: palette.lineStrong },
  skeletonFooter: { width: 140, height: 12, borderRadius: 3, backgroundColor: palette.line, marginTop: "auto" }
});
