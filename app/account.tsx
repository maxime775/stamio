import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AccountSummary } from "@/components/AccountSummary";
import { LatestAnswersList } from "@/components/LatestAnswersList";
import { PageShell } from "@/components/PageShell";
import { ReputationBadge } from "@/components/ReputationBadge";
import { useAuth } from "@/components/AuthProvider";
import { getCurrentUserProfile, getLatestUserAnswers, signOutUser } from "@/lib/api";
import type { Profile, UserPollAnswer } from "@/lib/types";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading: authLoading, emailVerified } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [answers, setAnswers] = useState<UserPollAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth/login" as Href);
      return;
    }
    if (!emailVerified) {
      router.replace({ pathname: "/auth/verify-email", params: { email: user.email ?? "" } } as Href);
      return;
    }

    let active = true;
    Promise.all([getCurrentUserProfile(), getLatestUserAnswers()]).then(([nextProfile, nextAnswers]) => {
      if (!active) return;
      setProfile(nextProfile);
      setAnswers(nextAnswers);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [authLoading, emailVerified, router, user]);

  const reputation = useMemo(() => Math.max(profile?.reputation_score ?? 0, answers.length), [answers.length, profile?.reputation_score]);

  async function handleSignOut() {
    await signOutUser();
    router.replace("/" as Href);
  }

  if (authLoading || loading) {
    return (
      <PageShell compact>
        <View style={styles.loading}>
          <ActivityIndicator color="#0F766E" />
          <Text style={styles.loadingText}>Chargement du compte</Text>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <View style={styles.heading}>
        <View>
          <Text style={styles.kicker}>Mon compte</Text>
          <Text style={styles.title}>Votre espace de participation</Text>
        </View>
        <Pressable onPress={handleSignOut} style={styles.logout}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        <View style={styles.main}>
          <AccountSummary profile={profile} email={user?.email} />
          <LatestAnswersList answers={answers} />
        </View>
        <View style={styles.side}>
          <ReputationBadge score={reputation} />
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" },
  kicker: { color: "#0F766E", fontWeight: "900", textTransform: "uppercase", fontSize: 13 },
  title: { color: "#F8FAFC", fontSize: 38, lineHeight: 44, fontWeight: "900", letterSpacing: 0, marginTop: 4 },
  logout: { borderRadius: 14, backgroundColor: "rgba(148, 163, 184, 0.12)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.18)", paddingHorizontal: 16, paddingVertical: 12 },
  logoutText: { color: "#CBD5E1", fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "flex-start" },
  main: { flex: 1, minWidth: 320, gap: 16 },
  side: { width: 330, minWidth: 280, flexGrow: 1 },
  loading: { borderRadius: 20, backgroundColor: "rgba(15, 23, 42, 0.92)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.18)", padding: 24, alignItems: "center", gap: 10 },
  loadingText: { color: "#94A3B8", fontWeight: "800" }
});
