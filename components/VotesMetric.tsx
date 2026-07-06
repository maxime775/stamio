import { useEffect, useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { fontFamilyBold, fontFamilyMedium, palette } from "@/lib/design";
import { useReducedMotion } from "@/lib/useReducedMotion";

const SIZE = 108;
const RADIUS = 48;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function VotesMetric({ value, accent = palette.primaryStrong, animationKey }: { value: number; accent?: string; animationKey?: string }) {
  const draw = useMemo(() => new Animated.Value(0), []);
  const content = useMemo(() => new Animated.Value(0), []);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    draw.stopAnimation();
    content.stopAnimation();
    if (reducedMotion) {
      draw.setValue(1);
      content.setValue(1);
      return;
    }
    draw.setValue(0);
    content.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(draw, { toValue: 1, duration: 720, useNativeDriver: false }),
      Animated.timing(content, { toValue: 1, duration: 220, useNativeDriver: true })
    ]);
    animation.start();
    return () => animation.stop();
  }, [animationKey, content, draw, reducedMotion]);

  return (
    <View accessibilityLabel={`${value} votes agrégés`} style={styles.wrap}>
      <View style={styles.ring}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={styles.svg}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={palette.lineStrong} strokeWidth={8} />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={accent}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [CIRCUMFERENCE, 0] })}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <Animated.View pointerEvents="none" style={StyleSheet.flatten([styles.content, {
          opacity: content,
          transform: [{ scale: content.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }]
        }])}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.label}>votes agrégés</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minWidth: 120, alignItems: "center", justifyContent: "center" },
  ring: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center", position: "relative" },
  svg: { position: "absolute", left: 0, top: 0 },
  content: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  value: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 25, lineHeight: 28, fontVariant: ["tabular-nums"] },
  label: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 8, lineHeight: 11, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.45, maxWidth: 70 }
});
