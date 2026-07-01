import { StyleSheet, View } from "react-native";

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
    borderRadius: 28,
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    gap: 16,
    maxWidth: 760
  },
  line: {
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.22)"
  },
  short: { width: 140, height: 26 },
  title: { width: "86%", height: 36 },
  option: {
    height: 62,
    borderRadius: 18,
    backgroundColor: "rgba(148, 163, 184, 0.14)"
  }
});
