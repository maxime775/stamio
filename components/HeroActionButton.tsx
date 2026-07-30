import { useMemo, useState } from "react";
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { fontFamilyMedium, fontFamilySemibold, palette, radius, shadows } from "@/lib/design";

type Props = {
  label: string;
  variant: "primary" | "secondary";
  onPress: () => void;
  onPressIn?: () => void;
  onFocus?: () => void;
  onHoverIn?: () => void;
  loading?: boolean;
  disabled?: boolean;
  disabledOpacity?: number;
  compact?: boolean;
  elevated?: boolean;
  fullWidth?: boolean;
  showArrow?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function HeroActionButton({
  label,
  variant,
  onPress,
  onPressIn,
  onFocus,
  onHoverIn,
  loading = false,
  disabled = false,
  disabledOpacity = 0.68,
  compact = false,
  elevated = true,
  fullWidth = false,
  showArrow = true,
  style
}: Props) {
  const hover = useMemo(() => new Animated.Value(0), []);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const unavailable = disabled || loading;
  const active = hovered || focused;

  function animateHover(toValue: number) {
    setHovered(toValue === 1);
    if (reducedMotion) return;
    Animated.timing(hover, {
      toValue,
      duration: 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }

  return (
    <Animated.View
      style={StyleSheet.flatten([
        styles.hoverFrame,
        fullWidth && styles.fullWidth,
        style,
        focused && focusRingStyle,
        unavailable && { opacity: disabledOpacity },
        {
          transform: [{
            translateY: hover.interpolate({ inputRange: [0, 1], outputRange: [0, -2] })
          }]
        }
      ])}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: unavailable }}
        disabled={unavailable}
        focusable={!unavailable}
        onPress={onPress}
        onPressIn={onPressIn}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        onHoverIn={() => {
          animateHover(1);
          onHoverIn?.();
        }}
        onHoverOut={() => animateHover(0)}
        style={({ pressed }) => StyleSheet.flatten([
          variant === "primary" ? styles.primary : styles.secondary,
          compact && styles.compactButton,
          variant === "primary" && elevated && shadows.panel,
          Platform.OS === "web" && (unavailable ? webDisabledInteractionStyle : webInteractionStyle),
          pressed && variant === "primary" && styles.primaryPressed,
          pressed && variant === "secondary" && styles.secondaryPressed
        ])}
      >
        <Text
          style={StyleSheet.flatten([
            variant === "primary" ? styles.primaryText : styles.secondaryText,
            compact && styles.compactText,
            variant === "secondary" && active && styles.secondaryTextHovered,
            loading && styles.loadingContent
          ])}
        >
          {label}
        </Text>
        {variant === "primary" && showArrow ? (
          <Animated.View
            style={StyleSheet.flatten([
              loading && styles.loadingContent,
              {
                transform: [{
                  translateX: hover.interpolate({ inputRange: [0, 1], outputRange: [0, 3] })
                }]
              }
            ])}
          >
            <ArrowRight size={18} color={palette.onPrimary} />
          </Animated.View>
        ) : null}
        {loading ? (
          <ActivityIndicator
            color={variant === "primary" ? palette.onPrimary : palette.primaryStrong}
            style={styles.loader}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hoverFrame: { borderRadius: radius.sm },
  fullWidth: { width: "100%" },
  primary: {
    minHeight: 48,
    borderRadius: radius.sm,
    backgroundColor: palette.primary,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  primaryPressed: { backgroundColor: palette.primaryPressed },
  primaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold, fontSize: 14 },
  compactButton: { minHeight: 44, paddingHorizontal: 0 },
  compactText: { fontSize: 15 },
  secondary: {
    minHeight: 48,
    borderRadius: radius.sm,
    backgroundColor: "transparent",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.lineStrong
  },
  secondaryPressed: { backgroundColor: "rgba(166, 176, 192, 0.08)" },
  secondaryText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14 },
  secondaryTextHovered: { color: palette.ink },
  loadingContent: { opacity: 0 },
  loader: { position: "absolute" }
});

const focusRingStyle = Platform.OS === "web"
  ? ({
      outlineStyle: "solid",
      outlineWidth: 2,
      outlineColor: palette.primaryStrong,
      outlineOffset: 3
    } as unknown as ViewStyle)
  : null;

const webInteractionStyle = { cursor: "pointer" } as unknown as ViewStyle;
const webDisabledInteractionStyle = { cursor: "default" } as unknown as ViewStyle;
