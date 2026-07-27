import { useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/components/AuthProvider";
import { verifyPasskeyEnrollment } from "@/lib/api";
import { getPasskeyErrorMessage, registerPasskey } from "@/lib/auth/passkeys";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

export default function PasskeyEnrollmentPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { user, loading: authLoading, emailVerified } = useAuth();
  const running = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    if (running.current) return;
    if (!user || !emailVerified) {
      router.replace("/auth/login" as Href);
      return;
    }
    running.current = true;
    setLoading(true);
    setError(null);
    try {
      await registerPasskey();
      const result = await verifyPasskeyEnrollment();
      if (!result.enrolled) throw new Error("webauthn_verification_failed");
      router.replace(safeNext(next));
    } catch (caught) {
      setError(getPasskeyErrorMessage(caught));
    } finally {
      running.current = false;
      setLoading(false);
    }
  }

  return (
    <PageShell compact>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>SÉCURITÉ DU COMPTE</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>Créez votre clé d’accès</Text>
        <Text style={styles.mainText}>Utilisez Face ID, votre empreinte, Windows Hello ou le code de votre appareil. Aucune application n’est à installer.</Text>
        <View style={styles.divider} />
        <Text style={styles.secondary}>Cette clé vous permettra de vous connecter rapidement et de manière sécurisée à Stamio.</Text>
        {Platform.OS !== "web" ? <Text accessibilityLiveRegion="polite" style={styles.error}>La création d’une clé d’accès est disponible sur le site web Stamio. Ouvrez cette page dans un navigateur récent.</Text> : null}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" disabled={loading || authLoading || Platform.OS !== "web"} onPress={enroll} style={({ pressed }) => StyleSheet.flatten([styles.primary, compact && styles.primaryCompact, pressed && !loading && styles.pressed, (loading || Platform.OS !== "web") && styles.disabled])}>
          {loading ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.primaryText}>{error?.includes("annulée") ? "Réessayer" : "Créer ma clé d’accès"}</Text>}
        </Pressable>
        <Text style={styles.help}>La méthode proposée dépend de votre appareil. Stamio n’accède jamais à vos données biométriques.</Text>
      </View>
    </PageShell>
  );
}

function safeNext(value?: string): Href {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.includes("://")) return value as Href;
  return "/account" as Href;
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: 720, alignSelf: "center", gap: 18 },
  eyebrow: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 32, lineHeight: 39, maxWidth: 620 },
  titleCompact: { fontSize: 29, lineHeight: 35 },
  mainText: { width: "100%", flexShrink: 1, color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 24, maxWidth: 660 },
  divider: { width: "100%", height: 1, backgroundColor: palette.line, marginVertical: 2 },
  secondary: { color: palette.inkSecondary, lineHeight: 22, maxWidth: 620 },
  error: { color: palette.dangerText, lineHeight: 22, maxWidth: 620 },
  primary: { minHeight: 44, alignSelf: "flex-start", borderRadius: radius.sm, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  primaryCompact: { width: "100%", alignSelf: "stretch" },
  pressed: { backgroundColor: palette.primaryPressed },
  disabled: { opacity: 0.7 },
  primaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold },
  help: { color: palette.muted, fontSize: 13, lineHeight: 20, maxWidth: 620 }
});
