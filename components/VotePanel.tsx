import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { X } from "lucide-react-native";
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@/components/AuthProvider";
import { getCurrentUserProfile, getResults, invalidatePollCaches, submitVote } from "@/lib/api";
import type { PollResult, VoteStatus } from "@/lib/types";
import { STAMIO_CORE_COLORS, authField, fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";
import {
  canTransitionVotePanel,
  isTerminalVotePanelStep,
  type VotePanelStep
} from "@/lib/votePanelState";

const EDITORIAL_AMBER = STAMIO_CORE_COLORS.editorialAmber;

type Props = {
  visible: boolean;
  pollId: string;
  choiceId: string;
  choiceLabel: string;
  platform: "web" | "native";
  onClose: () => void;
  onFinished: (status: VoteStatus, results?: PollResult[]) => void;
  onExploreContext: () => void;
  onJoinDiscussion: () => void;
};

export function VotePanel({ visible, pollId, choiceId, choiceLabel, platform, onClose, onFinished, onExploreContext, onJoinDiscussion }: Props) {
  const router = useRouter();
  const { user, emailVerified } = useAuth();
  const running = useRef(false);
  const acceptedStatus = useRef<Extract<VoteStatus, { status: "accepted" }> | null>(null);
  const mounted = useRef(true);
  const stepRef = useRef<VotePanelStep>("checking");
  const terminal = useRef(false);
  const [step, setStep] = useState<VotePanelStep>("checking");
  const [error, setError] = useState<string | null>(null);
  const [resultsRefreshFailed, setResultsRefreshFailed] = useState(false);
  const slide = useMemo(() => new Animated.Value(0), []);

  function transitionTo(next: VotePanelStep, reset = false) {
    if (!canTransitionVotePanel(stepRef.current, next, reset)) return false;
    stepRef.current = next;
    terminal.current = reset ? false : terminal.current || isTerminalVotePanelStep(next);
    setStep(next);
    return true;
  }

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  useEffect(() => {
    if (!visible) {
      running.current = false;
      transitionTo("checking", true);
      setError(null);
      setResultsRefreshFailed(false);
      acceptedStatus.current = null;
      slide.setValue(0);
      return;
    }

    if (terminal.current) return;

    let active = true;
    async function resolveStep() {
      if (!user) {
        transitionTo("visitor");
        return;
      }
      if (!emailVerified) {
        transitionTo("email");
        return;
      }
      const profile = await getCurrentUserProfile();
      if (!active) return;
      if (profile?.passkey_required_at && !profile.passkey_enrolled_at) transitionTo("passkey");
      else transitionTo("confirm");
    }
    void resolveStep();
    Animated.timing(slide, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => {
      active = false;
    };
  }, [emailVerified, slide, user?.id, visible]);

  function closeAll() {
    if (running.current) return;
    setError(null);
    setResultsRefreshFailed(false);
    transitionTo("checking", true);
    onClose();
  }

  function go(path: Href) {
    closeAll();
    router.push(path);
  }

  function goToEnrollment() {
    closeAll();
    router.push(`/auth/passkey-enrollment?next=${encodeURIComponent(`/poll/${pollId}`)}` as Href);
  }

  function goToPollSection(onNavigate: () => void) {
    closeAll();
    requestAnimationFrame(() => requestAnimationFrame(onNavigate));
  }

  async function handleSubmit() {
    if (running.current || terminal.current || stepRef.current !== "confirm") return;
    running.current = true;
    transitionTo("submitting");
    setError(null);
    try {
      const response = await submitVote({ poll_id: pollId, choice_id: choiceId });
      if (!mounted.current) return;
      if (response.status === "accepted") {
        terminal.current = true;
        acceptedStatus.current = response;
        invalidatePollCaches(pollId);
        const results = response.results ?? await getResults(pollId, { force: true, label: "getResultsAfterVote" });
        if (!mounted.current) return;
        const aggregateAvailable = results.reduce((total, item) => total + Number(item.votes ?? 0), 0) > 0;
        setResultsRefreshFailed(response.results_unavailable === true || !aggregateAvailable);
        onFinished(response, aggregateAvailable ? results : undefined);
        transitionTo("success");
      } else if (response.status === "duplicate") {
        terminal.current = true;
        transitionTo("duplicate");
        onFinished(response);
      } else if (response.status === "poll_closed") {
        transitionTo("closed");
      } else if (response.status === "passkey_required") {
        transitionTo("passkey");
      } else if (response.status === "authentication_required") {
        transitionTo("visitor");
      } else if (response.status === "rate_limited") {
        setError("Trop de tentatives ont été effectuées. Réessayez un peu plus tard.");
        transitionTo("error");
      } else {
        setError("Le vote n'a pas pu être comptabilisé. Réessayez dans quelques instants.");
        transitionTo("error");
      }
    } catch {
      if (mounted.current) {
        setError("La connexion au service de vote a échoué. Vérifiez votre connexion puis réessayez.");
        transitionTo("error");
      }
    } finally {
      running.current = false;
    }
  }

  async function retryResultsRefresh() {
    const results = await getResults(pollId, { force: true, label: "retryResultsAfterVote" });
    if (!mounted.current) return;
    const aggregateAvailable = results.reduce((total, item) => total + Number(item.votes ?? 0), 0) > 0;
    setResultsRefreshFailed(!aggregateAvailable);
    if (aggregateAvailable && acceptedStatus.current) onFinished(acceptedStatus.current, results);
  }

  const animatedStyle = {
    opacity: slide,
    transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }]
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={closeAll}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Fermer le tunnel de vote" style={styles.scrim} onPress={closeAll} />
        <Animated.View style={StyleSheet.flatten([styles.panel, animatedStyle])}>
          <ModalHeader title={getTitle(step)} choiceLabel={choiceLabel} />
          <ModalCloseButton onPress={closeAll} />
          <View style={styles.body}>
            {step === "checking" ? <LoadingState label="Vérification de votre compte" /> : null}

            {step === "visitor" ? (
              <>
                <Text style={styles.helperText}>Connectez-vous ou créez un compte pour enregistrer une participation sécurisée et unique.</Text>
                <View style={styles.actions}>
                  <AnimatedPrimaryButton label="Se connecter" onPress={() => go("/auth/login" as Href)} />
                  <Pressable accessibilityRole="button" onPress={() => go("/auth/signup" as Href)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>S'inscrire</Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {step === "email" ? (
              <>
                <Text style={styles.helperText}>Confirmez votre adresse email avant de sécuriser votre compte et de participer.</Text>
                <AnimatedPrimaryButton label="Confirmer mon adresse email" onPress={() => go({ pathname: "/auth/verify-email", params: { email: user?.email ?? "" } } as Href)} />
              </>
            ) : null}

            {step === "passkey" ? (
              <>
                <Text style={styles.helperText}>Créez votre clé d'accès pour terminer la sécurisation de votre compte. Vous reviendrez ensuite sur cette question.</Text>
                <AnimatedPrimaryButton label="Créer ma clé d'accès" onPress={goToEnrollment} />
                {platform !== "web" ? <Text accessibilityLiveRegion="polite" style={styles.noticeBox}>Les clés d'accès Stamio sont actuellement disponibles sur le site web. Ouvrez cette question dans votre navigateur.</Text> : null}
              </>
            ) : null}

            {step === "confirm" ? (
              <>
                <View style={styles.editorialCopy}>
                  <Text style={styles.editorialLead}>Une seule participation par question possible.</Text>
                  <Text style={styles.editorialQuote}>Comme disait Nietzsche : « Ce n'est pas le doute, c'est la certitude qui rend fou. »</Text>
                  <Text style={styles.editorialText}>
                    Avant de confirmer votre choix, pensez à{" "}
                    <Text
                      accessibilityRole="link"
                      accessibilityHint="Ferme la fenêtre et affiche les enjeux et ressources de la question"
                      onPress={() => goToPollSection(onExploreContext)}
                      style={styles.editorialLink}
                    >
                      explorer les ressources
                    </Text>
                    {" "}et le fil de discussion pour mieux cerner les enjeux.
                  </Text>
                </View>
                <AnimatedPrimaryButton label="Comptabiliser mon vote" onPress={handleSubmit} />
              </>
            ) : null}

            {step === "submitting" ? <LoadingState label="Comptabilisation de votre vote" /> : null}

            {step === "success" ? (
              <View style={styles.successBody}>
                {resultsRefreshFailed ? (
                  <>
                    <Text accessibilityLiveRegion="polite" style={styles.successText}>Votre vote a bien été enregistré, mais les résultats ne peuvent pas être actualisés pour le moment.</Text>
                    <AnimatedPrimaryButton label="Réessayer d’actualiser" onPress={retryResultsRefresh} />
                  </>
                ) : (
                  <View accessibilityLiveRegion="polite" style={styles.editorialCopy}>
                    <Text style={styles.successText}>Merci d’avoir exprimé votre point de vue, votre participation a bien été comptabilisée.</Text>
                    <Text style={styles.successText}>Vous pouvez maintenant suivre l’évolution des résultats.</Text>
                    <Text style={styles.successText}>
                      N’hésitez pas à{" "}
                      <Text
                        accessibilityRole="link"
                        accessibilityHint="Ferme la fenêtre et affiche le fil de discussion"
                        onPress={() => goToPollSection(onJoinDiscussion)}
                      style={styles.editorialLink}
                    >
                        prendre part au débat
                      </Text>
                      , exposer vos arguments et partager vos interrogations.
                    </Text>
                  </View>
                )}
                <AnimatedPrimaryButton
                  label="Découvrir les autres sujets"
                  onPress={() => go("/themes" as Href)}
                />
              </View>
            ) : null}

            {step === "duplicate" ? (
              <>
                <Text accessibilityLiveRegion="polite" style={styles.noticeBox}>Vous avez déjà participé à cette question. Une seule participation est possible.</Text>
                <AnimatedPrimaryButton label="Fermer" onPress={closeAll} />
              </>
            ) : null}

            {step === "closed" ? (
              <>
                <Text accessibilityLiveRegion="polite" style={styles.noticeBox}>Ce sondage est fermé. Votre choix n'a pas été enregistré.</Text>
                <AnimatedPrimaryButton label="Consulter les thèmes" onPress={() => go("/themes" as Href)} />
              </>
            ) : null}

            {step === "error" ? (
              <>
                <Text accessibilityLiveRegion="polite" style={styles.errorBox}>{error}</Text>
                <View style={styles.actions}>
                  <AnimatedPrimaryButton label="Réessayer" onPress={() => transitionTo("confirm")} />
                  <Pressable accessibilityRole="button" onPress={closeAll} style={styles.secondaryButton}><Text style={styles.secondaryText}>Fermer</Text></Pressable>
                </View>
              </>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function getTitle(step: VotePanelStep) {
  if (step === "success") return "Vote validé";
  if (step === "duplicate") return "Participation déjà enregistrée";
  if (step === "closed") return "Sondage fermé";
  if (step === "visitor") return "Connectez-vous pour participer";
  if (step === "email") return "Confirmez votre adresse email";
  if (step === "passkey") return "Sécurisez votre compte";
  if (step === "error") return "Impossible de valider le vote";
  return "Valider ma participation";
}

function LoadingState({ label }: { label: string }) {
  return <View style={styles.loadingState}><ActivityIndicator color={palette.primaryStrong} /><Text accessibilityLiveRegion="polite" style={styles.helperText}>{label}</Text></View>;
}

function ModalHeader({ title, choiceLabel }: { title: string; choiceLabel: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.answerText}>Ma réponse : <Text style={styles.answerValue}>{choiceLabel}</Text></Text>
      </View>
    </View>
  );
}

function ModalCloseButton({ onPress }: { onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const active = hovered || focusVisible;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Fermer"
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={(event) => {
        if (Platform.OS !== "web") {
          setFocusVisible(true);
          return;
        }
        const target = event.currentTarget as unknown as { matches?: (selector: string) => boolean };
        setFocusVisible(target.matches?.(":focus-visible") ?? true);
      }}
      onBlur={() => setFocusVisible(false)}
      style={StyleSheet.flatten([styles.closeHitArea, closeHitAreaWebReset])}
    >
      {({ pressed }) => (
        <View
          pointerEvents="none"
          style={StyleSheet.flatten([
            styles.closeVisual,
            active && styles.closeVisualActive,
            focusVisible && styles.closeVisualFocused,
            pressed && styles.closeVisualPressed
          ])}
        >
          <X size={16} color={active ? palette.ink : palette.inkSecondary} />
        </View>
      )}
    </Pressable>
  );
}

function AnimatedPrimaryButton({
  label,
  loading,
  disabled,
  onPress
}: {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const fill = useMemo(() => new Animated.Value(0), []);
  const active = !disabled && (hovered || focused || pressed);

  useEffect(() => {
    fill.stopAnimation(() => {
      Animated.timing(fill, {
        toValue: active ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
    });
  }, [active, fill]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      style={StyleSheet.flatten([
        styles.primaryButton,
        disabled && styles.primaryButtonDisabled
      ])}
    >
      <Animated.View
        pointerEvents="none"
        style={StyleSheet.flatten([
          styles.primaryFill,
          { transform: [{ translateY: fill.interpolate({ inputRange: [0, 1], outputRange: [52, 0] }) }] }
        ])}
      />
      {loading ? (
        <ActivityIndicator color={active ? palette.onPrimary : palette.primaryStrong} />
      ) : (
        <Text
          style={StyleSheet.flatten([
            styles.primaryText,
            active && styles.primaryTextActive
          ])}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const closeHitAreaWebReset = Platform.OS === "web"
  ? ({
      boxShadow: "none",
      filter: "none",
      outlineStyle: "none",
      outlineWidth: 0
    } as unknown as ViewStyle)
  : null;

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 6, 15, 0.74)" },
  panel: {
    position: "relative",
    width: "100%",
    maxWidth: 430,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    padding: 24,
    gap: 16,
    shadowColor: "#00060E",
    shadowOpacity: 0.68,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 24
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, paddingRight: 36, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: palette.line },
  headerCopy: { flex: 1, minWidth: 0, gap: 6 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 20, lineHeight: 25 },
  answerText: { color: palette.inkSecondary, fontSize: 13, lineHeight: 20 },
  answerValue: { color: palette.primaryStrong, fontFamily: fontFamilyBold },
  closeHitArea: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0
  },
  closeVisual: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  closeVisualActive: {
    backgroundColor: "rgba(2, 6, 15, 0.52)",
  },
  closeVisualFocused: { borderWidth: 1, borderColor: palette.primaryStrong },
  closeVisualPressed: { backgroundColor: "rgba(2, 6, 15, 0.7)", transform: [{ translateY: 1 }] },
  body: { gap: 16, paddingTop: 2 },
  helperText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 20 },
  editorialCopy: { gap: 10 },
  editorialLead: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 14, lineHeight: 21 },
  editorialQuote: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 13, lineHeight: 21 },
  editorialText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 21 },
  editorialLink: { color: EDITORIAL_AMBER, cursor: "pointer", fontFamily: fontFamilySemibold, textDecorationLine: "none" },
  loadingState: { minHeight: 88, alignItems: "center", justifyContent: "center", gap: 10 },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, flexWrap: "wrap" },
  primaryButton: { width: "auto", maxWidth: "100%", alignSelf: "center", flexGrow: 0, minHeight: 44, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.primaryStrong, backgroundColor: "transparent", alignItems: "center", justifyContent: "center", flexDirection: "row", overflow: "hidden", paddingHorizontal: 16 },
  primaryButtonDisabled: { opacity: 0.48 },
  primaryFill: { position: "absolute", left: 0, right: 0, bottom: 0, height: 52, backgroundColor: palette.primaryStrong },
  primaryText: { zIndex: 1, color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 14, textAlign: "center" },
  primaryTextActive: { color: palette.onPrimary },
  secondaryButton: { width: "auto", maxWidth: "100%", alignSelf: "center", flexGrow: 0, minHeight: 44, borderRadius: radius.sm, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: authField.separatorColor },
  secondaryText: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 13 },
  errorBox: { color: palette.dangerText, backgroundColor: palette.dangerSoft, borderRadius: radius.sm, padding: 11, fontSize: 13, lineHeight: 19, fontFamily: fontFamilyMedium },
  noticeBox: { color: palette.inkSecondary, backgroundColor: palette.surfaceSubtle, borderWidth: 1, borderColor: palette.line, borderRadius: radius.sm, padding: 11, fontSize: 13, lineHeight: 19, fontFamily: fontFamilyMedium },
  successBody: { gap: 18 },
  successText: { color: palette.inkSecondary, fontSize: 14, lineHeight: 22 },
});
