import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import Svg, { Line } from "react-native-svg";
import { ModalCloseButton } from "@/components/ModalCloseButton";
import {
  DecisionTreeScrollbarStyles,
  decisionTreeHorizontalScrollId,
  decisionTreeVerticalScrollId
} from "@/components/decision-tree/DecisionTreeScrollbarStyles";
import {
  fontFamilyBold,
  fontFamilyMedium,
  fontFamilySemibold,
  getColorWithOpacity,
  getThemeColor,
  palette,
  radius,
  STAMIO_CORE_COLORS
} from "@/lib/design";
import type { DecisionNode, DecisionStatus } from "@/lib/decisionTrees";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { ineligibilityDecisionTree } from "@/components/decision-tree/ineligibilityDecisionTree";

type Props = {
  visible: boolean;
  treeId: string;
  onClose: () => void;
};

const CANVAS_WIDTH = 1240;
const BRANCH_WIDTH = 292;
const BRANCH_GAP = 24;
const BRANCH_CENTERS = [146, 462, 778, 1094];
const MOBILE_BRANCH_WIDTH = 278;
const MOBILE_BRANCH_GAP = 18;
const MOBILE_CANVAS_WIDTH = MOBILE_BRANCH_WIDTH * 4 + MOBILE_BRANCH_GAP * 3;
const MOBILE_BRANCH_CENTERS = [139, 435, 731, 1027];
const MOBILE_BRANCH_LABELS = ["01 Rejet", "02 Partielle", "03 Avec renvoi", "04 Sans renvoi"] as const;
const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export default function DecisionTreeModal({ visible, treeId, onClose }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const tree = treeId === ineligibilityDecisionTree.id ? ineligibilityDecisionTree : null;
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<View>(null);
  const closeRef = useRef<View>(null);
  const horizontalRef = useRef<ScrollView>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [pinnedBranchId, setPinnedBranchId] = useState<string | null>(null);
  const [mobileBranchIndex, setMobileBranchIndex] = useState(0);
  const [showExploreHint, setShowExploreHint] = useState(compact);
  const entrance = useMemo(() => new Animated.Value(reducedMotion ? 1 : 0), []);

  useEffect(() => {
    if (!visible) return;
    entrance.setValue(reducedMotion ? 1 : 0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: reducedMotion ? 0 : 210,
      useNativeDriver: true
    }).start();
  }, [entrance, reducedMotion, visible]);

  useEffect(() => {
    if (!visible || Platform.OS !== "web" || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const target = closeRef.current as unknown as HTMLElement | null;
      target?.focus?.();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current as unknown as HTMLElement | null;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.getAttribute("aria-hidden") !== "true"
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus?.();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.scrollTo(scrollX, scrollY);
    };
  }, [onClose, visible]);

  useEffect(() => {
    if (!visible) return;
    setShowExploreHint(compact);
    setMobileBranchIndex(0);
    setPinnedBranchId(null);
    if (!compact) return;
    const positionTimer = setTimeout(() => {
      horizontalRef.current?.scrollTo({ x: 0, animated: false });
    }, 0);
    const timer = setTimeout(() => setShowExploreHint(false), 3200);
    return () => {
      clearTimeout(positionTimer);
      clearTimeout(timer);
    };
  }, [compact, visible]);

  if (!tree) return null;

  const branches = tree.root.children ?? [];
  const visuallyActiveBranch = activeBranchId ?? pinnedBranchId ?? (compact ? branches[mobileBranchIndex]?.id ?? null : null);

  function handleBranchPress(branchId: string) {
    setPinnedBranchId((current) => (current === branchId ? null : branchId));
    setActiveBranchId(null);
  }

  function dismissExploreHint() {
    if (showExploreHint) setShowExploreHint(false);
  }

  function getMobileBranchOffset(index: number) {
    const centered = MOBILE_BRANCH_CENTERS[index] - width / 2;
    return Math.max(0, Math.min(MOBILE_CANVAS_WIDTH - width, centered));
  }

  function selectMobileBranch(index: number) {
    const branch = branches[index];
    if (!branch) return;
    dismissExploreHint();
    setMobileBranchIndex(index);
    setPinnedBranchId(branch.id);
    horizontalRef.current?.scrollTo({ x: getMobileBranchOffset(index), animated: !reducedMotion });
  }

  function syncMobileBranchFromScroll(offsetX: number) {
    if (!compact) return;
    const viewportCenter = offsetX + width / 2;
    const closestIndex = MOBILE_BRANCH_CENTERS.reduce((closest, center, index) => (
      Math.abs(center - viewportCenter) < Math.abs(MOBILE_BRANCH_CENTERS[closest] - viewportCenter) ? index : closest
    ), 0);
    if (closestIndex === mobileBranchIndex) return;
    setMobileBranchIndex(closestIndex);
    setPinnedBranchId(branches[closestIndex]?.id ?? null);
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType={reducedMotion ? "none" : "fade"}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={StyleSheet.flatten([styles.overlay, compact && styles.overlayCompact])}>
        <Pressable
          accessibilityLabel="Fermer l’arbre de décision"
          accessibilityRole="button"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <Animated.View
          ref={panelRef}
          nativeID="decision-tree-dialog"
          role="dialog"
          aria-modal
          aria-labelledby="decision-tree-title"
          aria-describedby="decision-tree-subtitle"
          style={StyleSheet.flatten([
            styles.panel,
            compact && styles.panelCompact,
            {
              opacity: entrance,
              transform: [
                { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [reducedMotion ? 0 : 10, 0] }) },
                { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [reducedMotion ? 1 : 0.992, 1] }) }
              ]
            }
          ])}
        >
          <DecisionTreeScrollbarStyles />
          <View style={StyleSheet.flatten([styles.header, compact && styles.headerCompact])}>
            <View style={styles.headerCopy}>
              {!compact ? <Text style={styles.eyebrow}>{tree.eyebrow}</Text> : null}
              <Text nativeID="decision-tree-title" numberOfLines={compact ? 2 : undefined} style={StyleSheet.flatten([styles.title, compact && styles.titleCompact])}>
                {tree.title}
              </Text>
              <Text nativeID="decision-tree-subtitle" numberOfLines={compact ? 1 : undefined} style={StyleSheet.flatten([styles.subtitle, compact && styles.subtitleCompact])}>
                {tree.subtitle}
              </Text>
            </View>
            <ModalCloseButton
              ref={closeRef}
              accessibilityLabel="Fermer l’arbre de décision"
              onPress={onClose}
            />
          </View>

          <ScrollView
            nativeID={decisionTreeVerticalScrollId}
            contentContainerStyle={StyleSheet.flatten([styles.verticalContent, compact && styles.verticalContentCompact])}
            showsVerticalScrollIndicator
            stickyHeaderIndices={compact ? [2] : undefined}
          >
            <View style={styles.treeIntroduction}>
              <Text style={styles.treeSectionLabel}>ARBRE COMPLET</Text>
              <Text style={styles.treeInstruction}>Survolez ou sélectionnez une branche pour en suivre le parcours.</Text>
            </View>

            <View style={StyleSheet.flatten([styles.mobileRootSection, !compact && styles.hidden])}>
              <View style={StyleSheet.flatten([styles.rootCard, styles.rootCardCompact])}>
                <Text style={styles.rootLabel}>{tree.root.label}</Text>
                <Text style={styles.rootQuestion}>{tree.root.title}</Text>
              </View>
              <View style={styles.mobileRootStem} />
            </View>

            <View style={StyleSheet.flatten([styles.mobileBranchNavSticky, !compact && styles.hidden])}>
              <View accessibilityRole="tablist" style={styles.mobileBranchNav}>
                {MOBILE_BRANCH_LABELS.map((label, index) => {
                  const selected = index === mobileBranchIndex;
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="tab"
                      accessibilityLabel={`Afficher la branche ${label}`}
                      accessibilityState={{ selected }}
                      onPress={() => selectMobileBranch(index)}
                      style={({ pressed }) => StyleSheet.flatten([
                        styles.mobileBranchNavItem,
                        selected && styles.mobileBranchNavItemActive,
                        pressed && styles.mobileBranchNavItemPressed
                      ])}
                    >
                      <Text numberOfLines={1} style={StyleSheet.flatten([
                        styles.mobileBranchNavLabel,
                        selected && styles.mobileBranchNavLabelActive
                      ])}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.horizontalViewport}>
              <ScrollView
                nativeID={decisionTreeHorizontalScrollId}
                ref={horizontalRef}
                horizontal
                nestedScrollEnabled
                directionalLockEnabled
                showsHorizontalScrollIndicator
                contentContainerStyle={styles.horizontalContent}
                onScrollBeginDrag={dismissExploreHint}
                onScroll={(event) => syncMobileBranchFromScroll(event.nativeEvent.contentOffset.x)}
                scrollEventThrottle={80}
              >
                <View style={StyleSheet.flatten([styles.canvas, compact && styles.canvasCompact])}>
                  {!compact ? (
                    <>
                      <View style={styles.rootCard}>
                        <Text style={styles.rootLabel}>{tree.root.label}</Text>
                        <Text style={styles.rootQuestion}>{tree.root.title}</Text>
                      </View>
                      <RootConnectors activeIndex={branches.findIndex((branch) => branch.id === visuallyActiveBranch)} />
                    </>
                  ) : (
                    <MobileBranchConnectors activeIndex={mobileBranchIndex} />
                  )}

                  <View style={StyleSheet.flatten([styles.branchGrid, compact && styles.branchGridCompact])}>
                    {branches.map((branch, index) => {
                      const isActive = visuallyActiveBranch === branch.id;
                      const isDimmed = Boolean(visuallyActiveBranch && !isActive);
                      return (
                        <Pressable
                          key={branch.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Branche ${index + 1} sur 4 : ${branch.title}`}
                          accessibilityHint="Accentue visuellement cette branche sans masquer les autres informations"
                          accessibilityState={{ selected: pinnedBranchId === branch.id }}
                          onFocus={() => setActiveBranchId(branch.id)}
                          onBlur={() => setActiveBranchId(null)}
                          onHoverIn={() => setActiveBranchId(branch.id)}
                          onHoverOut={() => setActiveBranchId(null)}
                          onPress={() => handleBranchPress(branch.id)}
                          style={({ pressed }) =>
                            StyleSheet.flatten([
                              styles.branch,
                              compact && styles.branchCompact,
                              isActive && styles.branchActive,
                              isDimmed && styles.branchDimmed,
                              pressed && styles.branchPressed
                            ])
                          }
                        >
                          <View style={StyleSheet.flatten([styles.branchTopLine, isActive && styles.branchTopLineActive])} />
                          <Text style={StyleSheet.flatten([styles.branchNumber, isActive && styles.branchNumberActive])}>
                            0{index + 1}
                          </Text>
                          <NodeCard node={branch} main />
                          {branch.children?.length ? (
                            <View style={styles.children}>
                              {branch.children.map((child) => (
                                <NodePath key={child.id} node={child} />
                              ))}
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

            </View>

            <View style={styles.legendBlock}>
              <View style={styles.legendRow}>
                <Text style={styles.legendLead}>Candidature :</Text>
                <LegendItem status="possible" label="POSSIBLE" />
                <LegendItem status="impossible" label="IMPOSSIBLE" />
                <LegendItem status="conditional" label="CONDITIONNEL" />
              </View>
              <Text style={styles.note}>{tree.note}</Text>
            </View>
          </ScrollView>
          {compact && showExploreHint ? (
            <View pointerEvents="none" style={styles.exploreHint}>
              <Text style={styles.exploreHintText}>Faites glisser pour explorer l’arbre</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

function RootConnectors({ activeIndex }: { activeIndex: number }) {
  return (
    <Svg width={CANVAS_WIDTH} height={66} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Line x1={CANVAS_WIDTH / 2} y1="0" x2={CANVAS_WIDTH / 2} y2="28" stroke={CONNECTOR} strokeWidth="1.2" />
      <Line x1={BRANCH_CENTERS[0]} y1="28" x2={BRANCH_CENTERS[3]} y2="28" stroke={CONNECTOR} strokeWidth="1.2" />
      {BRANCH_CENTERS.map((center, index) => (
        <Line
          key={center}
          x1={center}
          y1="28"
          x2={center}
          y2="66"
          stroke={activeIndex === index ? POLITICS_COLOR : CONNECTOR}
          strokeWidth={activeIndex === index ? "2" : "1.2"}
        />
      ))}
    </Svg>
  );
}

function MobileBranchConnectors({ activeIndex }: { activeIndex: number }) {
  return (
    <Svg width={MOBILE_CANVAS_WIDTH} height={42} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Line
        x1={MOBILE_BRANCH_CENTERS[0]}
        y1="1"
        x2={MOBILE_BRANCH_CENTERS[3]}
        y2="1"
        stroke={CONNECTOR}
        strokeWidth="1.2"
      />
      {MOBILE_BRANCH_CENTERS.map((center, index) => (
        <Line
          key={center}
          x1={center}
          y1="1"
          x2={center}
          y2="42"
          stroke={activeIndex === index ? POLITICS_COLOR : CONNECTOR}
          strokeWidth={activeIndex === index ? "2" : "1.2"}
        />
      ))}
    </Svg>
  );
}

function NodePath({ node }: { node: DecisionNode }) {
  return (
    <View style={styles.nodePath}>
      <View style={styles.pathRail} />
      <View style={styles.pathJoin} />
      {node.edgeLabel ? <Text style={styles.edgeLabel}>{node.edgeLabel}</Text> : null}
      <NodeCard node={node} />
      {node.children?.length ? (
        <View style={styles.childrenNested}>
          {node.children.map((child) => (
            <NodePath key={child.id} node={child} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function NodeCard({ node, main = false }: { node: DecisionNode; main?: boolean }) {
  const colors = node.status ? STATUS_COLORS[node.status] : null;
  return (
    <View
      style={StyleSheet.flatten([
        styles.nodeCard,
        main && styles.mainNodeCard,
        node.type === "question" && styles.questionCard,
        colors && { borderColor: colors.line, backgroundColor: colors.soft }
      ])}
    >
      {node.label ? <Text style={StyleSheet.flatten([styles.nodeLabel, node.type === "question" && styles.questionLabel])}>{node.label}</Text> : null}
      <Text style={StyleSheet.flatten([styles.nodeTitle, main && styles.mainNodeTitle, node.type === "question" && styles.questionTitle])}>
        {node.title}
      </Text>
      {node.body ? <Text style={styles.nodeBody}>{node.body}</Text> : null}
      {node.status ? (
        <View style={StyleSheet.flatten([styles.status, { borderColor: colors?.line, backgroundColor: colors?.soft }])}>
          <View style={StyleSheet.flatten([styles.statusDot, { backgroundColor: colors?.accent }])} />
          <Text style={StyleSheet.flatten([styles.statusText, { color: colors?.text }])}>{STATUS_LABELS[node.status]}</Text>
        </View>
      ) : null}
    </View>
  );
}

function LegendItem({ status, label }: { status: DecisionStatus; label: string }) {
  const colors = STATUS_COLORS[status];
  return (
    <View style={styles.legendItem}>
      <View style={StyleSheet.flatten([styles.legendDot, { backgroundColor: colors.accent }])} />
      <Text style={StyleSheet.flatten([styles.legendLabel, { color: colors.text }])}>{label}</Text>
    </View>
  );
}

const POLITICS_COLOR = getThemeColor("politique");
const CONNECTOR = getColorWithOpacity(POLITICS_COLOR, 0.42);

const STATUS_LABELS: Record<DecisionStatus, string> = {
  possible: "CANDIDATURE POSSIBLE",
  impossible: "CANDIDATURE IMPOSSIBLE",
  conditional: "ISSUE CONDITIONNELLE"
};

const STATUS_COLORS: Record<DecisionStatus, { accent: string; text: string; soft: string; line: string }> = {
  possible: {
    accent: palette.positive,
    text: palette.positiveText,
    soft: getColorWithOpacity(palette.positive, 0.08),
    line: getColorWithOpacity(palette.positive, 0.34)
  },
  impossible: {
    accent: STAMIO_CORE_COLORS.signalRed,
    text: palette.dangerText,
    soft: getColorWithOpacity(STAMIO_CORE_COLORS.signalRed, 0.07),
    line: getColorWithOpacity(STAMIO_CORE_COLORS.signalRed, 0.32)
  },
  conditional: {
    accent: STAMIO_CORE_COLORS.editorialAmber,
    text: STAMIO_CORE_COLORS.editorialAmber,
    soft: getColorWithOpacity(STAMIO_CORE_COLORS.editorialAmber, 0.08),
    line: getColorWithOpacity(STAMIO_CORE_COLORS.editorialAmber, 0.34)
  }
};

const styles = StyleSheet.create({
  hidden: { display: "none" },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: getColorWithOpacity(STAMIO_CORE_COLORS.background, 0.9)
  },
  overlayCompact: { padding: 0 },
  panel: {
    width: "95%",
    maxWidth: 1580,
    maxHeight: "93%",
    borderWidth: 1,
    borderColor: palette.lineStrong,
    borderRadius: radius.panel,
    backgroundColor: palette.surface,
    overflow: "hidden",
    shadowColor: palette.canvas,
    shadowOpacity: 0.52,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 22 }
  },
  panelCompact: { width: "100%", height: "100%", maxHeight: "100%", borderWidth: 0, borderRadius: 0 },
  header: {
    minHeight: 104,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingVertical: 18,
    paddingLeft: 28,
    paddingRight: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    backgroundColor: palette.surfaceRaised
  },
  headerCompact: { minHeight: 90, paddingVertical: 10, paddingLeft: 16, paddingRight: 10, gap: 10 },
  headerCopy: { flex: 1, minWidth: 0, gap: 5, paddingRight: 36 },
  eyebrow: { color: POLITICS_COLOR, fontFamily: fontFamilySemibold, fontSize: 9, lineHeight: 12, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 23, lineHeight: 29 },
  titleCompact: { fontSize: 16, lineHeight: 20, paddingRight: 2 },
  subtitle: { color: palette.inkSecondary, fontSize: 12, lineHeight: 18 },
  subtitleCompact: { color: palette.muted, fontSize: 10, lineHeight: 14 },
  verticalContent: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 24 },
  verticalContentCompact: { paddingHorizontal: 0, paddingTop: 11, paddingBottom: 24 },
  treeIntroduction: { paddingHorizontal: 4, marginBottom: 16, gap: 4 },
  treeSectionLabel: { color: POLITICS_COLOR, fontFamily: fontFamilySemibold, fontSize: 9, lineHeight: 13, letterSpacing: 1.15 },
  treeInstruction: { color: palette.muted, fontSize: 11, lineHeight: 17 },
  mobileRootSection: { alignItems: "center", paddingTop: 2, paddingHorizontal: 16 },
  mobileRootStem: { width: 1, height: 18, backgroundColor: CONNECTOR },
  mobileBranchNavSticky: {
    zIndex: 3,
    paddingHorizontal: 8,
    paddingBottom: 7,
    backgroundColor: palette.surface
  },
  mobileBranchNav: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    padding: 4,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceSubtle
  },
  mobileBranchNavItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: radius.xs
  },
  mobileBranchNavItemActive: {
    borderColor: getColorWithOpacity(POLITICS_COLOR, 0.42),
    backgroundColor: getColorWithOpacity(POLITICS_COLOR, 0.12)
  },
  mobileBranchNavItemPressed: { opacity: 0.68 },
  mobileBranchNavLabel: {
    color: palette.muted,
    fontFamily: fontFamilyMedium,
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 0.1
  },
  mobileBranchNavLabelActive: { color: POLITICS_COLOR, fontFamily: fontFamilySemibold },
  horizontalViewport: { position: "relative" },
  horizontalContent: { minWidth: "100%", paddingBottom: 10 },
  canvas: { width: CANVAS_WIDTH, marginHorizontal: "auto", paddingHorizontal: 0 },
  canvasCompact: { width: MOBILE_CANVAS_WIDTH, marginHorizontal: 0 },
  rootCard: {
    width: 430,
    minHeight: 88,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: getColorWithOpacity(POLITICS_COLOR, 0.58),
    borderRadius: radius.md,
    backgroundColor: getColorWithOpacity(POLITICS_COLOR, 0.11)
  },
  rootCardCompact: { width: 330, minHeight: 98, paddingHorizontal: 16 },
  rootLabel: { color: POLITICS_COLOR, fontFamily: fontFamilySemibold, fontSize: 10, lineHeight: 14, letterSpacing: 1.35 },
  rootQuestion: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 17, lineHeight: 23, textAlign: "center" },
  branchGrid: { width: CANVAS_WIDTH, flexDirection: "row", alignItems: "flex-start", gap: BRANCH_GAP },
  branchGridCompact: { width: MOBILE_CANVAS_WIDTH, gap: MOBILE_BRANCH_GAP },
  branch: {
    position: "relative",
    width: BRANCH_WIDTH,
    minHeight: 600,
    paddingTop: 17,
    paddingHorizontal: 10,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceSubtle,
    opacity: 1
  },
  branchCompact: { width: MOBILE_BRANCH_WIDTH, paddingHorizontal: 8 },
  branchActive: { borderColor: getColorWithOpacity(POLITICS_COLOR, 0.54), backgroundColor: getColorWithOpacity(POLITICS_COLOR, 0.055) },
  branchDimmed: { opacity: 0.72 },
  branchPressed: { opacity: 0.84 },
  branchTopLine: { position: "absolute", top: -1, left: 26, right: 26, height: 2, backgroundColor: getColorWithOpacity(POLITICS_COLOR, 0.38) },
  branchTopLineActive: { backgroundColor: POLITICS_COLOR },
  branchNumber: { color: palette.muted, fontFamily: fontFamilySemibold, fontSize: 9, lineHeight: 13, letterSpacing: 1.1, marginBottom: 8 },
  branchNumberActive: { color: POLITICS_COLOR },
  nodeCard: { gap: 7, padding: 13, borderWidth: 1, borderColor: palette.lineStrong, borderRadius: radius.md, backgroundColor: palette.surfaceRaised },
  mainNodeCard: { minHeight: 150, borderColor: getColorWithOpacity(POLITICS_COLOR, 0.4), justifyContent: "center" },
  questionCard: { borderColor: getColorWithOpacity(palette.primaryStrong, 0.42), backgroundColor: palette.primarySoft },
  nodeLabel: { color: palette.muted, fontFamily: fontFamilySemibold, fontSize: 9, lineHeight: 13, letterSpacing: 0.8, textTransform: "uppercase" },
  questionLabel: { color: palette.primaryStrong },
  nodeTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 13, lineHeight: 19 },
  mainNodeTitle: { fontFamily: fontFamilyBold, fontSize: 17, lineHeight: 22 },
  questionTitle: { color: palette.inkSecondary },
  nodeBody: { color: palette.inkSecondary, fontSize: 12, lineHeight: 18 },
  children: { marginTop: 2, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: CONNECTOR },
  childrenNested: { marginTop: 2, marginLeft: 7, paddingLeft: 11, borderLeftWidth: 1, borderLeftColor: CONNECTOR },
  nodePath: { position: "relative", paddingTop: 18 },
  pathRail: { position: "absolute", left: -13, top: 0, width: 1, height: 34, backgroundColor: CONNECTOR },
  pathJoin: { position: "absolute", left: -13, top: 33, width: 13, height: 1, backgroundColor: CONNECTOR },
  edgeLabel: { alignSelf: "flex-start", marginBottom: 6, paddingVertical: 2, paddingHorizontal: 6, borderRadius: radius.xs, color: POLITICS_COLOR, backgroundColor: getColorWithOpacity(POLITICS_COLOR, 0.12), fontFamily: fontFamilySemibold, fontSize: 8, lineHeight: 12, letterSpacing: 0.9 },
  status: { marginTop: 4, minHeight: 26, flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 7, paddingVertical: 5, paddingHorizontal: 8, borderWidth: 1, borderRadius: radius.xs },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: fontFamilyBold, fontSize: 8, lineHeight: 12, letterSpacing: 0.7 },
  exploreHint: { position: "absolute", left: 18, right: 18, bottom: 20, zIndex: 4, alignItems: "center" },
  exploreHintText: { color: palette.ink, fontFamily: fontFamilyMedium, fontSize: 11, lineHeight: 16, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: palette.lineStrong, borderRadius: radius.round, backgroundColor: getColorWithOpacity(palette.surfaceRaised, 0.96) },
  legendBlock: { marginTop: 18, marginHorizontal: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: palette.line, gap: 11 },
  legendRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 13 },
  legendLead: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 11, lineHeight: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendLabel: { fontFamily: fontFamilySemibold, fontSize: 9, lineHeight: 13, letterSpacing: 0.65 },
  note: { color: palette.muted, fontSize: 11, lineHeight: 17, maxWidth: 920 }
});
