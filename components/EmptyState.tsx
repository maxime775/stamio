import { useMemo, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamilyBold, fontFamilySemibold, palette, radius } from "@/lib/design";

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: Props) {
  const [active, setActive] = useState(false);
  const fill = useMemo(() => new Animated.Value(0), []);

  function animate(toValue: number) {
    setActive(toValue === 1);
    Animated.timing(fill, {
      toValue,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onHoverIn={() => animate(1)}
          onHoverOut={() => animate(0)}
          onFocus={() => animate(1)}
          onBlur={() => animate(0)}
          onPressIn={() => animate(1)}
          onPressOut={() => animate(0)}
          onPress={onAction}
          style={styles.button}
        >
          <Animated.View
            pointerEvents="none"
            style={StyleSheet.flatten([
              styles.buttonFill,
              { transform: [{ translateY: fill.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }] }
            ])}
          />
          <Text style={StyleSheet.flatten([styles.buttonText, active && styles.buttonTextActive])}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.line,
    paddingVertical: 22,
    gap: 11,
    alignItems: "flex-start",
    backgroundColor: "transparent"
  },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 18, lineHeight: 24 },
  message: { color: palette.muted, fontSize: 14, lineHeight: 22, maxWidth: 620 },
  button: {
    minHeight: 44,
    marginTop: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.primaryStrong,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  buttonFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
    backgroundColor: palette.primaryStrong
  },
  buttonText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 14 },
  buttonTextActive: { color: palette.onPrimary }
});
