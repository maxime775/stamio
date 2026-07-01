import { useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const OTP_LENGTH = 6;

export function EditableOtpInput({ value, onChange }: Props) {
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? "");

  function handleChange(text: string, index: number) {
    const numericText = text.replace(/\D/g, "");

    if (numericText.length > 1) {
      const pastedCode = numericText.slice(0, OTP_LENGTH);
      onChange(pastedCode);
      inputRefs.current[Math.min(pastedCode.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = numericText;
    onChange(nextDigits.join("").slice(0, OTP_LENGTH));

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
    borderRadius: 15,
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    backgroundColor: "rgba(2, 6, 23, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.26)"
  },
  cellActive: {
    borderColor: "#14B8A6",
    shadowColor: "#14B8A6",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 }
  }
});
