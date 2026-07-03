import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { CSP_PROFESSIONS } from "@/lib/product";
import { fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
};

export function ProfessionSelect({ value, onChange, onBlur, error }: Props) {
  const [open, setOpen] = useState(false);

  function select(profession: string) {
    onChange(profession);
    setOpen(false);
    onBlur?.();
  }

  function close() {
    setOpen(false);
    onBlur?.();
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Profession</Text>
      <Pressable accessibilityRole="button" accessibilityHint={error} accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={StyleSheet.flatten([styles.select, error && styles.selectInvalid])}>
        <Text numberOfLines={2} style={StyleSheet.flatten([styles.selectText, !value && styles.placeholder])}>{value || "Sélectionnez un groupe socioprofessionnel"}</Text>
        <ChevronDown size={18} color={palette.primaryStrong} />
      </Pressable>

      {error ? <View style={styles.errorSlot}><Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text></View> : null}

      <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <Pressable style={styles.scrim} onPress={close} />
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Groupe socioprofessionnel</Text>
            <Text style={styles.menuHint}>Classification en 8 groupes de l’INSEE</Text>
            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              {CSP_PROFESSIONS.map((profession) => {
                const active = value === profession;
                return (
                  <Pressable key={profession} onPress={() => select(profession)} style={StyleSheet.flatten([styles.option, active && styles.optionActive])}>
                    <Text style={StyleSheet.flatten([styles.optionText, active && styles.optionTextActive])}>{profession}</Text>
                    {active ? <Check size={16} color={palette.primaryStrong} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7, flex: 1, minWidth: 250 },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  select: { minHeight: 52, borderRadius: radius.sm, borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.26)", backgroundColor: palette.surfaceSubtle, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  selectInvalid: { borderColor: "rgba(227, 93, 106, 0.68)", backgroundColor: "rgba(91, 24, 33, 0.12)" },
  selectText: { color: palette.ink, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 18, flex: 1 },
  placeholder: { color: "#64748B" },
  errorSlot: { justifyContent: "center" },
  error: { color: "#F08A95", fontSize: 11, lineHeight: 15 },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 6, 23, 0.76)" },
  menu: { width: "100%", maxWidth: 560, maxHeight: "82%", borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.lineStrong, padding: 14, gap: 5 },
  menuTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 17, paddingHorizontal: 4 },
  menuHint: { color: palette.muted, fontSize: 12, paddingHorizontal: 4, marginBottom: 6 },
  menuScroll: { maxHeight: 520 },
  option: { minHeight: 48, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 10 },
  optionActive: { backgroundColor: palette.primarySoft },
  optionText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 19, flex: 1 },
  optionTextActive: { color: palette.primaryStrong }
});
