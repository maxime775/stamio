import { lazy, Suspense, useMemo, useRef, useState, type ComponentType } from "react";
import { ActivityIndicator, Animated, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ArrowRight, Layers3 } from "@/lib/icons";
import { ModalCloseButton } from "@/components/ModalCloseButton";
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
import { decisionTreePreviewByPollId, type DecisionTreePreviewDefinition } from "@/lib/decisionTrees";
import { useReducedMotion } from "@/lib/useReducedMotion";

type DecisionTreeModalProps = { visible: boolean; treeId: string; onClose: () => void };
type DecisionTreePreviewProps = { pollId: string; embedded?: boolean; borderless?: boolean };

const LazyDecisionTreeModal = lazy<ComponentType<DecisionTreeModalProps>>(async () => ({
  default: require("@/components/decision-tree/DecisionTreeModal").default as ComponentType<DecisionTreeModalProps>
}));

export function DecisionTreePreview({ pollId, embedded = false, borderless = false }: DecisionTreePreviewProps) {
  const definition = decisionTreePreviewByPollId[pollId];
  const [visible, setVisible] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const compact = useWindowDimensions().width < 620;
  const reducedMotion = useReducedMotion();
  const lift = useMemo(() => new Animated.Value(0), []);
  const triggerRef = useRef<View>(null);

  if (!definition) return null;

  function setEmphasis(next: boolean) {
    setHighlighted(next);
    lift.stopAnimation();
    Animated.timing(lift, {
      toValue: next ? 1 : 0,
      duration: reducedMotion ? 0 : 190,
      useNativeDriver: true
    }).start();
  }

  function closeModal() {
    setVisible(false);
    setTimeout(() => {
      const trigger = triggerRef.current as unknown as { focus?: () => void } | null;
      trigger?.focus?.();
    }, 0);
  }

  return (
    <View style={StyleSheet.flatten([styles.section, embedded && styles.sectionEmbedded])}>
      <Animated.View
        style={StyleSheet.flatten([
          styles.animatedCard,
          {
            transform: [
              { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }
            ]
          }
        ])}
      >
        <Pressable
          ref={triggerRef}
          accessibilityRole="button"
          accessibilityLabel={`${definition.title}. Voir l’arbre de décision`}
          accessibilityHint="Ouvre l’arbre juridique complet dans une fenêtre superposée"
          aria-haspopup="dialog"
          onFocus={() => setEmphasis(true)}
          onBlur={() => setEmphasis(false)}
          onHoverIn={() => setEmphasis(true)}
          onHoverOut={() => setEmphasis(false)}
          onPress={() => setVisible(true)}
          style={({ pressed }) =>
            StyleSheet.flatten([
              styles.card,
              compact && styles.cardCompact,
              highlighted && styles.cardHighlighted,
              borderless && styles.cardBorderless,
              pressed && styles.cardPressed
            ])
          }
        >
          <View style={StyleSheet.flatten([styles.copy, compact && styles.copyCompact])}>
            <View style={styles.eyebrowRow}>
              <Layers3 size={14} color={POLITICS_COLOR} strokeWidth={1.8} />
              <Text style={styles.eyebrow}>{definition.eyebrow}</Text>
            </View>
            <Text style={styles.title}>{definition.title}</Text>
            <Text style={styles.description}>{definition.previewDescription}</Text>
            <View style={styles.ctaRow}>
              <Text style={StyleSheet.flatten([styles.cta, highlighted && styles.ctaHighlighted])}>
                Voir l’arbre de décision
              </Text>
              <ArrowRight
                size={15}
                color={highlighted ? STAMIO_CORE_COLORS.editorialAmber : palette.inkSecondary}
                strokeWidth={1.8}
              />
            </View>
          </View>
          <MiniTree compact={compact} highlighted={highlighted} />
        </Pressable>
      </Animated.View>

      {visible ? (
        <Suspense fallback={<DecisionTreeLoadingModal definition={definition} onClose={closeModal} />}>
          <LazyDecisionTreeModal visible treeId={definition.id} onClose={closeModal} />
        </Suspense>
      ) : null}
    </View>
  );
}

function MiniTree({ compact, highlighted }: { compact: boolean; highlighted: boolean }) {
  const branchPositions = compact ? (["5%", "27%", "49%", "71%"] as const) : ([26, 83, 140, 197] as const);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={StyleSheet.flatten([styles.miniature, compact && styles.miniatureCompact, highlighted && styles.miniatureHighlighted])}
    >
      <View style={styles.miniAmbient} />
      <View style={StyleSheet.flatten([styles.miniRoot, compact && styles.miniRootCompact])} />
      <View style={StyleSheet.flatten([styles.miniStem, compact && styles.miniStemCompact])} />
      <View style={StyleSheet.flatten([styles.miniBus, compact && styles.miniBusCompact])} />
      {branchPositions.map((left, index) => (
        <View key={String(left)} style={StyleSheet.flatten([styles.miniBranch, compact && styles.miniBranchCompact, { left }])}>
          <View style={StyleSheet.flatten([styles.miniBranchLine, compact && styles.miniBranchLineCompact])} />
          <View style={StyleSheet.flatten([styles.miniNode, index === 0 && styles.miniNodePositive, index === 3 && styles.miniNodeDanger])} />
          <View style={StyleSheet.flatten([styles.miniChildLine, compact && styles.miniChildLineCompact])} />
          <View style={styles.miniLeaves}>
            <View style={StyleSheet.flatten([styles.miniLeaf, index === 0 && styles.miniLeafPositive])} />
            {index > 0 ? <View style={StyleSheet.flatten([styles.miniLeaf, index === 3 && styles.miniLeafAmber])} /> : null}
            {index === 3 ? <View style={styles.miniLeaf} /> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function DecisionTreeLoadingModal({ definition, onClose }: { definition: DecisionTreePreviewDefinition; onClose: () => void }) {
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingPanel}>
          <ModalCloseButton accessibilityLabel="Fermer l’arbre de décision" onPress={onClose} />
          <ActivityIndicator accessibilityLabel="Chargement de l’arbre de décision" color={POLITICS_COLOR} />
          <Text style={styles.loadingTitle}>{definition.title}</Text>
        </View>
      </View>
    </Modal>
  );
}

const POLITICS_COLOR = getThemeColor("politique");

const styles = StyleSheet.create({
  section: { width: "100%", marginTop: 14 },
  sectionEmbedded: { marginTop: 2 },
  animatedCard: { width: "100%" },
  card: {
    width: "100%",
    minHeight: 214,
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderColor: palette.lineStrong,
    borderRadius: radius.panel,
    backgroundColor: palette.surface,
    overflow: "hidden",
    shadowColor: palette.canvas,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  cardHighlighted: {
    borderColor: getColorWithOpacity(POLITICS_COLOR, 0.62),
    shadowOpacity: 0.3,
    shadowRadius: 18
  },
  cardBorderless: {
    borderWidth: 0,
    backgroundColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0
  },
  cardCompact: { minHeight: 0, flexDirection: "column" },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  copy: { flex: 1, minWidth: 0, paddingVertical: 24, paddingLeft: 24, paddingRight: 18, justifyContent: "center", gap: 10 },
  copyCompact: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", paddingVertical: 20, paddingHorizontal: 20 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: { color: POLITICS_COLOR, fontFamily: fontFamilySemibold, fontSize: 9, lineHeight: 13, letterSpacing: 1.15 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 20, lineHeight: 25, maxWidth: 560 },
  description: { color: palette.inkSecondary, fontSize: 13, lineHeight: 20, maxWidth: 620 },
  ctaRow: { marginTop: 3, flexDirection: "row", alignItems: "center", gap: 8 },
  cta: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 12, lineHeight: 18 },
  ctaHighlighted: { color: STAMIO_CORE_COLORS.editorialAmber },
  miniature: {
    position: "relative",
    width: "34%",
    minWidth: 280,
    maxWidth: 380,
    minHeight: 214,
    borderLeftWidth: 1,
    borderLeftColor: palette.line,
    backgroundColor: palette.surfaceSubtle,
    opacity: 0.82
  },
  miniatureHighlighted: { opacity: 1 },
  miniatureCompact: { width: "100%", minWidth: 0, maxWidth: "100%", minHeight: 136, borderLeftWidth: 0, borderTopWidth: 1, borderTopColor: palette.line },
  miniAmbient: { position: "absolute", top: 25, right: 16, width: 150, height: 150, borderRadius: 75, backgroundColor: getColorWithOpacity(POLITICS_COLOR, 0.06) },
  miniRoot: { position: "absolute", top: 31, left: 96, width: 58, height: 22, borderRadius: radius.xs, borderWidth: 1, borderColor: getColorWithOpacity(POLITICS_COLOR, 0.76), backgroundColor: getColorWithOpacity(POLITICS_COLOR, 0.16) },
  miniRootCompact: { top: 14, left: "50%", transform: [{ translateX: -29 }] },
  miniStem: { position: "absolute", top: 53, left: 124, width: 1, height: 28, backgroundColor: getColorWithOpacity(POLITICS_COLOR, 0.54) },
  miniStemCompact: { top: 36, left: "50%", height: 21 },
  miniBus: { position: "absolute", top: 80, left: 50, width: 148, height: 1, backgroundColor: getColorWithOpacity(POLITICS_COLOR, 0.48) },
  miniBusCompact: { top: 56, left: "12%", width: "76%" },
  miniBranch: { position: "absolute", top: 80, width: 54, alignItems: "center" },
  miniBranchCompact: { top: 56 },
  miniBranchLine: { width: 1, height: 23, backgroundColor: getColorWithOpacity(POLITICS_COLOR, 0.44) },
  miniBranchLineCompact: { height: 15 },
  miniNode: { width: 44, height: 25, borderRadius: radius.xs, borderWidth: 1, borderColor: getColorWithOpacity(POLITICS_COLOR, 0.46), backgroundColor: palette.surfaceRaised },
  miniNodePositive: { borderColor: getColorWithOpacity(palette.positive, 0.55) },
  miniNodeDanger: { borderColor: getColorWithOpacity(STAMIO_CORE_COLORS.signalRed, 0.55) },
  miniChildLine: { width: 1, height: 18, backgroundColor: palette.lineStrong },
  miniChildLineCompact: { height: 11 },
  miniLeaves: { height: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  miniLeaf: { width: 7, height: 7, borderRadius: 4, backgroundColor: POLITICS_COLOR },
  miniLeafPositive: { backgroundColor: palette.positive },
  miniLeafAmber: { backgroundColor: STAMIO_CORE_COLORS.editorialAmber },
  loadingOverlay: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center", backgroundColor: getColorWithOpacity(STAMIO_CORE_COLORS.background, 0.9) },
  loadingPanel: { width: "95%", maxWidth: 540, minHeight: 220, alignItems: "center", justifyContent: "center", gap: 16, borderWidth: 1, borderColor: palette.lineStrong, borderRadius: radius.panel, backgroundColor: palette.surface, padding: 32 },
  loadingTitle: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 21, textAlign: "center" }
});
