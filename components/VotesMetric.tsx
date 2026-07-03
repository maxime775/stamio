import { StyleSheet, Text, View } from "react-native";
import { fontFamilyBold, fontFamilyMedium, palette } from "@/lib/design";

export function VotesMetric({ value, accent = palette.primaryStrong }: { value: number; accent?: string }) {
  return (
    <View accessibilityLabel={`${value} votes agrégés`} style={styles.wrap}>
      <View style={StyleSheet.flatten([styles.ring, { borderColor: accent }])}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>votes agrégés</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minWidth: 120, alignItems: "center", justifyContent: "center" },
  ring: { width: 108, height: 108, borderRadius: 54, borderWidth: 8, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  value: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 25, lineHeight: 28, fontVariant: ["tabular-nums"] },
  label: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 8, lineHeight: 11, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.45, maxWidth: 70 }
});
