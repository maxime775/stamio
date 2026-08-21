import { forwardRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { X } from "@/lib/icons";
import { palette, radius } from "@/lib/design";

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
};

export const ModalCloseButton = forwardRef<View, Props>(function ModalCloseButton(
  { onPress, accessibilityLabel = "Fermer" },
  ref
) {
  const [hovered, setHovered] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const active = hovered || focusVisible;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={(event) => {
        if (Platform.OS !== "web") {
          setFocusVisible(true);
          return;
        }
        const target = event.currentTarget as unknown as { matches?: (selector: string) => boolean };
        setFocusVisible(target.matches?.(":focus-visible") ?? true);
      }}
      onBlur={() => setFocusVisible(false)}
      style={StyleSheet.flatten([styles.closeHitArea, closeHitAreaWebReset])}
    >
      {({ pressed }) => (
        <View
          pointerEvents="none"
          style={StyleSheet.flatten([
            styles.closeVisual,
            active && styles.closeVisualActive,
            focusVisible && styles.closeVisualFocused,
            pressed && styles.closeVisualPressed
          ])}
        >
          <X size={16} color={active ? palette.ink : palette.inkSecondary} />
        </View>
      )}
    </Pressable>
  );
});

const closeHitAreaWebReset = Platform.OS === "web"
  ? ({
      boxShadow: "none",
      filter: "none",
      outlineStyle: "none",
      outlineWidth: 0
    } as unknown as ViewStyle)
  : null;

const styles = StyleSheet.create({
  closeHitArea: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0
  },
  closeVisual: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  closeVisualActive: { backgroundColor: "rgba(2, 6, 15, 0.52)" },
  closeVisualFocused: { borderWidth: 1, borderColor: palette.primaryStrong },
  closeVisualPressed: { backgroundColor: "rgba(2, 6, 15, 0.7)", transform: [{ translateY: 1 }] }
});
