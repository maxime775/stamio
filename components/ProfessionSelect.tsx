import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { CSP_PROFESSIONS } from "@/lib/product";
import { authField, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
};

export function ProfessionSelect({ value, onChange, onBlur, error }: Props) {
  const [open, setOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  function select(profession: string) {
    onChange(profession);
    setOpen(false);
    setHoveredOption(null);
    onBlur?.();
  }

  function close() {
    setOpen(false);
    setHoveredOption(null);
    onBlur?.();
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Votre profession</Text>
      <Pressable accessibilityRole="button" accessibilityHint={error} accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={StyleSheet.flatten([styles.select, open && styles.selectFocused, error && styles.selectInvalid])}>
        <Text numberOfLines={1} style={StyleSheet.flatten([styles.selectText, !value && styles.placeholder])}>{value || "Sélectionnez votre profession"}</Text>
        <ChevronDown size={18} color={palette.primaryStrong} />
      </Pressable>

      {error ? <View style={styles.errorSlot}><Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text></View> : null}

      <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <Pressable style={styles.scrim} onPress={close} />
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Votre profession</Text>
            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              {CSP_PROFESSIONS.map((profession) => {
                const active = value === profession;
                return (
                  <Pressable
                    key={profession}
                    onHoverIn={() => setHoveredOption(profession)}
                    onHoverOut={() => setHoveredOption((current) => current === profession ? null : current)}
                    onPress={() => select(profession)}
                    style={StyleSheet.flatten([styles.option, hoveredOption === profession && !active && styles.optionHovered, active && styles.optionActive])}
                  >
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
  wrap: { gap: 6, flex: 1, flexBasis: 0, minWidth: 190 },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  select: { minHeight: 48, borderRadius: authField.borderRadius, borderWidth: authField.borderWidth, borderColor: "transparent", backgroundColor: authField.background, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  selectFocused: { borderColor: authField.focusBorderColor, backgroundColor: authField.backgroundFocused },
  selectInvalid: { borderColor: authField.invalidBorderColor, backgroundColor: authField.backgroundInvalid },
  selectText: { color: palette.ink, fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 20, flex: 1 },
  placeholder: { color: authField.placeholderColor },
  errorSlot: { justifyContent: "center" },
  error: { color: palette.fieldError, fontSize: 11, lineHeight: 15 },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 6, 23, 0.76)" },
  menu: { width: "100%", maxWidth: 520, maxHeight: "82%", borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.lineStrong, padding: 14, gap: 8 },
  menuTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 17, paddingHorizontal: 4 },
  menuScroll: { maxHeight: 520 },
  option: { minHeight: 48, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 10 },
  optionHovered: { backgroundColor: palette.surfaceRaised },
  optionActive: { backgroundColor: palette.primarySoft },
  optionText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 19, flex: 1 },
  optionTextActive: { color: palette.primaryStrong }
});
