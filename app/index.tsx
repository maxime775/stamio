import { useEffect, useMemo, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { PageShell } from "@/components/PageShell";
import { TrendingPollsCarousel } from "@/components/TrendingPollsCarousel";
import { TrustBadge } from "@/components/TrustBadge";
import { FeaturedTopicsTicker } from "@/components/FeaturedTopicsTicker";
import { getFeaturedPolls } from "@/lib/api";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius, shadows } from "@/lib/design";
import type { PollWithStats } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [polls, setPolls] = useState<PollWithStats[]>([]);
  const fade = useMemo(() => new Animated.Value(0), []);
  const { width } = useWindowDimensions();
  const compact = width < 720;

  useEffect(() => {
    let active = true;
    getFeaturedPolls().then((items) => {
      if (!active) return;
      setPolls(items);
      Animated.timing(fade, { toValue: 1, duration: 520, useNativeDriver: true }).start();
    });
    return () => {
      active = false;
    };
  }, [fade]);

  return (
    <PageShell>
      <Animated.View style={StyleSheet.flatten([styles.hero, compact && styles.heroCompact, compact && { maxWidth: Math.max(280, width - 40) }, { opacity: fade as unknown as number }])}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>Signal d’opinion</Text>
          <Text style={StyleSheet.flatten([styles.title, compact && styles.titleCompact])}>Donnez votre avis. Prenez le temps d’en changer.</Text>
          <Text style={styles.subtitle}>
            Votez sur les grandes questions du moment, suivez les résultats en temps réel et participez à des débats où l’on peut hésiter, échanger et se faire une opinion.
          </Text>
          <View style={styles.actions}>
            <Pressable onPress={() => router.push("/themes" as Href)} style={styles.primary}>
              <Text style={styles.primaryText}>Découvrir les sondages</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable onPress={() => router.push("/results" as Href)} style={styles.secondary}>
              <Text style={styles.secondaryText}>Voir les derniers résultats</Text>
            </Pressable>
          </View>
        </View>
        <FeaturedTopicsTicker count={polls.length} />
      </Animated.View>

      <TrendingPollsCarousel polls={polls} />

      <View style={styles.trustGrid}>
        <TrustBadge icon="verified" title="Un numéro vérifié = un vote par question" text="La validation reste dans le parcours serveur sécurisé." />
        <TrustBadge icon="results" title="Résultats en temps réel" text="Les résultats sont présentés sous forme agrégée, sans donnée sensible." />
        <TrustBadge icon="private" title="Aucun numéro affiché publiquement" text="Les pages publiques ne montrent ni téléphone, ni hash individuel." />
        <TrustBadge icon="lock" title="Anti-doublon technique" text="La base conserve la contrainte anti-double vote par question." />
      </View>
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
  titleCompact: { fontSize: 36, lineHeight: 43, letterSpacing: -0.9 },
  subtitle: { color: palette.inkSecondary, fontSize: 17, lineHeight: 27, maxWidth: 680 },
  actions: { flexDirection: "row", gap: 12, flexWrap: "wrap", marginTop: 8 },
  primary: { minHeight: 48, borderRadius: radius.sm, backgroundColor: palette.primary, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10, ...shadows.panel },
  primaryText: { color: "#FFFFFF", fontFamily: fontFamilySemibold, fontSize: 14 },
  secondary: { minHeight: 48, borderRadius: radius.sm, backgroundColor: "transparent", paddingHorizontal: 18, justifyContent: "center", borderWidth: 1, borderColor: palette.lineStrong },
  secondaryText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14 },
  trustGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 }
});
