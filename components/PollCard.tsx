import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "@/lib/icons";
import type { Poll } from "@/lib/types";
import { STAMIO_CORE_COLORS, fontFamilyMedium, fontFamilySemibold, getAnswerBackgroundColor, getAnswerColor, getColorWithOpacity, palette, radius } from "@/lib/design";

const VOTE_MODULE_ACCENT = STAMIO_CORE_COLORS.editorialAmber;

type Props = {
  poll: Poll;
  selectedChoiceId: string | null;
  onSelectChoice: (choiceId: string) => void;
  locked?: boolean;
  footer?: ReactNode;
};

export function PollCard({ poll, selectedChoiceId, onSelectChoice, locked = false, footer }: Props) {
  const [hoveredChoiceId, setHoveredChoiceId] = useState<string | null>(null);
  return (
    <View style={styles.card}>
      <View style={styles.accentRail} />
      <View style={styles.heading}>
        <View style={styles.headingRow}>
          <Text style={styles.title}>Votre réponse</Text>
          <Text style={styles.kicker}>Réponse unique</Text>
        </View>
        <Text style={styles.hint}>{locked ? "Participation enregistrée" : "Choisissez une réponse, puis validez votre participation."}</Text>
        <View style={styles.headingRule} />
      </View>
      <View style={styles.options}>
        {poll.choices.map((choice, index) => {
          const selected = selectedChoiceId === choice.id;
          const hovered = hoveredChoiceId === choice.id && !selected && !locked;
          const answerColor = getAnswerColor(index, choice.label);
          const answerBorderColor = getColorWithOpacity(answerColor, selected ? 0.72 : 0.52);
          const answerBackgroundColor = getAnswerBackgroundColor(index, choice.label, selected ? 0.16 : 0.12);
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
                  hovered && { borderColor: answerBorderColor, backgroundColor: answerBackgroundColor },
                  selected && styles.optionSelected,
                  selected && { borderColor: answerBorderColor, backgroundColor: answerBackgroundColor },
                  locked && !selected && styles.optionLocked,
                  pressed && !locked && styles.optionPressed
                ])
              }
            >
              <View style={StyleSheet.flatten([styles.optionRail, (hovered || selected) && { backgroundColor: answerColor, opacity: selected ? 1 : 0.72 }])} />
              <View style={StyleSheet.flatten([
                styles.optionCode,
                hovered && styles.optionCodeHovered,
                selected && styles.optionCodeSelected,
                (hovered || selected) && { borderColor: answerBorderColor, backgroundColor: getAnswerBackgroundColor(index, choice.label, selected ? 0.18 : 0.12) }
              ])}><Text style={StyleSheet.flatten([styles.optionCodeText, (hovered || selected) && { color: answerColor }])}>{String.fromCharCode(65 + index)}</Text></View>
              <Text style={StyleSheet.flatten([styles.optionText, hovered && styles.optionTextHovered, selected && styles.optionTextSelected, (hovered || selected) && { color: answerColor }])}>{choice.label}</Text>
              {selected ? <View style={StyleSheet.flatten([styles.selectedMark, { backgroundColor: answerColor }])}><Check size={13} color={palette.canvas} /></View> : null}
            </Pressable>
          );
        })}
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    borderRadius: radius.md,
    padding: 18,
    paddingLeft: 20,
    backgroundColor: "#081019",
    borderWidth: 1,
    borderColor: "rgba(143, 184, 198, 0.24)",
    gap: 17,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 }
  },
  accentRail: { position: "absolute", top: 0, bottom: 0, left: 0, width: 2, backgroundColor: VOTE_MODULE_ACCENT, opacity: 0.82 },
  heading: { gap: 12 },
  headingRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 14 },
  kicker: { color: VOTE_MODULE_ACCENT, fontFamily: fontFamilySemibold, fontSize: 9, lineHeight: 12, textTransform: "uppercase", letterSpacing: 1.1, textAlign: "right", flexShrink: 0, paddingBottom: 3 },
  title: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 20, lineHeight: 25 },
  hint: { color: palette.muted, fontSize: 11, lineHeight: 16 },
  headingRule: { height: 1, backgroundColor: STAMIO_CORE_COLORS.text, opacity: 0.24 },
  options: { gap: 10 },
  option: {
    position: "relative",
    minHeight: 58,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(143, 184, 198, 0.16)",
    backgroundColor: "rgba(13, 23, 34, 0.78)",
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden"
  },
  optionSelected: {},
  optionLocked: { opacity: 0.52 },
  optionHovered: { borderColor: "rgba(143, 184, 198, 0.38)", backgroundColor: "rgba(19, 34, 53, 0.56)" },
  optionPressed: { opacity: 0.86 },
  optionRail: {
    position: "absolute",
    top: 9,
    bottom: 9,
    left: 0,
    width: 3,
    backgroundColor: "rgba(143, 184, 198, 0.18)",
    opacity: 0.6
  },
  optionRailSelected: { opacity: 1 },
  optionCode: {
    width: 27,
    height: 27,
    borderRadius: radius.xs,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(143, 184, 198, 0.24)",
    backgroundColor: "rgba(8, 11, 16, 0.42)"
  },
  optionCodeText: { color: palette.muted, fontFamily: fontFamilySemibold, fontSize: 10 },
  optionCodeHovered: { borderColor: "rgba(199, 206, 216, 0.42)" },
  optionCodeTextHovered: { color: palette.inkSecondary },
  optionCodeSelected: {},
  optionCodeTextSelected: {},
  optionText: { color: palette.inkSecondary, fontSize: 14, lineHeight: 19, fontFamily: fontFamilyMedium, flex: 1 },
  optionTextHovered: { color: palette.ink },
  optionTextSelected: {},
  selectedMark: { width: 24, height: 24, borderRadius: radius.round, alignItems: "center", justifyContent: "center", backgroundColor: VOTE_MODULE_ACCENT },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(143, 184, 198, 0.16)",
    paddingTop: 16,
    alignItems: "center"
  }
});
