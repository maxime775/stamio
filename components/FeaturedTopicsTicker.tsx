import { useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { THEMES } from "@/lib/product";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, getThemeVisual, palette, radius } from "@/lib/design";

export function FeaturedTopicsTicker({ count }: { count: number }) {
  const [index, setIndex] = useState(0);
  const motion = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(motion, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setIndex((value) => (value + 1) % THEMES.length);
        motion.setValue(0);
        Animated.timing(motion, { toValue: 1, duration: 420, useNativeDriver: true }).start();
      });
    }, 2800);
    return () => clearInterval(timer);
  }, [motion]);

  const theme = THEMES[index];
  const visual = getThemeVisual(theme.slug);
  const translateY = motion.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return (
    <View style={styles.panel}>
      <View style={styles.status}><View style={styles.statusDot} /><Text style={styles.statusText}>Signal en continu</Text></View>
      <Text style={styles.value}>{count || 5}</Text>
      <Text style={styles.label}>questions mises en avant</Text>
      <View style={styles.line} />
      <View style={styles.topicRow}>
        <Text style={styles.topicLabel}>Thème observé</Text>
        <Animated.View style={StyleSheet.flatten([styles.topicSignal, { opacity: motion, transform: [{ translateY }] }])}>
          <View style={StyleSheet.flatten([styles.topicLine, { backgroundColor: visual.accent }])} />
          <Text style={StyleSheet.flatten([styles.topic, { color: visual.accent }])}>{theme.label}</Text>
        </Animated.View>
      </View>
      <Text style={styles.note}>Une lecture structurée des sujets qui traversent le débat.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: 280, maxWidth: "100%", borderRadius: radius.md, backgroundColor: palette.surface, padding: 20, gap: 8, borderWidth: 1, borderColor: palette.line },
  status: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusDot: { width: 5, height: 5, borderRadius: 1, backgroundColor: palette.positive },
  statusText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 },
  value: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 46, letterSpacing: -1.5, marginTop: 2 },
  label: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 14 },
  line: { height: 1, backgroundColor: palette.line, marginVertical: 7 },
  topicRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 22, gap: 12 },
  topicLabel: { color: palette.muted, fontSize: 11 },
  topicSignal: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 7, minWidth: 96 },
  topicLine: { width: 14, height: 2 },
  topic: { fontFamily: fontFamilySemibold, fontSize: 12 },
  note: { color: palette.muted, fontSize: 12, lineHeight: 18 }
});
