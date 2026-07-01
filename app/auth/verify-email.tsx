import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

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
          <MailCheck size={30} color="#0F766E" />
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
  card: { width: "100%", maxWidth: 520, alignSelf: "center", borderRadius: 24, backgroundColor: "rgba(15, 23, 42, 0.94)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.18)", padding: 28, gap: 16, alignItems: "center" },
  icon: { width: 62, height: 62, borderRadius: 20, backgroundColor: "rgba(20, 184, 166, 0.12)", alignItems: "center", justifyContent: "center" },
  title: { color: "#F8FAFC", fontSize: 31, lineHeight: 37, fontWeight: "900", textAlign: "center" },
  text: { color: "#94A3B8", fontSize: 16, lineHeight: 24, textAlign: "center" },
  message: { color: "#A7F3D0", backgroundColor: "rgba(20, 184, 166, 0.12)", borderRadius: 12, padding: 12, fontWeight: "800" },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 },
  primary: { minHeight: 48, borderRadius: 14, backgroundColor: "#A7F3D0", paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#06111C", fontWeight: "900" },
  secondary: { minHeight: 48, borderRadius: 14, backgroundColor: "rgba(148, 163, 184, 0.12)", paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#CBD5E1", fontWeight: "900" }
});
