import { StyleSheet, Text, TextInput, type StyleProp, type TextStyle } from "react-native";
import type { ThemeSlug } from "@/lib/types";

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

type Palette = Record<
  | "canvas"
  | "surface"
  | "surfaceRaised"
  | "surfaceSubtle"
  | "ink"
  | "inkSecondary"
  | "muted"
  | "line"
  | "lineStrong"
  | "primary"
  | "primaryStrong"
  | "primaryPressed"
  | "primarySoft"
  | "onPrimary"
  | "positive"
  | "positiveText"
  | "positiveSoft"
  | "positiveLine"
  | "danger"
  | "dangerText"
  | "dangerSoft"
  | "dangerLine"
  | "fieldError"
  | "timerAccent",
  string
>;

type AuthField = {
  borderWidth: number;
  borderRadius: number;
  background: string;
  backgroundFocused: string;
  backgroundInvalid: string;
  focusBorderColor: string;
  invalidBorderColor: string;
  placeholderColor: string;
  separatorColor: string;
};

type ThemeVisualConfig = Record<ThemeSlug, { accent: string; soft: string; line: string }>;

type ColorScheme = {
  palette: Palette;
  authField: AuthField;
  themeVisuals: ThemeVisualConfig;
  choiceColors: readonly string[];
};

const currentPalette = {
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
  primaryPressed: "#315CC2",
  primarySoft: "rgba(56, 103, 214, 0.13)",
  onPrimary: "#FFFFFF",
  positive: "#2FBF91",
  positiveText: "#A7F3D0",
  positiveSoft: "rgba(16, 185, 129, 0.1)",
  positiveLine: "rgba(167, 243, 208, 0.22)",
  danger: "#D76672",
  dangerText: "#FCA5A5",
  dangerSoft: "rgba(127, 29, 29, 0.26)",
  dangerLine: "rgba(252, 165, 165, 0.22)",
  fieldError: "#F08A95",
  timerAccent: "#E35D6A"
} as const satisfies Palette;

const test1Palette = {
  canvas: "#080B10",
  surface: "#0E131B",
  surfaceRaised: "#141B25",
  surfaceSubtle: "#0B1017",
  ink: "#F6F7EB",
  inkSecondary: "#D7DACE",
  muted: "#9BA798",
  line: "rgba(246, 247, 235, 0.13)",
  lineStrong: "rgba(246, 247, 235, 0.24)",
  primary: "#3F88C5",
  primaryStrong: "#78B8EA",
  primaryPressed: "#3372A6",
  primarySoft: "rgba(63, 136, 197, 0.16)",
  onPrimary: "#080B10",
  positive: "#44BBA4",
  positiveText: "#82DDCE",
  positiveSoft: "rgba(68, 187, 164, 0.14)",
  positiveLine: "rgba(68, 187, 164, 0.34)",
  danger: "#E94F37",
  dangerText: "#FF9D8F",
  dangerSoft: "rgba(233, 79, 55, 0.16)",
  dangerLine: "rgba(233, 79, 55, 0.36)",
  fieldError: "#FF9D8F",
  timerAccent: "#E94F37"
} as const satisfies Palette;

const test2Palette = {
  canvas: "#080B10",
  surface: "#0E131B",
  surfaceRaised: "#141B25",
  surfaceSubtle: "#0B1017",
  ink: "#FBFBFF",
  inkSecondary: "#D9DCE8",
  muted: "#A2A8B8",
  line: "rgba(251, 251, 255, 0.13)",
  lineStrong: "rgba(251, 251, 255, 0.24)",
  primary: "#657ED4",
  primaryStrong: "#93A6EF",
  primaryPressed: "#5368B5",
  primarySoft: "rgba(101, 126, 212, 0.16)",
  onPrimary: "#080B10",
  positive: "#A7C4C2",
  positiveText: "#C8DEDC",
  positiveSoft: "rgba(167, 196, 194, 0.14)",
  positiveLine: "rgba(167, 196, 194, 0.34)",
  danger: "#FF331F",
  dangerText: "#FF9A90",
  dangerSoft: "rgba(255, 51, 31, 0.16)",
  dangerLine: "rgba(255, 51, 31, 0.36)",
  fieldError: "#FF9A90",
  timerAccent: "#FF331F"
} as const satisfies Palette;

const test3Palette = {
  canvas: "#080B10",
  surface: "#0E131B",
  surfaceRaised: "#141B25",
  surfaceSubtle: "#0B1017",
  ink: "#FBFCFF",
  inkSecondary: "#D0CCD0",
  muted: "#9E9BA3",
  line: "rgba(208, 204, 208, 0.15)",
  lineStrong: "rgba(208, 204, 208, 0.26)",
  primary: "#1C6E8C",
  primaryStrong: "#3A9ABD",
  primaryPressed: "#155872",
  primarySoft: "rgba(28, 110, 140, 0.18)",
  onPrimary: "#FBFCFF",
  positive: "#8FB7BA",
  positiveText: "#C6DADC",
  positiveSoft: "rgba(143, 183, 186, 0.14)",
  positiveLine: "rgba(143, 183, 186, 0.34)",
  danger: "#F40000",
  dangerText: "#FF8A8A",
  dangerSoft: "rgba(244, 0, 0, 0.14)",
  dangerLine: "rgba(244, 0, 0, 0.34)",
  fieldError: "#FF8A8A",
  timerAccent: "#F40000"
} as const satisfies Palette;

const slateSignalPalette = {
  canvas: "#080B10",
  surface: "#0E151F",
  surfaceRaised: "#132235",
  surfaceSubtle: "#0A1118",
  ink: "#FBFCFF",
  inkSecondary: "#D0CCD0",
  muted: "#9EA6AE",
  line: "rgba(143, 184, 198, 0.15)",
  lineStrong: "rgba(143, 184, 198, 0.28)",
  primary: "#2E6F95",
  primaryStrong: "#48A6B8",
  primaryPressed: "#1E3A5F",
  primarySoft: "rgba(46, 111, 149, 0.18)",
  onPrimary: "#FBFCFF",
  positive: "#48A6B8",
  positiveText: "#A6CDD8",
  positiveSoft: "rgba(72, 166, 184, 0.14)",
  positiveLine: "rgba(72, 166, 184, 0.34)",
  danger: "#F40000",
  dangerText: "#FF8A8A",
  dangerSoft: "rgba(244, 0, 0, 0.12)",
  dangerLine: "rgba(255, 74, 61, 0.34)",
  fieldError: "#FF8A8A",
  timerAccent: "#F40000"
} as const satisfies Palette;

const slateSignalV2Palette = {
  canvas: "#080B10",
  surface: "#0E151F",
  surfaceRaised: "#132235",
  surfaceSubtle: "#0A1118",
  ink: "#FBFCFF",
  inkSecondary: "#D0CCD0",
  muted: "#9EA6AE",
  line: "rgba(143, 184, 198, 0.15)",
  lineStrong: "rgba(143, 184, 198, 0.28)",
  primary: "#1C6E8C",
  primaryStrong: "#2E6F95",
  primaryPressed: "#1E3A5F",
  primarySoft: "rgba(28, 110, 140, 0.18)",
  onPrimary: "#FBFCFF",
  positive: "#44BBA4",
  positiveText: "#8EE2D0",
  positiveSoft: "rgba(68, 187, 164, 0.14)",
  positiveLine: "rgba(68, 187, 164, 0.34)",
  danger: "#F40000",
  dangerText: "#FF8A8A",
  dangerSoft: "rgba(244, 0, 0, 0.12)",
  dangerLine: "rgba(255, 74, 61, 0.34)",
  fieldError: "#FF8A8A",
  timerAccent: "#F40000"
} as const satisfies Palette;

const civicContrastSharpPalette = {
  canvas: "#080B10",
  surface: "#0E131B",
  surfaceRaised: "#141D29",
  surfaceSubtle: "#0A1017",
  ink: "#FBFCFF",
  inkSecondary: "#D0CCD0",
  muted: "#9E9BA3",
  line: "rgba(208, 204, 208, 0.14)",
  lineStrong: "rgba(208, 204, 208, 0.26)",
  primary: "#1C6E8C",
  primaryStrong: "#2E86A6",
  primaryPressed: "#155872",
  primarySoft: "rgba(28, 110, 140, 0.14)",
  onPrimary: "#FBFCFF",
  positive: "#1FA783",
  positiveText: "#73D8BB",
  positiveSoft: "rgba(31, 167, 131, 0.14)",
  positiveLine: "rgba(31, 167, 131, 0.34)",
  danger: "#F40000",
  dangerText: "#FF8A8A",
  dangerSoft: "rgba(244, 0, 0, 0.12)",
  dangerLine: "rgba(244, 0, 0, 0.34)",
  fieldError: "#FF8A8A",
  timerAccent: "#F40000"
} as const satisfies Palette;

const colorSchemes = {
  current: {
    palette: currentPalette,
    authField: {
      borderWidth: 2,
      borderRadius: radius.sm,
      background: "#101721",
      backgroundFocused: "rgba(20, 27, 37, 0.92)",
      backgroundInvalid: "rgba(91, 24, 33, 0.12)",
      focusBorderColor: currentPalette.primary,
      invalidBorderColor: "rgba(227, 93, 106, 0.68)",
      placeholderColor: "#64748B",
      separatorColor: "rgba(226, 232, 240, 0.2)"
    },
    themeVisuals: {
      politique: { accent: "#7792D0", soft: "rgba(83, 107, 163, 0.13)", line: "#536BA3" },
      economie: { accent: "#C49A52", soft: "rgba(154, 116, 55, 0.13)", line: "#9A7437" },
      societe: { accent: "#5BA497", soft: "rgba(69, 128, 118, 0.13)", line: "#458076" },
      sport: { accent: "#B96D77", soft: "rgba(145, 78, 88, 0.13)", line: "#914E58" }
    },
    choiceColors: ["#4F8CFF", "#00BFA6", "#F2A93B", "#E05D6F", "#A878E8"]
  },
  test1: {
    palette: test1Palette,
    authField: {
      borderWidth: 2,
      borderRadius: radius.sm,
      background: "#101721",
      backgroundFocused: "rgba(20, 27, 37, 0.96)",
      backgroundInvalid: test1Palette.dangerSoft,
      focusBorderColor: test1Palette.primary,
      invalidBorderColor: "rgba(233, 79, 55, 0.72)",
      placeholderColor: "#838F83",
      separatorColor: "rgba(246, 247, 235, 0.18)"
    },
    themeVisuals: {
      politique: { accent: "#3F88C5", soft: "rgba(63, 136, 197, 0.17)", line: "#2F6E9E" },
      economie: { accent: "#E94F37", soft: "rgba(233, 79, 55, 0.15)", line: "#B93F2C" },
      societe: { accent: "#44BBA4", soft: "rgba(68, 187, 164, 0.15)", line: "#2E8F80" },
      // Cream-derived, slightly muted sport accent keeps the tag distinct without leaving the test1 palette family.
      sport: { accent: "#D8D0A3", soft: "rgba(246, 247, 235, 0.11)", line: "#AAA47E" }
    },
    choiceColors: ["#3F88C5", "#44BBA4", "#E94F37", "#78B8EA", "#82DDCE", "#FF9D8F"]
  },
  test2: {
    palette: test2Palette,
    authField: {
      borderWidth: 2,
      borderRadius: radius.sm,
      background: "#101721",
      backgroundFocused: "rgba(20, 27, 37, 0.96)",
      backgroundInvalid: test2Palette.dangerSoft,
      focusBorderColor: test2Palette.primary,
      invalidBorderColor: "rgba(255, 51, 31, 0.72)",
      placeholderColor: "#8F95A5",
      separatorColor: "rgba(251, 251, 255, 0.18)"
    },
    themeVisuals: {
      politique: { accent: "#657ED4", soft: "rgba(101, 126, 212, 0.17)", line: "#5267AE" },
      economie: { accent: "#FF331F", soft: "rgba(255, 51, 31, 0.15)", line: "#C92819" },
      societe: { accent: "#A7C4C2", soft: "rgba(167, 196, 194, 0.15)", line: "#7E9E9B" },
      // Cold-white derived, slightly blue-muted sport accent keeps the tag separate from body text.
      sport: { accent: "#C8D0E5", soft: "rgba(251, 251, 255, 0.11)", line: "#9AA3BF" }
    },
    choiceColors: ["#657ED4", "#A7C4C2", "#FF331F", "#93A6EF", "#FBFBFF", "#FF8A7E"]
  },
  test3: {
    palette: test3Palette,
    authField: {
      borderWidth: 2,
      borderRadius: radius.sm,
      background: "#101721",
      backgroundFocused: "rgba(20, 27, 37, 0.96)",
      backgroundInvalid: test3Palette.dangerSoft,
      focusBorderColor: test3Palette.primary,
      invalidBorderColor: "rgba(244, 0, 0, 0.72)",
      placeholderColor: "#8A8790",
      separatorColor: "rgba(208, 204, 208, 0.2)"
    },
    themeVisuals: {
      politique: { accent: "#1C6E8C", soft: "rgba(28, 110, 140, 0.2)", line: "#165873" },
      economie: { accent: "#F40000", soft: "rgba(244, 0, 0, 0.13)", line: "#B80000" },
      societe: { accent: "#D0CCD0", soft: "rgba(208, 204, 208, 0.12)", line: "#9E9BA3" },
      // Cold-white derived and slightly dimmed so the sport tag stays distinct from primary body text.
      sport: { accent: "#E5E9F2", soft: "rgba(251, 252, 255, 0.1)", line: "#ADB5C4" }
    },
    choiceColors: ["#1C6E8C", "#D0CCD0", "#F40000", "#3A9ABD", "#8FB7BA", "#FF6B63"]
  },
  slateSignal: {
    palette: slateSignalPalette,
    authField: {
      borderWidth: 2,
      borderRadius: radius.sm,
      background: "#101721",
      backgroundFocused: "rgba(19, 34, 53, 0.96)",
      backgroundInvalid: slateSignalPalette.dangerSoft,
      focusBorderColor: slateSignalPalette.primary,
      invalidBorderColor: "rgba(244, 0, 0, 0.72)",
      placeholderColor: "#858E98",
      separatorColor: "rgba(143, 184, 198, 0.2)"
    },
    themeVisuals: {
      politique: { accent: "#2E6F95", soft: "rgba(46, 111, 149, 0.16)", line: "#48A6B8" },
      economie: { accent: "#F40000", soft: "rgba(244, 0, 0, 0.12)", line: "#FF4A3D" },
      societe: { accent: "#48A6B8", soft: "rgba(72, 166, 184, 0.14)", line: "#6BC4D1" },
      // Soft-steel tag uses the Slate Signal extension so it stays distinct from white body text.
      sport: { accent: "#8FB8C6", soft: "rgba(143, 184, 198, 0.16)", line: "#A6CDD8" }
    },
    choiceColors: ["#2E6F95", "#48A6B8", "#F40000", "#8FB8C6", "#D0CCD0"]
  },
  slateSignalV2: {
    palette: slateSignalV2Palette,
    authField: {
      borderWidth: 2,
      borderRadius: radius.sm,
      background: "#101721",
      backgroundFocused: "rgba(19, 34, 53, 0.96)",
      backgroundInvalid: slateSignalV2Palette.dangerSoft,
      focusBorderColor: slateSignalV2Palette.primary,
      invalidBorderColor: "rgba(244, 0, 0, 0.72)",
      placeholderColor: "#858E98",
      separatorColor: "rgba(143, 184, 198, 0.2)"
    },
    themeVisuals: {
      politique: { accent: "#1C6E8C", soft: "rgba(28, 110, 140, 0.16)", line: "#2E6F95" },
      economie: { accent: "#F40000", soft: "rgba(244, 0, 0, 0.12)", line: "#FF4A3D" },
      societe: { accent: "#44BBA4", soft: "rgba(68, 187, 164, 0.14)", line: "#5ED6BF" },
      // Institutional gold is added to break the blue/cyan family and make Sport immediately distinct.
      sport: { accent: "#C49A52", soft: "rgba(196, 154, 82, 0.15)", line: "#E0B86A" }
    },
    choiceColors: ["#1C6E8C", "#44BBA4", "#C49A52", "#F40000", "#7A6FF0"]
  },
  civicContrastSharp: {
    palette: civicContrastSharpPalette,
    authField: {
      borderWidth: 2,
      borderRadius: radius.sm,
      background: "#101721",
      backgroundFocused: "rgba(20, 29, 41, 0.96)",
      backgroundInvalid: civicContrastSharpPalette.dangerSoft,
      focusBorderColor: civicContrastSharpPalette.primary,
      invalidBorderColor: "rgba(244, 0, 0, 0.72)",
      placeholderColor: "#85818A",
      separatorColor: "rgba(208, 204, 208, 0.2)"
    },
    themeVisuals: {
      politique: { accent: "#1C6E8C", soft: "rgba(28, 110, 140, 0.16)", line: "#2E86A6" },
      economie: { accent: "#D49A2A", soft: "rgba(212, 154, 42, 0.15)", line: "#E0AE45" },
      societe: { accent: "#1FA783", soft: "rgba(31, 167, 131, 0.14)", line: "#35BE99" },
      // Violet is reserved for Sport to keep the theme tags sharply distinct without using the danger red.
      sport: { accent: "#6E56CF", soft: "rgba(110, 86, 207, 0.15)", line: "#8A76E3" }
    },
    choiceColors: ["#1C6E8C", "#1FA783", "#D49A2A", "#6E56CF", "#C84A3A"]
  }
} as const satisfies Record<"current" | "test1" | "test2" | "test3" | "slateSignal" | "slateSignalV2" | "civicContrastSharp", ColorScheme>;

const ACTIVE_COLOR_SCHEME: keyof typeof colorSchemes = "civicContrastSharp";

export const palette = colorSchemes[ACTIVE_COLOR_SCHEME].palette;
export const authField = colorSchemes[ACTIVE_COLOR_SCHEME].authField;

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

export const themeVisuals: ThemeVisualConfig = colorSchemes[ACTIVE_COLOR_SCHEME].themeVisuals;

export function getThemeVisual(theme?: ThemeSlug | null) {
  return themeVisuals[theme ?? "societe"];
}

export const choiceColors = colorSchemes[ACTIVE_COLOR_SCHEME].choiceColors;
