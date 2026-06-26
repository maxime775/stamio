import { StyleSheet, Text, View } from "react-native";
import { Hash, LockKeyhole, ShieldCheck } from "lucide-react-native";

type Props = {
  icon: "lock" | "hash" | "shield";
  label: string;
};

export function SecurityBadge({ icon, label }: Props) {
  const Icon = icon === "lock" ? LockKeyhole : icon === "hash" ? Hash : ShieldCheck;
  return (
    <View style={styles.badge}>
      <Icon size={15} color="#A7F3D0" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(167, 243, 208, 0.2)"
  },
  label: { color: "#DFFCF2", fontSize: 13, fontWeight: "700" }
});
