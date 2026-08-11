import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { HeroActionButton } from "@/components/HeroActionButton";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/components/AuthProvider";
import { verifyPasskeyEnrollment } from "@/lib/api";
import { createPasskeyCeremonyController } from "@/lib/auth/passkeyCeremony";
import { clearPendingSignup } from "@/lib/auth/pendingSignup";
import {
  createPasskeyEnrollmentTabId,
  subscribeToPasskeyEnrollmentSync,
  type PasskeyEnrollmentSyncEvent
} from "@/lib/auth/passkeyEnrollmentSync";
import { getPasskeyErrorMessage, registerPasskey } from "@/lib/auth/passkeys";
import { markSignupEnrollmentComplete } from "@/lib/auth/signupCompletion";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette } from "@/lib/design";

export default function PasskeyEnrollmentPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const { next, flow } = useLocalSearchParams<{ next?: string; flow?: string }>();
  const { user, loading: authLoading, emailVerified } = useAuth();
  const running = useRef(false);
  const passkeyCeremony = useRef(createPasskeyCeremonyController());
  const pageActive = useRef(true);
  const authReady = useRef(false);
  const localEnrollmentAttempt = useRef(false);
  const completedInThisTab = useRef(false);
  const externalCheckRunning = useRef(false);
  const navigationCommitted = useRef(false);
  const syncSubscription = useRef<ReturnType<typeof subscribeToPasskeyEnrollmentSync> | null>(null);
  const [loading, setLoading] = useState(false);
  const [externallyCompleted, setExternallyCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  authReady.current = !authLoading && Boolean(user && emailVerified);

  const verifyExternalEnrollment = useCallback(async (allowDuringLocalAttempt = false) => {
    if (
      Platform.OS !== "web"
      || flow !== "signup"
      || !authReady.current
      || (localEnrollmentAttempt.current && !allowDuringLocalAttempt)
      || completedInThisTab.current
      || navigationCommitted.current
      || externalCheckRunning.current
    ) {
      return false;
    }

    externalCheckRunning.current = true;
    try {
      const result = await verifyPasskeyEnrollment();
      if (
        !pageActive.current
        || completedInThisTab.current
        || navigationCommitted.current
        || !result.enrolled
      ) {
        return false;
      }

      navigationCommitted.current = true;
      running.current = true;
      setExternallyCompleted(true);
      setLoading(true);
      setError(null);
      router.replace("/" as Href);
      return true;
    } catch {
      return false;
    } finally {
      externalCheckRunning.current = false;
    }
  }, [flow, router]);

  useEffect(() => {
    pageActive.current = true;
    return () => {
      pageActive.current = false;
      passkeyCeremony.current.cancel();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || flow !== "signup") return;

    const tabId = createPasskeyEnrollmentTabId();
    const subscription = subscribeToPasskeyEnrollmentSync(
      tabId,
      (_event: PasskeyEnrollmentSyncEvent) => {
        void verifyExternalEnrollment();
      }
    );
    syncSubscription.current = subscription;

    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void verifyExternalEnrollment();
      }
    };

    document.addEventListener("visibilitychange", checkWhenVisible);
    void verifyExternalEnrollment();

    return () => {
      document.removeEventListener("visibilitychange", checkWhenVisible);
      subscription.cleanup();
      if (syncSubscription.current === subscription) syncSubscription.current = null;
    };
  }, [flow, verifyExternalEnrollment]);

  useEffect(() => {
    if (!authLoading && user && emailVerified) {
      void verifyExternalEnrollment();
    }
  }, [authLoading, emailVerified, user, verifyExternalEnrollment]);

  async function enroll() {
    if (running.current) return;
    if (!user || !emailVerified) {
      router.replace("/auth/login" as Href);
      return;
    }
    const lease = passkeyCeremony.current.begin();
    if (!lease) return;
    running.current = true;
    localEnrollmentAttempt.current = true;
    setLoading(true);
    setError(null);
    try {
      await registerPasskey(lease.signal);
      if (!pageActive.current || !passkeyCeremony.current.isActive(lease)) return;

      const result = await verifyPasskeyEnrollment();
      if (!pageActive.current || !passkeyCeremony.current.isActive(lease)) return;
      if (!result.enrolled) throw new Error("webauthn_verification_failed");
      clearPendingSignup();
      if (flow === "signup") {
        completedInThisTab.current = true;
        const markerCreated = await markSignupEnrollmentComplete(user.id);
        if (!pageActive.current || !passkeyCeremony.current.isActive(lease)) return;
        syncSubscription.current?.publishSuccess();
        navigationCommitted.current = true;
        router.replace(markerCreated ? "/auth/setup-complete" as Href : "/account" as Href);
      } else {
        navigationCommitted.current = true;
        router.replace(safeNext(next));
      }
    } catch (caught) {
      const isCurrentCeremony = pageActive.current && passkeyCeremony.current.isActive(lease);
      const reconciled = isCurrentCeremony && flow === "signup" && !completedInThisTab.current
        ? await verifyExternalEnrollment(true)
        : false;
      if (!reconciled && pageActive.current && passkeyCeremony.current.isActive(lease) && !navigationCommitted.current) {
        setError(getPasskeyErrorMessage(caught));
      }
    } finally {
      const wasCurrentCeremony = passkeyCeremony.current.isActive(lease);
      passkeyCeremony.current.finish(lease);
      if (wasCurrentCeremony || !passkeyCeremony.current.isActive()) {
        localEnrollmentAttempt.current = false;
        running.current = false;
        if (pageActive.current && !navigationCommitted.current) {
          setLoading(false);
        }
      }
    }
  }

  return (
    <PageShell compact>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>SÉCURITÉ DU COMPTE</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>Créez votre clé d’accès</Text>
        <Text style={styles.mainText}>Utilisez Face ID, votre empreinte, Windows Hello ou le code de votre appareil. Aucune application n’est à installer.</Text>
        <View style={styles.divider} />
        <Text style={styles.secondary}>Cette clé vous permettra de vous connecter rapidement et de manière sécurisée à Stamio.</Text>
        {Platform.OS !== "web" ? <Text accessibilityLiveRegion="polite" style={styles.error}>La création d’une clé d’accès est disponible sur le site web Stamio. Ouvrez cette page dans un navigateur récent.</Text> : null}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <HeroActionButton
          label={error?.includes("annulée") ? "Réessayer" : "Créer ma clé d’accès"}
          variant="primary"
          onPress={enroll}
          loading={loading}
          disabled={authLoading || externallyCompleted || Platform.OS !== "web"}
        />
        <Text style={styles.help}>La méthode proposée dépend de votre appareil. Stamio n’accède jamais à vos données biométriques.</Text>
      </View>
    </PageShell>
  );
}

function safeNext(value?: string): Href {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.includes("://")) return value as Href;
  return "/account" as Href;
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: 760, alignSelf: "center", alignItems: "center", gap: 18 },
  eyebrow: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, letterSpacing: 1.2, textAlign: "center" },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 32, lineHeight: 39, maxWidth: 660, textAlign: "center" },
  titleCompact: { fontSize: 29, lineHeight: 35 },
  mainText: { width: "100%", flexShrink: 1, color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 24, maxWidth: 660, textAlign: "center" },
  divider: { width: "100%", maxWidth: 660, height: 1, backgroundColor: palette.line, marginVertical: 2 },
  secondary: { width: "100%", color: palette.inkSecondary, lineHeight: 22, maxWidth: 620, textAlign: "center" },
  error: { width: "100%", color: palette.dangerText, lineHeight: 22, maxWidth: 620, textAlign: "center" },
  help: { width: "100%", color: palette.muted, fontSize: 13, lineHeight: 20, maxWidth: 620, textAlign: "center" }
});
