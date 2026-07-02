import { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View, type GestureResponderEvent, type ViewProps } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { choiceColors, fontFamily, fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius, shadows } from "@/lib/design";
import type { PollHistoryPoint } from "@/lib/types";

type Props = { history: PollHistoryPoint[] };
type WebMouseEvent = { nativeEvent?: { offsetX?: number }; clientX?: number; currentTarget?: { getBoundingClientRect?: () => { left: number } } };

export function ResultsHistoryChart({ history }: Props) {
  const [width, setWidth] = useState(720);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const height = 238;
  const pad = { left: 42, right: 18, top: 18, bottom: 32 };
  const timestamps = useMemo(() => [...new Set(history.map((point) => point.captured_at))].sort(), [history]);
  const series = useMemo(() => {
    const groups = new Map<string, PollHistoryPoint[]>();
    for (const point of history) groups.set(point.choice_id, [...(groups.get(point.choice_id) ?? []), point]);
    return [...groups.values()].map((points) => points.sort((a, b) => a.captured_at.localeCompare(b.captured_at)));
  }, [history]);
  const byTimestamp = useMemo(() => new Map(timestamps.map((timestamp) => [timestamp, history.filter((point) => point.captured_at === timestamp)])), [history, timestamps]);
  const plotWidth = Math.max(1, width - pad.left - pad.right);
  const plotHeight = height - pad.top - pad.bottom;
  const xForIndex = (index: number) => pad.left + (index / Math.max(1, timestamps.length - 1)) * plotWidth;
  const xFor = (date: string) => xForIndex(Math.max(0, timestamps.indexOf(date)));
  const yFor = (value: number) => pad.top + plotHeight - (Math.min(100, Math.max(0, value)) / 100) * plotHeight;
  const selectedTimestamp = activeIndex === null ? null : timestamps[activeIndex];
  const selectedPoints = selectedTimestamp ? byTimestamp.get(selectedTimestamp) ?? [] : [];
  const activeX = activeIndex === null ? null : xForIndex(activeIndex);
  const xTickIndexes = [...new Set([0, Math.floor((timestamps.length - 1) / 2), timestamps.length - 1])].filter((index) => index >= 0);

  function selectAt(locationX: number) {
    if (timestamps.length === 0) return;
    const ratio = Math.min(1, Math.max(0, (locationX - pad.left) / plotWidth));
    setActiveIndex(Math.round(ratio * Math.max(0, timestamps.length - 1)));
  }

  function handleTouch(event: GestureResponderEvent) {
    selectAt(event.nativeEvent.locationX);
  }

  function handleMouseMove(event: WebMouseEvent) {
    const offset = event.nativeEvent?.offsetX;
    if (typeof offset === "number") return selectAt(offset);
    const left = event.currentTarget?.getBoundingClientRect?.().left ?? 0;
    if (typeof event.clientX === "number") selectAt(event.clientX - left);
  }

  const webPointerProps = Platform.OS === "web"
    ? ({ onMouseMove: handleMouseMove, onMouseLeave: () => setActiveIndex(null) } as unknown as ViewProps)
    : {};

  return (
    <View style={styles.card} onLayout={(event) => setWidth(Math.max(240, event.nativeEvent.layout.width - 40))}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.kicker}>Évolution du vote</Text>
          <Text style={styles.title}>Résultats dans le temps</Text>
        </View>
        <Text style={styles.hint}>{Platform.OS === "web" ? "Survolez la courbe" : "Touchez la courbe"}</Text>
      </View>
      {history.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>L’historique apparaîtra après les premiers votes.</Text></View>
      ) : (
        <View style={styles.chartShell}>
          <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = yFor(tick);
              return <Line key={tick} x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="rgba(148,163,184,0.13)" strokeWidth={1} />;
            })}
            {[0, 50, 100].map((tick) => <SvgText key={tick} x={4} y={yFor(tick) + 4} fill="#718096" fontFamily={fontFamily} fontSize={11}>{tick}%</SvgText>)}
            {xTickIndexes.map((index) => <SvgText key={timestamps[index]} x={xForIndex(index)} y={height - 9} textAnchor={index === 0 ? "start" : index === timestamps.length - 1 ? "end" : "middle"} fill={palette.muted} fontFamily={fontFamily} fontSize={10}>{new Date(timestamps[index]).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</SvgText>)}
            {series.map((points, index) => {
              const color = choiceColors[index % choiceColors.length];
              const path = points.map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"}${xFor(point.captured_at)},${yFor(point.percentage)}`).join(" ");
              return <Path key={points[0]?.choice_id} d={path} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />;
            })}
            {activeX !== null ? <Line x1={activeX} x2={activeX} y1={pad.top} y2={height - pad.bottom} stroke="rgba(220,229,255,0.48)" strokeWidth={1} strokeDasharray="4 5" /> : null}
            {selectedPoints.map((point) => {
              const seriesIndex = series.findIndex((points) => points[0]?.choice_id === point.choice_id);
              return <Circle key={point.choice_id} cx={activeX ?? 0} cy={yFor(point.percentage)} r={3.5} fill={choiceColors[Math.max(0, seriesIndex) % choiceColors.length]} stroke={palette.surface} strokeWidth={1.5} />;
            })}
          </Svg>
          <View
            {...webPointerProps}
            onTouchStart={handleTouch}
            onTouchMove={handleTouch}
            style={styles.pointerLayer}
          />
          {selectedTimestamp && activeX !== null ? (
            <View pointerEvents="none" style={StyleSheet.flatten([styles.tooltip, { left: Math.min(Math.max(activeX - 104, 8), Math.max(8, width - 218)) }])}>
              <Text style={styles.tooltipDate}>{new Date(selectedTimestamp).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
              {selectedPoints.map((point) => {
                const seriesIndex = series.findIndex((points) => points[0]?.choice_id === point.choice_id);
                return <View key={point.choice_id} style={styles.tooltipRow}><View style={StyleSheet.flatten([styles.tooltipDot, { backgroundColor: choiceColors[Math.max(0, seriesIndex) % choiceColors.length] }])} /><Text numberOfLines={1} style={styles.tooltipLabel}>{point.label}</Text><Text style={styles.tooltipValue}>{Math.round(point.percentage)}%</Text></View>;
              })}
            </View>
          ) : null}
        </View>
      )}
      <View style={styles.legend}>
        {series.map((points, index) => <View key={points[0]?.choice_id} style={styles.legendItem}><View style={StyleSheet.flatten([styles.legendLine, { backgroundColor: choiceColors[index % choiceColors.length] }])} /><Text style={styles.legendText}>{points[0]?.label}</Text></View>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", borderRadius: radius.md, padding: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, gap: 14, ...shadows.panel },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.1 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 21, letterSpacing: -0.35, marginTop: 5 },
  hint: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 10, paddingTop: 4 },
  chartShell: { position: "relative", width: "100%", minHeight: 238, overflow: "hidden" },
  pointerLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
  tooltip: { position: "absolute", top: 10, width: 210, borderRadius: radius.sm, padding: 12, backgroundColor: "rgba(11,16,23,0.97)", borderWidth: 1, borderColor: palette.lineStrong, gap: 8, ...shadows.panel },
  tooltipDate: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 11 },
  tooltipRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  tooltipDot: { width: 6, height: 6, borderRadius: 1 }, tooltipLabel: { color: palette.inkSecondary, flex: 1, fontSize: 11 }, tooltipValue: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 12 },
  empty: { minHeight: 180, alignItems: "center", justifyContent: "center" }, emptyText: { color: palette.muted, fontFamily },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 18, paddingTop: 2 }, legendItem: { flexDirection: "row", alignItems: "center", gap: 7 }, legendLine: { width: 18, height: 2 }, legendText: { color: palette.inkSecondary, fontFamily, fontSize: 11 }
});
