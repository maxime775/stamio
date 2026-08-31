import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { HeroActionButton } from "@/components/HeroActionButton";
import { PageShell } from "@/components/PageShell";
import { checkSignupConfirmation, signInUser } from "@/lib/api";
import {
  clearPendingSignup,
  clearPendingSignupResumeToken,
  getPendingSignupResumeToken,
  getPendingSignupStartedAt,
  restartPendingSignupWindow
} from "@/lib/auth/pendingSignup";
import {
  clearSignupCredentials,
  getSignupCredentials,
  SIGNUP_CONFIRMATION_ACTIVE_WINDOW_MS,
  SIGNUP_CONFIRMATION_POLL_INTERVAL_MS
} from "@/lib/auth/signupResume";
import { supabase } from "@/lib/supabase";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette } from "@/lib/design";

const CONFIRMATION_PENDING_MESSAGE = "La confirmation de votre adresse n’est pas encore détectée. Ouvrez le lien reçu par email, puis réessayez dans quelques instants.";
const RELEVANT_AUTH_EVENTS = new Set(["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"]);

export default function VerifyEmailPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const [messagePositive, setMessagePositive] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [checkingLoading, setCheckingLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [requiresRestart, setRequiresRestart] = useState(false);
  const [pollingGeneration, setPollingGeneration] = useState(0);
  const checkingRef = useRef(false);
  const announceAfterCheckRef = useRef(false);
  const navigateAfterCheckRef = useRef(false);
  const navigatedRef = useRef(false);
  const terminalRef = useRef(false);
  const pollingStartedAtRef = useRef(getPendingSignupStartedAt() ?? Date.now());

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const checkConfirmation = useCallback(async ({ navigate, announce }: { navigate: boolean; announce: boolean }) => {
    if (terminalRef.current || navigatedRef.current) return;
    if (navigate) navigateAfterCheckRef.current = true;
    if (announce) {
      announceAfterCheckRef.current = true;
      setCheckingLoading(true);
    }
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user;
      if (!sessionError && sessionUser) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        const confirmedUser = userData.user;
        const confirmed = !userError
          && confirmedUser?.id === sessionUser.id
          && Boolean(confirmedUser.email_confirmed_at);
        if (confirmed) {
          terminalRef.current = true;
          clearSignupCredentials();
          clearPendingSignupResumeToken();
          setMessagePositive(true);
          setMessage("Votre adresse email est confirmée. Vous pouvez poursuivre la création de votre compte.");
          navigatedRef.current = true;
          router.replace("/auth/passkey-enrollment?flow=signup" as Href);
          return;
        }
      }

      const resumeToken = getPendingSignupResumeToken();
      if (!resumeToken) {
        if (announceAfterCheckRef.current) {
          setMessagePositive(false);
          setMessage(CONFIRMATION_PENDING_MESSAGE);
        }
        return;
      }

      const confirmation = await checkSignupConfirmation(resumeToken);
      if (confirmation.status === "expired" || confirmation.status === "invalid") {
        terminalRef.current = true;
        clearSignupCredentials();
        clearPendingSignup();
        setRequiresRestart(true);
        setMessagePositive(false);
        setMessage("Cette reprise d’inscription a expiré. Recommencez l’inscription ou connectez-vous si votre compte est déjà confirmé.");
        return;
      }
      if (confirmation.status !== "confirmed") {
        if (announceAfterCheckRef.current) {
          setMessagePositive(false);
          setMessage(CONFIRMATION_PENDING_MESSAGE);
        }
        return;
      }

      setMessagePositive(true);
      setMessage("Votre adresse email est confirmée. Vérification de votre session locale…");
      const credentials = getSignupCredentials(email);
      if (credentials) {
        const { data: signInData, error: signInError } = await signInUser(credentials.email, credentials.password);
        if (!signInError && signInData.session?.user) {
          const { data: verifiedData, error: verifiedError } = await supabase.auth.getUser();
          if (!verifiedError && verifiedData.user?.id === signInData.session.user.id && verifiedData.user.email_confirmed_at) {
            terminalRef.current = true;
            clearSignupCredentials();
            clearPendingSignupResumeToken();
            setMessage("Votre adresse email est confirmée. Vous pouvez poursuivre la création de votre compte.");
            navigatedRef.current = true;
            router.replace("/auth/passkey-enrollment?flow=signup" as Href);
            return;
          }
        }
      }

      terminalRef.current = true;
      clearSignupCredentials();
      clearPendingSignupResumeToken();
      setRequiresLogin(true);
      setMessage("Votre adresse email est confirmée. Connectez-vous dans ce navigateur pour créer votre clé d’accès.");
      if (navigateAfterCheckRef.current && !navigatedRef.current) {
        navigatedRef.current = true;
        router.replace("/auth/login" as Href);
      }
    } catch {
      if (announceAfterCheckRef.current) {
        setMessagePositive(false);
        setMessage(CONFIRMATION_PENDING_MESSAGE);
      }
    } finally {
      checkingRef.current = false;
      if (announceAfterCheckRef.current) setCheckingLoading(false);
      announceAfterCheckRef.current = false;
      navigateAfterCheckRef.current = false;
    }
  }, [email, router]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (!active || terminalRef.current) return;
      if (Date.now() - pollingStartedAtRef.current >= SIGNUP_CONFIRMATION_ACTIVE_WINDOW_MS) {
        terminalRef.current = true;
        clearSignupCredentials();
        setMessagePositive(false);
        setMessage("La vérification automatique a expiré. Vous pouvez renvoyer un email de confirmation.");
        return;
      }
      await checkConfirmation({ navigate: false, announce: false });
      if (active && !terminalRef.current) timer = setTimeout(poll, SIGNUP_CONFIRMATION_POLL_INTERVAL_MS);
    }

    function recheckWhenVisible() {
      if (!active || terminalRef.current || document.visibilityState !== "visible") return;
      void checkConfirmation({ navigate: false, announce: false });
    }

    document.addEventListener("visibilitychange", recheckWhenVisible);
    window.addEventListener("focus", recheckWhenVisible);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (RELEVANT_AUTH_EVENTS.has(event)) recheckWhenVisible();
    });
    void poll();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", recheckWhenVisible);
      window.removeEventListener("focus", recheckWhenVisible);
      data.subscription.unsubscribe();
    };
  }, [checkConfirmation, pollingGeneration]);

  async function resend() {
    if (resendLoading || checkingLoading || cooldown > 0) return;
    if (!email) {
      setMessagePositive(false);
      setMessage("Adresse email indisponible. Relancez l’inscription si nécessaire.");
      return;
    }
    setResendLoading(true);
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: redirectTo } });
    setResendLoading(false);
    if (!error) {
      setCooldown(60);
      restartPendingSignupWindow();
      pollingStartedAtRef.current = Date.now();
      terminalRef.current = false;
      setRequiresLogin(false);
      setPollingGeneration((value) => value + 1);
    }
    setMessagePositive(!error);
    setMessage(error ? "Impossible de renvoyer l’email pour le moment." : "Si cette inscription est valide, un nouvel email vient d’être envoyé.");
  }

  return (
    <PageShell compact>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>INSCRIPTION</Text>
        <Text style={StyleSheet.flatten([styles.title, compact && styles.titleCompact])}>Confirmez votre adresse email</Text>
        <Text style={styles.text}>Nous vous avons envoyé un lien de confirmation. Cliquez sur ce lien pour poursuivre la création de votre compte.</Text>
        <Text style={styles.secondaryCopy}>Pensez à vérifier votre dossier de courriers indésirables si vous ne trouvez pas notre message.</Text>
        {message ? <Text accessibilityLiveRegion="polite" style={StyleSheet.flatten([styles.message, messagePositive && styles.messagePositive])}>{message}</Text> : null}
        <View style={styles.actions}>
          <HeroActionButton
            label={requiresRestart ? "Recommencer l’inscription" : cooldown > 0 ? `Renvoyer dans ${cooldown} s` : "Renvoyer l’email"}
            variant="primary"
            onPress={requiresRestart ? () => router.replace("/auth/signup" as Href) : resend}
            loading={!requiresRestart && resendLoading}
            disabled={!requiresRestart && (checkingLoading || cooldown > 0)}
          />
          <HeroActionButton
            label={requiresRestart ? "Se connecter" : requiresLogin ? "Se connecter pour continuer" : "J’ai vérifié mon email"}
            variant="secondary"
            onPress={requiresRestart || requiresLogin ? () => router.replace("/auth/login" as Href) : () => void checkConfirmation({ navigate: true, announce: true })}
            loading={checkingLoading}
            disabled={resendLoading}
          />
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: 760, alignSelf: "center", alignItems: "center", gap: 18 },
  eyebrow: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, letterSpacing: 1.2, textAlign: "center" },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 32, lineHeight: 39, maxWidth: 660, textAlign: "center" },
  titleCompact: { fontSize: 29, lineHeight: 35 },
  text: { width: "100%", flexShrink: 1, color: palette.inkSecondary, fontSize: 15, lineHeight: 24, maxWidth: 660, textAlign: "center" },
  secondaryCopy: { width: "100%", flexShrink: 1, color: palette.muted, fontSize: 14, lineHeight: 22, maxWidth: 660, textAlign: "center" },
  message: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, lineHeight: 22, maxWidth: 660, textAlign: "center" },
  messagePositive: { color: palette.positiveText },
  actions: { width: "100%", flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 4 }
});
