import { useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import type { Poll } from "@/lib/types";
import { fontFamilySemibold, palette } from "@/lib/design";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export function getPollDeadline(poll: Pick<Poll, "created_at" | "closes_at">) {
  if (poll.closes_at) return new Date(poll.closes_at);
  if (poll.created_at) return new Date(new Date(poll.created_at).getTime() + FIVE_DAYS_MS);
  return null;
}

export function formatTimeRemaining(poll: Pick<Poll, "created_at" | "closes_at" | "status">, now = Date.now()) {
  if (poll.status === "closed") return "Clôturé";
  const deadline = getPollDeadline(poll);
  if (!deadline || Number.isNaN(deadline.getTime())) return "Sans échéance";
  const remaining = deadline.getTime() - now;
  if (remaining <= 0) return "Clôturé";
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${days}J ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

export function PollTimer({ poll, style }: { poll: Pick<Poll, "created_at" | "closes_at" | "status">; style?: StyleProp<TextStyle> }) {
  const [label, setLabel] = useState(() => formatTimeRemaining(poll));
  const pulse = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    setLabel(formatTimeRemaining(poll));
    const timer = setInterval(() => {
      setLabel(formatTimeRemaining(poll));
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.62, duration: 90, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 190, useNativeDriver: true })
      ]).start();
    }, 1_000);
    return () => clearInterval(timer);
  }, [poll.closes_at, poll.created_at, poll.status, pulse]);

  const match = label.match(/^(.*\s)(\d{2}s)$/);
  if (!match) return <Text style={StyleSheet.flatten([style, styles.base])}>{label}</Text>;
  return <View accessibilityLabel={label} style={styles.row}>
    <Text style={StyleSheet.flatten([style, styles.base])}>{match[1]}</Text>
    <Animated.Text style={StyleSheet.flatten([style, styles.base, styles.seconds, { opacity: pulse }])}>{match[2]}</Animated.Text>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline" },
  base: { fontFamily: fontFamilySemibold, fontVariant: ["tabular-nums"] },
  seconds: { color: palette.timerAccent }
});
