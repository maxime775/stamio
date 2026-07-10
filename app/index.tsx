import { useEffect, useMemo, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { PageShell } from "@/components/PageShell";
import { TrendingPollsCarousel } from "@/components/TrendingPollsCarousel";
import { ApproachSection } from "@/components/ApproachSection";
import { FeaturedTopicsTicker } from "@/components/FeaturedTopicsTicker";
import { getFeaturedPolls, prefetchLatestResults, prefetchThemePolls } from "@/lib/api";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius, shadows } from "@/lib/design";
import type { PollWithStats } from "@/lib/types";
import { useReducedMotion } from "@/lib/useReducedMotion";

const HERO_TITLE = "Exprimez votre position. Faites-la évoluer.";

export default function Home() {
  const router = useRouter();
  const [polls, setPolls] = useState<PollWithStats[]>([]);
  const [isLoadingPolls, setIsLoadingPolls] = useState(true);
  const [typedTitle, setTypedTitle] = useState("");
  const subtitleReveal = useMemo(() => new Animated.Value(0), []);
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const compact = width < 720;

  useEffect(() => {
    let active = true;
    getFeaturedPolls()
      .then((items) => {
        if (!active) return;
        setPolls(items);
      })
      .catch(() => {
        if (active) setPolls([]);
      })
      .finally(() => {
        if (active) setIsLoadingPolls(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setTypedTitle(HERO_TITLE);
      subtitleReveal.setValue(1);
      return undefined;
    }
    setTypedTitle("");
    subtitleReveal.setValue(0);
    let index = 0;
    const typing = setInterval(() => {
      index += 1;
      setTypedTitle(HERO_TITLE.slice(0, index));
      if (index >= HERO_TITLE.length) clearInterval(typing);
    }, 28);
    const subtitle = Animated.sequence([
      Animated.delay(820),
      Animated.timing(subtitleReveal, { toValue: 1, duration: 430, useNativeDriver: true })
    ]);
    subtitle.start();
    return () => {
      clearInterval(typing);
      subtitle.stop();
    };
  }, [reducedMotion, subtitleReveal]);

  return (
    <PageShell>
      <View style={StyleSheet.flatten([styles.hero, compact && styles.heroCompact, compact && { maxWidth: Math.max(280, width - 40) }])}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>Là où l’opinion prend forme</Text>
          <View accessible accessibilityRole="header" accessibilityLabel={HERO_TITLE} style={styles.titleFrame}>
            <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.flatten([styles.title, compact && styles.titleCompact, styles.titleMeasure])}>{HERO_TITLE}</Text>
            <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.flatten([styles.title, compact && styles.titleCompact, styles.typedTitle])}>{typedTitle}</Text>
          </View>
          <Animated.Text style={StyleSheet.flatten([styles.subtitle, {
            opacity: subtitleReveal,
            transform: [{ translateY: subtitleReveal.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }]
          }])}>
            Faites entendre votre voix, prenez part au débat.{"\n"}
            Exprimez-vous sur les sujets qui vous animent et façonnez votre pensée. Ici on échange, on s’interroge, on réfléchit toujours.
          </Animated.Text>
          <Text style={styles.privacyNote}>Les participations sont toujours anonymisées</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => router.push("/themes" as Href)} onPressIn={() => prefetchThemePolls("all")} onFocus={() => prefetchThemePolls("all")} onHoverIn={() => prefetchThemePolls("all")} style={styles.primary}>
              <Text style={styles.primaryText}>Découvrir les sondages</Text>
              <ArrowRight size={18} color={palette.onPrimary} />
            </Pressable>
            <Pressable onPress={() => router.push("/results" as Href)} onPressIn={prefetchLatestResults} onFocus={prefetchLatestResults} onHoverIn={prefetchLatestResults} style={styles.secondary}>
              <Text style={styles.secondaryText}>Voir les derniers résultats</Text>
            </Pressable>
          </View>
        </View>
        <FeaturedTopicsTicker count={polls.length} />
      </View>

      <TrendingPollsCarousel polls={polls} loading={isLoadingPolls} />

      <ApproachSection />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 420,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceSubtle,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
    padding: 32,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 28,
    overflow: "hidden"
  },
  heroCompact: { width: "100%", padding: 22, minHeight: 0 },
  heroCopy: { flex: 1, minWidth: 280, gap: 16 },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase" },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 46, lineHeight: 53, letterSpacing: -1.4, maxWidth: 720 },
  titleFrame: { position: "relative", maxWidth: 720 },
  titleMeasure: { opacity: 0 },
  typedTitle: { position: "absolute", left: 0, top: 0, right: 0 },
  titleCompact: { fontSize: 36, lineHeight: 43, letterSpacing: -0.9 },
  subtitle: { color: palette.inkSecondary, fontSize: 17, lineHeight: 27, maxWidth: 680 },
  privacyNote: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 18, maxWidth: 680 },
  actions: { flexDirection: "row", gap: 12, flexWrap: "wrap", marginTop: 8 },
  primary: { minHeight: 48, borderRadius: radius.sm, backgroundColor: palette.primary, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10, ...shadows.panel },
  primaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold, fontSize: 14 },
  secondary: { minHeight: 48, borderRadius: radius.sm, backgroundColor: "transparent", paddingHorizontal: 18, justifyContent: "center", borderWidth: 1, borderColor: palette.lineStrong },
  secondaryText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14 }
});
