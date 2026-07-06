import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ArrowRight, TrendingUp } from "lucide-react-native";
import { getThemeLabel } from "@/lib/product";
import { getThemeVisual, fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius, shadows } from "@/lib/design";
import { PollTimer } from "@/components/PollTimer";
import type { PollWithStats } from "@/lib/types";

type Props = {
  poll: PollWithStats;
  compact?: boolean;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
};

export function PollTeaserCard({ poll, compact = false, onHoverStart, onHoverEnd }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const theme = getThemeVisual(poll.theme);
  const openPoll = () => router.push(`/poll/${poll.id}` as Href);
  const webCardHoverProps = Platform.OS === "web" ? ({
    onMouseEnter: onHoverStart,
    onMouseLeave: onHoverEnd
  } as unknown as PressableProps) : {};
  const webCtaHoverProps = Platform.OS === "web" ? ({ onMouseEnter: onHoverStart } as unknown as PressableProps) : {};

  return (
    <Pressable
      {...webCardHoverProps}
      onPress={openPoll}
      onHoverIn={() => { setHovered(true); onHoverStart?.(); }}
      onHoverOut={() => { setHovered(false); setCtaHovered(false); onHoverEnd?.(); }}
      style={({ pressed }) => StyleSheet.flatten([
        styles.card,
        compact && styles.compact,
        { borderColor: hovered ? theme.accent : "rgba(148, 163, 184, 0.18)" },
        hovered && styles.hovered,
        pressed && styles.pressed
      ])}
    >
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
        <Pressable {...webCtaHoverProps} accessibilityRole="link" onPress={(event) => { event.stopPropagation(); openPoll(); }} onHoverIn={() => { setCtaHovered(true); onHoverStart?.(); }} onHoverOut={() => setCtaHovered(false)} style={({ pressed }) => StyleSheet.flatten([styles.cta, ctaHovered && styles.ctaHovered, pressed && styles.ctaPressed])}>
          <Text style={StyleSheet.flatten([styles.ctaText, ctaHovered && styles.ctaTextHovered])}>J’ai un avis</Text>
          <View style={ctaHovered && styles.ctaArrowHovered}><ArrowRight size={16} color={palette.primaryStrong} /></View>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 320,
    minHeight: 238,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    backgroundColor: palette.surface,
    padding: 20,
    justifyContent: "space-between",
    gap: 18,
    ...shadows.panel
  },
  compact: { width: "100%", minHeight: 190 },
  hovered: { transform: [{ translateY: -2 }], backgroundColor: palette.surfaceRaised },
  pressed: { transform: [{ translateY: 1 }, { scale: 0.992 }] },
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
  question: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 19, lineHeight: 26, letterSpacing: -0.25 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  meta: { flex: 1, gap: 4 },
  votes: { color: palette.muted, fontSize: 12, fontFamily: fontFamilyMedium },
  timer: { color: palette.ink, fontSize: 13, letterSpacing: 0.2 },
  cta: {
    borderRadius: radius.xs,
    backgroundColor: "transparent",
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  ctaHovered: { backgroundColor: palette.primarySoft },
  ctaPressed: { opacity: 0.72 },
  ctaText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 12, borderBottomWidth: 1, borderBottomColor: "transparent" },
  ctaTextHovered: { borderBottomColor: palette.primaryStrong },
  ctaArrowHovered: { transform: [{ translateX: 3 }] }
});
