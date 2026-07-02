import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { REGIONS_FR } from "@/lib/product";
import { fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function RegionSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  function select(region: string) {
    onChange(region);
    setOpen(false);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Région de résidence</Text>
      <Pressable onPress={() => setOpen(true)} style={styles.select}>
        <Text style={styles.selectText}>{value}</Text>
        <ChevronDown size={18} color={palette.primaryStrong} />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Choisir une région</Text>
            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              {REGIONS_FR.map((region) => {
                const active = value === region;
                return (
                  <Pressable
                    key={region}
                    onPress={() => select(region)}
                    style={StyleSheet.flatten([styles.option, active && styles.optionActive])}
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
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.26)",
    backgroundColor: palette.surfaceSubtle,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
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
  optionActive: { backgroundColor: palette.primarySoft },
  optionText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14 },
  optionTextActive: { color: palette.primaryStrong }
});
