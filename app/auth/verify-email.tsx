import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/lib/supabase";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    if (loading || cooldown > 0) return;
    if (!email) {
      setMessage("Adresse email indisponible. Relancez l’inscription si nécessaire.");
      return;
    }
    setLoading(true);
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: redirectTo } });
    setLoading(false);
    if (!error) setCooldown(60);
    setMessage(error ? "Impossible de renvoyer l’email pour le moment." : "Si cette inscription est valide, un nouvel email vient d’être envoyé.");
  }

  return (
    <PageShell compact>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>INSCRIPTION</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>Confirmez votre adresse email</Text>
        <Text style={styles.text}>Nous vous avons envoyé un lien de confirmation. Cliquez sur ce lien pour poursuivre la création de votre compte.</Text>
        <Text style={styles.secondaryCopy}>Pensez à vérifier votre dossier de courriers indésirables si vous ne trouvez pas notre message.</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={resend} disabled={loading || cooldown > 0} style={[styles.primary, compact && styles.actionCompact]}>
            {loading ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.primaryText}>{cooldown > 0 ? `Renvoyer dans ${cooldown} s` : "Renvoyer l’email"}</Text>}
          </Pressable>
          <Pressable onPress={() => router.push("/auth/login" as Href)} style={[styles.secondary, compact && styles.actionCompact]}>
            <Text style={styles.secondaryText}>J’ai vérifié mon email</Text>
          </Pressable>
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: 720, alignSelf: "center", gap: 18 },
  eyebrow: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 32, lineHeight: 39, maxWidth: 620 },
  titleCompact: { fontSize: 29, lineHeight: 35 },
  text: { width: "100%", flexShrink: 1, color: palette.inkSecondary, fontSize: 15, lineHeight: 24, maxWidth: 660 },
  secondaryCopy: { width: "100%", flexShrink: 1, color: palette.muted, fontSize: 14, lineHeight: 22, maxWidth: 660 },
  message: { color: palette.positiveText, fontFamily: fontFamilyMedium, lineHeight: 22 },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 4 },
  primary: { minHeight: 44, borderRadius: radius.sm, backgroundColor: palette.primary, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  primaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold },
  secondary: { minHeight: 44, borderRadius: radius.sm, backgroundColor: "transparent", borderWidth: 1, borderColor: palette.lineStrong, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  actionCompact: { width: "100%" },
  secondaryText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium }
});
