import { memo, useEffect, useMemo, useRef, useState, type Ref } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type GestureResponderEvent } from "react-native";
import * as THREE from "three";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, getThemeVisual, palette } from "@/lib/design";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { OpenPollStats, ThemeSlug } from "@/lib/types";

type ThemeAnchor = {
  theme: ThemeSlug;
  label: string;
  metricLabel: string;
  position: [number, number, number];
};

type Satellite = {
  id: string;
  theme: ThemeSlug;
  position: [number, number, number];
  size: number;
};

type Link = {
  from: [number, number, number];
  to: [number, number, number];
  theme: ThemeSlug;
  cluster: ThemeSlug | "bridge";
};

type FallbackNode = {
  theme: ThemeSlug;
  x: number;
  y: number;
  z: number;
  label: string;
};

const THEME_ORDER: ThemeSlug[] = ["politique", "economie", "societe", "sport"];
const HERO_BASE_ROTATION = { x: -0.24, y: 0.36, z: 0 };
const HERO_IDLE_ROTATION = {
  xAmplitude: 0.105,
  yAmplitude: 0.205,
  zAmplitude: 0.035,
  floatAmplitude: 0.07,
  xSpeed: 0.54,
  ySpeed: 0.44,
  zSpeed: 0.36,
  floatSpeed: 0.68
};

const THEME_ANCHORS: ThemeAnchor[] = [
  { theme: "politique", label: "Politique", metricLabel: "politique", position: [-1.54, 0.46, 0.72] },
  { theme: "economie", label: "Économie", metricLabel: "économie", position: [1.48, 0.86, -0.88] },
  { theme: "societe", label: "Société", metricLabel: "société", position: [-0.34, -1.18, -0.18] },
  { theme: "sport", label: "Sport", metricLabel: "sport", position: [1.82, -0.58, 1.02] }
];

const SATELLITE_OFFSETS: Array<[number, number, number, number]> = [
  [-0.46, 0.22, 0.38, 0.048],
  [0.34, 0.3, -0.32, 0.038],
  [-0.16, -0.46, 0.52, 0.044],
  [0.58, -0.12, 0.18, 0.036],
  [-0.62, -0.2, -0.48, 0.034],
  [0.08, 0.55, 0.08, 0.032],
  [0.48, 0.12, 0.66, 0.04],
  [-0.28, 0.02, -0.66, 0.032]
];

const SATELLITES: Satellite[] = THEME_ANCHORS.flatMap((anchor, themeIndex) => SATELLITE_OFFSETS.map(([x, y, z, size], index) => ({
  id: `${anchor.theme}-${index}`,
  theme: anchor.theme,
  position: [
    anchor.position[0] + x * (themeIndex % 2 === 0 ? 1 : 0.84),
    anchor.position[1] + y * (themeIndex > 1 ? 0.9 : 1),
    anchor.position[2] + z * (index % 2 === 0 ? 1 : 0.72)
  ],
  size
})));

const LINKS: Link[] = [
  ...THEME_ANCHORS.flatMap((anchor) => SATELLITES
    .filter((satellite) => satellite.theme === anchor.theme)
    .map((satellite) => ({ from: anchor.position, to: satellite.position, theme: anchor.theme, cluster: anchor.theme }))),
  { from: THEME_ANCHORS[0].position, to: THEME_ANCHORS[2].position, theme: "politique", cluster: "bridge" },
  { from: THEME_ANCHORS[2].position, to: THEME_ANCHORS[1].position, theme: "societe", cluster: "bridge" },
  { from: THEME_ANCHORS[1].position, to: THEME_ANCHORS[3].position, theme: "economie", cluster: "bridge" },
  { from: THEME_ANCHORS[3].position, to: THEME_ANCHORS[0].position, theme: "sport", cluster: "bridge" }
];

const FALLBACK_NODES: FallbackNode[] = THEME_ANCHORS.map((anchor) => ({
  theme: anchor.theme,
  label: anchor.label,
  x: 156 + anchor.position[0] * 64,
  y: 152 - anchor.position[1] * 58,
  z: anchor.position[2]
}));

export const HeroThemeNetwork3D = memo(function HeroThemeNetwork3D({ stats }: { stats: OpenPollStats | null }) {
  if (Platform.OS === "web") return <HeroThemeNetworkWeb stats={stats} />;
  return <HeroThemeNetworkFallback stats={stats} />;
});

function HeroThemeNetworkWeb({ stats }: { stats: OpenPollStats | null }) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const sceneWidth = compact ? 312 : 440;
  const sceneHeight = compact ? 332 : 408;
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement | null>(null);
  const [activeTheme, setActiveTheme] = useState<ThemeSlug | null>(null);
  const activeThemeRef = useRef<ThemeSlug | null>(null);
  const [keyboardIndex, setKeyboardIndex] = useState(0);
  const displayedValue = stats ? activeTheme ? stats.byTheme[activeTheme] : stats.total : null;
  const metricLabel = formatQuestionLabel(displayedValue ?? 0, activeTheme);

  function applyTheme(theme: ThemeSlug | null) {
    if (activeThemeRef.current === theme) return;
    activeThemeRef.current = theme;
    setActiveTheme(theme);
  }

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let cleanup = () => undefined;

    function startScene() {
      const host = containerRef.current;
      if (!host) return;
      if (disposed || !containerRef.current) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(sceneWidth, sceneHeight);
      renderer.domElement.style.width = `${sceneWidth}px`;
      renderer.domElement.style.height = `${sceneHeight}px`;
      renderer.domElement.style.display = "block";
      renderer.domElement.style.pointerEvents = "auto";
      host.replaceChildren(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, sceneWidth / sceneHeight, 0.1, 100);
      camera.position.set(0, 0, 6.5);

      const root = new THREE.Group();
      root.rotation.x = HERO_BASE_ROTATION.x;
      root.rotation.y = HERO_BASE_ROTATION.y;
      root.rotation.z = HERO_BASE_ROTATION.z;
      scene.add(root);

      const light = new THREE.PointLight(0xffffff, 0.85, 14);
      light.position.set(0, 0, 4);
      scene.add(light);
      scene.add(new THREE.AmbientLight(0xffffff, 0.42));

      const themeMeshes: Array<{ theme: ThemeSlug; mesh: any; halo: any; material: any; base: any }> = [];
      const satelliteMeshes: Array<{ theme: ThemeSlug; mesh: any; material: any; base: any; seed: number }> = [];
      const linkMaterials: Array<{ cluster: ThemeSlug | "bridge"; material: any }> = [];
      const hitMeshes: any[] = [];

      function makeSphere(radius: number, color: string, opacity: number) {
        return new THREE.Mesh(
          new THREE.SphereGeometry(radius, 32, 18),
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.42,
            roughness: 0.48,
            metalness: 0.14,
            transparent: true,
            opacity
          })
        );
      }

      for (const anchor of THEME_ANCHORS) {
        const visual = getThemeVisual(anchor.theme);
        const base = new THREE.Vector3(...anchor.position);
        const mesh = makeSphere(0.145, visual.accent, 0.95);
        mesh.position.copy(base);
        mesh.userData.theme = anchor.theme;
        root.add(mesh);

        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(0.245, 32, 18),
          new THREE.MeshBasicMaterial({ color: visual.accent, transparent: true, opacity: 0.12, wireframe: true })
        );
        halo.position.copy(base);
        root.add(halo);

        const hit = new THREE.Mesh(
          new THREE.SphereGeometry(0.36, 24, 14),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
        );
        hit.position.copy(base);
        hit.userData.theme = anchor.theme;
        hitMeshes.push(hit);
        root.add(hit);

        themeMeshes.push({ theme: anchor.theme, mesh, halo, material: mesh.material, base });
      }

      SATELLITES.forEach((satellite, index) => {
        const visual = getThemeVisual(satellite.theme);
        const base = new THREE.Vector3(...satellite.position);
        const mesh = makeSphere(satellite.size, visual.accent, 0.58);
        mesh.position.copy(base);
        root.add(mesh);
        satelliteMeshes.push({ theme: satellite.theme, mesh, material: mesh.material, base, seed: index * 0.63 });
      });

      LINKS.forEach((link) => {
        const visual = getThemeVisual(link.theme);
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...link.from),
          new THREE.Vector3(...link.to)
        ]);
        const material = new THREE.LineBasicMaterial({
          color: visual.line,
          transparent: true,
          opacity: link.cluster === "bridge" ? 0.16 : 0.23
        });
        const line = new THREE.Line(geometry, material);
        root.add(line);
        linkMaterials.push({ cluster: link.cluster, material });
      });

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2(0, 0);
      const targetRotation = { x: root.rotation.x, y: root.rotation.y };
      const targetPosition = { y: root.position.y };
      let hovering = false;

      function setPointerFromEvent(event: PointerEvent) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
        targetRotation.y = HERO_BASE_ROTATION.y + pointer.x * 0.62;
        targetRotation.x = HERO_BASE_ROTATION.x + pointer.y * 0.34;
        root.rotation.z += (HERO_BASE_ROTATION.z - root.rotation.z) * 0.08;
        targetPosition.y = 0;
      }

      function handlePointerMove(event: PointerEvent) {
        hovering = true;
        setPointerFromEvent(event);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(hitMeshes, false)[0];
        applyTheme(hit?.object?.userData?.theme ?? null);
      }

      function handlePointerLeave() {
        hovering = false;
        targetRotation.x = HERO_BASE_ROTATION.x;
        targetRotation.y = HERO_BASE_ROTATION.y;
        targetPosition.y = 0;
        applyTheme(null);
      }

      renderer.domElement.addEventListener("pointermove", handlePointerMove);
      renderer.domElement.addEventListener("pointerleave", handlePointerLeave);

      function animate(time: number) {
        const active = activeThemeRef.current;
        const seconds = time / 1000;
        if (!reducedMotion && !hovering) {
          targetRotation.y = HERO_BASE_ROTATION.y + Math.sin(seconds * HERO_IDLE_ROTATION.ySpeed + 0.65) * HERO_IDLE_ROTATION.yAmplitude;
          targetRotation.x = HERO_BASE_ROTATION.x + Math.cos(seconds * HERO_IDLE_ROTATION.xSpeed + 0.4) * HERO_IDLE_ROTATION.xAmplitude;
          root.rotation.z += ((HERO_BASE_ROTATION.z + Math.sin(seconds * HERO_IDLE_ROTATION.zSpeed + 1.2) * HERO_IDLE_ROTATION.zAmplitude) - root.rotation.z) * 0.045;
          targetPosition.y = Math.sin(seconds * HERO_IDLE_ROTATION.floatSpeed) * HERO_IDLE_ROTATION.floatAmplitude;
        } else {
          root.rotation.z += (HERO_BASE_ROTATION.z - root.rotation.z) * 0.045;
          targetPosition.y = 0;
        }
        root.rotation.x += (targetRotation.x - root.rotation.x) * 0.055;
        root.rotation.y += (targetRotation.y - root.rotation.y) * 0.055;
        root.position.y += (targetPosition.y - root.position.y) * 0.05;

        for (const item of themeMeshes) {
          const isActive = active === item.theme;
          const dimmed = active !== null && !isActive;
          const pulse = reducedMotion ? 0 : Math.sin(seconds * 1.3 + item.base.x) * 0.018;
          const targetScale = isActive ? 1.62 : dimmed ? 0.86 : 1.03 + pulse;
          item.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
          item.halo.scale.lerp(new THREE.Vector3(isActive ? 1.86 : 1.06, isActive ? 1.86 : 1.06, isActive ? 1.86 : 1.06), 0.12);
          item.material.opacity += ((dimmed ? 0.28 : 0.95) - item.material.opacity) * 0.12;
          item.material.emissiveIntensity += ((isActive ? 1.35 : 0.42) - item.material.emissiveIntensity) * 0.12;
          item.halo.material.opacity += ((isActive ? 0.32 : dimmed ? 0.04 : 0.12) - item.halo.material.opacity) * 0.12;
          const forward = item.base.clone().normalize().multiplyScalar(isActive ? 0.34 : 0);
          item.mesh.position.lerp(item.base.clone().add(forward), 0.1);
          item.halo.position.copy(item.mesh.position);
        }

        for (const item of satelliteMeshes) {
          const isActive = active === item.theme;
          const dimmed = active !== null && !isActive;
          const orbit = reducedMotion ? 0 : seconds * 0.42 + item.seed;
          const offset = new THREE.Vector3(Math.cos(orbit) * 0.025, Math.sin(orbit * 1.3) * 0.02, Math.sin(orbit) * 0.032);
          const target = item.base.clone().add(offset.multiplyScalar(isActive ? 2.2 : 1));
          item.mesh.position.lerp(target, 0.08);
          const scale = isActive ? 1.42 : dimmed ? 0.72 : 1;
          item.mesh.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
          item.material.opacity += ((isActive ? 0.88 : dimmed ? 0.18 : 0.54) - item.material.opacity) * 0.1;
          item.material.emissiveIntensity += ((isActive ? 0.92 : 0.28) - item.material.emissiveIntensity) * 0.1;
        }

        for (const item of linkMaterials) {
          const isActive = active !== null && item.cluster === active;
          const dimmed = active !== null && item.cluster !== active;
          const target = isActive ? 0.82 : dimmed ? 0.06 : item.cluster === "bridge" ? 0.15 : 0.24;
          item.material.opacity += (target - item.material.opacity) * 0.1;
        }

        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      }

      frame = requestAnimationFrame(animate);
      cleanup = () => {
        renderer.domElement.removeEventListener("pointermove", handlePointerMove);
        renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
        cancelAnimationFrame(frame);
        renderer.dispose();
        host.replaceChildren();
      };
    }

    void startScene();
    return () => {
      disposed = true;
      cleanup();
    };
  }, [sceneHeight, sceneWidth, reducedMotion]);

  function handleFocus() {
    const theme = THEME_ORDER[keyboardIndex % THEME_ORDER.length];
    setKeyboardIndex((value) => value + 1);
    applyTheme(theme);
  }

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={stats ? `${displayedValue ?? stats.total} ${metricLabel}` : "Carte 3D des questions ouvertes par thème"}
      onFocus={handleFocus}
      onBlur={() => applyTheme(null)}
      style={StyleSheet.flatten([styles.shell, compact && styles.shellCompact])}
    >
      <View ref={containerRef as unknown as Ref<View>} style={StyleSheet.flatten([styles.canvasHost, { width: sceneWidth, height: sceneHeight }])} />
      <MetricOverlay activeTheme={activeTheme} displayedValue={displayedValue} metricLabel={metricLabel} compact={compact} />
    </Pressable>
  );
}

function HeroThemeNetworkFallback({ stats }: { stats: OpenPollStats | null }) {
  const [activeTheme, setActiveTheme] = useState<ThemeSlug | null>(null);
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const pulse = useMemo(() => new Animated.Value(0), []);
  const reducedMotion = useReducedMotion();
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayedValue = stats ? activeTheme ? stats.byTheme[activeTheme] : stats.total : null;
  const metricLabel = formatQuestionLabel(displayedValue ?? 0, activeTheme);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, reducedMotion]);

  useEffect(() => () => {
    if (resetRef.current) clearTimeout(resetRef.current);
  }, []);

  function activate(theme: ThemeSlug | null) {
    setActiveTheme(theme);
    if (resetRef.current) clearTimeout(resetRef.current);
    resetRef.current = setTimeout(() => setActiveTheme(null), 4200);
  }

  function handlePress(event: GestureResponderEvent) {
    const { locationX, locationY } = event.nativeEvent;
    let nearest: { theme: ThemeSlug; distance: number } | null = null;
    for (const node of FALLBACK_NODES) {
      const distance = Math.sqrt((node.x - locationX) ** 2 + (node.y - locationY) ** 2);
      if (!nearest || distance < nearest.distance) nearest = { theme: node.theme, distance };
    }
    activate(nearest && nearest.distance < 76 ? nearest.theme : null);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={stats ? `${displayedValue ?? stats.total} ${metricLabel}` : "Carte 3D des questions ouvertes par thème"}
      onPress={handlePress}
      style={StyleSheet.flatten([styles.shell, compact && styles.shellCompact])}
    >
      <View style={styles.fallbackStage}>
        <View style={styles.fallbackCore} />
        {FALLBACK_NODES.map((node, index) => {
          const visual = getThemeVisual(node.theme);
          const active = activeTheme === node.theme;
          const dimmed = activeTheme !== null && !active;
          const size = active ? 34 : 24 + node.z * 4;
          return (
            <Animated.View key={node.theme} style={StyleSheet.flatten([styles.fallbackNodeWrap, {
              left: node.x,
              top: node.y,
              opacity: dimmed ? 0.34 : 1,
              transform: [
                { translateX: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(index * 1.7) * 5] }) },
                { translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(index * 1.3) * 5] }) }
              ]
            }])}>
              <View style={StyleSheet.flatten([styles.fallbackHalo, { borderColor: visual.line, opacity: active ? 0.78 : 0.2 }])} />
              <View style={StyleSheet.flatten([styles.fallbackNode, { width: size, height: size, borderRadius: size / 2, backgroundColor: visual.accent }])} />
              <Text style={StyleSheet.flatten([styles.fallbackLabel, { color: active ? visual.accent : palette.inkSecondary }])}>{node.label}</Text>
            </Animated.View>
          );
        })}
      </View>
      <MetricOverlay activeTheme={activeTheme} displayedValue={displayedValue} metricLabel={metricLabel} compact={compact} />
    </Pressable>
  );
}

function MetricOverlay({ activeTheme, displayedValue, metricLabel, compact }: { activeTheme: ThemeSlug | null; displayedValue: number | null; metricLabel: string; compact: boolean }) {
  const visual = getThemeVisual(activeTheme ?? "societe");
  const valueColor = activeTheme ? visual.accent : palette.ink;
  const pulse = useMemo(() => new Animated.Value(1), []);
  useEffect(() => {
    pulse.setValue(0.9);
    Animated.timing(pulse, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [displayedValue, metricLabel, pulse]);

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.flatten([styles.metric, { transform: [{ scale: pulse }], opacity: displayedValue === null ? 0 : 1 }])}>
      {displayedValue !== null ? <Text style={StyleSheet.flatten([styles.value, { color: valueColor }, compact && styles.valueCompact])}>{displayedValue}</Text> : null}
      <Text style={StyleSheet.flatten([styles.metricLabel, activeTheme && { color: visual.accent }, compact && styles.metricLabelCompact])}>{metricLabel}</Text>
    </Animated.View>
  );
}

function formatQuestionLabel(count: number, activeTheme: ThemeSlug | null) {
  const question = count > 1 ? "questions" : "question";
  if (activeTheme) return `${question} ${getThemeMetricLabel(activeTheme)}`;
  return `${question} ${count > 1 ? "totales" : "totale"}`;
}

function getThemeMetricLabel(theme: ThemeSlug) {
  if (theme === "economie") return "économie";
  if (theme === "societe") return "société";
  return theme;
}

const styles = StyleSheet.create({
  shell: {
    width: 440,
    maxWidth: "100%",
    minHeight: 414,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginLeft: "auto"
  },
  shellCompact: { width: 312, minHeight: 360, marginLeft: 0 },
  canvasHost: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  metric: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 170,
    minHeight: 128,
    paddingHorizontal: 18,
    zIndex: 4
  },
  value: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 68, lineHeight: 72, letterSpacing: 0 },
  valueCompact: { fontSize: 54, lineHeight: 58 },
  metricLabel: {
    color: palette.inkSecondary,
    fontFamily: fontFamilySemibold,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 168,
    textTransform: "uppercase",
    letterSpacing: 0.7
  },
  metricLabelCompact: { fontSize: 11, lineHeight: 16, maxWidth: 148 },
  fallbackStage: { width: 312, height: 320, position: "relative" },
  fallbackCore: {
    position: "absolute",
    left: 76,
    top: 74,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(28, 110, 140, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(166, 176, 192, 0.16)"
  },
  fallbackNodeWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  fallbackHalo: { position: "absolute", width: 54, height: 54, borderRadius: 27, borderWidth: 1 },
  fallbackNode: { shadowColor: palette.primaryStrong, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  fallbackLabel: { position: "absolute", top: 30, fontFamily: fontFamilyMedium, fontSize: 10, minWidth: 76, textAlign: "center" }
});
