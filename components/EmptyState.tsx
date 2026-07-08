import { Pressable, StyleSheet, Text, View } from "react-native";
import { Inbox } from "lucide-react-native";
import { fontFamilyBold, fontFamilySemibold, palette, radius } from "@/lib/design";

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
        <Inbox size={22} color={palette.primaryStrong} />
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
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    padding: 24,
    gap: 10,
    alignItems: "flex-start"
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primarySoft
  },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 19 },
  message: { color: palette.muted, fontSize: 14, lineHeight: 22, maxWidth: 620 },
  button: { marginTop: 6, borderRadius: radius.sm, backgroundColor: palette.primary, paddingHorizontal: 16, paddingVertical: 11 },
  buttonText: { color: palette.onPrimary, fontFamily: fontFamilySemibold }
});
