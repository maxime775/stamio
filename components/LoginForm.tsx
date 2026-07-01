import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AuthForm } from "@/components/AuthForm";
import { signInUser } from "@/lib/api";

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
  label: { color: "#CBD5E1", fontWeight: "900", fontSize: 14 },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.26)",
    backgroundColor: "rgba(2, 6, 23, 0.58)",
    paddingHorizontal: 14,
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700"
  },
  error: {
    color: "#FCA5A5",
    backgroundColor: "rgba(127, 29, 29, 0.26)",
    borderRadius: 12,
    padding: 12,
    fontWeight: "800"
  },
  primary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center"
  },
  primaryPressed: { transform: [{ scale: 0.99 }], backgroundColor: "#6EE7B7" },
  primaryText: { color: "#06111C", fontSize: 16, fontWeight: "900" },
  link: { alignItems: "center", padding: 8 },
  linkText: { color: "#A7F3D0", fontWeight: "900" }
});
