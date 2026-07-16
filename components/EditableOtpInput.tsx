import { useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { fontFamilyBold, palette, radius } from "@/lib/design";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onInvalidInput?: () => void;
};

const OTP_LENGTH = 6;

export function EditableOtpInput({ value, onChange, onInvalidInput }: Props) {
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? "");

  function handleChange(text: string, index: number) {
    const numericText = text.replace(/\D/g, "");
    const hasInvalidInput = Boolean(text && numericText.length !== text.length);

    if (numericText.length > 1) {
      const pastedCode = numericText.slice(0, OTP_LENGTH);
      onChange(pastedCode);
      if (hasInvalidInput) onInvalidInput?.();
      inputRefs.current[Math.min(pastedCode.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = numericText;
    onChange(nextDigits.join("").slice(0, OTP_LENGTH));
    if (hasInvalidInput) onInvalidInput?.();

    if (numericText && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleBackspace(index: number) {
    if (digits[index] || index === 0) return;

    const nextDigits = [...digits];
    nextDigits[index - 1] = "";
    onChange(nextDigits.join(""));
    inputRefs.current[index - 1]?.focus();
  }

  return (
    <View style={styles.cells}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(input) => {
            inputRefs.current[index] = input;
          }}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === "Backspace") handleBackspace(index);
          }}
          autoFocus={index === 0}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={OTP_LENGTH}
          selectTextOnFocus
          accessibilityLabel={`Chiffre ${index + 1} du code OTP`}
          style={StyleSheet.flatten([styles.cell, value.length === index && styles.cellActive])}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cells: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  cell: {
    width: 46,
    height: 54,
    borderRadius: radius.sm,
    color: palette.ink,
    fontSize: 22,
    fontFamily: fontFamilyBold,
    textAlign: "center",
    backgroundColor: palette.surfaceSubtle,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.26)"
  },
  cellActive: {
    borderColor: palette.primaryStrong,
    shadowColor: palette.primaryStrong,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 }
  }
});
