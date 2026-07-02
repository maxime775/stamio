import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppFooter } from "@/components/AppFooter";
import { palette } from "@/lib/design";

type Props = {
  children: ReactNode;
  compact?: boolean;
};

export function PageShell({ children, compact = false }: Props) {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={StyleSheet.flatten([styles.content, compact && styles.compact])}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inner}>
        {children}
        <AppFooter />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  content: {
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 96
  },
  compact: { paddingTop: 20 },
  inner: {
    width: "100%",
    maxWidth: 1160,
    alignSelf: "center",
    gap: 24
  }
});
