import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  maxWidth?: number;
};

export function AuthForm({ title, subtitle, children, maxWidth = 560 }: Props) {
  return (
    <View style={{ ...styles.wrap, maxWidth }}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center", gap: 20 },
  copy: { gap: 8, alignItems: "center" },
  title: { color: "#F8FAFC", fontSize: 34, lineHeight: 40, fontWeight: "900", textAlign: "center", letterSpacing: 0 },
  subtitle: { color: "#94A3B8", fontSize: 16, lineHeight: 23, textAlign: "center", maxWidth: 520 },
  card: {
    borderRadius: 22,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    padding: 22,
    gap: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  }
});
