import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { REGIONS_FR } from "@/lib/product";
import { authField, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
};

export function RegionSelect({ value, onChange, onBlur, error }: Props) {
  const [open, setOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  function select(region: string) {
    onChange(region);
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
      <Text style={styles.label}>Région de résidence</Text>
      <Pressable accessibilityRole="button" accessibilityHint={error} accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={StyleSheet.flatten([styles.select, open && styles.selectFocused, error && styles.selectInvalid])}>
        <Text style={styles.selectText}>{value}</Text>
        <ChevronDown size={18} color={palette.primaryStrong} />
      </Pressable>

      {error ? <View style={styles.errorSlot}><Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text></View> : null}

      <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <Pressable style={styles.scrim} onPress={close} />
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Choisir une région</Text>
            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              {REGIONS_FR.map((region) => {
                const active = value === region;
                return (
                  <Pressable
                    key={region}
                    onHoverIn={() => setHoveredOption(region)}
                    onHoverOut={() => setHoveredOption((current) => current === region ? null : current)}
                    onPress={() => select(region)}
                    style={StyleSheet.flatten([styles.option, hoveredOption === region && !active && styles.optionHovered, active && styles.optionActive])}
                  >
                    <Text style={StyleSheet.flatten([styles.optionText, active && styles.optionTextActive])}>{region}</Text>
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
  wrap: { gap: 8 },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  select: {
    minHeight: 48,
    borderRadius: authField.borderRadius,
    borderWidth: authField.borderWidth,
    borderColor: "transparent",
    backgroundColor: authField.background,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  selectFocused: { borderColor: authField.focusBorderColor, backgroundColor: authField.backgroundFocused },
  selectInvalid: { borderColor: authField.invalidBorderColor, backgroundColor: authField.backgroundInvalid },
  errorSlot: { justifyContent: "center" },
  error: { color: palette.fieldError, fontSize: 11, lineHeight: 15 },
  selectText: { color: palette.ink, fontFamily: fontFamilyMedium, fontSize: 15, flex: 1 },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 6, 23, 0.72)" },
  menu: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "78%",
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.24)",
    padding: 14,
    gap: 10
  },
  menuTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 17, paddingHorizontal: 4 },
  menuScroll: { maxHeight: 520 },
  option: {
    minHeight: 44,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    justifyContent: "center"
  },
  optionHovered: { backgroundColor: palette.surfaceRaised },
  optionActive: { backgroundColor: palette.primarySoft },
  optionText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14 },
  optionTextActive: { color: palette.primaryStrong }
});
