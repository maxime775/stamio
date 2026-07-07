import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
          const visual = item.slug === "all" ? { accent: palette.primaryStrong, soft: palette.primarySoft } : getThemeVisual(item.slug);
          return (
            <Pressable
              key={item.slug}
              onPress={() => handleSelect(item.slug)}
              onPressIn={() => prefetchThemePolls(item.slug)}
              onFocus={() => prefetchThemePolls(item.slug)}
              onHoverIn={() => prefetchThemePolls(item.slug)}
              style={({ pressed }) => StyleSheet.flatten([styles.tab, selected && styles.tabActive, selected && { borderBottomColor: visual.accent }, pressed && styles.tabPressed])}
            >
              <Text style={StyleSheet.flatten([styles.label, selected && styles.labelActive, selected && { color: visual.accent }])}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
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
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  tabActive: {
    backgroundColor: "transparent"
  },
  tabPressed: { transform: [{ scale: 0.98 }] },
  label: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 13 },
  labelActive: { color: palette.ink, fontFamily: fontFamilySemibold }
});
