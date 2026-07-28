import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from "react-native";
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
  const { width } = useWindowDimensions();
  const alignedColumns = width >= 1024;
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
        if (nextProfile?.passkey_required_at && !nextProfile.passkey_enrolled_at) {
          router.replace("/auth/passkey-enrollment" as Href);
          return;
        }
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

  const participationCount = useMemo(
    () => (stats?.participation_by_theme ?? []).reduce((sum, item) => sum + item.count, 0),
    [stats?.participation_by_theme]
  );
  const reputationStatus = getUserReputationStatus(participationCount);

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
      {alignedColumns ? (
        <View style={styles.desktopLayout}>
          <View style={styles.desktopHeader}>
            <View style={styles.desktopRow}>
              <Text style={StyleSheet.flatten([styles.primarySlot, styles.kicker])}>Mon compte</Text>
              <View style={styles.secondarySlot} />
            </View>
            <View style={styles.desktopRow}>
              <Text style={StyleSheet.flatten([styles.primarySlot, styles.title])}>Espace personnel</Text>
              <View style={StyleSheet.flatten([styles.secondarySlot, styles.secondaryCentered])}>
                <PointsLine score={participationCount} />
              </View>
            </View>
            <View style={styles.desktopRow}>
              <View style={styles.primarySlot}>
                <Text style={styles.subtitle}>Suivez vos réponses et les thèmes auxquels vous avez pris part.</Text>
              </View>
              <View style={StyleSheet.flatten([styles.secondarySlot, styles.secondaryCentered])}>
                <Text style={StyleSheet.flatten([styles.status, styles.centeredText])}>{reputationStatus}</Text>
              </View>
            </View>
          </View>
          <View style={StyleSheet.flatten([styles.desktopRow, styles.dividerRow])}>
            <View style={StyleSheet.flatten([styles.primarySlot, styles.divider])} />
            <View style={StyleSheet.flatten([styles.secondarySlot, styles.divider])} />
          </View>
          <View style={StyleSheet.flatten([styles.desktopRow, styles.sectionTitleRow])}>
            <Text style={StyleSheet.flatten([styles.primarySlot, styles.sectionTitle])}>Mes dernières réponses</Text>
            <Text style={StyleSheet.flatten([styles.secondarySlot, styles.sectionTitle, styles.centeredText])}>Mes thèmes</Text>
          </View>
          <View style={styles.desktopRow}>
            <View style={StyleSheet.flatten([styles.primarySlot, styles.latestAnswersContent])}>
              <LatestAnswersList answers={answers} showTitle={false} />
            </View>
            <View style={StyleSheet.flatten([styles.secondarySlot, styles.themeParticipationContent])}>
              <View style={styles.themeParticipationGroup}>
                <ThemeParticipationDonut items={stats?.participation_by_theme ?? []} showTitle={false} />
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.layout}>
          <View style={styles.primaryColumn}>
            <View style={styles.heading}>
              <Text style={styles.kicker}>Mon compte</Text>
              <Text style={styles.title}>Espace personnel</Text>
              <Text style={styles.subtitle}>Suivez vos réponses et les thèmes auxquels vous avez pris part.</Text>
            </View>
            <LatestAnswersList answers={answers} />
          </View>
          <View style={styles.secondaryColumn}>
            <PointsInline score={participationCount} />
            <ThemeParticipationDonut items={stats?.participation_by_theme ?? []} />
          </View>
        </View>
      )}
    </PageShell>
  );
}

function PointsInline({ score }: { score: number }) {
  return (
    <View style={styles.points}>
      <PointsContent score={score} />
    </View>
  );
}

function PointsContent({ score }: { score: number }) {
  const status = getUserReputationStatus(score);
  return (
    <>
      <PointsLine score={score} />
      <Text style={styles.status}>{status}</Text>
    </>
  );
}

function PointsLine({ score }: { score: number }) {
  return (
    <View style={styles.pointsLine}>
      <Text style={styles.pointsValue}>{score}</Text>
      <Text style={styles.pointsLabel}>point{score > 1 ? "s" : ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flexDirection: "row", flexWrap: "wrap", gap: 34, alignItems: "flex-start" },
  desktopLayout: { gap: 0 },
  desktopHeader: { gap: 8 },
  desktopRow: { flexDirection: "row", gap: 34, alignItems: "stretch" },
  primarySlot: { flex: 1, flexBasis: 620, minWidth: 300 },
  secondarySlot: { flexGrow: 0, flexShrink: 1, flexBasis: 320, minWidth: 280 },
  secondaryCentered: { alignItems: "center" },
  primaryColumn: { flex: 1, flexBasis: 620, minWidth: 300, gap: 24 },
  secondaryColumn: { flexGrow: 0, flexShrink: 1, flexBasis: 320, minWidth: 280, gap: 28 },
  heading: { gap: 8, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: palette.line },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 34, lineHeight: 40, letterSpacing: 0 },
  subtitle: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 23, maxWidth: 620 },
  points: { gap: 8, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: palette.line },
  dividerRow: { marginTop: 18 },
  divider: { height: 1, backgroundColor: palette.line },
  sectionTitleRow: { marginTop: 24 },
  sectionTitle: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 20, lineHeight: 26 },
  centeredText: { textAlign: "center" },
  latestAnswersContent: { paddingTop: 10 },
  themeParticipationContent: { paddingTop: 14, alignItems: "center" },
  themeParticipationGroup: { width: 300, maxWidth: "100%" },
  pointsLine: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  pointsValue: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 34, lineHeight: 38, fontVariant: ["tabular-nums"] },
  pointsLabel: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 12, lineHeight: 15 },
  status: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  loading: { padding: 24, alignItems: "center", gap: 10 },
  loadingText: { color: palette.muted, fontFamily: fontFamilyMedium }
});
