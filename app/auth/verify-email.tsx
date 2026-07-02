import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/lib/supabase";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function resend() {
    if (!email) {
      setMessage("Adresse email indisponible. Relancez l’inscription si nécessaire.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setLoading(false);
    setMessage(error ? error.message : "Email de vérification renvoyé.");
  }

  return (
    <PageShell compact>
      <View style={styles.card}>
        <View style={styles.icon}>
          <MailCheck size={28} color={palette.primaryStrong} />
        </View>
        <Text style={styles.title}>Vérifiez votre boîte mail</Text>
        <Text style={styles.text}>Cliquez sur le lien reçu pour activer votre compte. L’accès complet au compte est réservé aux emails vérifiés.</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.actions}>
          <Pressable onPress={resend} disabled={loading} style={styles.primary}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Renvoyer l’email</Text>}
          </Pressable>
          <Pressable onPress={() => router.push("/auth/login" as Href)} style={styles.secondary}>
            <Text style={styles.secondaryText}>J’ai vérifié mon email</Text>
          </Pressable>
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", maxWidth: 520, alignSelf: "center", borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, padding: 28, gap: 16, alignItems: "center" },
  icon: { width: 54, height: 54, borderRadius: radius.md, backgroundColor: palette.primarySoft, alignItems: "center", justifyContent: "center" },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 29, lineHeight: 36, textAlign: "center" },
  text: { color: palette.muted, fontSize: 15, lineHeight: 24, textAlign: "center" },
  message: { color: palette.positive, backgroundColor: "rgba(47,191,145,0.1)", borderRadius: radius.sm, padding: 12, fontFamily: fontFamilyMedium },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 },
  primary: { minHeight: 48, borderRadius: radius.sm, backgroundColor: palette.primary, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontFamily: fontFamilySemibold },
  secondary: { minHeight: 48, borderRadius: radius.sm, backgroundColor: "transparent", borderWidth: 1, borderColor: palette.lineStrong, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium }
});
