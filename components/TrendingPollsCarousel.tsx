import { useEffect, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, StyleSheet, Text, View, type ViewProps } from "react-native";
import { PollTeaserCard } from "@/components/PollTeaserCard";
import type { PollWithStats } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, palette } from "@/lib/design";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Props = {
  polls: PollWithStats[];
};

const SCROLL_SPEED_PX_PER_SECOND = 30;

export function TrendingPollsCarousel({ polls }: Props) {
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView | null>(null);
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
        scrollRef.current?.scrollTo({ x: next, y: 0, animated: false });
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [polls.length, reducedMotion]);

  function pauseTemporarily() {
    touchPausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      touchPausedRef.current = false;
    }, 2600);
  }

  function handleCardHover(value: boolean) {
    hoverPausedRef.current = value;
    lastFrameRef.current = 0;
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    void contentSize;
    void layoutMeasurement;
    offsetRef.current = contentOffset.x;
  }

  function handleContentSizeChange(width: number) {
    const segment = polls.length > 1 ? width / 3 : width;
    segmentWidthRef.current = segment;
    const initial = polls.length > 1 ? segment : 0;
    offsetRef.current = initial;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: initial, y: 0, animated: false }));
  }

  function normalizeLoopPosition() {
    if (polls.length < 2) return;
    const segment = segmentWidthRef.current;
    let next = offsetRef.current;
    if (next < segment * 0.5) next += segment;
    if (next > segment * 2.5) next -= segment;
    if (next !== offsetRef.current) {
      offsetRef.current = next;
      scrollRef.current?.scrollTo({ x: next, y: 0, animated: false });
    }
  }

  const segments = polls.length > 1 ? [0, 1, 2] : [0];
  const webHoverProps = Platform.OS === "web" ? ({
    onMouseEnter: () => handleCardHover(true),
    onMouseLeave: () => handleCardHover(false)
  } as unknown as ViewProps) : {};

  return (
    <View {...webHoverProps} style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Sujets qui font l’actu</Text>
        <Text style={styles.counter}>{polls.length} questions ouvertes</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        decelerationRate="fast"
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onScrollBeginDrag={pauseTemporarily}
        onMomentumScrollEnd={normalizeLoopPosition}
        onTouchStart={pauseTemporarily}
        scrollEventThrottle={16}
      >
        {segments.map((segment) => (
          <View key={segment} style={styles.segment}>
            {polls.map((poll) => <PollTeaserCard
              key={`${poll.id}-${segment}`}
              poll={poll}
              onHoverStart={() => handleCardHover(true)}
            />)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: "100%", gap: 16, overflow: "hidden" },
  scroller: { width: "100%", maxWidth: "100%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  counter: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 12 },
  rail: { paddingVertical: 6 },
  segment: { flexDirection: "row", gap: 16, paddingRight: 16 }
});
