import { memo, useEffect, useId, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Mask } from "react-native-svg";
import { choiceColors, fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette } from "@/lib/design";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { Choice, PollResult } from "@/lib/types";

type Props = {
  choices: Choice[];
  results: PollResult[];
};

const SIZE = 112;
const CENTER = SIZE / 2;
const RADIUS = 43;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const ResultsDonutSummary = memo(function ResultsDonutSummary({ choices, results }: Props) {
  const items = useMemo(() => {
    const resultByChoice = new Map(results.map((result) => [result.choice_id, result]));
    return (choices.length > 0 ? choices.map((choice) => ({
      choice_id: choice.id,
      label: choice.label,
      votes: resultByChoice.get(choice.id)?.votes ?? 0
    })) : results).map((item, index) => ({ ...item, color: choiceColors[index % choiceColors.length] }));
  }, [choices, results]);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.votes, 0), [items]);
  const draw = useMemo(() => new Animated.Value(0), []);
  const reveal = useMemo(() => new Animated.Value(0), []);
  const counter = useMemo(() => new Animated.Value(0), []);
  const [counterProgress, setCounterProgress] = useState(0);
  const [drawComplete, setDrawComplete] = useState(false);
  const reducedMotion = useReducedMotion();
  const maskId = `donut-mask-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const listener = counter.addListener(({ value }) => setCounterProgress(value));
    let drawAnimation: Animated.CompositeAnimation | null = null;
    let revealAnimation: Animated.CompositeAnimation | null = null;
    draw.stopAnimation();
    reveal.stopAnimation();
    counter.stopAnimation();
    if (reducedMotion) {
      setDrawComplete(true);
      draw.setValue(1);
      reveal.setValue(1);
      counter.setValue(1);
    } else {
      setDrawComplete(false);
      draw.setValue(0);
      reveal.setValue(0);
      counter.setValue(0);
      drawAnimation = Animated.timing(draw, { toValue: 1, duration: 760, useNativeDriver: false });
      revealAnimation = Animated.parallel([
        Animated.timing(reveal, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(counter, { toValue: 1, duration: 850, useNativeDriver: false })
      ]);
      drawAnimation.start(({ finished }) => {
        if (!finished) return;
        draw.setValue(1);
        setDrawComplete(true);
        revealAnimation?.start();
      });
    }
    return () => {
      drawAnimation?.stop();
      revealAnimation?.stop();
      counter.removeListener(listener);
    };
  }, [counter, draw, reducedMotion, reveal]);

  const segments = useMemo(() => {
    const lastPositiveIndex = items.reduce((last, item, index) => item.votes > 0 ? index : last, -1);
    let accumulatedLength = 0;
    return items.map((item, index) => {
      if (total <= 0 || item.votes <= 0) return { ...item, length: 0, offset: accumulatedLength, fullCircle: false };
      const length = index === lastPositiveIndex
        ? Math.max(0, CIRCUMFERENCE - accumulatedLength)
        : (item.votes / total) * CIRCUMFERENCE;
      const segment = {
        ...item,
        length,
        offset: accumulatedLength,
        fullCircle: item.votes === total
      };
      accumulatedLength += length;
      return segment;
    });
  }, [items, total]);

  return (
    <View accessibilityLabel={`${total} votes. ${items.map((item) => `${item.label} ${Math.round((item.votes / Math.max(total, 1)) * 100)} pour cent`).join(", ")}`} style={styles.card}>
      <View style={styles.content}>
        <View style={styles.donutFrame}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={palette.lineStrong} strokeWidth={10} />
            <Defs>
              <Mask id={maskId} x={0} y={0} width={SIZE} height={SIZE} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                <AnimatedCircle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={12}
                  strokeLinecap="butt"
                  strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [CIRCUMFERENCE, 0] })}
                  transform={`rotate(-90 ${CENTER} ${CENTER})`}
                />
              </Mask>
            </Defs>
            <G mask={drawComplete ? undefined : `url(#${maskId})`}>
              {segments.map((segment) => segment.length > 0 ? <Circle
                key={segment.choice_id}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={10}
                strokeLinecap="butt"
                strokeDasharray={segment.fullCircle ? undefined : `${segment.length} ${CIRCUMFERENCE - segment.length}`}
                strokeDashoffset={segment.fullCircle ? 0 : -segment.offset}
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
              /> : null)}
            </G>
          </Svg>
          <Animated.View pointerEvents="none" style={StyleSheet.flatten([styles.donutCenter, {
            opacity: reveal,
            transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }]
          }])}>
            <Text style={styles.total}>{total}</Text>
            <Text style={styles.totalLabel}>votes</Text>
          </Animated.View>
        </View>
        <Animated.View style={StyleSheet.flatten([styles.legend, {
          opacity: reveal,
          transform: [{ translateX: reveal.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }]
        }])}>
          {items.map((item) => {
            const percentage = total > 0 ? Math.round((item.votes / total) * 100) : 0;
            return <View key={item.choice_id} style={styles.legendRow}>
              <View style={StyleSheet.flatten([styles.swatch, { backgroundColor: item.color }])} />
              <Text numberOfLines={2} style={styles.label}>{item.label}</Text>
              <Text style={styles.percentage}>{Math.round(percentage * counterProgress)}%</Text>
            </View>;
          })}
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { width: 300, maxWidth: "100%", alignSelf: "center", justifyContent: "center" },
  content: { flexDirection: "row", alignItems: "center", gap: 16 },
  donutFrame: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center", position: "relative" },
  donutCenter: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", paddingTop: 1 },
  total: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 22, lineHeight: 24, fontVariant: ["tabular-nums"] },
  totalLabel: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.7 },
  legend: { flex: 1, alignItems: "flex-start", gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%" },
  swatch: { width: 12, height: 2, flexShrink: 0 },
  label: { color: palette.inkSecondary, fontSize: 11, lineHeight: 14, flexShrink: 1 },
  percentage: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 11, lineHeight: 14, flexShrink: 0, fontVariant: ["tabular-nums"] }
});
