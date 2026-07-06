import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { TrustBadge } from "@/components/TrustBadge";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette } from "@/lib/design";
import { useReducedMotion } from "@/lib/useReducedMotion";

const SECTION_TITLE = "Notre approche";
const ITEMS = [
  { icon: "verified" as const, title: "Un numéro vérifié = un vote par question", text: "La validation reste dans le parcours serveur sécurisé." },
  { icon: "results" as const, title: "Résultats en temps réel", text: "Les résultats sont présentés sous forme agrégée, sans donnée sensible." },
  { icon: "private" as const, title: "Aucun numéro affiché publiquement", text: "Les pages publiques ne montrent ni téléphone, ni hash individuel." },
  { icon: "lock" as const, title: "Anti-doublon technique", text: "La base conserve la contrainte anti-double vote par question." }
];

export function ApproachSection() {
  const sectionRef = useRef<View | null>(null);
  const playedRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [visible, setVisible] = useState(Platform.OS !== "web");
  const [typedTitle, setTypedTitle] = useState("");
  const reducedMotion = useReducedMotion();
  const subtitleReveal = useMemo(() => new Animated.Value(0), []);
  const reveals = useMemo(() => ITEMS.map(() => new Animated.Value(0)), []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof IntersectionObserver === "undefined" || !sectionRef.current) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(sectionRef.current as unknown as Element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    if (reducedMotion) {
      playedRef.current = true;
      setTypedTitle(SECTION_TITLE);
      subtitleReveal.setValue(1);
      reveals.forEach((value) => value.setValue(1));
      return undefined;
    }
    if (playedRef.current) return undefined;
    playedRef.current = true;

    let titleIndex = 0;
    const typingDelay = setTimeout(() => {
      const typing = setInterval(() => {
        titleIndex += 1;
        setTypedTitle(SECTION_TITLE.slice(0, titleIndex));
        if (titleIndex >= SECTION_TITLE.length) clearInterval(typing);
      }, 44);
      typingTimerRef.current = typing;
    }, 100);

    const subtitleAnimation = Animated.sequence([
      Animated.delay(360),
      Animated.timing(subtitleReveal, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]);
    const cardsAnimation = Animated.sequence([
      Animated.delay(520),
      Animated.stagger(145, reveals.map((value) => Animated.timing(value, {
        toValue: 1,
        duration: 820,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })))
    ]);
    subtitleAnimation.start();
    cardsAnimation.start();

    return () => {
      clearTimeout(typingDelay);
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      subtitleAnimation.stop();
      cardsAnimation.stop();
    };
  }, [reducedMotion, reveals, subtitleReveal, visible]);

  return (
    <View ref={sectionRef} style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.kicker}>Nos engagements</Text>
        <View accessible accessibilityRole="header" accessibilityLabel={SECTION_TITLE} style={styles.titleFrame}>
          <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.flatten([styles.title, styles.titleMeasure])}>{SECTION_TITLE}</Text>
          <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.flatten([styles.title, styles.typedTitle])}>{typedTitle}</Text>
        </View>
        <Animated.Text style={StyleSheet.flatten([styles.intro, {
          opacity: subtitleReveal,
          transform: [{ translateY: subtitleReveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
        }])}>
          Une participation lisible, vérifiée et respectueuse. Quatre principes structurent la collecte des avis et la présentation publique des résultats.
        </Animated.Text>
      </View>
      <View style={styles.grid}>
        {ITEMS.map((item, index) => (
          <Animated.View key={item.title} style={StyleSheet.flatten([styles.item, {
            opacity: reveals[index],
            transform: [
              { translateY: reveals[index].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
              { scale: reveals[index].interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }
            ]
          }])}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</Text>
              <View style={styles.stepLine} />
            </View>
            <TrustBadge {...item} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderTopWidth: 1, borderTopColor: palette.lineStrong, paddingTop: 34, gap: 24 },
  heading: { gap: 8, maxWidth: 760 },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase" },
  titleFrame: { position: "relative", maxWidth: 620 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 30, lineHeight: 37, letterSpacing: -0.6 },
  titleMeasure: { opacity: 0 },
  typedTitle: { position: "absolute", left: 0, top: 0, right: 0 },
  intro: { color: palette.muted, fontSize: 15, lineHeight: 23, maxWidth: 720 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  item: { flex: 1, flexBasis: 240, minWidth: 220, gap: 9 },
  step: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 2 },
  stepNumber: { color: palette.primaryStrong, fontFamily: fontFamilyMedium, fontSize: 9, letterSpacing: 0.8 },
  stepLine: { height: 1, flex: 1, backgroundColor: palette.lineStrong }
});
