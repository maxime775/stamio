import { StyleSheet, View } from "react-native";
import { palette, radius } from "@/lib/design";

export function SkeletonPoll() {
  return (
    <View style={styles.card}>
      <View style={StyleSheet.flatten([styles.line, styles.short])} />
      <View style={StyleSheet.flatten([styles.line, styles.title])} />
      <View style={styles.option} />
      <View style={styles.option} />
      <View style={styles.option} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 24,
    backgroundColor: palette.surface,
    gap: 16,
    maxWidth: 760
  },
  line: {
    borderRadius: radius.xs,
    backgroundColor: "rgba(148, 163, 184, 0.22)"
  },
  short: { width: 140, height: 26 },
  title: { width: "86%", height: 36 },
  option: {
    height: 62,
    borderRadius: radius.md,
    backgroundColor: "rgba(148, 163, 184, 0.14)"
  }
});
