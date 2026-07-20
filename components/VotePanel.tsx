import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { useRouter, type Href } from "expo-router";
import { AuthTextField } from "@/components/AuthFields";
import { useAuth } from "@/components/AuthProvider";
import { OtpInput } from "@/components/OtpInput";
import { Turnstile } from "@/components/Turnstile";
import { getResults, invalidatePollCaches, startVerification, submitVote } from "@/lib/api";
import { formatFrenchMobilePhoneDisplay, normalizeFrenchMobilePhoneInput, validateOtp } from "@/lib/validation";
import type { PollResult, VoteStatus } from "@/lib/types";
import { authField, fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius, shadows } from "@/lib/design";

type Props = {
  visible: boolean;
  pollId: string;
  choiceId: string;
  choiceLabel: string;
  platform: "web" | "native";
  onClose: () => void;
  onFinished: (status: VoteStatus, results?: PollResult[]) => void;
};

type Step = "phone" | "otp" | "success";
type VerificationLimitStatus = "visitor_phone_limit_reached" | "visitor_connection_limit_reached" | "rate_limited";

const RESEND_DELAY_SECONDS = 50;
const PHONE_INVALID_CHARACTER_MESSAGE = "Utilisez uniquement des chiffres, des espaces ou le préfixe +33.";
const PHONE_INVALID_MESSAGE = "Veuillez saisir un numéro de mobile français valide.";
const PHONE_TEST_LIMIT_MESSAGE = "Pour cette phase de test, seuls les numéros mobiles français commençant par 06 ou 07 sont acceptés.";
const OTP_INVALID_CHARACTER_MESSAGE = "Saisissez uniquement les 6 chiffres du code reçu par SMS.";
const LIMIT_COPY: Record<VerificationLimitStatus, {
  title: string;
  text: string;
  primaryLabel: string;
  primaryAction: "signup" | "login";
  secondaryLabel: string;
  secondaryAction: "login" | "close";
}> = {
  visitor_phone_limit_reached: {
    title: "Créez un compte pour continuer",
    text: "Ce numéro a déjà été utilisé plusieurs fois sans compte. Créez gratuitement un compte ou connectez-vous pour continuer à participer.",
    primaryLabel: "S’inscrire",
    primaryAction: "signup",
    secondaryLabel: "J’ai déjà un compte",
    secondaryAction: "login"
  },
  visitor_connection_limit_reached: {
    title: "Connexion temporairement limitée",
    text: "Nous ne pouvons pas envoyer de nouveau code depuis cette connexion pour le moment. Créez gratuitement un compte ou connectez-vous pour continuer à participer.",
    primaryLabel: "S’inscrire",
    primaryAction: "signup",
    secondaryLabel: "J’ai déjà un compte",
    secondaryAction: "login"
  },
  rate_limited: {
    title: "Veuillez patienter quelques instants",
    text: "Par sécurité, l’envoi de nouveaux codes est temporairement limité. Réessayez dans quelques instants ou connectez-vous à votre compte.",
    primaryLabel: "J’ai déjà un compte",
    primaryAction: "login",
    secondaryLabel: "Fermer",
    secondaryAction: "close"
  }
};

export function VotePanel({ visible, pollId, choiceId, choiceLabel, platform, onClose, onFinished }: Props) {
  const router = useRouter();
  const { user, emailVerified } = useAuth();
  const isRegisteredUser = Boolean(user && emailVerified);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpWarning, setOtpWarning] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendVisible, setResendVisible] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [limitStatus, setLimitStatus] = useState<VerificationLimitStatus | null>(null);
  const [codeRequested, setCodeRequested] = useState(false);
  const [autoRequestStarted, setAutoRequestStarted] = useState(false);
  const [registeredPhoneLast4, setRegisteredPhoneLast4] = useState<string | null>(null);
  const [accountPhoneRequired, setAccountPhoneRequired] = useState(false);
  const [accountLoginRequired, setAccountLoginRequired] = useState(false);
  const [duplicateParticipation, setDuplicateParticipation] = useState(false);
  const slide = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (visible) {
      setStep(isRegisteredUser ? "otp" : "phone");
      setPhone("");
      setOtp("");
      setOtpError(null);
      setOtpWarning(null);
      setPhoneError(null);
      setPhoneWarning(null);
      setTurnstileToken("");
      setResendVisible(false);
      setResendError(null);
      setResendSeconds(0);
      setLimitStatus(null);
      setCodeRequested(false);
      setAutoRequestStarted(false);
      setRegisteredPhoneLast4(null);
      setAccountPhoneRequired(false);
      setAccountLoginRequired(false);
      setDuplicateParticipation(false);
      Animated.spring(slide, { toValue: 1, damping: 18, stiffness: 160, useNativeDriver: true }).start();
    } else {
      slide.setValue(0);
      setResendVisible(false);
      setLimitStatus(null);
      setAutoRequestStarted(false);
      setAccountLoginRequired(false);
      setDuplicateParticipation(false);
    }
  }, [isRegisteredUser, slide, visible]);

  useEffect(() => {
    if (!visible || !isRegisteredUser || step !== "otp" || autoRequestStarted) return;
    setAutoRequestStarted(true);
    void requestCode("initial");
  }, [autoRequestStarted, isRegisteredUser, step, visible]);

  useEffect(() => {
    if (!visible || step !== "otp" || resendSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds, step, visible]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });
  const siteKey = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;
  const normalizedPhone = normalizeFrenchMobilePhoneInput(phone);
  const readablePhone = normalizedPhone.ok ? formatFrenchMobilePhoneDisplay(normalizedPhone.value) : formatFrenchMobilePhoneDisplay(phone);
  const otpPhoneLabel = isRegisteredUser
    ? registeredPhoneLast4
      ? `au numéro se terminant par ${registeredPhoneLast4}`
      : "au numéro enregistré sur votre compte"
    : `au ${readablePhone}`;
  const phoneFeedback = phoneWarning ?? phoneError ?? undefined;
  const otpFeedback = otpWarning ?? otpError ?? undefined;
  const canRequestCode = normalizedPhone.ok && !phoneWarning;
  const canSubmitOtp = codeRequested && !accountPhoneRequired && validateOtp(otp);

  function closeAll() {
    setResendVisible(false);
    onClose();
  }

  function handlePhoneChange(value: string) {
    const hasInvalidCharacters = /[^\d+\s().-]/.test(value);
    setPhone(hasInvalidCharacters ? value : formatFrenchMobilePhoneDisplay(value));
    setPhoneWarning(hasInvalidCharacters ? PHONE_INVALID_CHARACTER_MESSAGE : null);
    setPhoneError(null);
  }

  function handleOtpChange(value: string) {
    setOtp(value);
    setOtpWarning(null);
    setOtpError(null);
  }

  function verificationErrorMessage(status: string) {
    if (status === "invalid_phone_type") return PHONE_TEST_LIMIT_MESSAGE;
    if (status === "poll_closed") return "Ce sondage est fermé.";
    if (status === "captcha_required") return "La validation anti-abus est requise. Complétez le captcha puis réessayez.";
    if (status === "registered_phone_required") return "Ajoutez un numéro de téléphone vérifié à votre compte pour recevoir votre code et participer.";
    return "Impossible d'envoyer le code pour le moment.";
  }

  function getLimitStatus(status: string): VerificationLimitStatus | null {
    if (status === "visitor_phone_limit_reached" || status === "visitor_connection_limit_reached" || status === "rate_limited") return status;
    return null;
  }

  function navigateFromLimit(action: "signup" | "login" | "close") {
    if (action === "close") {
      setLimitStatus(null);
      return;
    }
    setLimitStatus(null);
    setResendVisible(false);
    closeAll();
    router.push((action === "signup" ? "/auth/signup" : "/auth/login") as Href);
  }

  async function requestCode(source: "initial" | "resend") {
    const normalized = normalizeFrenchMobilePhoneInput(phone);
    if (!isRegisteredUser && !normalized.ok) {
      const message = phone.trim() ? PHONE_INVALID_MESSAGE : "Le numéro de téléphone est obligatoire.";
      if (source === "resend") setResendError(message);
      else setPhoneError(message);
      return;
    }

    if (source === "initial") {
      setLoading(true);
      setPhoneError(null);
    } else {
      setResendLoading(true);
      setResendError(null);
    }
    setAccountPhoneRequired(false);

    const response = await startVerification({
      poll_id: pollId,
      choice_id: choiceId,
      ...(isRegisteredUser ? {} : normalized.ok ? { phone_e164: normalized.value } : {}),
      platform,
      turnstile_token: !isRegisteredUser && platform === "web" ? turnstileToken : undefined
    });

    if (source === "initial") setLoading(false);
    else setResendLoading(false);

    if (response.status === "verification_started") {
      setStep("otp");
      setOtp("");
      setOtpError(null);
      setOtpWarning(null);
      setCodeRequested(true);
      setRegisteredPhoneLast4(response.phone_last4 ?? null);
      setAccountPhoneRequired(false);
      setResendSeconds(RESEND_DELAY_SECONDS);
      setResendVisible(false);
      setResendError(null);
      return;
    }

    if (response.status === "registered_phone_required") {
      setStep("otp");
      setCodeRequested(false);
      setAccountPhoneRequired(true);
      setOtpError(null);
      setResendVisible(false);
      setResendError(null);
      return;
    }

    const limit = getLimitStatus(response.status);
    if (limit) {
      setLimitStatus(limit);
      setResendVisible(false);
      setResendError(null);
      setPhoneError(null);
      return;
    }

    const message = verificationErrorMessage(response.status);
    if (source === "resend") setResendError(message);
    else setPhoneError(message);
  }

  async function handleSubmit() {
    const normalized = normalizeFrenchMobilePhoneInput(phone);
    if (!isRegisteredUser && !normalized.ok) {
      setPhoneError(PHONE_TEST_LIMIT_MESSAGE);
      setStep("phone");
      return;
    }
    if (!validateOtp(otp)) {
      setOtpError("Code OTP invalide.");
      return;
    }

    setLoading(true);
    setOtpError(null);
    const response = await submitVote({
      poll_id: pollId,
      choice_id: choiceId,
      ...(isRegisteredUser ? {} : normalized.ok ? { phone_e164: normalized.value } : {}),
      otp_code: otp
    });
    let results: PollResult[] | undefined;
    if (response.status === "accepted") {
      invalidatePollCaches(pollId);
      results = await getResults(pollId, { force: true, label: "getResultsAfterVote" });
    }
    setLoading(false);

    if (response.status === "accepted") {
      onFinished(response, results);
      setStep("success");
    } else if (response.status === "account_login_required") {
      setAccountLoginRequired(true);
    } else if (response.status === "invalid_phone_type") {
      setPhoneError(PHONE_TEST_LIMIT_MESSAGE);
      setStep("phone");
    } else if (response.status === "invalid_code") {
      setOtpError("Code OTP invalide.");
    } else if (response.status === "duplicate") {
      setDuplicateParticipation(true);
    } else if (response.status === "poll_closed") {
      setOtpError("Ce sondage est fermé.");
    } else if (response.status === "registered_phone_required") {
      setAccountPhoneRequired(true);
      setCodeRequested(false);
    } else {
      setOtpError("Le vote n'a pas pu être comptabilisé.");
    }
  }

  async function handleResend() {
    if (resendSeconds > 0) return;
    await requestCode("resend");
  }

  function goToTopics() {
    closeAll();
    router.push("/themes" as Href);
  }

  function goToLogin() {
    closeAll();
    router.push("/auth/login" as Href);
  }

  function goToSignup() {
    closeAll();
    router.push("/auth/signup" as Href);
  }

  return (
    <>
      <Modal transparent visible={visible} animationType="fade" onRequestClose={closeAll}>
        <View style={styles.overlay}>
          <Pressable style={styles.scrim} onPress={closeAll} />
          <Animated.View style={StyleSheet.flatten([styles.panel, { transform: [{ translateY: translateY as unknown as number }] }])}>
            {step === "phone" ? (
              <>
                <ModalHeader title="Valider ma participation" choiceLabel={choiceLabel} onClose={closeAll} />
                <View style={styles.body}>
                  <AuthTextField
                    field="vote-phone"
                    label="Numéro de téléphone"
                    error={phoneFeedback}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    placeholder="+33 06 12 34 56 78"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                  />
                  {platform === "web" && siteKey ? <Turnstile compact siteKey={siteKey} onToken={setTurnstileToken} /> : null}
                  <AnimatedPrimaryButton disabled={loading || !canRequestCode} loading={loading} label="Recevoir mon code de vérification" onPress={() => requestCode("initial")} />
                  <View style={styles.loginSeparator} />
                  <View style={styles.loginPrompt}>
                    <Text style={styles.loginPromptText}>Vous avez déjà un compte ?</Text>
                    <Pressable accessibilityRole="link" onPress={goToLogin} style={styles.loginPromptLink}>
                      <Text style={styles.loginPromptLinkText}>Connectez-vous</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            ) : null}

            {step === "otp" ? (
              <>
                <ModalHeader title={accountPhoneRequired ? "Numéro de téléphone requis" : "Vérifiez votre numéro de téléphone"} choiceLabel={choiceLabel} onClose={closeAll} />
                <View style={styles.body}>
                  {loading && !codeRequested && !accountPhoneRequired ? (
                    <View style={styles.sendingCode}>
                      <ActivityIndicator color={palette.primaryStrong} />
                      <Text style={styles.helperText}>Envoi du code de vérification...</Text>
                    </View>
                  ) : null}
                  {accountPhoneRequired ? (
                    <>
                      <Text style={styles.helperText}>Ajoutez un numéro vérifié à votre compte pour recevoir votre code et participer plus rapidement.</Text>
                      <Text style={styles.noticeBox}>Le numéro affiché dans vos informations peut correspondre aux derniers chiffres renseignés lors de l’inscription. Pour envoyer un SMS, le serveur doit disposer d’un numéro complet vérifié.</Text>
                      <View style={styles.resendActions}>
                        <Pressable onPress={() => { closeAll(); router.push("/account/informations" as Href); }} style={styles.secondaryButton}>
                          <Text style={styles.secondaryText}>Mon compte</Text>
                        </Pressable>
                        <Pressable onPress={closeAll} style={styles.secondaryButton}>
                          <Text style={styles.secondaryText}>Fermer</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.helperText}>Saisissez le code à 6 chiffres que nous vous avons envoyé par SMS {otpPhoneLabel}.</Text>
                      <View style={styles.otpField}>
                        <Text style={styles.label}>Code de vérification</Text>
                        <OtpInput value={otp} onChange={handleOtpChange} onInvalidInput={() => setOtpWarning(OTP_INVALID_CHARACTER_MESSAGE)} />
                        {otpFeedback ? <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{otpFeedback}</Text> : null}
                      </View>
                      <View style={styles.otpFooter}>
                        <Text accessibilityLiveRegion="polite" style={styles.timerText}>
                          {resendSeconds > 0
                            ? `Vous pourrez demander un nouveau code dans ${resendSeconds} s.`
                            : codeRequested
                              ? "Vous pouvez demander un nouveau code si le SMS n'est pas arrivé."
                              : "Le code de vérification va être envoyé automatiquement."}
                        </Text>
                        {codeRequested ? (
                          <Pressable accessibilityRole="button" onPress={() => { setResendVisible(true); setResendError(null); }} style={styles.resendLink}>
                            <Text style={styles.resendLinkText}>Vous n’avez pas reçu de code ?</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <AnimatedPrimaryButton disabled={loading || !canSubmitOtp} loading={loading && codeRequested} label="Comptabiliser mon vote" onPress={handleSubmit} />
                    </>
                  )}
                </View>
              </>
            ) : null}

            {step === "success" ? (
              <>
                <ModalHeader title="Vote validé" choiceLabel={choiceLabel} onClose={closeAll} />
                <View style={styles.successBody}>
                  <Text style={styles.successText}>Merci d’avoir pris part au débat. Votre vote a bien été comptabilisé. Vous pouvez maintenant suivre l’évolution des résultats.</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={goToTopics}
                    style={({ pressed }) => StyleSheet.flatten([styles.successPrimary, pressed && styles.successPrimaryPressed])}
                  >
                    <Text style={styles.successPrimaryText}>Voir les autres sujets</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Animated.View>
        </View>
      </Modal>

      <VerificationLimitModal
        visible={visible && Boolean(limitStatus)}
        status={limitStatus}
        choiceLabel={choiceLabel}
        onClose={() => setLimitStatus(null)}
        onAction={navigateFromLimit}
      />

      <AccountLoginRequiredModal
        visible={visible && accountLoginRequired}
        onClose={() => setAccountLoginRequired(false)}
        onLogin={goToLogin}
      />

      <DuplicateParticipationModal
        visible={visible && duplicateParticipation}
        onClose={closeAll}
        onSignup={goToSignup}
      />

      <Modal transparent visible={visible && resendVisible} animationType="fade" onRequestClose={() => setResendVisible(false)}>
        <View style={styles.resendOverlay}>
          <Pressable style={styles.scrim} onPress={() => setResendVisible(false)} />
          <View style={styles.resendPanel}>
            <ModalHeader title="Renvoyer un code de vérification" choiceLabel={choiceLabel} onClose={() => setResendVisible(false)} compact />
            <Text style={styles.helperText}>
              {resendSeconds > 0
                ? `Vous pourrez demander un nouveau code dans ${resendSeconds} s.`
                : `Nous pouvons vous envoyer un nouveau code de vérification ${otpPhoneLabel}.`}
            </Text>
            {resendError ? <Text accessibilityLiveRegion="polite" style={styles.errorBox}>{resendError}</Text> : null}
            <View style={styles.resendActions}>
              <Pressable onPress={() => setResendVisible(false)} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Retour au code</Text>
              </Pressable>
              <AnimatedPrimaryButton compact disabled={resendLoading || resendSeconds > 0} loading={resendLoading} label="Renvoyer un code" onPress={handleResend} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function VerificationLimitModal({
  visible,
  status,
  choiceLabel,
  onClose,
  onAction
}: {
  visible: boolean;
  status: VerificationLimitStatus | null;
  choiceLabel: string;
  onClose: () => void;
  onAction: (action: "signup" | "login" | "close") => void;
}) {
  if (!status) return null;
  const copy = LIMIT_COPY[status];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.limitOverlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.limitPanel}>
          <ModalHeader title={copy.title} choiceLabel={choiceLabel} onClose={onClose} compact />
          <Text style={styles.limitText}>{copy.text}</Text>
          <View style={styles.limitActions}>
            <Pressable onPress={() => onAction(copy.primaryAction)} style={styles.limitPrimary}>
              <Text style={styles.limitPrimaryText}>{copy.primaryLabel}</Text>
            </Pressable>
            <Pressable onPress={() => onAction(copy.secondaryAction)} style={styles.limitSecondary}>
              <Text style={styles.limitSecondaryText}>{copy.secondaryLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AccountLoginRequiredModal({
  visible,
  onClose,
  onLogin
}: {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.limitOverlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.limitPanel}>
          <SimpleModalHeader title="Connectez-vous pour participer" onClose={onClose} compact />
          <Text style={styles.limitText}>Ce numéro est déjà associé à un compte. Pour enregistrer votre participation, veuillez vous connecter.</Text>
          <View style={styles.modalSeparator} />
          <View style={styles.limitActions}>
            <AnimatedPrimaryButton compact label="Se connecter" onPress={onLogin} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DuplicateParticipationModal({
  visible,
  onClose,
  onSignup
}: {
  visible: boolean;
  onClose: () => void;
  onSignup: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.limitOverlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.limitPanel}>
          <SimpleModalHeader title="Participation déjà enregistrée" onClose={onClose} compact />
          <Text style={styles.limitText}>Ce numéro a déjà été utilisé pour cette question. Une seule participation est possible par question.</Text>
          <View style={styles.modalSeparator} />
          <View style={styles.signupPrompt}>
            <Text style={styles.signupPromptText}>Prenez part aux débats,</Text>
            <Pressable accessibilityRole="link" onPress={onSignup} style={styles.signupPromptLink}>
              <Text style={styles.signupPromptLinkText}>créez-vous un compte</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SimpleModalHeader({ title, onClose, compact = false }: { title: string; onClose: () => void; compact?: boolean }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={StyleSheet.flatten([styles.title, compact && styles.titleCompact])}>{title}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={styles.iconButton}>
        <X size={18} color={palette.inkSecondary} />
      </Pressable>
    </View>
  );
}

function ModalHeader({ title, choiceLabel, onClose, compact = false }: { title: string; choiceLabel: string; onClose: () => void; compact?: boolean }) {
  const choiceAccent = getChoiceAccent(choiceLabel);

  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={StyleSheet.flatten([styles.title, compact && styles.titleCompact])}>{title}</Text>
        <Text style={styles.answerText}>Ma réponse : <Text style={StyleSheet.flatten([styles.answerValue, { color: choiceAccent }])}>{choiceLabel}</Text></Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={styles.iconButton}>
        <X size={18} color={palette.inkSecondary} />
      </Pressable>
    </View>
  );
}

function getChoiceAccent(label: string) {
  const normalized = label.trim().toLocaleLowerCase("fr-FR");
  if (["oui", "pour", "favorable"].some((word) => normalized.includes(word))) return palette.positiveText;
  if (["non", "contre", "defavorable", "défavorable"].some((word) => normalized.includes(word))) return palette.dangerText;
  return palette.primaryStrong;
}

function AnimatedPrimaryButton({ label, loading, disabled, compact = false, onPress }: { label: string; loading?: boolean; disabled?: boolean; compact?: boolean; onPress: () => void }) {
  const [active, setActive] = useState(false);
  const fill = useMemo(() => new Animated.Value(0), []);

  function animate(toValue: number) {
    if (disabled) return;
    setActive(toValue === 1);
    Animated.timing(fill, {
      toValue,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      disabled={disabled}
      onHoverIn={() => animate(1)}
      onHoverOut={() => animate(0)}
      onFocus={() => animate(1)}
      onBlur={() => animate(0)}
      onPressIn={() => animate(1)}
      onPressOut={() => animate(0)}
      onPress={onPress}
      style={StyleSheet.flatten([styles.primaryButton, compact && styles.primaryButtonCompact, disabled && styles.primaryButtonDisabled])}
    >
      <Animated.View
        pointerEvents="none"
        style={StyleSheet.flatten([
          styles.primaryFill,
          { transform: [{ translateY: fill.interpolate({ inputRange: [0, 1], outputRange: [52, 0] }) }] }
        ])}
      />
      {loading ? <ActivityIndicator color={active ? palette.onPrimary : palette.primaryStrong} /> : null}
      <Text style={StyleSheet.flatten([styles.primaryText, active && styles.primaryTextActive, disabled && styles.primaryTextDisabled])}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.66)"
  },
  panel: {
    width: "100%",
    maxWidth: 390,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 22,
    gap: 14,
    ...shadows.panel
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.line
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 6 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 20, lineHeight: 25 },
  titleCompact: { fontSize: 18, lineHeight: 24 },
  answerText: { color: palette.inkSecondary, fontSize: 13, lineHeight: 20 },
  answerValue: { color: palette.primaryStrong, fontFamily: fontFamilyBold },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surfaceRaised
  },
  body: { gap: 12, paddingTop: 2 },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  helperText: { color: palette.inkSecondary, fontSize: 13, lineHeight: 20 },
  sendingCode: { flexDirection: "row", alignItems: "center", gap: 10 },
  otpField: { gap: 7 },
  fieldError: { color: palette.fieldError, fontSize: 11, lineHeight: 15 },
  errorBox: {
    color: palette.dangerText,
    backgroundColor: palette.dangerSoft,
    borderRadius: radius.sm,
    padding: 11,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontFamilyMedium
  },
  noticeBox: {
    color: palette.inkSecondary,
    backgroundColor: palette.surfaceSubtle,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.sm,
    padding: 11,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontFamilyMedium
  },
  otpFooter: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 11, alignItems: "flex-end", gap: 5 },
  timerText: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: "right" },
  resendLink: { alignSelf: "flex-end", paddingVertical: 2 },
  resendLinkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13, textAlign: "right" },
  loginSeparator: { height: 1, width: "100%", backgroundColor: authField.separatorColor, marginTop: 6, marginBottom: 0 },
  loginPrompt: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, flexWrap: "wrap", paddingTop: 0 },
  loginPromptText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  loginPromptLink: { paddingVertical: 3 },
  loginPromptLinkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13 },
  signupPrompt: { flexDirection: "row", justifyContent: "center", alignItems: "center", columnGap: 5, rowGap: 2, flexWrap: "wrap" },
  signupPromptText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13, textAlign: "center" },
  signupPromptLink: { paddingVertical: 3 },
  signupPromptLinkText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13 },
  primaryButton: {
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.primaryStrong,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
    marginTop: 0,
    paddingHorizontal: 12
  },
  primaryButtonCompact: { minHeight: 42, paddingHorizontal: 14, marginTop: 0 },
  primaryButtonDisabled: { opacity: 0.48 },
  primaryFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 52,
    backgroundColor: palette.primaryStrong
  },
  primaryText: { zIndex: 1, color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 14, textAlign: "center" },
  primaryTextActive: { color: palette.onPrimary },
  primaryTextDisabled: { color: palette.muted },
  successBody: { gap: 16 },
  successText: { color: palette.inkSecondary, fontSize: 14, lineHeight: 22 },
  successPrimary: {
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  successPrimaryPressed: { transform: [{ translateY: 1 }], backgroundColor: palette.primaryPressed },
  successPrimaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold, fontSize: 14 },
  resendOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  resendPanel: {
    width: "100%",
    maxWidth: 390,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 22,
    gap: 14,
    ...shadows.panel
  },
  limitOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  limitPanel: {
    width: "100%",
    maxWidth: 390,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 22,
    gap: 14,
    ...shadows.panel
  },
  limitText: { color: palette.inkSecondary, fontSize: 13, lineHeight: 20 },
  modalSeparator: { height: 1, width: "100%", backgroundColor: palette.line },
  limitActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, flexWrap: "wrap" },
  limitPrimary: { minHeight: 42, borderRadius: radius.sm, backgroundColor: palette.primary, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  limitPrimaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold, fontSize: 13 },
  limitSecondary: {
    minHeight: 42,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: authField.separatorColor
  },
  limitSecondaryText: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 13 },
  resendActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, flexWrap: "wrap" },
  secondaryButton: {
    minHeight: 42,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: authField.separatorColor
  },
  secondaryText: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 13 }
});
