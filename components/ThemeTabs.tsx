import { useEffect, useMemo, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { THEMES } from "@/lib/product";
import { prefetchThemePolls } from "@/lib/api";
import type { ThemeSlug } from "@/lib/types";
import { fontFamilyMedium, fontFamilySemibold, getThemeVisual, palette } from "@/lib/design";

type Props = {
  active?: ThemeSlug | "all";
  includeAll?: boolean;
  onSelect?: (theme: ThemeSlug | "all") => void;
};

export function ThemeTabs({ active = "all", includeAll = false, onSelect }: Props) {
  const router = useRouter();
  const items = includeAll ? [{ slug: "all" as const, label: "Tous" }, ...THEMES] : THEMES;

  function handleSelect(slug: ThemeSlug | "all") {
    if (onSelect) {
      onSelect(slug);
      return;
    }
    router.push((slug === "all" ? "/themes" : `/themes/${slug}`) as Href);
  }

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {items.map((item) => {
          const selected = active === item.slug;
          return (
            <ThemeTabItem
              key={item.slug}
              label={item.label}
              slug={item.slug}
              selected={selected}
              onSelect={handleSelect}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

function ThemeTabItem({ label, slug, selected, onSelect }: { label: string; slug: ThemeSlug | "all"; selected: boolean; onSelect: (slug: ThemeSlug | "all") => void }) {
  const [hovered, setHovered] = useState(false);
  const line = useMemo(() => new Animated.Value(selected ? 1 : 0), []);
  const accent = slug === "all" ? palette.ink : getThemeVisual(slug).accent;
  const highlighted = selected || hovered;

  useEffect(() => {
    Animated.timing(line, {
      toValue: selected ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [line, selected]);

  function animateLine(toValue: number) {
    Animated.timing(line, {
      toValue,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }

  function handleHoverIn() {
    setHovered(true);
    animateLine(1);
    prefetchThemePolls(slug);
  }

  function handleHoverOut() {
    setHovered(false);
    animateLine(selected ? 1 : 0);
  }

  return (
    <Pressable
      onPress={() => onSelect(slug)}
      onPressIn={() => prefetchThemePolls(slug)}
      onFocus={() => prefetchThemePolls(slug)}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={({ pressed }) => StyleSheet.flatten([styles.tab, pressed && styles.tabPressed])}
    >
      <Text style={StyleSheet.flatten([styles.label, highlighted && styles.labelActive, highlighted && { color: accent }])}>{label}</Text>
      <Animated.View style={StyleSheet.flatten([styles.tabLine, { backgroundColor: accent, transform: [{ scaleX: line }] }])} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: palette.line
  },
  content: { gap: 8, alignItems: "center" },
  tab: {
    minHeight: 40,
    borderRadius: 0,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  tabPressed: { transform: [{ scale: 0.98 }] },
  tabLine: { position: "absolute", left: 16, right: 16, bottom: 0, height: 2, borderRadius: 1 },
  label: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 13 },
  labelActive: { color: palette.ink, fontFamily: fontFamilySemibold }
});
