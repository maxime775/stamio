import { useEffect, useMemo, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { PageShell } from "@/components/PageShell";
import { TrendingPollsCarousel } from "@/components/TrendingPollsCarousel";
import { TrustBadge } from "@/components/TrustBadge";
import { getFeaturedPolls } from "@/lib/api";
import type { PollWithStats } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [polls, setPolls] = useState<PollWithStats[]>([]);
  const fade = useMemo(() => new Animated.Value(0), []);

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
      <Animated.View style={StyleSheet.flatten([styles.hero, { opacity: fade as unknown as number }])}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>Sondages vérifiés</Text>
          <Text style={styles.title}>Les sujets qui font l’actu. Votre avis compte.</Text>
          <Text style={styles.subtitle}>
            Votez sur les grandes questions du moment, suivez les résultats en temps réel et construisez votre réputation citoyenne.
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
        <View style={styles.signalPanel}>
          <Text style={styles.signalValue}>{polls.length || 5}</Text>
          <Text style={styles.signalLabel}>questions mises en avant</Text>
          <View style={styles.signalLine} />
          <Text style={styles.signalNote}>Participation encadrée par validation serveur et anti-doublon technique.</Text>
        </View>
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
    borderRadius: 28,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
    padding: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
    overflow: "hidden"
  },
  heroCopy: { flex: 1, minWidth: 280, gap: 16 },
  kicker: { color: "#A7F3D0", fontSize: 13, fontWeight: "900", textTransform: "uppercase" },
  title: { color: "#FFFFFF", fontSize: 48, lineHeight: 54, fontWeight: "900", letterSpacing: 0, maxWidth: 720 },
  subtitle: { color: "#CBD5E1", fontSize: 18, lineHeight: 28, maxWidth: 680 },
  actions: { flexDirection: "row", gap: 12, flexWrap: "wrap", marginTop: 8 },
  primary: { minHeight: 50, borderRadius: 14, backgroundColor: "#0F766E", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10 },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  secondary: { minHeight: 50, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.09)", paddingHorizontal: 18, justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  secondaryText: { color: "#E2E8F0", fontWeight: "900", fontSize: 15 },
  signalPanel: { width: 280, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.08)", padding: 22, gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  signalValue: { color: "#A7F3D0", fontSize: 54, fontWeight: "900" },
  signalLabel: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  signalLine: { height: 1, backgroundColor: "rgba(255,255,255,0.16)", marginVertical: 8 },
  signalNote: { color: "#CBD5E1", lineHeight: 21, fontWeight: "700" },
  trustGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 }
});
