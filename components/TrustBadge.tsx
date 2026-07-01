import { StyleSheet, Text, View } from "react-native";
import { BadgeCheck, ChartNoAxesColumnIncreasing, EyeOff, Fingerprint } from "lucide-react-native";

type IconName = "verified" | "results" | "private" | "lock";

type Props = {
  icon: IconName;
  title: string;
  text: string;
};

export function TrustBadge({ icon, title, text }: Props) {
  const Icon = icon === "verified" ? BadgeCheck : icon === "results" ? ChartNoAxesColumnIncreasing : icon === "private" ? EyeOff : Fingerprint;
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Icon size={22} color="#A7F3D0" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    padding: 18,
    gap: 8
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20, 184, 166, 0.12)"
  },
  title: { color: "#F8FAFC", fontWeight: "900", fontSize: 16 },
  text: { color: "#94A3B8", lineHeight: 20, fontSize: 13 }
});
