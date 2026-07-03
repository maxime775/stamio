import { StyleSheet, Text, TextInput, type StyleProp, type TextStyle } from "react-native";
import type { ThemeSlug } from "@/lib/types";

export const palette = {
  canvas: "#080B10",
  surface: "#0E131B",
  surfaceRaised: "#141B25",
  surfaceSubtle: "#0B1017",
  ink: "#F3F5F7",
  inkSecondary: "#C7CED8",
  muted: "#8893A2",
  line: "rgba(166, 176, 192, 0.14)",
  lineStrong: "rgba(166, 176, 192, 0.24)",
  primary: "#3867D6",
  primaryStrong: "#5B82E5",
  primarySoft: "rgba(56, 103, 214, 0.13)",
  positive: "#2FBF91",
  danger: "#D76672",
  timerAccent: "#E35D6A"
} as const;

export const fontFamily = "Inter_400Regular";
export const fontFamilyMedium = "Inter_500Medium";
export const fontFamilySemibold = "Inter_600SemiBold";
export const fontFamilyBold = "Inter_700Bold";

export const radius = {
  xs: 3,
  sm: 5,
  md: 8,
  lg: 12,
  panel: 14,
  round: 999
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
} as const;

export const shadows = {
  panel: {
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 }
  }
} as const;

type TextComponentWithDefaults = {
  defaultProps?: { style?: StyleProp<TextStyle> };
};

let typographyConfigured = false;

export function configureGlobalTypography() {
  if (typographyConfigured) return;
  typographyConfigured = true;
  for (const component of [Text, TextInput] as unknown as TextComponentWithDefaults[]) {
    component.defaultProps = component.defaultProps ?? {};
    component.defaultProps.style = StyleSheet.flatten([component.defaultProps.style, { fontFamily }]);
  }
}

export const themeVisuals: Record<ThemeSlug, { accent: string; soft: string; line: string }> = {
  politique: { accent: "#7792D0", soft: "rgba(83, 107, 163, 0.13)", line: "#536BA3" },
  economie: { accent: "#C49A52", soft: "rgba(154, 116, 55, 0.13)", line: "#9A7437" },
  societe: { accent: "#5BA497", soft: "rgba(69, 128, 118, 0.13)", line: "#458076" },
  sport: { accent: "#B96D77", soft: "rgba(145, 78, 88, 0.13)", line: "#914E58" }
};

export function getThemeVisual(theme?: ThemeSlug | null) {
  return themeVisuals[theme ?? "societe"];
}

export const choiceColors = ["#4F8CFF", "#00BFA6", "#F2A93B", "#E05D6F", "#A878E8"];
