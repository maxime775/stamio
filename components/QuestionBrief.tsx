import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { CSSProperties } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import { STAMIO_CORE_COLORS, fontFamilySemibold, palette, radius } from "@/lib/design";

type Props = {
  summary: string;
  editorial: string;
  compact: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

const EDITORIAL_AMBER = STAMIO_CORE_COLORS.editorialAmber;

const webHeadingStyle: CSSProperties = {
  backgroundColor: "transparent",
  border: 0,
  boxSizing: "border-box",
  color: palette.ink,
  fontFamily: fontFamilySemibold,
  fontSize: 20,
  fontWeight: "normal",
  lineHeight: "25px",
  listStyle: "none",
  margin: 0,
  padding: 0,
  position: "relative",
  textAlign: "start",
  textDecoration: "none"
};

const webSummaryStyle: CSSProperties = {
  appearance: "none",
  background: palette.surface,
  border: 0,
  boxSizing: "border-box",
  color: palette.primaryStrong,
  cursor: "pointer",
  display: "block",
  fontFamily: fontFamilySemibold,
  fontSize: 13,
  lineHeight: "20px",
  margin: 0,
  padding: "8px 16px",
  textAlign: "left",
  width: "100%"
};

export function QuestionBrief({ summary, editorial, compact, expanded, onExpandedChange }: Props) {
  const renderEditorial = Platform.OS === "web" || expanded;

  return (
    <View nativeID="poll-context" style={StyleSheet.flatten([styles.card, compact && styles.cardCompact])}>
      <View style={styles.briefSection}>
        <View pointerEvents="none" style={StyleSheet.flatten([styles.sectionRail, styles.summaryRail, compact && styles.sectionRailCompact])} />
        <View style={StyleSheet.flatten([styles.summarySection, compact && styles.summarySectionCompact])}>
          <View style={styles.headingRow}>
            {Platform.OS === "web"
              ? <h2 style={webHeadingStyle}>En bref</h2>
              : <Text accessibilityRole="header" style={styles.title}>En bref</Text>}
          </View>
          <Text style={styles.summary}>{summary}</Text>
        </View>
        {Platform.OS === "web" ? (
          <button
            aria-expanded={expanded}
            aria-label={expanded ? "Réduire l’édito" : "Lire l’édito complet"}
            onClick={() => onExpandedChange(!expanded)}
            style={webSummaryStyle}
            type="button"
          >
            {expanded ? "Réduire" : "Lire plus"}
          </button>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={expanded ? "Réduire l’édito" : "Lire l’édito complet"}
            onPress={() => onExpandedChange(!expanded)}
            style={({ pressed }) => StyleSheet.flatten([styles.toggle, pressed && styles.togglePressed])}
          >
            <Text style={styles.toggleText}>{expanded ? "Réduire" : "Lire plus"}</Text>
          </Pressable>
        )}
      </View>
      {renderEditorial ? (
        <View style={StyleSheet.flatten([styles.editorial, compact && styles.editorialCompact, Platform.OS === "web" && !expanded && styles.editorialCollapsed])}>
          <View pointerEvents="none" style={StyleSheet.flatten([styles.sectionRail, styles.editorialRail, compact && styles.sectionRailCompact])} />
          <Text style={styles.editorialKicker}>Enjeux</Text>
          <MarkdownContent value={editorial} compact />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    position: "relative",
    minWidth: 0,
    borderRadius: radius.xs,
    overflow: "hidden"
  },
  cardCompact: { width: "100%" },
  briefSection: { position: "relative", backgroundColor: palette.surface },
  sectionRail: { position: "absolute", left: 0, top: 14, bottom: 14, width: 2, zIndex: 1 },
  sectionRailCompact: { top: 13, bottom: 13 },
  summaryRail: { backgroundColor: EDITORIAL_AMBER },
  editorialRail: { backgroundColor: palette.primaryStrong },
  summarySection: {
    backgroundColor: palette.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 0,
    gap: 9
  },
  summarySectionCompact: { paddingHorizontal: 14, paddingTop: 13, paddingBottom: 0 },
  headingRow: { minHeight: 25, justifyContent: "center" },
  title: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 20, lineHeight: 25 },
  summary: { color: palette.inkSecondary, fontSize: 14, lineHeight: 22 },
  toggle: { width: "100%", minHeight: 36, justifyContent: "center", backgroundColor: palette.surface, paddingHorizontal: 14, paddingVertical: 8 },
  togglePressed: { opacity: 0.7 },
  toggleText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13, lineHeight: 20 },
  editorial: {
    position: "relative",
    backgroundColor: palette.surface,
    marginTop: 3,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8
  },
  editorialCompact: { paddingHorizontal: 14, paddingVertical: 13 },
  editorialCollapsed: { display: "none" },
  editorialKicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, lineHeight: 14, textTransform: "uppercase", letterSpacing: 1 }
});
