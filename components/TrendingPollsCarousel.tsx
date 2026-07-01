import { useEffect, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from "react-native";
import { PollTeaserCard } from "@/components/PollTeaserCard";
import type { PollWithStats } from "@/lib/types";

type Props = {
  polls: PollWithStats[];
};

export function TrendingPollsCarousel({ polls }: Props) {
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const maxOffsetRef = useRef(1);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (polls.length < 2) return undefined;

    const timer = setInterval(() => {
      if (pausedRef.current) return;

      const next = offsetRef.current >= maxOffsetRef.current ? 0 : offsetRef.current + 1.1;
      offsetRef.current = next;
      scrollRef.current?.scrollTo({ x: next, y: 0, animated: false });
    }, 34);

    return () => {
      clearInterval(timer);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [polls.length]);

  function pauseTemporarily() {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, 2600);
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    maxOffsetRef.current = Math.max(contentSize.width - layoutMeasurement.width, 1);
    offsetRef.current = contentOffset.x;
    setProgress(Math.min(contentOffset.x / maxOffsetRef.current, 1));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Sujets qui font l’actu</Text>
        <Text style={styles.counter}>{polls.length} questions ouvertes</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        decelerationRate="fast"
        onScroll={handleScroll}
        onScrollBeginDrag={pauseTemporarily}
        onTouchStart={pauseTemporarily}
        scrollEventThrottle={16}
      >
        {polls.map((poll) => (
          <PollTeaserCard key={poll.id} poll={poll} />
        ))}
      </ScrollView>
      <View style={styles.progressTrack}>
        <View style={{ ...styles.progressFill, width: `${Math.max(18, progress * 100)}%` }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" },
  title: { color: "#F8FAFC", fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: 0 },
  counter: { color: "#94A3B8", fontWeight: "800" },
  rail: { gap: 16, paddingVertical: 6, paddingRight: 20 },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: "rgba(148, 163, 184, 0.18)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#A7F3D0" }
});
