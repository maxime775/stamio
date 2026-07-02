import { StyleSheet, Text, View } from "react-native";
import { Hash, LockKeyhole, ShieldCheck } from "lucide-react-native";
import { fontFamilyMedium, palette, radius } from "@/lib/design";

type Props = {
  icon: "lock" | "hash" | "shield";
  label: string;
};

export function SecurityBadge({ icon, label }: Props) {
  const Icon = icon === "lock" ? LockKeyhole : icon === "hash" ? Hash : ShieldCheck;
  return (
    <View style={styles.badge}>
      <Icon size={14} color={palette.primaryStrong} />
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
    borderRadius: radius.sm,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line
  },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 12 }
});
