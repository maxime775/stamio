import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { PollResult } from "@/lib/types";

type Props = {
  results: PollResult[];
};

export function ResultsBars({ results }: Props) {
  const total = results.reduce((sum, item) => sum + item.votes, 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Résultats</Text>
        <Text style={styles.total}>{total} vote{total > 1 ? "s" : ""}</Text>
      </View>
      <View style={styles.rows}>
        {results.map((result) => (
          <ResultRow key={result.choice_id} result={result} total={total} />
        ))}
      </View>
    </View>
  );
}

function ResultRow({ result, total }: { result: PollResult; total: number }) {
  const progress = total === 0 ? 0 : result.votes / total;
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(width, {
      toValue: progress,
      damping: 18,
      stiffness: 120,
      mass: 0.7,
      useNativeDriver: false
    }).start();
  }, [progress, width]);

  const percent = Math.round(progress * 100);

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.label}>{result.label}</Text>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={{
            ...styles.fill,
            width: width.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"]
            }) as unknown as `${number}%`
          }}
        />
      </View>
      <Text style={styles.votes}>{result.votes} comptabilisé{result.votes > 1 ? "s" : ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 22,
    backgroundColor: "rgba(15, 23, 42, 0.76)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    gap: 20
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { color: "#F8FAFC", fontSize: 22, fontWeight: "900" },
  total: { color: "#A7F3D0", fontSize: 13, fontWeight: "800" },
  rows: { gap: 18 },
  row: { gap: 8 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  label: { color: "#E2E8F0", fontSize: 15, fontWeight: "800", flex: 1 },
  percent: { color: "#F8FAFC", fontSize: 15, fontWeight: "900" },
  track: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#5EEAD4"
  },
  votes: { color: "#94A3B8", fontSize: 12, fontWeight: "700" }
});
