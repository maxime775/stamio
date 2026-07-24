import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AuthForm } from "@/components/AuthForm";
import { AuthTextField } from "@/components/AuthFields";
import { OtpInput } from "@/components/OtpInput";
import { Turnstile } from "@/components/Turnstile";
import { confirmSignupPhoneVerification, startSignupPhoneVerification } from "@/lib/api";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius, shadows } from "@/lib/design";
import { formatFrenchMobilePhoneDisplay, normalizeFrenchMobilePhoneInput } from "@/lib/validation";

const RESEND_DELAY_SECONDS = 15;
const PHONE_LINKED_MESSAGE = "Ce numéro est déjà associé à un autre compte Stamio. Veuillez utiliser le compte lié à ce numéro ou associer un autre numéro à ce compte.";

type Props = {
  onContinue: (verifiedPhone: string, verificationToken: string) => void;
};

export function SignupPhoneVerification({ onContinue }: Props) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [otpError, setOtpError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_DELAY_SECONDS);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [verificationToken, setVerificationToken] = useState("");
  const [successVisible, setSuccessVisible] = useState(false);
  const normalizedPhone = normalizeFrenchMobilePhoneInput(phone);
  const turnstileSiteKey = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  useEffect(() => {
    if (step !== "otp" || resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds, step]);

  async function sendCode(source: "initial" | "resend") {
    if (!normalizedPhone.ok) {
      setPhoneTouched(true);
      setPhoneError("Veuillez saisir un numéro de mobile français valide.");
      return;
    }

    source === "initial" ? setLoading(true) : setResendLoading(true);
    setPhoneError(undefined);
    setOtpError(null);
    const response = await startSignupPhoneVerification(normalizedPhone.value, turnstileToken || undefined);
    source === "initial" ? setLoading(false) : setResendLoading(false);

    if (response.status === "verification_started") {
      setVerifiedPhone(normalizedPhone.value);
      setStep("otp");
      setOtp("");
      setResendSeconds(RESEND_DELAY_SECONDS);
      setTurnstileToken("");
      setTurnstileResetKey((key) => key + 1);
      return;
    }

    const message = response.status === "captcha_required"
      ? "La vérification de sécurité a expiré. Veuillez la valider de nouveau."
      : response.status === "invalid_phone_type"
        ? "Veuillez saisir un numéro de mobile français valide."
        : source === "resend"
          ? "Le renvoi du code a échoué. Veuillez réessayer."
          : "L’envoi du code a échoué. Veuillez réessayer.";
    if (source === "initial") setPhoneError(message);
    else setOtpError(message);
    setTurnstileResetKey((key) => key + 1);
    setTurnstileToken("");
  }

  async function confirmCode() {
    if (otp.length !== 6 || loading) return;
    setLoading(true);
    setOtpError(null);
    const response = await confirmSignupPhoneVerification(verifiedPhone, otp);
    setLoading(false);

    if (response.status === "phone_confirmed") {
      setVerificationToken(response.verification_token);
      setSuccessVisible(true);
      return;
    }
    if (response.status === "phone_already_linked") {
      setOtpError(PHONE_LINKED_MESSAGE);
      return;
    }
    if (response.status === "code_expired") {
      setOtpError("Ce code a expiré. Veuillez demander un nouveau code.");
      return;
    }
    setOtpError(response.status === "invalid_code"
      ? "Le code saisi est incorrect. Veuillez vérifier les 6 chiffres."
      : "La vérification du code a échoué. Veuillez réessayer.");
  }

  if (step === "phone") {
    const validationError = phoneTouched && !normalizedPhone.ok
      ? "Veuillez saisir un numéro de mobile français valide."
      : phoneError;
    return (
      <AuthForm
        title="Vérification du téléphone"
        subtitle="Pour sécuriser votre participation, merci de vérifier votre numéro de téléphone."
        maxWidth={460}
        compact
      >
        <AuthTextField
          field="signup-phone"
          label="Téléphone"
          error={validationError}
          value={phone}
          onBlur={() => setPhoneTouched(true)}
          onChangeText={(value) => {
            setPhone(formatFrenchMobilePhoneDisplay(value));
            setPhoneError(undefined);
          }}
          keyboardType="phone-pad"
          placeholder="+33 06 12 34 56 78"
        />
        <Turnstile siteKey={turnstileSiteKey} onToken={handleTurnstileToken} resetKey={turnstileResetKey} compact />
        <PrimaryButton
          disabled={!normalizedPhone.ok || loading || Boolean(turnstileSiteKey && !turnstileToken)}
          loading={loading}
          label="Continuer"
          onPress={() => void sendCode("initial")}
        />
      </AuthForm>
    );
  }

  return (
    <>
      <AuthForm
        title="Nous vous avons envoyé un code de vérification"
        subtitle="Le code a été envoyé sur votre téléphone"
        maxWidth={460}
        compact
      >
        <View style={styles.otpBlock}>
          <OtpInput
            value={otp}
            onChange={(value) => {
              setOtp(value);
              setOtpError(null);
            }}
            onInvalidInput={() => setOtpError("Le code doit contenir uniquement 6 chiffres.")}
          />
          {otpError ? <Text accessibilityLiveRegion="polite" style={styles.errorBox}>{otpError}</Text> : null}
        </View>
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Vous n’avez pas reçu de code ? </Text>
          {resendSeconds > 0 ? (
            <Text accessibilityLiveRegion="polite" style={styles.timerText}>Réessayer dans {resendSeconds} s</Text>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={resendLoading || Boolean(turnstileSiteKey && !turnstileToken)}
              onPress={() => void sendCode("resend")}
            >
              <Text style={StyleSheet.flatten([styles.resendLink, resendLoading && styles.disabledText])}>
                {resendLoading ? "Envoi en cours…" : "Renvoyer le code"}
              </Text>
            </Pressable>
          )}
        </View>
        <Turnstile siteKey={turnstileSiteKey} onToken={handleTurnstileToken} resetKey={turnstileResetKey} compact />
        <PrimaryButton disabled={otp.length !== 6 || loading} loading={loading} label="Vérifier le code" onPress={() => void confirmCode()} />
      </AuthForm>

      <Modal transparent visible={successVisible} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>Votre numéro est vérifié</Text>
            <PrimaryButton
              label="Continuer mon inscription"
              onPress={() => {
                setSuccessVisible(false);
                onContinue(verifiedPhone, verificationToken);
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function PrimaryButton({
  disabled = false,
  loading = false,
  label,
  onPress
}: {
  disabled?: boolean;
  loading?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => StyleSheet.flatten([styles.primary, disabled && styles.primaryDisabled, pressed && !disabled && styles.primaryPressed])}
    >
      {loading ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  otpBlock: { gap: 10 },
  errorBox: { color: palette.dangerText, backgroundColor: palette.dangerSoft, borderRadius: radius.sm, padding: 12, fontSize: 12, lineHeight: 18 },
  resendRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", minHeight: 24 },
  resendText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 13 },
  timerText: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 13 },
  resendLink: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13, textDecorationLine: "underline" },
  disabledText: { opacity: 0.55 },
  primary: { minHeight: 44, borderRadius: radius.sm, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  primaryDisabled: { opacity: 0.5 },
  primaryPressed: { transform: [{ translateY: 1 }], backgroundColor: palette.primaryPressed },
  primaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: "rgba(3, 7, 13, 0.74)", alignItems: "center", justifyContent: "center", padding: 22 },
  modalPanel: { width: "100%", maxWidth: 440, borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, padding: 22, gap: 20, ...shadows.panel },
  modalTitle: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 25, lineHeight: 31, textAlign: "center" }
});
