import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import type { Poll } from "@/lib/types";
import { fontFamilyMedium, fontFamilySemibold, getThemeVisual, palette, radius } from "@/lib/design";

type Props = {
  poll: Poll;
  selectedChoiceId: string | null;
  onSelectChoice: (choiceId: string) => void;
};

export function PollCard({ poll, selectedChoiceId, onSelectChoice }: Props) {
  const theme = getThemeVisual(poll.theme);
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.kicker}>Position</Text>
        <View style={styles.headingRow}><Text style={styles.title}>Votre réponse</Text><Text style={styles.hint}>Sélection unique</Text></View>
      </View>
      <View style={styles.options}>
        {poll.choices.map((choice, index) => {
          const selected = selectedChoiceId === choice.id;
          return (
            <Pressable
              key={choice.id}
              onPress={() => onSelectChoice(choice.id)}
              style={({ pressed }) =>
                StyleSheet.flatten([
                  styles.option,
                  selected && styles.optionSelected,
                  selected && { borderColor: theme.accent, borderLeftColor: theme.accent, backgroundColor: theme.soft },
                  pressed && styles.optionPressed
                ])
              }
            >
              <View style={StyleSheet.flatten([styles.optionCode, selected && { borderColor: theme.accent }])}><Text style={StyleSheet.flatten([styles.optionCodeText, selected && { color: theme.accent }])}>{String.fromCharCode(65 + index)}</Text></View>
              <Text style={StyleSheet.flatten([styles.optionText, selected && styles.optionTextSelected, selected && { color: theme.accent }])}>{choice.label}</Text>
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
  optionText: { color: palette.inkSecondary, fontSize: 14, fontFamily: fontFamilyMedium, flex: 1 },
  optionTextSelected: { color: palette.primaryStrong },
});
