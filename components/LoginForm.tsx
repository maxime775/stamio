import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AuthForm } from "@/components/AuthForm";
import { signInUser } from "@/lib/api";
import { fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.includes("@") || password.length === 0) {
      setError("Email ou mot de passe invalide.");
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: loginError } = await signInUser(email.trim(), password);
    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    if (!data.user?.email_confirmed_at) {
      router.replace({ pathname: "/auth/verify-email", params: { email: email.trim() } } as Href);
      return;
    }

    router.replace("/account" as Href);
  }

  return (
    <AuthForm title="Se connecter" subtitle="Accédez à votre profil, votre historique et votre réputation." maxWidth={460}>
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="vous@example.com"
          placeholderTextColor="#64748B"
          style={styles.input}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Votre mot de passe"
          placeholderTextColor="#64748B"
          style={styles.input}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable disabled={loading} onPress={handleSubmit} style={({ pressed }) => ({ ...styles.primary, ...(pressed ? styles.primaryPressed : {}) })}>
        {loading ? <ActivityIndicator color="#06111C" /> : <Text style={styles.primaryText}>Se connecter</Text>}
      </Pressable>
      <Pressable onPress={() => router.push("/auth/signup" as Href)} style={styles.link}>
        <Text style={styles.linkText}>Créer un compte gratuit</Text>
      </Pressable>
    </AuthForm>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  input: {
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.26)",
    backgroundColor: palette.surfaceSubtle,
    paddingHorizontal: 14,
    color: "#F8FAFC",
    fontSize: 16,
    fontFamily: fontFamilyMedium
  },
  error: {
    color: "#FCA5A5",
    backgroundColor: "rgba(127, 29, 29, 0.26)",
    borderRadius: radius.sm,
    padding: 12,
    fontFamily: fontFamilyMedium
  },
  primary: {
    minHeight: 52,
    borderRadius: radius.sm,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryPressed: { transform: [{ translateY: 1 }], backgroundColor: "#315CC2" },
  primaryText: { color: "#FFFFFF", fontFamily: fontFamilySemibold, fontSize: 15 },
  link: { alignItems: "center", padding: 8 },
  linkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold }
});
