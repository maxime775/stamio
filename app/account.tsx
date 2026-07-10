import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AccountSummary } from "@/components/AccountSummary";
import { LatestAnswersList } from "@/components/LatestAnswersList";
import { PageShell } from "@/components/PageShell";
import { ThemeParticipationDonut } from "@/components/ThemeParticipationDonut";
import { useAuth } from "@/components/AuthProvider";
import { getCurrentUserProfile, getLatestUserAnswers, getMyAccountStats } from "@/lib/api";
import type { AccountStats, Profile, UserPollAnswer } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading: authLoading, emailVerified } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [answers, setAnswers] = useState<UserPollAnswer[]>([]);
  const [stats, setStats] = useState<AccountStats | null>(null);
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
    setLoading(true);
    Promise.all([getCurrentUserProfile(), getLatestUserAnswers(), getMyAccountStats()])
      .then(([nextProfile, nextAnswers, nextStats]) => {
        if (!active) return;
        setProfile(nextProfile);
        setAnswers(nextAnswers);
        setStats(nextStats);
      })
      .catch(() => {
        if (!active) return;
        setProfile(null);
        setAnswers([]);
        setStats(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, emailVerified, router, user]);

  const reputation = useMemo(() => Math.max(profile?.reputation_score ?? 0, answers.length), [answers.length, profile?.reputation_score]);

  if (authLoading || loading) {
    return (
      <PageShell compact>
        <View style={styles.loading}>
          <ActivityIndicator color={palette.primaryStrong} />
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
          <Text style={styles.title}>Mon espace de participation</Text>
        </View>
        <PointsPill score={reputation} />
      </View>

      <View style={styles.statsRow}>
        <MetricCard label="Participations sur 30 jours" value={stats?.participations_30_days ?? 0} />
        <View style={styles.profileColumn}>
          <AccountSummary profile={profile} email={user?.email} />
        </View>
      </View>

      <View style={styles.mainRow}>
        <View style={styles.answersColumn}>
          <LatestAnswersList answers={answers} />
        </View>
        <View style={styles.donutColumn}>
          <ThemeParticipationDonut items={stats?.participation_by_theme ?? []} />
        </View>
      </View>
    </PageShell>
  );
}

function PointsPill({ score }: { score: number }) {
  return (
    <View style={styles.pointsPill}>
      <Text style={styles.pointsValue}>{score}</Text>
      <Text style={styles.pointsLabel}>point{score > 1 ? "s" : ""}</Text>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 36, lineHeight: 43, letterSpacing: -0.8, marginTop: 5 },
  pointsPill: { minWidth: 118, borderRadius: radius.sm, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.lineStrong, paddingHorizontal: 14, paddingVertical: 10, alignItems: "flex-end" },
  pointsValue: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 24, lineHeight: 27, fontVariant: ["tabular-nums"] },
  pointsLabel: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "stretch" },
  metricCard: { width: 250, minWidth: 220, flexGrow: 1, borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, padding: 18, justifyContent: "center", gap: 5 },
  metricValue: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 32, lineHeight: 36, fontVariant: ["tabular-nums"] },
  metricLabel: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  profileColumn: { flex: 2, minWidth: 300, maxWidth: 680 },
  mainRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "flex-start" },
  answersColumn: { flex: 1.5, minWidth: 320 },
  donutColumn: { flex: 1, minWidth: 300 },
  loading: { borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, padding: 24, alignItems: "center", gap: 10 },
  loadingText: { color: palette.muted, fontFamily: fontFamilyMedium }
});
