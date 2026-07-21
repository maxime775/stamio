import { memo, useCallback, useMemo, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ArrowRight, TrendingUp } from "lucide-react-native";
import { getThemeLabel } from "@/lib/product";
import { getThemeVisual, fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";
import { PollTimer } from "@/components/PollTimer";
import { prefetchPollDetail } from "@/lib/api";
import type { PollWithStats } from "@/lib/types";

type Props = {
  poll: PollWithStats;
  compact?: boolean;
  cardWidth?: number;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
};

export const PollTeaserCard = memo(function PollTeaserCard({ poll, compact = false, cardWidth, onHoverStart, onHoverEnd }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const hover = useMemo(() => new Animated.Value(0), []);
  const theme = getThemeVisual(poll.theme);
  const warmPoll = useCallback(() => {
    prefetchPollDetail(poll.id);
  }, [poll.id]);
  const openPoll = useCallback(() => router.push(`/poll/${poll.id}` as Href), [poll.id, router]);
  const handleHoverIn = useCallback(() => {
    setHovered(true);
    onHoverStart?.();
    warmPoll();
    Animated.timing(hover, {
      toValue: 1,
      duration: 210,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [hover, onHoverStart, warmPoll]);
  const handleHoverOut = useCallback(() => {
    setHovered(false);
    onHoverEnd?.();
    Animated.timing(hover, {
      toValue: 0,
      duration: 230,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [hover, onHoverEnd]);
  const cardTranslateY = hover.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  const hoverOpacity = hover.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const arrowTranslateX = hover.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });

  return (
    <Pressable
      accessibilityRole="link"
      onPress={openPoll}
      onPressIn={warmPoll}
      onFocus={warmPoll}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={({ pressed }) => StyleSheet.flatten([
        styles.shell,
        compact && styles.shellCompact,
        cardWidth ? { width: cardWidth } : null,
        pressed && styles.pressed
      ])}
    >
      <Animated.View
        pointerEvents="none"
        style={StyleSheet.flatten([
          styles.card,
          compact && styles.compact,
          { borderColor: hovered ? theme.accent : "rgba(143, 184, 198, 0.18)", transform: [{ translateY: cardTranslateY }] }
        ])}
      >
        <Animated.View style={StyleSheet.flatten([styles.hoverWash, { opacity: hoverOpacity, backgroundColor: theme.soft }])} />
        <View style={StyleSheet.flatten([styles.topRule, { backgroundColor: theme.accent }])} />
      <View style={styles.top}>
        <Text style={StyleSheet.flatten([styles.theme, { color: theme.accent }])}>{getThemeLabel(poll.theme)}</Text>
        {poll.trend_label ? (
          <View style={styles.trend}>
            <TrendingUp size={14} color={palette.positive} />
            <Text style={styles.trendText}>{poll.trend_label}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.question}>{poll.question}</Text>
      <View style={styles.footer}>
        <View style={styles.meta}>
          <Text style={styles.votes}>{poll.totalVotes} participant{poll.totalVotes > 1 ? "s" : ""}</Text>
          <PollTimer poll={poll} style={styles.timer} />
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>J’ai un avis</Text>
          <Animated.View style={{ transform: [{ translateX: arrowTranslateX }] }}><ArrowRight size={15} color={palette.primaryStrong} /></Animated.View>
        </View>
      </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  shell: {
    width: 344,
    minHeight: 248,
    paddingTop: 2,
    paddingBottom: 2
  },
  shellCompact: { width: "100%", minHeight: 230 },
  card: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(143, 184, 198, 0.18)",
    backgroundColor: "#0E151F",
    padding: 18,
    justifyContent: "space-between",
    gap: 20,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  compact: { minHeight: 230, padding: 17, gap: 18 },
  pressed: { opacity: 0.9 },
  hoverWash: {
    ...StyleSheet.absoluteFillObject
  },
  topRule: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.86
  },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
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
  trend: { flexDirection: "row", alignItems: "center", gap: 5 },
  trendText: { color: palette.positive, fontSize: 11, fontFamily: fontFamilyMedium },
  question: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 20, lineHeight: 27, letterSpacing: 0 },
  footer: { borderTopWidth: 1, borderTopColor: "rgba(208, 204, 208, 0.12)", paddingTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  meta: { flex: 1, gap: 4 },
  votes: { color: palette.muted, fontSize: 12, fontFamily: fontFamilyMedium },
  timer: { color: palette.inkSecondary, fontSize: 13, letterSpacing: 0.2 },
  cta: {
    minHeight: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(28, 110, 140, 0.38)",
    backgroundColor: "rgba(28, 110, 140, 0.12)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  ctaText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 12 }
});
