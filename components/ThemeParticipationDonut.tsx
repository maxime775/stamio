import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { getThemeLabel } from "@/lib/product";
import type { AccountThemeParticipation } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius, themeVisuals } from "@/lib/design";

type Props = {
  items: AccountThemeParticipation[];
};

const SIZE = 132;
const CENTER = SIZE / 2;
const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ThemeParticipationDonut({ items }: Props) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  let offset = 0;

  if (total === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Participation par thème</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucune participation pour le moment</Text>
          <Text style={styles.emptyText}>La répartition par thème apparaîtra après vos premières réponses vérifiées.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.title}>Participation par thème</Text>
        <Text style={styles.total}>{total} participation{total > 1 ? "s" : ""}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.donutFrame}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={palette.lineStrong} strokeWidth={13} />
            {items.map((item) => {
              if (item.count <= 0) return null;
              const length = (item.count / total) * CIRCUMFERENCE;
              const visual = themeVisuals[item.theme];
              const segment = (
                <Circle
                  key={item.theme}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke={visual.accent}
                  strokeWidth={13}
                  strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${CENTER} ${CENTER})`}
                />
              );
              offset += length;
              return segment;
            })}
          </Svg>
          <View pointerEvents="none" style={styles.donutCenter}>
            <Text style={styles.centerValue}>{total}</Text>
            <Text style={styles.centerLabel}>total</Text>
          </View>
        </View>
        <View style={styles.legend}>
          {items.map((item) => {
            const visual = themeVisuals[item.theme];
            return (
              <View key={item.theme} style={styles.legendRow}>
                <View style={StyleSheet.flatten([styles.swatch, { backgroundColor: visual.accent }])} />
                <Text style={styles.legendLabel}>{getThemeLabel(item.theme)}</Text>
                <Text style={styles.legendValue}>{item.percentage}%</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, padding: 18, gap: 16 },
  heading: { gap: 4 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 19 },
  total: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 12 },
  content: { flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" },
  donutFrame: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center", position: "relative" },
  donutCenter: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  centerValue: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 24, lineHeight: 27, fontVariant: ["tabular-nums"] },
  centerLabel: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 9, textTransform: "uppercase" },
  legend: { flex: 1, minWidth: 150, gap: 9 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  swatch: { width: 14, height: 3, flexShrink: 0 },
  legendLabel: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 12, flex: 1 },
  legendValue: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 12, fontVariant: ["tabular-nums"] },
  empty: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 14, gap: 5 },
  emptyTitle: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 14 },
  emptyText: { color: palette.muted, fontSize: 12, lineHeight: 18 }
});
