import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { HeroActionButton } from "@/components/HeroActionButton";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/lib/supabase";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette } from "@/lib/design";

const GENERIC_ERROR = "Ce lien de confirmation est invalide ou a expiré. Demandez un nouvel email pour poursuivre votre inscription.";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const tokenHash = useRef<string | null>(null);
  const consumed = useRef(false);
  const initialized = useRef(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (typeof window === "undefined") return;
    const meta = document.querySelector('meta[name="referrer"]') ?? document.createElement("meta");
    meta.setAttribute("name", "referrer");
    meta.setAttribute("content", "no-referrer");
    if (!meta.parentNode) document.head.appendChild(meta);

    const url = new URL(window.location.href);
    const token = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    tokenHash.current = type === "email" ? token : null;
    window.history.replaceState({}, document.title, url.pathname);
    setReady(true);
    if (!tokenHash.current) setError(GENERIC_ERROR);
  }, []);

  async function confirmEmail() {
    if (loading || consumed.current || !tokenHash.current) return;
    consumed.current = true;
    setLoading(true);
    setError(null);
    const token = tokenHash.current;
    tokenHash.current = null;
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: token, type: "email" });
      if (verifyError || !data.session || !data.user?.email_confirmed_at) throw new Error("confirmation_failed");
      router.replace("/auth/passkey-enrollment?flow=signup" as Href);
    } catch {
      consumed.current = false;
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell compact>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>INSCRIPTION</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>Confirmez votre adresse email</Text>
        <Text style={styles.text}>Pour terminer la confirmation, utilisez le bouton ci-dessous.</Text>
        {!ready ? <ActivityIndicator color={palette.primaryStrong} /> : null}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        {ready && !error ? (
          <HeroActionButton
            label="Confirmer mon adresse email"
            variant="primary"
            onPress={confirmEmail}
            loading={loading}
          />
        ) : null}
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: 760, alignSelf: "center", alignItems: "center", gap: 18 },
  eyebrow: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, letterSpacing: 1.2, textAlign: "center" },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 32, lineHeight: 39, maxWidth: 660, textAlign: "center" },
  titleCompact: { fontSize: 29, lineHeight: 35 },
  text: { width: "100%", flexShrink: 1, color: palette.inkSecondary, fontFamily: fontFamilyMedium, lineHeight: 23, maxWidth: 620, textAlign: "center" },
  error: { color: palette.dangerText, fontFamily: fontFamilyMedium, lineHeight: 22, maxWidth: 620, textAlign: "center" }
});
