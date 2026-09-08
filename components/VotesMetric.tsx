import { memo, useEffect, useId, useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Mask } from "react-native-svg";
import { ResultsConstructionText } from "@/components/ResultsConstructionText";
import { formatAggregatedVotes, getAggregatedVotesLabel, type ThemeVoteTotal } from "@/lib/aggregatedVotes";
import { fontFamilyBold, fontFamilyMedium, getThemeColor, palette } from "@/lib/design";
import { canShowPublicResults } from "@/lib/publicResults";
import { useReducedMotion } from "@/lib/useReducedMotion";

const SIZE = 108;
const RADIUS = 48;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  value: number;
  accent?: string;
  animationKey?: string;
  themeVotes?: readonly ThemeVoteTotal[];
  hideExactValueBelowPublicThreshold?: boolean;
};

export const VotesMetric = memo(function VotesMetric({
  value,
  accent = palette.primaryStrong,
  animationKey,
  themeVotes,
  hideExactValueBelowPublicThreshold = false
}: Props) {
  const draw = useMemo(() => new Animated.Value(0), []);
  const content = useMemo(() => new Animated.Value(0), []);
  const reducedMotion = useReducedMotion();
  const formattedValue = formatAggregatedVotes(value);
  const label = getAggregatedVotesLabel(value);
  const showExactValue = !hideExactValueBelowPublicThreshold || canShowPublicResults(value);
  const maskId = `votes-metric-mask-${useId().replace(/:/g, "")}`;
  const segments = useMemo(() => {
    if (!themeVotes) return [];
    const positiveItems = themeVotes.filter((item) => item.votes > 0);
    const segmentTotal = positiveItems.reduce((sum, item) => sum + item.votes, 0);
    let accumulatedLength = 0;
    return positiveItems.map((item, index) => {
      const length = index === positiveItems.length - 1
        ? Math.max(0, CIRCUMFERENCE - accumulatedLength)
        : item.votes / segmentTotal * CIRCUMFERENCE;
      const segment = { ...item, color: getThemeColor(item.theme), length, offset: accumulatedLength };
      accumulatedLength += length;
      return segment;
    });
  }, [themeVotes]);

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
    <View accessibilityLabel={showExactValue ? formattedValue : "Votes en cours"} style={styles.wrap}>
      <View style={styles.ring}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={styles.svg}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={palette.lineStrong} strokeWidth={8} />
          {themeVotes ? <>
            <Defs>
              <Mask id={maskId} x={0} y={0} width={SIZE} height={SIZE} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                <AnimatedCircle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [CIRCUMFERENCE, 0] })}
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
              </Mask>
            </Defs>
            <G mask={`url(#${maskId})`}>
              {segments.map((segment) => <Circle
                id={`theme-vote-segment-${segment.theme}`}
                key={segment.theme}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={8}
                strokeLinecap="butt"
                strokeDasharray={`${segment.length} ${CIRCUMFERENCE - segment.length}`}
                strokeDashoffset={-segment.offset}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />)}
            </G>
          </> : <AnimatedCircle
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
          />}
        </Svg>
        {showExactValue ? (
          <Animated.View pointerEvents="none" style={StyleSheet.flatten([styles.content, {
            opacity: content,
            transform: [{ scale: content.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }]
          }])}>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
          </Animated.View>
        ) : (
          <View pointerEvents="none" style={styles.content}>
            <ResultsConstructionText style={styles.construction}>Votes en cours</ResultsConstructionText>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { minWidth: 120, alignItems: "center", justifyContent: "center" },
  ring: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center", position: "relative" },
  svg: { position: "absolute", left: 0, top: 0 },
  content: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  construction: { maxWidth: 64 },
  value: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 25, lineHeight: 28, fontVariant: ["tabular-nums"] },
  label: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 8, lineHeight: 11, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.45, maxWidth: 70 }
});
