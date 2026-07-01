import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Check, Circle } from "lucide-react-native";
import type { Poll } from "@/lib/types";

type Props = {
  poll: Poll;
  selectedChoiceId: string | null;
  onSelectChoice: (choiceId: string) => void;
};

export function PollCard({ poll, selectedChoiceId, onSelectChoice }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.livePill}>Question ouverte</Text>
        <Text style={styles.count}>{poll.choices.length} options</Text>
      </View>
      <Text style={styles.question}>{poll.question}</Text>
      <View style={styles.options}>
        {poll.choices.map((choice) => {
          const selected = selectedChoiceId === choice.id;
          return (
            <Pressable
              key={choice.id}
              onPress={() => onSelectChoice(choice.id)}
              style={({ pressed }) =>
                StyleSheet.flatten([
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.optionPressed
                ])
              }
            >
              <View style={StyleSheet.flatten([styles.radio, selected && styles.radioSelected])}>
                {selected ? <Check size={16} color="#06111C" /> : <Circle size={14} color="#8EA1B8" />}
              </View>
              <Text style={StyleSheet.flatten([styles.optionText, selected && styles.optionTextSelected])}>{choice.label}</Text>
              {selected ? <Animated.View style={styles.glow} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    shadowColor: "#020617",
    shadowOpacity: 0.26,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 22 },
    gap: 20,
    overflow: "hidden"
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  livePill: {
    color: "#A7F3D0",
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden"
  },
  count: { color: "#94A3B8", fontSize: 13, fontWeight: "700" },
  question: { color: "#F8FAFC", fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: 0 },
  options: { gap: 12 },
  option: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    backgroundColor: "rgba(2, 6, 23, 0.42)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    overflow: "hidden"
  },
  optionSelected: {
    borderColor: "#A7F3D0",
    backgroundColor: "rgba(20, 184, 166, 0.12)"
  },
  optionPressed: { transform: [{ scale: 0.992 }] },
  radio: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  radioSelected: {
    backgroundColor: "#A7F3D0",
    borderColor: "#10B981"
  },
  optionText: { color: "#CBD5E1", fontSize: 17, fontWeight: "700", flex: 1 },
  optionTextSelected: { color: "#A7F3D0" },
  glow: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(45, 212, 191, 0.18)"
  }
});
