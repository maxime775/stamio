import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { palette } from "@/lib/design";

type Props = {
  primary: ReactNode;
  secondary: ReactNode;
};

export function IntrinsicEditorialSplit({ primary, secondary }: Props) {
  return (
    <View style={styles.stack}>
      <View style={styles.column}>{primary}</View>
      <View style={styles.column}>{secondary}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { width: "100%", gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: palette.line },
  column: { width: "100%", minWidth: 0 }
});
