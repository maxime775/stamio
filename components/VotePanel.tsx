import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Animated, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CheckCircle2, Send, X } from "lucide-react-native";
import { OtpInput } from "@/components/OtpInput";
import { Turnstile } from "@/components/Turnstile";
import { getResults, startVerification, submitVote } from "@/lib/api";
import { normalizePhoneInput, validateOtp } from "@/lib/validation";
import type { PollResult, VoteStatus } from "@/lib/types";

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
      Animated.spring(slide, { toValue: 1, damping: 18, stiffness: 160, useNativeDriver: true }).start();
    } else {
      slide.setValue(0);
    }
  }, [slide, visible]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [360, 0] });
  const siteKey = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleStart() {
    const normalized = normalizePhoneInput(phone);
    if (!normalized.ok) {
      setPhoneError("Numéro invalide. Utilisez le format international, par exemple +33612345678.");
      return;
    }
    if (platform === "web" && !turnstileToken) {
      setPhoneError("Validation anti-abus requise avant l'envoi du SMS.");
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

    if (response.status === "ok") {
      setStep("otp");
    } else if (response.status === "invalid_phone") {
      setPhoneError("Numéro invalide. Utilisez le format international.");
    } else if (response.status === "poll_closed") {
      setPhoneError("Ce sondage est fermé.");
    } else {
      setPhoneError("Impossible d'envoyer le code pour le moment.");
    }
  }

  async function handleSubmit() {
    const normalized = normalizePhoneInput(phone);
    if (!normalized.ok) {
      setPhoneError("Numéro invalide.");
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
    const results = await getResults(pollId);
    setLoading(false);
    onFinished(response, results);

    if (response.status === "accepted") {
      setStep("success");
      setTimeout(onClose, 900);
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
        <Animated.View style={[styles.panel, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>Vote vérifié</Text>
              <Text style={styles.title}>{choiceLabel}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.iconButton}>
              <X size={18} color="#0F172A" />
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
                {loading ? <ActivityIndicator color="#06111C" /> : <Send size={18} color="#06111C" />}
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
                {loading ? <ActivityIndicator color="#06111C" /> : <CheckCircle2 size={18} color="#06111C" />}
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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "#FFFFFF",
    padding: 22,
    paddingBottom: 30,
    gap: 18,
    shadowColor: "#020617",
    shadowOpacity: 0.35,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: -12 }
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    alignSelf: "center"
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  kicker: { color: "#0F766E", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: "#0F172A", fontSize: 22, fontWeight: "900", marginTop: 4 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9"
  },
  body: { gap: 13 },
  label: { color: "#334155", fontWeight: "800", fontSize: 14 },
  input: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 16,
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
    backgroundColor: "#F8FAFC"
  },
  error: {
    color: "#B91C1C",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    fontWeight: "700"
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10
  },
  primaryText: { color: "#06111C", fontSize: 16, fontWeight: "900" },
  success: { alignItems: "center", justifyContent: "center", paddingVertical: 30, gap: 12 },
  successTitle: { color: "#064E3B", fontSize: 24, fontWeight: "900" }
});
