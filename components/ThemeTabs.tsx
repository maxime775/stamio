import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { THEMES } from "@/lib/product";
import type { ThemeSlug } from "@/lib/types";

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
            <Pressable
              key={item.slug}
              onPress={() => handleSelect(item.slug)}
              style={({ pressed }) => StyleSheet.flatten([styles.tab, selected && styles.tabActive, pressed && styles.tabPressed])}
            >
              <Text style={StyleSheet.flatten([styles.label, selected && styles.labelActive])}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    padding: 6
  },
  content: { gap: 8, alignItems: "center" },
  tab: {
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: "#A7F3D0",
    shadowColor: "#0F766E",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  tabPressed: { transform: [{ scale: 0.98 }] },
  label: { color: "#94A3B8", fontSize: 14, fontWeight: "900" },
  labelActive: { color: "#06111C" }
});
