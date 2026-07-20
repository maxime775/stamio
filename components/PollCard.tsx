import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import type { Poll } from "@/lib/types";
import { fontFamilyMedium, fontFamilySemibold, getThemeVisual, palette, radius } from "@/lib/design";

type Props = {
  poll: Poll;
  selectedChoiceId: string | null;
  onSelectChoice: (choiceId: string) => void;
  locked?: boolean;
};

export function PollCard({ poll, selectedChoiceId, onSelectChoice, locked = false }: Props) {
  const theme = getThemeVisual(poll.theme);
  const [hoveredChoiceId, setHoveredChoiceId] = useState<string | null>(null);
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.kicker}>Position</Text>
        <View style={styles.headingRow}><Text style={styles.title}>Votre réponse</Text><Text style={styles.hint}>{locked ? "Participation enregistrée" : "Sélection unique"}</Text></View>
      </View>
      <View style={styles.options}>
        {poll.choices.map((choice, index) => {
          const selected = selectedChoiceId === choice.id;
          const hovered = hoveredChoiceId === choice.id && !selected && !locked;
          return (
            <Pressable
              key={choice.id}
              accessibilityState={{ disabled: locked, selected }}
              disabled={locked}
              onPress={() => onSelectChoice(choice.id)}
              onHoverIn={() => {
                if (!locked) setHoveredChoiceId(choice.id);
              }}
              onHoverOut={() => setHoveredChoiceId(null)}
              style={({ pressed }) =>
                StyleSheet.flatten([
                  styles.option,
                  hovered && styles.optionHovered,
                  selected && styles.optionSelected,
                  locked && !selected && styles.optionLocked,
                  selected && { borderColor: theme.accent, borderLeftColor: theme.accent, backgroundColor: theme.soft },
                  pressed && !locked && styles.optionPressed
                ])
              }
            >
              <View style={StyleSheet.flatten([styles.optionCode, hovered && styles.optionCodeHovered, selected && { borderColor: theme.accent }])}><Text style={StyleSheet.flatten([styles.optionCodeText, hovered && styles.optionCodeTextHovered, selected && { color: theme.accent }])}>{String.fromCharCode(65 + index)}</Text></View>
              <Text style={StyleSheet.flatten([styles.optionText, hovered && styles.optionTextHovered, selected && styles.optionTextSelected, selected && { color: theme.accent }])}>{choice.label}</Text>
              {selected ? <Check size={15} color={theme.accent} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    borderTopWidth: 2,
    borderTopColor: palette.primary,
    gap: 14,
    overflow: "hidden"
  },
  heading: { gap: 5 },
  headingRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 },
  title: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 15 },
  hint: { color: palette.muted, fontSize: 10 },
  options: { gap: 8 },
  option: {
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: palette.lineStrong,
    borderColor: palette.line,
    backgroundColor: palette.surfaceSubtle,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    overflow: "hidden"
  },
  optionSelected: {
    borderColor: palette.primaryStrong,
    backgroundColor: palette.primarySoft
  },
  optionLocked: { opacity: 0.58 },
  optionHovered: { borderColor: "rgba(166, 176, 192, 0.34)", borderLeftColor: "rgba(166, 176, 192, 0.52)", backgroundColor: palette.surfaceRaised },
  optionPressed: { transform: [{ scale: 0.995 }] },
  optionCode: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.lineStrong
  },
  optionCodeText: { color: palette.muted, fontFamily: fontFamilySemibold, fontSize: 10 },
  optionCodeHovered: { borderColor: "rgba(199, 206, 216, 0.42)" },
  optionCodeTextHovered: { color: palette.inkSecondary },
  optionText: { color: palette.inkSecondary, fontSize: 14, fontFamily: fontFamilyMedium, flex: 1 },
  optionTextHovered: { color: palette.ink },
  optionTextSelected: { color: palette.primaryStrong },
});
