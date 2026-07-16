import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius, themeVisuals } from "@/lib/design";
import { useReducedMotion } from "@/lib/useReducedMotion";

const SECTION_TITLE = "Notre approche";
const ITEMS = [
  { title: "Participer en confiance", text: "Chaque participation s’inscrit dans un processus de vérification sécurisé. Pour chaque question, un même numéro vérifié ne peut contribuer qu’une seule fois, afin de préserver la qualité du signal recueilli." },
  { title: "Préserver l’anonymat", text: "Les résultats sont présentés sous forme agrégée afin de faire apparaître les tendances, sans jamais dévoiler les participations individuelles." },
  { title: "La réflexion au centre", text: "Les questions peuvent être accompagnées de ressources et d’éléments de contexte pour encourager chacun à s’interroger plus en profondeur sur les enjeux du sujet. Avoir un avis est légitime ; prendre le temps de le confronter, de le nuancer ou de le faire évoluer l’est tout autant." },
  { title: "Suivre l’évolution du signal", text: "Les sujets évoluent, les arguments convainquent ou se renversent, les positions changent. Stamio permet de mettre les avis en perspective et d’observer la manière dont les points de vue se transforment ou se consolident au fil du débat." }
];
const EDITORIAL_AMBER = themeVisuals.economie.accent;
const EDITORIAL_TURQUOISE = palette.primaryStrong;
const STEP_HOVER_COLORS = [EDITORIAL_TURQUOISE, EDITORIAL_AMBER, EDITORIAL_TURQUOISE, EDITORIAL_AMBER] as const;

export const ApproachSection = memo(function ApproachSection() {
  const sectionRef = useRef<View | null>(null);
  const methodRef = useRef<View | null>(null);
  const headingPlayedRef = useRef(false);
  const methodPlayedRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [headingVisible, setHeadingVisible] = useState(Platform.OS !== "web");
  const [methodVisible, setMethodVisible] = useState(Platform.OS !== "web");
  const [typedTitle, setTypedTitle] = useState("");
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const compact = width < 860;
  const subtitleReveal = useMemo(() => new Animated.Value(0), []);
  const railReveal = useMemo(() => new Animated.Value(0), []);
  const reveals = useMemo(() => ITEMS.map(() => new Animated.Value(0)), []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof IntersectionObserver === "undefined" || !sectionRef.current || !methodRef.current) {
      setHeadingVisible(true);
      setMethodVisible(true);
      return undefined;
    }

    const headingObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.12) return;
      setHeadingVisible(true);
      headingObserver.disconnect();
    }, { threshold: [0.08, 0.12, 0.2], rootMargin: "0px 0px -22% 0px" });

    const methodObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.3) return;
      setMethodVisible(true);
      methodObserver.disconnect();
    }, { threshold: [0.22, 0.3, 0.42], rootMargin: "0px 0px -8% 0px" });

    headingObserver.observe(sectionRef.current as unknown as Element);
    methodObserver.observe(methodRef.current as unknown as Element);
    return () => {
      headingObserver.disconnect();
      methodObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!headingVisible) return undefined;
    if (reducedMotion) {
      headingPlayedRef.current = true;
      setTypedTitle(SECTION_TITLE);
      subtitleReveal.setValue(1);
      return undefined;
    }
    if (headingPlayedRef.current) return undefined;
    headingPlayedRef.current = true;

    let titleIndex = 0;
    const typingDelay = setTimeout(() => {
      const typing = setInterval(() => {
        titleIndex += 1;
        setTypedTitle(SECTION_TITLE.slice(0, titleIndex));
        if (titleIndex >= SECTION_TITLE.length) clearInterval(typing);
      }, 44);
      typingTimerRef.current = typing;
    }, 80);

    const subtitleAnimation = Animated.sequence([
      Animated.delay(300),
      Animated.timing(subtitleReveal, {
        toValue: 1,
        duration: 640,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]);
    subtitleAnimation.start();

    return () => {
      clearTimeout(typingDelay);
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      subtitleAnimation.stop();
    };
  }, [headingVisible, reducedMotion, subtitleReveal]);

  useEffect(() => {
    if (!methodVisible || !headingVisible) return undefined;
    if (reducedMotion) {
      methodPlayedRef.current = true;
      railReveal.setValue(1);
      reveals.forEach((value) => value.setValue(1));
      return undefined;
    }
    if (methodPlayedRef.current) return undefined;
    methodPlayedRef.current = true;

    const methodAnimation = Animated.sequence([
      Animated.delay(180),
      Animated.timing(railReveal, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.stagger(170, reveals.map((value) => Animated.timing(value, {
        toValue: 1,
        duration: 760,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })))
    ]);
    methodAnimation.start();
    return () => methodAnimation.stop();
  }, [headingVisible, methodVisible, railReveal, reducedMotion, reveals]);

  return (
    <View ref={sectionRef} style={styles.section}>
      <Animated.View style={StyleSheet.flatten([styles.rail, {
        opacity: railReveal,
        transform: [{ translateY: railReveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
      }])}>
        {ITEMS.map((item, index) => (
          <View key={item.title} style={styles.railItem}>
            <Text style={styles.railNumber}>{String(index + 1).padStart(2, "0")}</Text>
            {!compact && <Text numberOfLines={1} style={styles.railTitle}>{item.title}</Text>}
            {index < ITEMS.length - 1 && <View style={styles.railLine} />}
          </View>
        ))}
      </Animated.View>

      <View style={StyleSheet.flatten([styles.body, compact && styles.bodyCompact])}>
        <View style={StyleSheet.flatten([styles.heading, compact && styles.headingCompact])}>
          <Text style={styles.kicker}>Nos engagements</Text>
          <View accessible accessibilityRole="header" accessibilityLabel={SECTION_TITLE} style={styles.titleFrame}>
            <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.flatten([styles.title, compact && styles.titleCompact, styles.titleMeasure])}>{SECTION_TITLE}</Text>
            <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.flatten([styles.title, compact && styles.titleCompact, styles.typedTitle])}>{typedTitle}</Text>
          </View>
          <Animated.Text style={StyleSheet.flatten([styles.intro, compact && styles.introCompact, {
            opacity: subtitleReveal,
            transform: [{ translateY: subtitleReveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
          }])}>
            Stamio permet à chacun d’exprimer son point de vue dans un cadre vérifié, anonyme et sécurisé.{"\n\n"}
            Chaque question ouvre un espace clair : <Text style={styles.introTurquoise}>comprendre le sujet en consultant des ressources, se faire un avis, puis participer.</Text> Stamio invite chacun à prendre le temps de s’interroger, de confronter les arguments et d’affiner sa position avant de prendre part au débat.{"\n\n"}
            Les réponses sont ensuite présentées sous forme agrégée. Plus la participation augmente, plus le signal recueilli gagne en consistance et plus les nuances du débat se dessinent.{"\n\n"}
            <Text style={styles.introAmber}>Ici, chaque avis compte</Text> et contribue à donner du poids à l’ensemble.
          </Animated.Text>
        </View>

        <View ref={methodRef} style={StyleSheet.flatten([styles.steps, compact && styles.stepsCompact])}>
          <Animated.View style={StyleSheet.flatten([styles.progressLine, {
            opacity: railReveal,
            transform: [{ scaleY: railReveal }]
          }])} />
          {ITEMS.map((item, index) => {
            const hoverAccent = STEP_HOVER_COLORS[index];
            return (
              <Animated.View key={item.title} style={StyleSheet.flatten([styles.stepReveal, {
                opacity: reveals[index],
                transform: [
                  { translateY: reveals[index].interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
                  { translateX: reveals[index].interpolate({ inputRange: [0, 1], outputRange: [compact ? 0 : 14, 0] }) }
                ]
              }])}>
                <View
                  onPointerEnter={() => setHoveredStep(index)}
                  onPointerLeave={() => setHoveredStep((current) => current === index ? null : current)}
                  style={StyleSheet.flatten([
                    styles.stepPanel,
                    index === 0 && styles.stepPanelLead,
                    compact && styles.stepPanelCompact
                  ])}
                >
                  <View style={styles.stepMeta}>
                    <Text style={StyleSheet.flatten([styles.stepNumber, index === 0 && styles.stepNumberLead, hoveredStep === index && { color: hoverAccent }])}>{String(index + 1).padStart(2, "0")}</Text>
                    <View style={styles.stepMarker} />
                  </View>
                  <View style={styles.stepCopy}>
                    <Text style={StyleSheet.flatten([styles.stepTitle, hoveredStep === index && styles.stepTitleActive, hoveredStep === index && { textDecorationColor: hoverAccent }])}>{item.title}</Text>
                    <Text style={styles.stepText}>{item.text}</Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: { borderTopWidth: 1, borderTopColor: palette.lineStrong, paddingTop: 34, gap: 28 },
  rail: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.line,
    paddingVertical: 12,
    gap: 10
  },
  railItem: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  railNumber: { color: palette.primaryStrong, fontFamily: fontFamilyBold, fontSize: 14, letterSpacing: 0 },
  railTitle: { flexShrink: 1, color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 11, letterSpacing: 0 },
  railLine: { height: 1, flex: 1, minWidth: 18, backgroundColor: palette.lineStrong },
  body: { flexDirection: "row", alignItems: "flex-start", gap: 34 },
  bodyCompact: { flexDirection: "column", gap: 26 },
  heading: { flex: 0.95, gap: 12, maxWidth: 650 },
  headingCompact: { width: "100%", maxWidth: 760 },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase" },
  titleFrame: { position: "relative", maxWidth: 620 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 34, lineHeight: 41, letterSpacing: 0 },
  titleCompact: { fontSize: 30, lineHeight: 37 },
  titleMeasure: { opacity: 0 },
  typedTitle: { position: "absolute", left: 0, top: 0, right: 0 },
  intro: { color: palette.inkSecondary, fontSize: 15, lineHeight: 25, maxWidth: 620 },
  introCompact: { maxWidth: 760 },
  introAmber: { color: EDITORIAL_AMBER, fontFamily: fontFamilySemibold },
  introTurquoise: { color: EDITORIAL_TURQUOISE, fontFamily: fontFamilySemibold },
  steps: { flex: 1.15, minWidth: 360, position: "relative", gap: 0, paddingLeft: 18 },
  stepsCompact: { width: "100%", minWidth: 0, paddingLeft: 10 },
  progressLine: {
    position: "absolute",
    left: 3,
    top: 12,
    bottom: 12,
    width: 1,
    backgroundColor: palette.lineStrong
  },
  stepReveal: { borderBottomWidth: 1, borderBottomColor: palette.line },
  stepPanel: {
    flexDirection: "row",
    gap: 20,
    paddingVertical: 22,
    paddingRight: 16,
    paddingLeft: 14,
    borderRadius: radius.md,
    borderLeftWidth: 2,
    borderLeftColor: "transparent",
    cursor: "default"
  },
  stepPanelLead: { paddingTop: 10 },
  stepPanelCompact: { gap: 14, paddingVertical: 20, paddingRight: 8, paddingLeft: 12 },
  stepMeta: { width: 68, alignItems: "flex-start", gap: 10 },
  stepNumber: { color: "rgba(251, 252, 255, 0.34)", fontFamily: fontFamilyBold, fontSize: 34, lineHeight: 38, letterSpacing: 0 },
  stepNumberLead: { color: "rgba(251, 252, 255, 0.42)", fontSize: 44, lineHeight: 47 },
  stepMarker: { width: 30, height: 2, backgroundColor: palette.lineStrong },
  stepCopy: { flex: 1, minWidth: 0, gap: 9 },
  stepTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 18, lineHeight: 23, letterSpacing: 0 },
  stepTitleActive: { color: palette.ink, textDecorationLine: "underline", textDecorationStyle: "solid" },
  stepText: { color: palette.muted, fontSize: 14, lineHeight: 22, letterSpacing: 0 }
});
