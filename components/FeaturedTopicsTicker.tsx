import { memo, useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { THEMES } from "@/lib/product";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, getThemeVisual, palette, radius } from "@/lib/design";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { ThemeSlug } from "@/lib/types";

const THEME_PHRASE: Record<ThemeSlug, string> = {
  politique: "la politique",
  economie: "l'économie",
  societe: "la société",
  sport: "le sport"
};

export const FeaturedTopicsTicker = memo(function FeaturedTopicsTicker({ count }: { count: number | null }) {
  const [index, setIndex] = useState(0);
  const motion = useMemo(() => new Animated.Value(1), []);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      motion.setValue(1);
      return undefined;
    }
    const timer = setInterval(() => {
      Animated.timing(motion, { toValue: 0.18, duration: 260, useNativeDriver: true }).start(() => {
        setIndex((value) => (value + 1) % THEMES.length);
        motion.setValue(0.18);
        Animated.timing(motion, { toValue: 1, duration: 480, useNativeDriver: true }).start();
      });
    }, 3200);
    return () => clearInterval(timer);
  }, [motion, reducedMotion]);

  const theme = THEMES[index];
  const visual = getThemeVisual(theme.slug);
  const translateY = motion.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <View style={styles.panel}>
      <View style={styles.status}><View style={styles.statusDot} /><Text style={styles.statusText}>Signal en continu</Text></View>
      {count === null ? <View accessibilityLabel="Chargement du nombre de questions mises en avant" style={styles.valueSkeleton} /> : <Text style={styles.value}>{count}</Text>}
      <Text style={styles.label}>questions mises en avant</Text>
      <Text style={styles.note}>Une sélection de questions ouvertes pour entrer rapidement dans le débat, sans lecture artificielle des résultats.</Text>
      <View style={styles.phraseWrap}>
        <Text style={styles.phrase}>
          que ce soit sur{" "}
          <Animated.Text style={StyleSheet.flatten([styles.topic, { color: visual.accent, opacity: motion, transform: [{ translateY }] }])}>
            {THEME_PHRASE[theme.slug]}
          </Animated.Text>
          , on a toujours quelque chose à dire.
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: { width: 318, maxWidth: "100%", borderRadius: radius.md, backgroundColor: "#090E14", padding: 20, gap: 9 },
  status: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusDot: { width: 5, height: 5, borderRadius: 1, backgroundColor: palette.positive },
  statusText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 },
  value: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 46, letterSpacing: 0, marginTop: 2 },
  valueSkeleton: { width: 46, height: 42, borderRadius: radius.xs, backgroundColor: palette.lineStrong, marginTop: 4, marginBottom: 2 },
  label: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 14 },
  note: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  phraseWrap: { minHeight: 50, justifyContent: "center", paddingTop: 4 },
  phrase: { color: palette.inkSecondary, fontSize: 15, lineHeight: 24 },
  topic: { fontFamily: fontFamilyBold, fontSize: 15, lineHeight: 24, minWidth: 86 }
});
