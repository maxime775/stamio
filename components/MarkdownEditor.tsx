import { memo, useState, type ComponentProps, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Bold, Heading2, Italic, Link, List, ListOrdered, Quote } from "@/lib/icons";
import { MarkdownContent } from "@/components/MarkdownContent";
import { authField, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

type Selection = {
  start: number;
  end: number;
};

export const MarkdownEditor = memo(function MarkdownEditor({ value, onChangeText, placeholder }: Props) {
  const [selection, setSelection] = useState<Selection>({ start: value.length, end: value.length });
  const [preview, setPreview] = useState(false);

  function apply(before: string, after = before, fallback = "texte") {
    const start = Math.min(selection.start, value.length);
    const end = Math.min(selection.end, value.length);
    const selected = value.slice(start, end) || fallback;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChangeText(next);
    const cursor = start + before.length + selected.length + after.length;
    setSelection({ start: cursor, end: cursor });
  }

  function applyLine(prefix: string) {
    const start = Math.min(selection.start, value.length);
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
    onChangeText(next);
    setSelection({ start: start + prefix.length, end: start + prefix.length });
  }

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <ToolButton label="Gras" onPress={() => apply("**", "**", "important")}><Bold size={15} color={palette.inkSecondary} /></ToolButton>
        <ToolButton label="Italique" onPress={() => apply("*", "*", "nuance")}><Italic size={15} color={palette.inkSecondary} /></ToolButton>
        <ToolButton label="Titre" onPress={() => applyLine("## ")}><Heading2 size={15} color={palette.inkSecondary} /></ToolButton>
        <ToolButton label="Citation" onPress={() => applyLine("> ")}><Quote size={15} color={palette.inkSecondary} /></ToolButton>
        <ToolButton label="Liste" onPress={() => applyLine("- ")}><List size={15} color={palette.inkSecondary} /></ToolButton>
        <ToolButton label="Liste numérotée" onPress={() => applyLine("1. ")}><ListOrdered size={15} color={palette.inkSecondary} /></ToolButton>
        <ToolButton label="Lien" onPress={() => apply("[", "](https://)", "source")}><Link size={15} color={palette.inkSecondary} /></ToolButton>
        <Pressable onPress={() => setPreview((current) => !current)} style={StyleSheet.flatten([styles.previewToggle, preview && styles.previewToggleActive])}>
          <Text style={StyleSheet.flatten([styles.previewToggleText, preview && styles.previewToggleTextActive])}>{preview ? "Éditer" : "Aperçu"}</Text>
        </Pressable>
      </View>
      {preview ? (
        <View style={styles.preview}>
          <MarkdownContent value={value || placeholder} compact />
        </View>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
          multiline
          placeholder={placeholder}
          placeholderTextColor={authField.placeholderColor}
          style={StyleSheet.flatten([styles.input, webInputReset])}
        />
      )}
      <Text style={styles.help}>Markdown limité : gras, italique, listes, citation, lien http(s) et sous-titre.</Text>
    </View>
  );
});

function ToolButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.toolButton}>
      {children}
    </Pressable>
  );
}

const webInputReset = Platform.OS === "web"
  ? ({ outlineStyle: "none" } as unknown as ComponentProps<typeof TextInput>["style"])
  : null;

const styles = StyleSheet.create({
  root: {
    borderRadius: authField.borderRadius,
    backgroundColor: authField.background,
    borderWidth: authField.borderWidth,
    borderColor: "transparent",
    overflow: "hidden"
  },
  toolbar: {
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: authField.separatorColor,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6
  },
  toolButton: {
    width: 30,
    height: 28,
    borderRadius: radius.xs,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  previewToggle: {
    marginLeft: "auto",
    minHeight: 28,
    borderRadius: radius.xs,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.lineStrong
  },
  previewToggleActive: { backgroundColor: palette.primarySoft, borderColor: palette.primaryStrong },
  previewToggleText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 12 },
  previewToggleTextActive: { color: palette.ink, fontFamily: fontFamilySemibold },
  input: {
    minHeight: 126,
    color: palette.ink,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontFamily: fontFamilyMedium,
    fontSize: 14,
    lineHeight: 21,
    textAlignVertical: "top"
  },
  preview: { minHeight: 126, paddingHorizontal: 13, paddingVertical: 11 },
  help: { color: palette.muted, fontSize: 11, lineHeight: 16, paddingHorizontal: 13, paddingBottom: 10 }
});
