import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { choiceColors, fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette } from "@/lib/design";
import type { Choice, PollResult } from "@/lib/types";

type Props = {
  choices: Choice[];
  results: PollResult[];
};

const SIZE = 112;
const CENTER = SIZE / 2;
const RADIUS = 43;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ResultsDonutSummary({ choices, results }: Props) {
  const resultByChoice = new Map(results.map((result) => [result.choice_id, result]));
  const items = (choices.length > 0 ? choices.map((choice) => ({
    choice_id: choice.id,
    label: choice.label,
    votes: resultByChoice.get(choice.id)?.votes ?? 0
  })) : results).map((item, index) => ({ ...item, color: choiceColors[index % choiceColors.length] }));
  const total = items.reduce((sum, item) => sum + item.votes, 0);
  let offset = 0;

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.donutFrame}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={palette.lineStrong} strokeWidth={10} />
            {total > 0 ? items.map((item) => {
              const fraction = item.votes / total;
              const length = fraction * CIRCUMFERENCE;
              const currentOffset = offset;
              offset += length;
              return <Circle
                key={item.choice_id}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={item.color}
                strokeWidth={10}
                strokeDasharray={`${length} ${Math.max(0, CIRCUMFERENCE - length)}`}
                strokeDashoffset={-currentOffset}
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
              />;
            }) : null}
          </Svg>
          <View pointerEvents="none" style={styles.donutCenter}>
            <Text style={styles.total}>{total}</Text>
            <Text style={styles.totalLabel}>votes</Text>
          </View>
        </View>
        <View style={styles.legend}>
          {items.map((item) => {
            const percentage = total > 0 ? Math.round((item.votes / total) * 100) : 0;
            return <View key={item.choice_id} style={styles.legendRow}>
              <View style={StyleSheet.flatten([styles.swatch, { backgroundColor: item.color }])} />
              <View style={styles.legendCopy}>
                <Text numberOfLines={2} style={styles.label}>{item.label}</Text>
                <Text style={styles.percentage}>{percentage}%</Text>
              </View>
            </View>;
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 300, maxWidth: "100%", alignSelf: "center", justifyContent: "center" },
  content: { flexDirection: "row", alignItems: "center", gap: 16 },
  donutFrame: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center", position: "relative" },
  donutCenter: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", paddingTop: 1 },
  total: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 22, lineHeight: 24, fontVariant: ["tabular-nums"] },
  totalLabel: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.7 },
  legend: { flex: 1, gap: 9 },
  legendRow: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  swatch: { width: 10, height: 2 },
  legendCopy: { flexShrink: 1, alignItems: "flex-start", gap: 1 },
  label: { color: palette.inkSecondary, fontSize: 11, lineHeight: 14 },
  percentage: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 11, lineHeight: 14 }
});
