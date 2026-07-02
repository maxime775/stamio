import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { PollResult } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

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
    borderRadius: radius.md,
    padding: 17,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 15
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 20 },
  total: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 12 },
  rows: { gap: 13 },
  row: { gap: 8 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14, flex: 1 },
  percent: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 14 },
  track: {
    height: 6,
    borderRadius: radius.xs,
    backgroundColor: palette.lineStrong,
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    borderRadius: radius.xs,
    backgroundColor: palette.primaryStrong
  },
  votes: { color: palette.muted, fontSize: 11 }
});
