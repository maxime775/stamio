import { memo, useEffect, useId, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Mask } from "react-native-svg";
import { getThemeLabel } from "@/lib/product";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { AccountThemeParticipation } from "@/lib/types";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, getThemeColor, palette } from "@/lib/design";

type Props = {
  items: AccountThemeParticipation[];
};

const SIZE = 112;
const CENTER = SIZE / 2;
const RADIUS = 43;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const ThemeParticipationDonut = memo(function ThemeParticipationDonut({ items }: Props) {
  const orderedItems = useMemo(() => items.map((item) => ({
    ...item,
    color: getThemeColor(item.theme),
    label: item.label || getThemeLabel(item.theme)
  })), [items]);
  const total = useMemo(() => orderedItems.reduce((sum, item) => sum + item.count, 0), [orderedItems]);
  const draw = useMemo(() => new Animated.Value(0), []);
  const reveal = useMemo(() => new Animated.Value(0), []);
  const counter = useMemo(() => new Animated.Value(0), []);
  const [counterProgress, setCounterProgress] = useState(0);
  const [drawComplete, setDrawComplete] = useState(false);
  const reducedMotion = useReducedMotion();
  const maskId = `theme-donut-mask-${useId().replace(/:/g, "")}`;

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
    const lastPositiveIndex = orderedItems.reduce((last, item, index) => item.count > 0 ? index : last, -1);
    let accumulatedLength = 0;
    return orderedItems.map((item, index) => {
      if (total <= 0 || item.count <= 0) return { ...item, length: 0, offset: accumulatedLength, fullCircle: false };
      const length = index === lastPositiveIndex
        ? Math.max(0, CIRCUMFERENCE - accumulatedLength)
        : (item.count / total) * CIRCUMFERENCE;
      const segment = {
        ...item,
        length,
        offset: accumulatedLength,
        fullCircle: item.count === total
      };
      accumulatedLength += length;
      return segment;
    });
  }, [orderedItems, total]);

  if (total === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Mes thèmes</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>La répartition apparaîtra après vos premières réponses vérifiées.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Mes thèmes</Text>
      <View accessibilityLabel={`${total} avis. ${orderedItems.map((item) => `${item.label} ${item.percentage} pour cent`).join(", ")}`} style={styles.summary}>
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
                  key={segment.theme}
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
              <Text style={styles.total}>{Math.round(total * counterProgress)}</Text>
              <Text style={styles.totalLabel}>avis</Text>
            </Animated.View>
          </View>
          <Animated.View style={StyleSheet.flatten([styles.legend, {
            opacity: reveal,
            transform: [{ translateX: reveal.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }]
          }])}>
            {orderedItems.map((item) => (
              <View key={item.theme} style={styles.legendRow}>
                <View style={StyleSheet.flatten([styles.swatch, { backgroundColor: item.color }])} />
                <Text numberOfLines={2} style={styles.label}>{item.label}</Text>
                <Text style={styles.percentage}>{Math.round(item.percentage * counterProgress)}%</Text>
              </View>
            ))}
          </Animated.View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { width: "100%", gap: 14 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 20, lineHeight: 26 },
  empty: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.line, paddingVertical: 18, alignItems: "flex-start" },
  emptyText: { color: palette.muted, fontSize: 14, lineHeight: 22, maxWidth: 300 },
  summary: { width: 300, maxWidth: "100%", alignSelf: "flex-start", justifyContent: "center" },
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
