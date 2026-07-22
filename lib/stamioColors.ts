import type { ThemeSlug } from "@/lib/types";

export const USE_EXTENDED_CATEGORY_PALETTE = true;

export type ThemeVisual = {
  accent: string;
  soft: string;
  line: string;
};

export type ThemeVisualConfig = Record<ThemeSlug, ThemeVisual>;

export const STAMIO_CORE_COLORS = {
  background: "#080B10",
  text: "#FBFCFF",
  secondary: "#D0CCD0",
  signalRed: "#F40000",
  editorialAmber: "#E0A526"
} as const;

export const STAMIO_GLOBAL_UI_COLORS = {
  petroleumBlue: "#1C6E8C"
} as const;

export const STAMIO_NEUTRAL_COLORS = {
  surface_1: "#0D1219",
  surface_2: "#121A24",
  surface_3: "#182330",
  border: "#2A3848",
  textMuted: "#8C96A6"
} as const;

export const LEGACY_THEME_COLORS = {
  politique: "#1C6E8C",
  economie: "#D49A2A",
  societe: "#1FA783",
  sport: "#6E56CF"
} as const satisfies Record<ThemeSlug, string>;

export const EXTENDED_THEME_COLORS = {
  politique: "#4D7CFE",
  economie: STAMIO_CORE_COLORS.editorialAmber,
  societe: "#00C896",
  sport: "#9B5CFF"
} as const satisfies Record<ThemeSlug, string>;

export const RESERVE_THEME_COLORS = {
  environnement: "#A3E635",
  technologie: "#22D3EE",
  international: "#FF7A45",
  sante: "#F052A4",
  culture: "#FFB4E6",
  science: "#63B8FF",
  education: "#F4D35E",
  justice: "#B58A68"
} as const;

export const LEGACY_THEME_VISUALS = {
  politique: { accent: LEGACY_THEME_COLORS.politique, soft: "rgba(28, 110, 140, 0.16)", line: "#2E86A6" },
  economie: { accent: LEGACY_THEME_COLORS.economie, soft: "rgba(212, 154, 42, 0.15)", line: "#E0AE45" },
  societe: { accent: LEGACY_THEME_COLORS.societe, soft: "rgba(31, 167, 131, 0.14)", line: "#35BE99" },
  sport: { accent: LEGACY_THEME_COLORS.sport, soft: "rgba(110, 86, 207, 0.15)", line: "#8A76E3" }
} as const satisfies ThemeVisualConfig;

export const EXTENDED_THEME_VISUALS = {
  politique: themeVisualFromHex(EXTENDED_THEME_COLORS.politique),
  economie: themeVisualFromHex(EXTENDED_THEME_COLORS.economie),
  societe: themeVisualFromHex(EXTENDED_THEME_COLORS.societe),
  sport: themeVisualFromHex(EXTENDED_THEME_COLORS.sport)
} as const satisfies ThemeVisualConfig;

export const LEGACY_ANSWER_SERIES_COLORS = [
  "#1C6E8C",
  "#1FA783",
  "#D49A2A",
  "#6E56CF",
  "#C84A3A"
] as const;

export const EXTENDED_ANSWER_SERIES_COLORS = [
  "#00B8FF",
  "#FF5C8A",
  STAMIO_CORE_COLORS.text,
  "#B889FF"
] as const;

export const ALL_THEMES_TAB_COLOR = STAMIO_CORE_COLORS.text;

export const activeThemeVisuals: ThemeVisualConfig = USE_EXTENDED_CATEGORY_PALETTE
  ? EXTENDED_THEME_VISUALS
  : LEGACY_THEME_VISUALS;

export const activeAnswerSeriesColors: readonly string[] = USE_EXTENDED_CATEGORY_PALETTE
  ? EXTENDED_ANSWER_SERIES_COLORS
  : LEGACY_ANSWER_SERIES_COLORS;

export function getThemeColor(theme?: ThemeSlug | null) {
  return getThemeVisual(theme).accent;
}

export function getThemeVisual(theme?: ThemeSlug | null): ThemeVisual {
  return activeThemeVisuals[theme ?? "societe"];
}

export function getThemeBackgroundColor(theme?: ThemeSlug | null, opacity = 0.14) {
  return getColorWithOpacity(getThemeColor(theme), opacity);
}

export function getThemeTagStyle(theme?: ThemeSlug | null) {
  const visual = getThemeVisual(theme);
  return {
    color: visual.accent,
    backgroundColor: visual.soft,
    borderColor: visual.accent
  };
}

export function getAnswerColor(indexOrKey: number | string | null | undefined, label?: string | null) {
  if (isNeutralAnswerLabel(label)) return STAMIO_CORE_COLORS.text;
  const index = typeof indexOrKey === "number" ? indexOrKey : answerKeyToIndex(indexOrKey);
  return activeAnswerSeriesColors[index % activeAnswerSeriesColors.length];
}

export function getAnswerBackgroundColor(indexOrKey: number | string | null | undefined, labelOrOpacity?: string | number | null, opacity = 0.14) {
  const label = typeof labelOrOpacity === "string" ? labelOrOpacity : null;
  const resolvedOpacity = typeof labelOrOpacity === "number" ? labelOrOpacity : opacity;
  return getColorWithOpacity(getAnswerColor(indexOrKey, label), resolvedOpacity);
}

export function getColorWithOpacity(hex: string, opacity: number) {
  return hexToRgba(hex, opacity);
}

function answerKeyToIndex(choiceKey: string | null | undefined) {
  if (!choiceKey) return 0;
  const normalized = choiceKey.trim().toLowerCase();
  if (/^[a-z]$/.test(normalized)) return normalized.charCodeAt(0) - 97;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed - 1 : 0;
}

function isNeutralAnswerLabel(label?: string | null) {
  return normalizeAnswerLabel(label) === "ne se prononce pas";
}

function normalizeAnswerLabel(label?: string | null) {
  return (label ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function themeVisualFromHex(hex: string): ThemeVisual {
  return {
    accent: hex,
    soft: hexToRgba(hex, 0.14),
    line: hex
  };
}

function hexToRgba(hex: string, opacity: number) {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(1, Math.max(0, opacity))})`;
}

function assertUnique(values: readonly string[], label: string, errors: string[]) {
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) errors.push(`${label} contains duplicate color ${value}`);
    seen.add(normalized);
  }
}

function validateColorSystem() {
  const errors: string[] = [];
  const themeColors = Object.values(EXTENDED_THEME_COLORS);
  const reserveColors = Object.values(RESERVE_THEME_COLORS);
  assertUnique(themeColors, "EXTENDED_THEME_COLORS", errors);
  assertUnique([...themeColors, ...reserveColors], "theme and reserve colors", errors);
  if (themeColors.some((color) => color.toLowerCase() === STAMIO_CORE_COLORS.signalRed.toLowerCase())) {
    errors.push("signalRed is assigned to a theme");
  }
  const blockedAnswerColors = new Set([
    ...themeColors,
    ...reserveColors,
    STAMIO_CORE_COLORS.signalRed,
    STAMIO_CORE_COLORS.background,
    STAMIO_CORE_COLORS.text,
    STAMIO_CORE_COLORS.secondary,
    STAMIO_GLOBAL_UI_COLORS.petroleumBlue
  ].map((color) => color.toLowerCase()));
  assertUnique(EXTENDED_ANSWER_SERIES_COLORS, "EXTENDED_ANSWER_SERIES_COLORS", errors);
  for (const color of EXTENDED_ANSWER_SERIES_COLORS) {
    const normalizedColor = color.toLowerCase();
    const allowedNeutralAnswerColor = STAMIO_CORE_COLORS.text.toLowerCase();
    if (blockedAnswerColors.has(normalizedColor) && normalizedColor !== allowedNeutralAnswerColor) {
      errors.push(`answer color ${color} duplicates a theme, reserve, core, signal, or global UI color`);
    }
  }
  if (ALL_THEMES_TAB_COLOR.toLowerCase() === EXTENDED_THEME_COLORS.politique.toLowerCase()) {
    errors.push("Tous tab color duplicates Politique");
  }
  if (errors.length > 0) {
    console.warn(`[stamio-colors] ${errors.join("; ")}`);
  }
}

const isDevRuntime = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";
if (isDevRuntime) validateColorSystem();
