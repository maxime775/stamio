import { StyleSheet, View } from "react-native";

export function SkeletonPoll() {
  return (
    <View style={styles.card}>
      <View style={[styles.line, styles.short]} />
      <View style={[styles.line, styles.title]} />
      <View style={styles.option} />
      <View style={styles.option} />
      <View style={styles.option} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: "rgba(248, 250, 252, 0.95)",
    gap: 16,
    maxWidth: 760
  },
  line: {
    borderRadius: 999,
    backgroundColor: "#E2E8F0"
  },
  short: { width: 140, height: 26 },
  title: { width: "86%", height: 36 },
  option: {
    height: 62,
    borderRadius: 18,
    backgroundColor: "#EEF2F7"
  }
});
