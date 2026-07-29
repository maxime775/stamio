import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { HeroActionButton } from "@/components/HeroActionButton";
import { PageShell } from "@/components/PageShell";
import { verifyPasskeyEnrollment } from "@/lib/api";
import {
  clearPendingSignup,
  hasRecentPendingSignup
} from "@/lib/auth/pendingSignup";
import {
  clearSignupEnrollmentCompletion,
  hasRecentSignupEnrollmentCompletion
} from "@/lib/auth/signupCompletion";
import { getSetupCompleteDestination } from "@/lib/auth/signupCompletionPolicy";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette } from "@/lib/design";
import { supabase } from "@/lib/supabase";

export default function SetupCompletePage() {
  const router = useRouter();
  const compact = useWindowDimensions().width < 600;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function validateCompletion() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!active) return;

        if (sessionError || !session?.user) {
          const destination = getSetupCompleteDestination({
            hasSession: false,
            userValidated: false,
            emailConfirmed: false,
            passkeyEnrolled: false,
            markerValid: false,
            pendingSignupValid: hasRecentPendingSignup()
          });
          clearSignupEnrollmentCompletion();
          if (destination === "/auth/login") clearPendingSignup();
          router.replace((destination ?? "/auth/login") as Href);
          return;
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        const currentUser = userData.user;
        if (!active) return;

        const userValidated = !userError && Boolean(currentUser) && currentUser?.id === session.user.id;
        const emailConfirmed = Boolean(currentUser?.email_confirmed_at);
        if (!userValidated || !emailConfirmed) {
          const destination = getSetupCompleteDestination({
            hasSession: true,
            userValidated,
            emailConfirmed,
            passkeyEnrolled: false,
            markerValid: false,
            pendingSignupValid: hasRecentPendingSignup()
          });
          clearSignupEnrollmentCompletion();
          if (destination === "/auth/verify-email") {
            router.replace({
              pathname: "/auth/verify-email",
              params: { email: currentUser?.email ?? "" }
            } as Href);
          } else {
            clearPendingSignup();
            router.replace((destination ?? "/auth/login") as Href);
          }
          return;
        }

        const passkey = await verifyPasskeyEnrollment();
        if (!active) return;
        if (passkey.error) {
          clearSignupEnrollmentCompletion();
          router.replace("/account" as Href);
          return;
        }

        const markerValid = passkey.enrolled
          ? await hasRecentSignupEnrollmentCompletion(currentUser.id)
          : false;
        if (!active) return;

        const destination = getSetupCompleteDestination({
          hasSession: true,
          userValidated: true,
          emailConfirmed: true,
          passkeyEnrolled: passkey.enrolled,
          markerValid,
          pendingSignupValid: hasRecentPendingSignup()
        });
        if (destination) {
          clearSignupEnrollmentCompletion();
          if (destination === "/account") clearPendingSignup();
          router.replace(destination as Href);
          return;
        }

        clearPendingSignup();
        setReady(true);
      } catch {
        if (!active) return;
        clearSignupEnrollmentCompletion();
        clearPendingSignup();
        router.replace("/account" as Href);
      }
    }

    void validateCompletion();
    return () => {
      active = false;
    };
  }, [router]);

  function leave(path: Href) {
    clearSignupEnrollmentCompletion();
    router.replace(path);
  }

  if (!ready) {
    return (
      <PageShell compact>
        <View style={styles.loading}>
          <ActivityIndicator color={palette.primaryStrong} />
          <Text accessibilityLiveRegion="polite" style={styles.loadingText}>Vérification de votre inscription</Text>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell compact>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>INSCRIPTION TERMINÉE</Text>
        <Text style={StyleSheet.flatten([styles.title, compact && styles.titleCompact])}>Tout est prêt, bienvenue chez Stamio</Text>
        <Text style={styles.mainText}>Votre compte est désormais sécurisé. Vous pouvez prendre part aux débats, exprimer votre point de vue et suivre les résultats en toute sérénité.</Text>
        <Text style={styles.explanation}>Si votre appareil vous a demandé Face ID, une empreinte digitale ou son code de déverrouillage, cette vérification est restée entièrement gérée par votre appareil. Stamio n’a jamais accès à vos données biométriques.</Text>
        <Text style={styles.explanation}>La clé d’accès sert uniquement à protéger votre compte et à renforcer la fiabilité des participations et des résultats publiés sur Stamio.</Text>
        <View style={styles.actions}>
          <HeroActionButton
            label="Accéder à mon espace"
            variant="primary"
            onPress={() => leave("/account" as Href)}
          />
          <HeroActionButton
            label="Découvrir les débats"
            variant="secondary"
            onPress={() => leave("/themes" as Href)}
          />
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  loading: { width: "100%", minHeight: 260, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 22, textAlign: "center" },
  content: { width: "100%", maxWidth: 780, alignSelf: "center", alignItems: "center", gap: 18 },
  eyebrow: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, letterSpacing: 1.2, textAlign: "center" },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 34, lineHeight: 41, maxWidth: 700, textAlign: "center" },
  titleCompact: { fontSize: 29, lineHeight: 35 },
  mainText: { width: "100%", color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 24, maxWidth: 680, textAlign: "center" },
  explanation: { width: "100%", color: palette.muted, fontSize: 14, lineHeight: 22, maxWidth: 680, textAlign: "center" },
  actions: { width: "100%", flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 6 }
});
