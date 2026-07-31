import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useRouter, type Href } from "expo-router";
import { ArrowRight, TrendingUp } from "lucide-react-native";
import { getThemeLabel } from "@/lib/product";
import { getThemeTagStyle, getThemeVisual, fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";
import { PollTimer } from "@/components/PollTimer";
import { prefetchPollDetail } from "@/lib/api";
import type { PollWithStats } from "@/lib/types";

type Props = {
  poll: PollWithStats;
  compact?: boolean;
  cardWidth?: number;
  showBottomHoverRule?: boolean;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
};

export const PollTeaserCard = memo(function PollTeaserCard({ poll, compact = false, cardWidth, showBottomHoverRule = true, onHoverStart, onHoverEnd }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const hover = useMemo(() => new Animated.Value(0), []);
  const ctaHover = useMemo(() => new Animated.Value(0), []);
  const cardHoveredRef = useRef(false);
  const ctaHoveredRef = useRef(false);
  const theme = getThemeVisual(poll.theme);
  const warmPoll = useCallback(() => {
    prefetchPollDetail(poll.id);
  }, [poll.id]);
  const openPoll = useCallback(() => router.push(`/poll/${poll.id}` as Href), [poll.id, router]);
  const startHoverPause = useCallback(() => {
    if (!cardHoveredRef.current && !ctaHoveredRef.current) onHoverStart?.();
  }, [onHoverStart]);
  const stopHoverPause = useCallback(() => {
    if (!cardHoveredRef.current && !ctaHoveredRef.current) onHoverEnd?.();
  }, [onHoverEnd]);
  const handleHoverIn = useCallback(() => {
    startHoverPause();
    cardHoveredRef.current = true;
    setHovered(true);
    warmPoll();
    Animated.timing(hover, {
      toValue: 1,
      duration: 210,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [hover, startHoverPause, warmPoll]);
  const handleHoverOut = useCallback(() => {
    cardHoveredRef.current = false;
    ctaHoveredRef.current = false;
    setHovered(false);
    setCtaHovered(false);
    stopHoverPause();
    Animated.timing(hover, {
      toValue: 0,
      duration: 230,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
    Animated.timing(ctaHover, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [ctaHover, hover, stopHoverPause]);
  const handleCtaHoverIn = useCallback(() => {
    startHoverPause();
    ctaHoveredRef.current = true;
    setCtaHovered(true);
    Animated.timing(ctaHover, {
      toValue: 1,
      duration: 170,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [ctaHover, startHoverPause]);
  const handleCtaHoverOut = useCallback(() => {
    ctaHoveredRef.current = false;
    stopHoverPause();
    setCtaHovered(false);
    Animated.timing(ctaHover, {
      toValue: 0,
      duration: 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [ctaHover, stopHoverPause]);
  const cardTranslateY = hover.interpolate({ inputRange: [0, 1], outputRange: [0, -1] });
  const topRuleOpacity = hover.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] });
  const bottomRuleTranslateX = hover.interpolate({ inputRange: [0, 1], outputRange: [-(cardWidth ?? 344), 0] });
  const arrowTranslateX = ctaHover.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
  const ctaFillOpacity = ctaHover.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

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
        style={StyleSheet.flatten([
          styles.card,
          compact && styles.compact,
          hovered && styles.cardHovered,
          { transform: [{ translateY: cardTranslateY }] }
        ])}
      >
        <Animated.View style={StyleSheet.flatten([styles.topRule, { backgroundColor: theme.accent, opacity: topRuleOpacity }])} />
        {showBottomHoverRule ? <Animated.View style={StyleSheet.flatten([styles.bottomRule, { backgroundColor: theme.accent, transform: [{ translateX: bottomRuleTranslateX }] }])} /> : null}
      <View style={styles.top}>
        <Text style={StyleSheet.flatten([styles.theme, getThemeTagStyle(poll.theme)])}>{getThemeLabel(poll.theme)}</Text>
        {poll.trend_label ? (
          <View style={styles.trend}>
            <TrendingUp size={12} color="#C7B58B" />
            <Text style={styles.trendText}>{poll.trend_label}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.question}>{poll.question}</Text>
      <View style={styles.footer}>
        <View style={styles.meta}>
          <Text style={styles.votes}>Clôture dans</Text>
          <PollTimer poll={poll} style={styles.timer} />
        </View>
        <Link href={`/poll/${poll.id}` as Href} asChild>
          <Pressable
            accessibilityRole="link"
            onPress={(event) => event.stopPropagation()}
            onPressIn={warmPoll}
            onFocus={warmPoll}
            onHoverIn={handleCtaHoverIn}
            onHoverOut={handleCtaHoverOut}
            style={({ pressed }) => StyleSheet.flatten([styles.cta, ctaHovered && styles.ctaHovered, pressed && styles.ctaPressed])}
          >
            <Animated.View pointerEvents="none" style={StyleSheet.flatten([styles.ctaFill, { opacity: ctaFillOpacity }])} />
            <Text style={styles.ctaText}>J’ai un avis</Text>
            <Animated.View style={{ transform: [{ translateX: arrowTranslateX }] }}><ArrowRight size={15} color={palette.primaryStrong} /></Animated.View>
          </Pressable>
        </Link>
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
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 }
  },
  cardHovered: {
    backgroundColor: "#101A26",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 }
  },
  compact: { minHeight: 230, padding: 17, gap: 18 },
  pressed: { opacity: 0.9 },
  topRule: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2
  },
  bottomRule: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2
  },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  theme: {
    color: palette.primaryStrong,
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingVertical: 2,
    fontSize: 11,
    fontFamily: fontFamilySemibold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    overflow: "hidden",
    flexShrink: 0
  },
  trend: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 5, flexShrink: 1 },
  trendText: { color: "#C7B58B", fontSize: 11, fontFamily: fontFamilyMedium, textAlign: "right" },
  question: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 20, lineHeight: 27, letterSpacing: 0 },
  footer: { borderTopWidth: 1, borderTopColor: "rgba(208, 204, 208, 0.12)", paddingTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  meta: { flex: 1, gap: 4 },
  votes: { color: palette.muted, fontSize: 12, fontFamily: fontFamilyMedium },
  timer: { color: palette.inkSecondary, fontSize: 13, letterSpacing: 0.2 },
  cta: {
    minHeight: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    overflow: "hidden"
  },
  ctaHovered: { borderColor: "rgba(28, 110, 140, 0.32)" },
  ctaPressed: { opacity: 0.72 },
  ctaFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28, 110, 140, 0.12)"
  },
  ctaText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 12 }
});
