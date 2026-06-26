import { useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function OtpInput({ value, onChange }: Props) {
  const inputRef = useRef<TextInput>(null);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  return (
    <View style={styles.wrapper}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        style={styles.hiddenInput}
      />
      <View style={styles.cells} onTouchEnd={() => inputRef.current?.focus()}>
        {digits.map((digit, index) => (
          <View key={index} style={[styles.cell, value.length === index && styles.cellActive]}>
            <TextInput
              editable={false}
              value={digit}
              pointerEvents="none"
              style={styles.cellText}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%" },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0
  },
  cells: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  cell: {
    width: 46,
    height: 54,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  cellActive: {
    borderColor: "#14B8A6",
    shadowColor: "#14B8A6",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 }
  },
  cellText: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center"
  }
});
