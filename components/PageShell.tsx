import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { AppFooter } from "@/components/AppFooter";
import { SiteContainer } from "@/components/SiteContainer";
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
      <SiteContainer style={styles.inner}>
        {children}
        <AppFooter />
      </SiteContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  content: {
    paddingTop: 34,
    paddingBottom: 96
  },
  compact: { paddingTop: 20 },
  inner: {
    gap: 24
  }
});
