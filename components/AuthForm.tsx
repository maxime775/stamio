import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fontFamilyBold, palette, radius, shadows } from "@/lib/design";

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
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 32, lineHeight: 39, textAlign: "center", letterSpacing: -0.7 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 23, textAlign: "center", maxWidth: 520 },
  card: {
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 22,
    gap: 14,
    ...shadows.panel
  }
});
