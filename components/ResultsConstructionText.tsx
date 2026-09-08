import { useEffect, useMemo } from "react";
import { Animated, Easing, StyleSheet, type StyleProp, type TextStyle } from "react-native";
import { fontFamilyMedium, palette } from "@/lib/design";
import { useReducedMotion } from "@/lib/useReducedMotion";

export function ResultsConstructionText({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  const progress = useMemo(() => new Animated.Value(0), []);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    progress.setValue(0);
    if (reducedMotion) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false, isInteraction: false }),
      Animated.timing(progress, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false, isInteraction: false })
    ]));
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion]);

  return <Animated.Text style={StyleSheet.flatten([styles.text, style, {
    // Same token as MarkdownContent's paragraph in the Enjeux section.
    color: reducedMotion ? palette.inkSecondary : progress.interpolate({
      inputRange: [0, 1], outputRange: [palette.inkSecondary, "rgb(251, 252, 255)"]
    })
  }])}>{children}</Animated.Text>;
}

const styles = StyleSheet.create({
  text: { fontFamily: fontFamilyMedium, fontSize: 12, lineHeight: 16, textAlign: "center" }
});
