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
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed
              ]}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <Check size={16} color="#06111C" /> : <Circle size={14} color="#8EA1B8" />}
              </View>
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{choice.label}</Text>
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
    backgroundColor: "rgba(248, 250, 252, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.55)",
    shadowColor: "#020617",
    shadowOpacity: 0.26,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 22 },
    gap: 20,
    overflow: "hidden"
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  livePill: {
    color: "#047857",
    backgroundColor: "#D1FAE5",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden"
  },
  count: { color: "#64748B", fontSize: 13, fontWeight: "700" },
  question: { color: "#0F172A", fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: 0 },
  options: { gap: 12 },
  option: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    overflow: "hidden"
  },
  optionSelected: {
    borderColor: "#0F766E",
    backgroundColor: "#ECFDF5"
  },
  optionPressed: { transform: [{ scale: 0.992 }] },
  radio: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  radioSelected: {
    backgroundColor: "#A7F3D0",
    borderColor: "#10B981"
  },
  optionText: { color: "#334155", fontSize: 17, fontWeight: "700", flex: 1 },
  optionTextSelected: { color: "#064E3B" },
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
