import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Animated, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CheckCircle2, Send, X } from "lucide-react-native";
import { OtpInput } from "@/components/OtpInput";
import { Turnstile } from "@/components/Turnstile";
import { getResults, invalidatePollCaches, startVerification, submitVote } from "@/lib/api";
import { normalizeFrenchMobilePhoneInput, validateOtp } from "@/lib/validation";
import type { PollResult, VoteStatus } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius, shadows } from "@/lib/design";

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

export function VotePanel({ visible, pollId, choiceId, choiceLabel, platform, onClose, onFinished }: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const slide = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (visible) {
      setStep("phone");
      setOtp("");
      setOtpError(null);
      setPhoneError(null);
      setTurnstileToken("");
      Animated.spring(slide, { toValue: 1, damping: 18, stiffness: 160, useNativeDriver: true }).start();
    } else {
      slide.setValue(0);
    }
  }, [slide, visible]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [360, 0] });
  const siteKey = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleStart() {
    const normalized = normalizeFrenchMobilePhoneInput(phone);
    if (!normalized.ok) {
      setPhoneError("Pour cette phase de test, seuls les numéros mobiles français commençant par 06 ou 07 sont acceptés.");
      return;
    }
    setLoading(true);
    setPhoneError(null);
    const response = await startVerification({
      poll_id: pollId,
      choice_id: choiceId,
      phone_e164: normalized.value,
      platform,
      turnstile_token: platform === "web" ? turnstileToken : undefined
    });
    setLoading(false);

    if (response.status === "verification_started") {
      setStep("otp");
    } else if (response.status === "invalid_phone_type") {
      setPhoneError("Pour cette phase de test, seuls les numéros mobiles français commençant par 06 ou 07 sont acceptés.");
    } else if (response.status === "poll_closed") {
      setPhoneError("Ce sondage est fermé.");
    } else if (response.status === "captcha_required") {
      setPhoneError("La validation anti-abus est requise. Complétez le captcha puis réessayez.");
    } else {
      setPhoneError("Impossible d'envoyer le code pour le moment.");
    }
  }

  async function handleSubmit() {
    const normalized = normalizeFrenchMobilePhoneInput(phone);
    if (!normalized.ok) {
      setPhoneError("Pour cette phase de test, seuls les numéros mobiles français commençant par 06 ou 07 sont acceptés.");
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
      phone_e164: normalized.value,
      otp_code: otp
    });
    if (response.status === "accepted") invalidatePollCaches(pollId);
    const results = await getResults(pollId, { force: response.status === "accepted", label: "getResultsAfterVote" });
    setLoading(false);
    onFinished(response, results);

    if (response.status === "accepted") {
      setStep("success");
      setTimeout(onClose, 900);
    } else if (response.status === "invalid_phone_type") {
      setPhoneError("Pour cette phase de test, seuls les numéros mobiles français commençant par 06 ou 07 sont acceptés.");
      setStep("phone");
    } else if (response.status === "invalid_code") {
      setOtpError("Code OTP invalide.");
    } else if (response.status === "duplicate") {
      setOtpError("Ce numéro a déjà été utilisé pour cette question.");
    } else if (response.status === "poll_closed") {
      setOtpError("Ce sondage est fermé.");
    } else {
      setOtpError("Le vote n'a pas pu être comptabilisé.");
    }
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <Animated.View style={StyleSheet.flatten([styles.panel, { transform: [{ translateY: translateY as unknown as number }] }])}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>Vote vérifié</Text>
              <Text style={styles.title}>{choiceLabel}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.iconButton}>
              <X size={18} color="#E2E8F0" />
            </Pressable>
          </View>

          {step === "phone" ? (
            <View style={styles.body}>
              <Text style={styles.label}>Numéro de téléphone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+33612345678"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                style={styles.input}
              />
              {platform === "web" ? <Turnstile siteKey={siteKey} onToken={setTurnstileToken} /> : null}
              {phoneError ? <Text style={styles.error}>{phoneError}</Text> : null}
              <Pressable disabled={loading} onPress={handleStart} style={styles.primaryButton}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Send size={18} color="#FFFFFF" />}
                <Text style={styles.primaryText}>Recevoir le code SMS</Text>
              </Pressable>
            </View>
          ) : null}

          {step === "otp" ? (
            <View style={styles.body}>
              <Text style={styles.label}>Code reçu par SMS</Text>
              <OtpInput value={otp} onChange={setOtp} />
              {otpError ? <Text style={styles.error}>{otpError}</Text> : null}
              <Pressable disabled={loading} onPress={handleSubmit} style={styles.primaryButton}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <CheckCircle2 size={18} color="#FFFFFF" />}
                <Text style={styles.primaryText}>Comptabiliser mon vote</Text>
              </Pressable>
            </View>
          ) : null}

          {step === "success" ? (
            <View style={styles.success}>
              <CheckCircle2 size={46} color="#059669" />
              <Text style={styles.successTitle}>Vote validé</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end"
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.62)"
  },
  panel: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 560,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: palette.surface,
    padding: 22,
    paddingBottom: 30,
    gap: 18,
    ...shadows.panel
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: radius.xs,
    backgroundColor: palette.lineStrong,
    alignSelf: "center"
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 21, marginTop: 4 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surfaceRaised
  },
  body: { gap: 13 },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  input: {
    minHeight: 56,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.26)",
    paddingHorizontal: 16,
    color: "#F8FAFC",
    fontSize: 18,
    fontFamily: fontFamilyMedium,
    backgroundColor: palette.surfaceSubtle
  },
  error: {
    color: "#FCA5A5",
    backgroundColor: "rgba(127, 29, 29, 0.26)",
    borderRadius: radius.sm,
    padding: 12,
    fontSize: 13,
    fontFamily: fontFamilyMedium
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: radius.sm,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10
  },
  primaryText: { color: "#FFFFFF", fontFamily: fontFamilySemibold, fontSize: 15 },
  success: { alignItems: "center", justifyContent: "center", paddingVertical: 30, gap: 12 },
  successTitle: { color: palette.positive, fontFamily: fontFamilyBold, fontSize: 23 }
});
