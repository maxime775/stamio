import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { palette } from "@/lib/design";

type Props = {
  primary: ReactNode;
  secondary: ReactNode;
  primaryWeight?: number;
  secondaryWeight?: number;
  stacked?: boolean;
  variant?: "preview" | "balanced";
};

export function IntrinsicEditorialSplit({ primary, secondary, primaryWeight = 1, secondaryWeight = 1, stacked = false, variant = "preview" }: Props) {
  if (!primary || !secondary) {
    return <View style={styles.singleColumn}>{primary ?? secondary}</View>;
  }

  const balanced = variant === "balanced";

  return (
    <View style={StyleSheet.flatten([styles.split, balanced && styles.splitBalanced, stacked && styles.splitStacked, balanced && stacked && styles.splitBalancedStacked])}>
      <View style={StyleSheet.flatten([styles.column, balanced && !stacked && styles.primaryColumn, !stacked && { flexGrow: primaryWeight }])}>{primary}</View>
      {balanced ? <View style={StyleSheet.flatten([styles.divider, stacked && styles.dividerStacked])} /> : null}
      <View style={StyleSheet.flatten([styles.column, balanced && !stacked && styles.secondaryColumn, !stacked && { flexGrow: secondaryWeight }])}>{secondary}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  singleColumn: { width: "100%", minWidth: 0 },
  split: { width: "100%", flexDirection: "row", alignItems: "stretch", gap: 24, paddingTop: 14, borderTopWidth: 1, borderTopColor: palette.line },
  splitBalanced: { gap: 0, paddingTop: 0, borderTopWidth: 0 },
  splitStacked: { flexDirection: "column", gap: 12 },
  splitBalancedStacked: { gap: 0 },
  column: { minWidth: 0, flexBasis: 0, flexShrink: 1 },
  primaryColumn: { paddingRight: 24 },
  secondaryColumn: { paddingLeft: 24 },
  divider: { width: 1, alignSelf: "stretch", backgroundColor: palette.lineStrong },
  dividerStacked: { width: "100%", height: 1, marginVertical: 14 }
});
