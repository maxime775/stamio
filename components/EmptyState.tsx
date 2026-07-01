import { Pressable, StyleSheet, Text, View } from "react-native";
import { Inbox } from "lucide-react-native";

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.icon}>
        <Inbox size={24} color="#A7F3D0" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    padding: 24,
    gap: 10,
    alignItems: "flex-start"
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20, 184, 166, 0.12)"
  },
  title: { color: "#F8FAFC", fontSize: 20, fontWeight: "900" },
  message: { color: "#94A3B8", fontSize: 15, lineHeight: 22, maxWidth: 620 },
  button: { marginTop: 6, borderRadius: 12, backgroundColor: "#A7F3D0", paddingHorizontal: 16, paddingVertical: 11 },
  buttonText: { color: "#06111C", fontWeight: "900" }
});
