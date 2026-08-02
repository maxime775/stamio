import { StyleSheet, Text, View } from "react-native";
import { BadgeCheck, ChartNoAxesColumnIncreasing, EyeOff, Fingerprint } from "@/lib/icons";
import { fontFamilySemibold, palette, radius } from "@/lib/design";

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
        <Icon size={20} color={palette.primaryStrong} />
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
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    padding: 18,
    gap: 8
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primarySoft
  },
  title: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 15 },
  text: { color: palette.muted, lineHeight: 20, fontSize: 13 }
});
