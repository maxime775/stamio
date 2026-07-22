import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { PageShell } from "@/components/PageShell";
import { STAMIO_CORE_COLORS, fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";
import { useReducedMotion } from "@/lib/useReducedMotion";

const AMBER = STAMIO_CORE_COLORS.editorialAmber;
const TURQUOISE = palette.primaryStrong;

const ABOUT_ANIMATION = {
  enabled: true,
  legacyDuration: 520,
  duration: 780,
  legacyDistance: 18,
  distance: 30,
  heroDistance: 26,
  heroStagger: 130,
  sectionStagger: 150,
  sectionInnerStagger: 115,
  quickBodyDelay: 120,
  finalDelay: 180,
  ctaDelay: 320,
  lineDuration: 720
} as const;
const ABOUT_SUBPOINT_REVEAL = {
  distanceY: 18,
  distanceX: 6,
  duration: 560,
  stagger: 120,
  threshold: 0.18,
  rootMargin: "0px 0px -22% 0px"
} as const;
const ABOUT_LEGACY_EASING = Easing.out(Easing.cubic);
const ABOUT_MODERN_EASING = Easing.bezier(0.16, 1, 0.3, 1);

const METHOD_POINTS = [
  "ouverte",
  "réactive",
  "transparente"
] as const;

const FUTURE_POINTS = [
  "Comparer les réponses selon différents profils",
  "Mieux comprendre les écarts d’opinion",
  "Identifier les nuances selon les générations",
  "Observer les différences selon les territoires",
  "Lire les résultats par catégories socio-professionnelles"
] as const;

export default function AboutPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const reducedMotion = useReducedMotion();
  const [ctaActive, setCtaActive] = useState(false);
  const ctaProgress = useMemo(() => new Animated.Value(0), []);

  function animateCta(toValue: number) {
    setCtaActive(toValue === 1);
    if (reducedMotion) {
      ctaProgress.setValue(toValue);
      return;
    }
    Animated.timing(ctaProgress, {
      toValue,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }

  return (
    <PageShell>
      <View style={styles.page}>
        <RevealBlock distance={ABOUT_ANIMATION.heroDistance}>
          <View style={StyleSheet.flatten([styles.hero, compact && styles.heroCompact])}>
            <View style={styles.heroCopy}>
              <RevealBlock delay={ABOUT_ANIMATION.heroStagger} distance={18}>
                <Text style={styles.kicker}>À propos de Stamio</Text>
              </RevealBlock>
              <RevealBlock delay={ABOUT_ANIMATION.heroStagger * 2} distance={ABOUT_ANIMATION.heroDistance}>
                <Text style={StyleSheet.flatten([styles.title, compact && styles.titleCompact])}>Qui sommes-nous ?</Text>
              </RevealBlock>
              <RevealBlock delay={ABOUT_ANIMATION.heroStagger * 3} distance={20}>
                <Text style={styles.lede}>Stamio veut proposer une manière plus ouverte, plus lisible et plus exigeante de recueillir les opinions.</Text>
              </RevealBlock>
            </View>
          </View>
        </RevealBlock>

        <View style={StyleSheet.flatten([styles.editorialFlow, compact && styles.editorialFlowCompact])}>
          <EditorialSection
            eyebrow="Un constat"
            title="L’opinion ne tient pas dans un chiffre isolé."
            compact={compact}
            accent="turquoise"
            delay={ABOUT_ANIMATION.sectionStagger}
          >
            <Text style={styles.bodyText}>
              Stamio est né d’un constat simple : l’opinion publique est souvent résumée à <Text style={styles.turquoiseStrong}>quelques chiffres</Text>, alors qu’elle se construit dans <Text style={styles.amberStrong}>la nuance, le contexte et la confrontation des points de vue</Text>.
            </Text>
          </EditorialSection>

          <EditorialSection
            eyebrow="Une autre manière de lire les opinions"
            title="Recueillir sans réduire."
            compact={compact}
            accent="amber"
            delay={ABOUT_ANIMATION.sectionStagger * 2}
            bodyDelay={ABOUT_ANIMATION.quickBodyDelay}
            bodyEager
          >
            <Text style={styles.bodyText}>
              Notre ambition est de proposer une autre manière de recueillir et de lire les opinions : plus ouverte, plus réactive, plus transparente dans son fonctionnement.
            </Text>
            <View style={styles.wordRail}>
              {METHOD_POINTS.map((point) => (
                <Text key={point} style={styles.wordRailItem}>{point}</Text>
              ))}
            </View>
            <Text style={styles.bodyText}>
              La plateforme permet à chacun de répondre à des questions ouvertes dans un cadre de <Text style={styles.turquoiseStrong}>participation vérifiée, anonymisée et sécurisée</Text>. L’objectif n’est pas de réduire une opinion à un clic, mais de créer un espace où chacun peut s’informer, se faire un avis, répondre, puis observer la manière dont les positions collectives se dessinent.
            </Text>
          </EditorialSection>

          <EditorialSection
            eyebrow="Un signal empirique"
            title="Lire ce qui s’exprime, sans prétendre représenter tout le monde."
            compact={compact}
            accent="turquoise"
            delay={ABOUT_ANIMATION.sectionStagger * 2}
          >
            <Text style={styles.bodyText}>
              Dans un premier temps, Stamio fait émerger un <Text style={styles.amberStrong}>signal empirique</Text> à partir des contributions recueillies. Ce signal n’a pas vocation à se présenter comme un sondage représentatif traditionnel. Il vise d’abord à rendre lisible ce qui s’exprime sur la plateforme, à mesure que la communauté participe.
            </Text>
            <Text style={styles.bodyText}>
              Plus la participation augmente, plus ce signal devient riche, robuste et lisible. Il permet de mieux percevoir les tendances, les hésitations, les lignes de fracture et les évolutions possibles du débat.
            </Text>
          </EditorialSection>

          <EditorialSection
            eyebrow="Une lecture plus fine à mesure que la plateforme grandit"
            title="Aller plus loin, toujours en données agrégées."
            compact={compact}
            accent="amber"
            delay={ABOUT_ANIMATION.sectionStagger * 2}
          >
            <Text style={styles.bodyText}>
              À mesure que la plateforme se développe, cette approche pourra permettre d’aller plus loin : comparer les réponses selon différents profils, mieux comprendre les écarts d’opinion, identifier les nuances selon les générations, les territoires ou les catégories socio-professionnelles, toujours à partir de <Text style={styles.turquoiseStrong}>données agrégées</Text> et dans le <Text style={styles.amberStrong}>respect de l’anonymat</Text> des participants.
            </Text>
            <RevealFutureList points={FUTURE_POINTS} />
          </EditorialSection>

          <EditorialSection
            eyebrow="Une conviction"
            title="Un espace pour structurer la lecture des opinions."
            compact={compact}
            accent="turquoise"
            delay={ABOUT_ANIMATION.sectionStagger * 2}
            hideDivider
          >
            <Text style={styles.bodyText}>
              Stamio ne se limite donc pas à poser des questions. La plateforme cherche à créer un espace où l’on peut <Text style={styles.turquoiseStrong}>s’informer, réfléchir, répondre</Text> et comprendre comment les opinions se structurent.
            </Text>
          </EditorialSection>
        </View>

        <RevealBlock delay={ABOUT_ANIMATION.finalDelay} distance={ABOUT_ANIMATION.distance}>
          <View style={StyleSheet.flatten([styles.finalSection, compact && styles.finalSectionCompact])}>
            <Text style={StyleSheet.flatten([styles.finalText, compact && styles.finalTextCompact])}>
              Notre conviction : une opinion gagne en valeur lorsqu’elle peut être exprimée dans un cadre clair, confrontée à d’autres points de vue et lue avec nuance.
            </Text>
            <RevealBlock delay={ABOUT_ANIMATION.ctaDelay} distance={18}>
              <Pressable
                accessibilityRole="link"
                onHoverIn={() => animateCta(1)}
                onHoverOut={() => animateCta(0)}
                onFocus={() => animateCta(1)}
                onBlur={() => animateCta(0)}
                onPressIn={() => animateCta(1)}
                onPressOut={() => animateCta(0)}
                onPress={() => router.push("/themes" as Href)}
                style={({ pressed }) => StyleSheet.flatten([styles.cta, pressed && styles.ctaPressed])}
              >
                <Animated.View
                  pointerEvents="none"
                  style={StyleSheet.flatten([
                    styles.ctaFill,
                    {
                      transform: [{
                        translateY: ctaProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [54, 0]
                        })
                      }]
                    }
                  ])}
                />
                <Text style={StyleSheet.flatten([styles.ctaText, ctaActive && styles.ctaTextActive])}>Découvrir les questions</Text>
              </Pressable>
            </RevealBlock>
          </View>
        </RevealBlock>
      </View>
    </PageShell>
  );
}

function EditorialSection({ eyebrow, title, children, compact, accent, delay = 0, bodyDelay, bodyEager = false, hideDivider = false }: { eyebrow: string; title: string; children: ReactNode; compact: boolean; accent: "amber" | "turquoise"; delay?: number; bodyDelay?: number; bodyEager?: boolean; hideDivider?: boolean }) {
  const accentColor = accent === "amber" ? AMBER : TURQUOISE;
  return (
    <RevealBlock delay={delay}>
      <View style={StyleSheet.flatten([styles.section, hideDivider && styles.sectionWithoutDivider, compact && styles.sectionCompact])}>
        <View style={StyleSheet.flatten([styles.sectionLabel, compact && styles.sectionLabelCompact])}>
          <RevealBlock delay={ABOUT_ANIMATION.sectionInnerStagger} distance={12}>
            <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
          </RevealBlock>
          <RevealLine delay={ABOUT_ANIMATION.sectionInnerStagger * 2} color={accentColor} />
        </View>
        <View style={styles.sectionCopy}>
          <RevealBlock delay={ABOUT_ANIMATION.sectionInnerStagger * 2} distance={18}>
            <Text style={StyleSheet.flatten([styles.sectionTitle, compact && styles.sectionTitleCompact])}>{title}</Text>
          </RevealBlock>
          <RevealBlock delay={bodyDelay ?? ABOUT_ANIMATION.sectionInnerStagger * 3} distance={bodyEager ? 14 : 20} eager={bodyEager}>
            <View style={styles.sectionBody}>{children}</View>
          </RevealBlock>
        </View>
      </View>
    </RevealBlock>
  );
}

function RevealFutureList({ points }: { points: readonly string[] }) {
  const ref = useRef<View | null>(null);
  const reducedMotion = useReducedMotion();
  const progressValues = useMemo(() => points.map(() => new Animated.Value(0)), [points]);

  useEffect(() => {
    if (reducedMotion) {
      progressValues.forEach((progress) => progress.setValue(1));
      return undefined;
    }

    function reveal() {
      Animated.stagger(
        ABOUT_ANIMATION.enabled ? ABOUT_SUBPOINT_REVEAL.stagger : 0,
        progressValues.map((progress) => Animated.timing(progress, {
          toValue: 1,
          duration: ABOUT_ANIMATION.enabled ? ABOUT_SUBPOINT_REVEAL.duration : ABOUT_ANIMATION.legacyDuration,
          easing: ABOUT_ANIMATION.enabled ? ABOUT_MODERN_EASING : ABOUT_LEGACY_EASING,
          useNativeDriver: true
        }))
      ).start();
    }

    if (Platform.OS !== "web" || typeof IntersectionObserver === "undefined" || !ref.current) {
      reveal();
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < ABOUT_SUBPOINT_REVEAL.threshold) return;
      reveal();
      observer.disconnect();
    }, {
      threshold: [ABOUT_SUBPOINT_REVEAL.threshold],
      rootMargin: ABOUT_SUBPOINT_REVEAL.rootMargin
    });
    observer.observe(ref.current as unknown as Element);
    return () => observer.disconnect();
  }, [progressValues, reducedMotion]);

  return (
    <View ref={ref} style={styles.futureList}>
      {points.map((point, index) => {
        const progress = progressValues[index];
        return (
          <Animated.View
            key={point}
            style={StyleSheet.flatten([
              styles.futureRow,
              {
                opacity: progress,
                transform: [
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [ABOUT_SUBPOINT_REVEAL.distanceY, 0] }) },
                  { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [ABOUT_SUBPOINT_REVEAL.distanceX, 0] }) }
                ]
              }
            ])}
          >
            <View style={styles.futureBullet} />
            <Text style={styles.futureText}>{point}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

function RevealLine({ delay, color }: { delay: number; color: string }) {
  const ref = useRef<View | null>(null);
  const reducedMotion = useReducedMotion();
  const progress = useMemo(() => new Animated.Value(0), []);
  const revealDelay = ABOUT_ANIMATION.enabled ? delay : 0;
  const revealDuration = ABOUT_ANIMATION.enabled ? ABOUT_ANIMATION.lineDuration : ABOUT_ANIMATION.legacyDuration;
  const revealEasing = ABOUT_ANIMATION.enabled ? ABOUT_MODERN_EASING : ABOUT_LEGACY_EASING;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return undefined;
    }
    if (Platform.OS !== "web" || typeof IntersectionObserver === "undefined" || !ref.current) {
      Animated.timing(progress, {
        toValue: 1,
        duration: revealDuration,
        delay: revealDelay,
        easing: revealEasing,
        useNativeDriver: true
      }).start();
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.16) return;
      Animated.timing(progress, {
        toValue: 1,
        duration: revealDuration,
        delay: revealDelay,
        easing: revealEasing,
        useNativeDriver: true
      }).start();
      observer.disconnect();
    }, { threshold: [0.12, 0.16, 0.28], rootMargin: "0px 0px -12% 0px" });
    observer.observe(ref.current as unknown as Element);
    return () => observer.disconnect();
  }, [progress, reducedMotion, revealDelay, revealDuration, revealEasing]);

  return (
    <Animated.View
      ref={ref}
      style={StyleSheet.flatten([
        styles.sectionAccent,
        {
          backgroundColor: color,
          opacity: progress,
          transform: [{ scaleX: progress }]
        }
      ])}
    />
  );
}

function RevealBlock({ children, delay = 0, distance, eager = false }: { children: ReactNode; delay?: number; distance?: number; eager?: boolean }) {
  const ref = useRef<View | null>(null);
  const reducedMotion = useReducedMotion();
  const progress = useMemo(() => new Animated.Value(0), []);
  const revealDistance = distance ?? (ABOUT_ANIMATION.enabled ? ABOUT_ANIMATION.distance : ABOUT_ANIMATION.legacyDistance);
  const revealDuration = ABOUT_ANIMATION.enabled ? ABOUT_ANIMATION.duration : ABOUT_ANIMATION.legacyDuration;
  const revealDelay = ABOUT_ANIMATION.enabled ? delay : 0;
  const revealEasing = ABOUT_ANIMATION.enabled ? ABOUT_MODERN_EASING : ABOUT_LEGACY_EASING;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return undefined;
    }
    if (eager || Platform.OS !== "web" || typeof IntersectionObserver === "undefined" || !ref.current) {
      Animated.timing(progress, {
        toValue: 1,
        duration: revealDuration,
        delay: revealDelay,
        easing: revealEasing,
        useNativeDriver: true
      }).start();
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.16) return;
      Animated.timing(progress, {
        toValue: 1,
        duration: revealDuration,
        delay: revealDelay,
        easing: revealEasing,
        useNativeDriver: true
      }).start();
      observer.disconnect();
    }, { threshold: [0.12, 0.16, 0.28], rootMargin: "0px 0px -12% 0px" });
    observer.observe(ref.current as unknown as Element);
    return () => observer.disconnect();
  }, [eager, progress, reducedMotion, revealDelay, revealDuration, revealEasing]);

  return (
    <Animated.View
      ref={ref}
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [revealDistance, 0] }) }]
      }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 30 },
  hero: {
    paddingTop: 2,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: palette.lineStrong
  },
  heroCompact: { paddingTop: 0, paddingBottom: 20 },
  heroCopy: { gap: 10, maxWidth: 860 },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 40, lineHeight: 47, letterSpacing: -1, maxWidth: 820 },
  titleCompact: { fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  lede: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 17, lineHeight: 27, maxWidth: 760 },
  editorialFlow: { gap: 0 },
  editorialFlowCompact: { gap: 4 },
  section: {
    flexDirection: "row",
    gap: 46,
    paddingVertical: 34,
    borderBottomWidth: 1,
    borderBottomColor: palette.line
  },
  sectionWithoutDivider: { borderBottomWidth: 0 },
  sectionCompact: { flexDirection: "column", gap: 16, paddingVertical: 28 },
  sectionLabel: { width: 245, gap: 12, paddingTop: 5 },
  sectionLabelCompact: { width: "100%", paddingTop: 0, gap: 10 },
  sectionAccent: { width: 48, height: 2, borderRadius: radius.round },
  sectionCopy: { flex: 1, minWidth: 0, gap: 12 },
  sectionEyebrow: { color: palette.muted, fontFamily: fontFamilySemibold, fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase", lineHeight: 16 },
  sectionTitle: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 30, lineHeight: 37, letterSpacing: 0, maxWidth: 760 },
  sectionTitleCompact: { fontSize: 24, lineHeight: 30 },
  sectionBody: { gap: 14, maxWidth: 790 },
  bodyText: { color: palette.inkSecondary, fontSize: 16, lineHeight: 27 },
  turquoiseStrong: { color: TURQUOISE, fontFamily: fontFamilySemibold },
  amberStrong: { color: AMBER, fontFamily: fontFamilySemibold },
  wordRail: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 2, paddingBottom: 2 },
  wordRailItem: {
    color: palette.ink,
    fontFamily: fontFamilySemibold,
    fontSize: 13,
    lineHeight: 18,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: AMBER
  },
  futureList: { paddingTop: 7, gap: 0 },
  futureRow: { flexDirection: "row", alignItems: "flex-start", gap: 13, borderTopWidth: 1, borderTopColor: palette.line, paddingVertical: 13 },
  futureBullet: { width: 6, height: 6, borderRadius: radius.round, backgroundColor: TURQUOISE, marginTop: 8 },
  futureText: { flex: 1, color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 22 },
  finalSection: {
    borderTopWidth: 1,
    borderTopColor: palette.lineStrong,
    paddingTop: 30,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 26
  },
  finalSectionCompact: { flexDirection: "column", alignItems: "flex-start" },
  finalText: { flex: 1, color: palette.ink, fontFamily: fontFamilyBold, fontSize: 28, lineHeight: 36, letterSpacing: 0, maxWidth: 820 },
  finalTextCompact: { fontSize: 23, lineHeight: 31 },
  cta: {
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.primaryStrong,
    backgroundColor: "transparent",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  ctaPressed: { opacity: 0.9 },
  ctaFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 54,
    backgroundColor: palette.primaryStrong
  },
  ctaText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 14, lineHeight: 20 },
  ctaTextActive: { color: palette.onPrimary }
});
