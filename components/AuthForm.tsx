import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fontFamilyBold, palette, radius, shadows } from "@/lib/design";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  maxWidth?: number;
  compact?: boolean;
};

export function AuthForm({ title, subtitle, children, maxWidth = 520, compact = false }: Props) {
  return (
    <View style={{ ...styles.wrap, maxWidth }}>
      <View style={styles.copy}>
        <Text style={StyleSheet.flatten([styles.title, compact && styles.titleCompact])}>{title}</Text>
        <Text style={StyleSheet.flatten([styles.subtitle, compact && styles.subtitleCompact])}>{subtitle}</Text>
      </View>
      <View style={StyleSheet.flatten([styles.card, compact && styles.tunnel])}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center", gap: 18 },
  copy: { gap: 8, alignItems: "center" },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 32, lineHeight: 39, textAlign: "center", letterSpacing: -0.7 },
  titleCompact: { fontSize: 29, lineHeight: 35, letterSpacing: -0.45 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 23, textAlign: "center", maxWidth: 520 },
  subtitleCompact: { fontSize: 14, lineHeight: 21, maxWidth: 380 },
  card: {
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 22,
    gap: 14,
    ...shadows.panel
  },
  tunnel: {
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    gap: 12,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 }
  }
});
