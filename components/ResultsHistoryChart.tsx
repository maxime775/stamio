import { memo, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View, type GestureResponderEvent, type ViewProps } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { choiceColors, fontFamily, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";
import type { PollHistoryPoint } from "@/lib/types";

type Props = { history: PollHistoryPoint[]; containerHeight?: number };
type WebMouseEvent = {
  nativeEvent?: { offsetX?: number; offsetY?: number };
  clientX?: number;
  clientY?: number;
  currentTarget?: { getBoundingClientRect?: () => { left: number; top: number } };
};

const CHART_HEIGHT = 190;
const TOOLTIP_ESTIMATED_WIDTH = 180;
const WEB_HIT_DISTANCE = 18;
const TOUCH_HIT_DISTANCE = 30;

export const ResultsHistoryChart = memo(function ResultsHistoryChart({ history, containerHeight }: Props) {
  const [width, setWidth] = useState(720);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const pad = { left: 42, right: 18, top: 18, bottom: 32 };
  const timestamps = useMemo(() => [...new Set(history.map((point) => point.captured_at))].sort(), [history]);
  const series = useMemo(() => {
    const groups = new Map<string, PollHistoryPoint[]>();
    for (const point of history) groups.set(point.choice_id, [...(groups.get(point.choice_id) ?? []), point]);
    return [...groups.values()].map((points) => points.sort((a, b) => a.captured_at.localeCompare(b.captured_at)));
  }, [history]);
  const byTimestamp = useMemo(() => new Map(timestamps.map((timestamp) => [timestamp, history.filter((point) => point.captured_at === timestamp)])), [history, timestamps]);
  const plotWidth = Math.max(1, width - pad.left - pad.right);
  const plotHeight = Math.max(1, CHART_HEIGHT - pad.top - pad.bottom);
  const xForIndex = (index: number) => pad.left + (index / Math.max(1, timestamps.length - 1)) * plotWidth;
  const xFor = (date: string) => xForIndex(Math.max(0, timestamps.indexOf(date)));
  const yFor = (value: number) => pad.top + plotHeight - (Math.min(100, Math.max(0, value)) / 100) * plotHeight;
  const selectedTimestamp = activeIndex === null ? null : timestamps[activeIndex];
  const selectedPoints = selectedTimestamp ? byTimestamp.get(selectedTimestamp) ?? [] : [];
  const activeX = activeIndex === null ? null : xForIndex(activeIndex);
  const xTickIndexes = [...new Set([0, Math.floor((timestamps.length - 1) / 2), timestamps.length - 1])].filter((index) => index >= 0 && index < timestamps.length);

  function selectNear(locationX: number, locationY: number, threshold: number) {
    if (timestamps.length === 0 || locationX < pad.left || locationX > width - pad.right || locationY < pad.top || locationY > CHART_HEIGHT - pad.bottom) {
      setActiveIndex(null);
      return;
    }

    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const points of series) {
      const coordinates = points.map((point) => ({ x: xFor(point.captured_at), y: yFor(point.percentage) }));
      if (coordinates.length === 1) {
        nearestDistance = Math.min(nearestDistance, Math.hypot(locationX - coordinates[0].x, locationY - coordinates[0].y));
        continue;
      }
      for (let index = 1; index < coordinates.length; index += 1) {
        nearestDistance = Math.min(nearestDistance, distanceToSegment(locationX, locationY, coordinates[index - 1], coordinates[index]));
      }
    }

    if (nearestDistance > threshold) {
      setActiveIndex(null);
      return;
    }
    const ratio = Math.min(1, Math.max(0, (locationX - pad.left) / plotWidth));
    setActiveIndex(Math.round(ratio * Math.max(0, timestamps.length - 1)));
  }

  function handleTouch(event: GestureResponderEvent) {
    selectNear(event.nativeEvent.locationX, event.nativeEvent.locationY, TOUCH_HIT_DISTANCE);
  }

  function handleMouseMove(event: WebMouseEvent) {
    const offsetX = event.nativeEvent?.offsetX;
    const offsetY = event.nativeEvent?.offsetY;
    if (typeof offsetX === "number" && typeof offsetY === "number") return selectNear(offsetX, offsetY, WEB_HIT_DISTANCE);
    const bounds = event.currentTarget?.getBoundingClientRect?.();
    if (bounds && typeof event.clientX === "number" && typeof event.clientY === "number") {
      selectNear(event.clientX - bounds.left, event.clientY - bounds.top, WEB_HIT_DISTANCE);
    }
  }

  const webPointerProps = Platform.OS === "web"
    ? ({ onMouseMove: handleMouseMove, onMouseLeave: () => setActiveIndex(null) } as unknown as ViewProps)
    : {};

  return (
    <View style={StyleSheet.flatten([styles.card, containerHeight ? { height: containerHeight } : null])} onLayout={(event) => {
      const nextWidth = Math.max(240, event.nativeEvent.layout.width - 8);
      setWidth((current) => current === nextWidth ? current : nextWidth);
    }}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.kicker}>Évolution du vote</Text>
          <Text style={styles.title}>Résultats dans le temps</Text>
        </View>
        <Text style={styles.hint}>{Platform.OS === "web" ? "Survolez la courbe" : "Touchez la courbe"}</Text>
      </View>
      <View style={styles.chartBlock}>
        <View style={styles.chartShell}>
          <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${width} ${CHART_HEIGHT}`}>
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = yFor(tick);
              return <Line key={tick} x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="rgba(148,163,184,0.13)" strokeWidth={1} />;
            })}
            {[0, 50, 100].map((tick) => <SvgText key={tick} x={4} y={yFor(tick) + 4} fill="#718096" fontFamily={fontFamily} fontSize={11}>{tick}%</SvgText>)}
            {xTickIndexes.map((index) => <SvgText key={timestamps[index]} x={xForIndex(index)} y={CHART_HEIGHT - 9} textAnchor={index === 0 ? "start" : index === timestamps.length - 1 ? "end" : "middle"} fill={palette.muted} fontFamily={fontFamily} fontSize={10}>{new Date(timestamps[index]).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</SvgText>)}
            {series.map((points, index) => {
              const color = choiceColors[index % choiceColors.length];
              const path = points.map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"}${xFor(point.captured_at)},${yFor(point.percentage)}`).join(" ");
              return <Path key={points[0]?.choice_id} d={path} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />;
            })}
            {activeX !== null ? <Line x1={activeX} x2={activeX} y1={pad.top} y2={CHART_HEIGHT - pad.bottom} stroke="rgba(220,229,255,0.48)" strokeWidth={1} strokeDasharray="4 5" /> : null}
            {selectedPoints.map((point) => {
              const seriesIndex = series.findIndex((points) => points[0]?.choice_id === point.choice_id);
              return <Circle key={point.choice_id} cx={activeX ?? 0} cy={yFor(point.percentage)} r={3.5} fill={choiceColors[Math.max(0, seriesIndex) % choiceColors.length]} stroke={palette.surface} strokeWidth={1.5} />;
            })}
          </Svg>
          {history.length === 0 ? <View pointerEvents="none" style={styles.emptyOverlay}><Text style={styles.emptyText}>L'historique apparaitra apres les premiers votes.</Text></View> : null}
          <View
            {...webPointerProps}
            onTouchStart={handleTouch}
            onTouchMove={handleTouch}
            style={styles.pointerLayer}
          />
          {selectedTimestamp && activeX !== null ? (
            <View pointerEvents="none" style={StyleSheet.flatten([styles.tooltip, {
              left: Math.min(
                Math.max(activeX < width / 2 ? activeX + 14 : activeX - TOOLTIP_ESTIMATED_WIDTH - 14, 8),
                Math.max(8, width - TOOLTIP_ESTIMATED_WIDTH - 8)
              )
            }])}>
              <Text style={styles.tooltipDate}>{new Date(selectedTimestamp).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
              <View style={styles.tooltipRule} />
              {selectedPoints.map((point) => {
                const seriesIndex = series.findIndex((points) => points[0]?.choice_id === point.choice_id);
                return (
                  <View key={point.choice_id} style={styles.tooltipRow}>
                    <View style={StyleSheet.flatten([styles.tooltipDot, { backgroundColor: choiceColors[Math.max(0, seriesIndex) % choiceColors.length] }])} />
                    <Text numberOfLines={1} style={styles.tooltipLabel}>{point.label}</Text>
                    <Text style={styles.tooltipValue}>{Math.round(point.percentage)}%</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
        <View style={styles.legend}>
          {series.map((points, index) => <View key={points[0]?.choice_id} style={styles.legendItem}><View style={StyleSheet.flatten([styles.legendLine, { backgroundColor: choiceColors[index % choiceColors.length] }])} /><Text style={styles.legendText}>{points[0]?.label}</Text></View>)}
        </View>
      </View>
    </View>
  );
});

function distanceToSegment(
  x: number,
  y: number,
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) return Math.hypot(x - start.x, y - start.y);
  const ratio = Math.min(1, Math.max(0, ((x - start.x) * deltaX + (y - start.y) * deltaY) / lengthSquared));
  return Math.hypot(x - (start.x + ratio * deltaX), y - (start.y + ratio * deltaY));
}

const styles = StyleSheet.create({
  card: { width: "100%", boxSizing: "border-box", paddingHorizontal: 4, paddingVertical: 2, gap: 12 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.1 },
  title: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 15, lineHeight: 20, marginTop: 5 },
  hint: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 10, paddingTop: 4 },
  chartBlock: { marginTop: "auto", gap: 0 },
  chartShell: { position: "relative", width: "100%", height: CHART_HEIGHT, overflow: "hidden" },
  pointerLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
  emptyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  emptyText: { color: palette.muted, fontFamily, fontSize: 12, textAlign: "center" },
  tooltip: {
    position: "absolute",
    top: 8,
    maxWidth: 240,
    borderRadius: radius.sm,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: "rgba(11,16,23,0.97)",
    borderWidth: 1,
    borderColor: palette.lineStrong,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 }
  },
  tooltipDate: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 10, textAlign: "center" },
  tooltipRule: { width: 34, height: 1, backgroundColor: palette.lineStrong, alignSelf: "center", marginBottom: 2 },
  tooltipRow: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7 },
  tooltipDot: { width: 5, height: 5, borderRadius: 1 },
  tooltipLabel: { color: palette.inkSecondary, maxWidth: 142, fontSize: 10 },
  tooltipValue: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 11, fontVariant: ["tabular-nums"] },
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", columnGap: 18, rowGap: 8, paddingTop: 0 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  legendLine: { width: 18, height: 2 },
  legendText: { color: palette.inkSecondary, fontFamily, fontSize: 11 }
});
