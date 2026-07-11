import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { LatestAnswersList } from "@/components/LatestAnswersList";
import { PageShell } from "@/components/PageShell";
import { ThemeParticipationDonut } from "@/components/ThemeParticipationDonut";
import { useAuth } from "@/components/AuthProvider";
import { getCurrentUserProfile, getLatestUserAnswers, getMyAccountStats } from "@/lib/api";
import type { AccountStats, Profile, UserPollAnswer } from "@/lib/types";
import { getUserReputationStatus } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette } from "@/lib/design";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading: authLoading, emailVerified } = useAuth();
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? "";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [answers, setAnswers] = useState<UserPollAnswer[]>([]);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      router.replace("/auth/login" as Href);
      return;
    }
    if (!emailVerified) {
      router.replace({ pathname: "/auth/verify-email", params: { email: userEmail } } as Href);
      return;
    }

    let active = true;
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
  }, [authLoading, emailVerified, router, userEmail, userId]);

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
        <View style={styles.headingCopy}>
          <Text style={styles.kicker}>Mon compte</Text>
          <Text style={styles.title}>Mon espace de participation</Text>
        </View>
        <PointsInline score={reputation} />
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

function PointsInline({ score }: { score: number }) {
  const status = getUserReputationStatus(score);
  return (
    <View style={styles.points}>
      <View style={styles.pointsLine}>
        <Text style={styles.pointsValue}>{score}</Text>
        <Text style={styles.pointsLabel}>point{score > 1 ? "s" : ""}</Text>
      </View>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 18,
    flexWrap: "wrap",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: palette.line
  },
  headingCopy: { minWidth: 260, flex: 1 },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 36, lineHeight: 43, letterSpacing: -0.8, marginTop: 5 },
  points: { alignItems: "flex-end", gap: 2, paddingBottom: 3 },
  pointsLine: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  pointsValue: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 28, lineHeight: 31, fontVariant: ["tabular-nums"] },
  pointsLabel: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 12, lineHeight: 15 },
  status: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  mainRow: { flexDirection: "row", flexWrap: "wrap", gap: 28, alignItems: "flex-start" },
  answersColumn: { flex: 1, flexBasis: 560, minWidth: 300 },
  donutColumn: { flexGrow: 0, flexShrink: 1, flexBasis: 330, minWidth: 280, paddingTop: 2 },
  loading: { padding: 24, alignItems: "center", gap: 10 },
  loadingText: { color: palette.muted, fontFamily: fontFamilyMedium }
});
