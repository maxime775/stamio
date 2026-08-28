import { forwardRef, useImperativeHandle, type ReactNode } from "react";
import { Linking, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { fontFamilyBold, fontFamilyMedium, palette, radius } from "@/lib/design";
import { splitDiscussionMentions } from "@/lib/discussionMentions";

export const RICH_TEXT_PREFIX = "STAMIO_RICH_TEXT_V1:";

export type RichTextFormatAction = "bold" | "italic" | "link" | "quote" | "bullet" | "numbered" | "code";
export type RichTextActiveFormats = Partial<Record<RichTextFormatAction, boolean>>;

export type RichDiscussionMentionAnchor = {
  left: number;
  top: number;
  minTop: number;
  bottom: number;
};

export type RichTextNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: RichTextNode[];
};

export type RichDiscussionEditorHandle = {
  applyFormat: (format: RichTextFormatAction) => void;
  clear: () => void;
  getSerializedBody: () => string | null;
  getText: () => string;
  focus: () => void;
  prependMention: (username: string) => void;
  replaceActiveMention: (username: string) => boolean;
};

type RichDiscussionEditorProps = {
  disabled?: boolean;
  mentionUsernames: readonly string[];
  placeholder: string;
  style?: StyleProp<ViewStyle>;
  onChangeText: (text: string) => void;
  onActiveFormatsChange: (formats: RichTextActiveFormats) => void;
  onFocusChange: (focused: boolean) => void;
  onMentionQueryChange: (query: string | null) => void;
  onMentionAnchorChange: (anchor: RichDiscussionMentionAnchor | null) => void;
  onMentionKeyDown?: (key: string) => boolean;
};

export const RichDiscussionEditor = forwardRef<RichDiscussionEditorHandle, RichDiscussionEditorProps>(function RichDiscussionEditor(_props, ref) {
  useImperativeHandle(ref, () => ({
    applyFormat() {},
    clear() {},
    getSerializedBody() {
      return null;
    },
    getText() {
      return "";
    },
    focus() {},
    prependMention() {},
    replaceActiveMention() { return false; }
  }), []);
  return null;
});

export function isRichTextBody(value: string) {
  return value.startsWith(RICH_TEXT_PREFIX);
}

export function RichCommentBody({ value, deleted, bodyStyle, deletedStyle, mentionUsernames = [] }: { value: string; deleted: boolean; bodyStyle: StyleProp<TextStyle>; deletedStyle: StyleProp<TextStyle>; mentionUsernames?: readonly string[] }) {
  if (deleted || !isRichTextBody(value)) {
    return <Text style={StyleSheet.flatten([bodyStyle, deleted && deletedStyle])}>{renderMentionText(value, mentionUsernames, "plain")}</Text>;
  }

  const doc = parseRichTextBody(value);
  if (!doc) return <Text style={bodyStyle}>{renderMentionText(value, mentionUsernames, "invalid-rich")}</Text>;
  return <View style={styles.richBody}>{renderBlockNodes(doc.content ?? [], bodyStyle, mentionUsernames, 0)}</View>;
}

function parseRichTextBody(value: string): RichTextNode | null {
  try {
    const parsed = JSON.parse(value.slice(RICH_TEXT_PREFIX.length));
    return parsed && typeof parsed === "object" ? parsed as RichTextNode : null;
  } catch {
    return null;
  }
}

function renderBlockNodes(nodes: RichTextNode[], bodyStyle: StyleProp<TextStyle>, mentionUsernames: readonly string[], depth: number) {
  return nodes.map((node, index) => {
    const key = `${depth}-${index}-${node.type ?? "node"}`;
    if (node.type === "paragraph") {
      return <Text key={key} style={bodyStyle}>{renderInlineNodes(node.content ?? [], bodyStyle, mentionUsernames, key)}</Text>;
    }
    if (node.type === "blockquote") {
      return <View key={key} style={styles.quote}><Text style={StyleSheet.flatten([bodyStyle, styles.quoteText])}>{renderInlineNodes(flattenInlineContent(node.content ?? []), bodyStyle, mentionUsernames, key)}</Text></View>;
    }
    if (node.type === "bulletList" || node.type === "orderedList") {
      return <View key={key} style={styles.list}>{renderListItems(node.content ?? [], bodyStyle, mentionUsernames, node.type === "orderedList", key)}</View>;
    }
    if (node.type === "codeBlock") {
      return <Text key={key} style={StyleSheet.flatten([bodyStyle, styles.codeBlock])}>{getTextFromRichNode(node)}</Text>;
    }
    return <Text key={key} style={bodyStyle}>{renderInlineNodes(flattenInlineContent(node.content ?? []), bodyStyle, mentionUsernames, key)}</Text>;
  });
}

function renderListItems(nodes: RichTextNode[], bodyStyle: StyleProp<TextStyle>, mentionUsernames: readonly string[], ordered: boolean, keyPrefix: string) {
  return nodes.map((node, index) => (
    <View key={`${keyPrefix}-item-${index}`} style={styles.listItem}>
      <Text style={StyleSheet.flatten([bodyStyle, styles.listMarker])}>{ordered ? `${index + 1}.` : "•"}</Text>
      <Text style={StyleSheet.flatten([bodyStyle, styles.listText])}>{renderInlineNodes(flattenInlineContent(node.content ?? []), bodyStyle, mentionUsernames, `${keyPrefix}-item-${index}`)}</Text>
    </View>
  ));
}

function flattenInlineContent(nodes: RichTextNode[]): RichTextNode[] {
  return nodes.flatMap((node) => {
    if (node.text || node.type === "hardBreak") return [node];
    return flattenInlineContent(node.content ?? []);
  });
}

function renderInlineNodes(nodes: RichTextNode[], bodyStyle: StyleProp<TextStyle>, mentionUsernames: readonly string[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.type === "hardBreak") return "\n";
    const text = node.text ?? "";
    const markStyle = getMarkStyle(node.marks ?? []);
    const linkHref = getLinkHref(node.marks ?? []);
    const key = `${keyPrefix}-inline-${index}`;
    if (linkHref) {
      return <Text key={key} style={StyleSheet.flatten([bodyStyle, markStyle, styles.link])} onPress={() => void Linking.openURL(linkHref)}>{renderMentionText(text, mentionUsernames, key)}</Text>;
    }
    return <Text key={key} style={StyleSheet.flatten([bodyStyle, markStyle])}>{renderMentionText(text, mentionUsernames, key)}</Text>;
  });
}

function renderMentionText(value: string, mentionUsernames: readonly string[], keyPrefix: string) {
  return splitDiscussionMentions(value, mentionUsernames).map((segment, index) => (
    <Text key={`${keyPrefix}-mention-${index}`} style={segment.username ? styles.mention : undefined}>{segment.text}</Text>
  ));
}

function getTextFromRichNode(node: RichTextNode): string {
  if (typeof node.text === "string") return node.text;
  return (node.content ?? []).map(getTextFromRichNode).join(node.type === "paragraph" ? "\n" : "");
}

function getMarkStyle(marks: NonNullable<RichTextNode["marks"]>): StyleProp<TextStyle> {
  return marks.map((mark) => {
    if (mark.type === "bold") return styles.bold;
    if (mark.type === "italic") return styles.italic;
    if (mark.type === "code") return styles.inlineCode;
    return null;
  });
}

function getLinkHref(marks: NonNullable<RichTextNode["marks"]>) {
  const href = marks.find((mark) => mark.type === "link")?.attrs?.href;
  if (typeof href !== "string") return null;
  return normalizeSafeUrl(href);
}

function normalizeSafeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  richBody: { gap: 7 },
  bold: { fontFamily: fontFamilyBold, color: palette.ink },
  italic: { fontStyle: "italic" },
  link: { color: palette.primaryStrong, textDecorationLine: "underline" },
  mention: { color: palette.primaryStrong, fontFamily: fontFamilyBold },
  quote: { borderLeftWidth: 2, borderLeftColor: palette.lineStrong, paddingLeft: 10, paddingVertical: 2 },
  quoteText: { color: palette.muted, fontStyle: "italic" },
  list: { gap: 5 },
  listItem: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  listMarker: { width: 18, color: palette.primaryStrong, fontFamily: fontFamilyMedium },
  listText: { flex: 1 },
  inlineCode: {
    color: palette.ink,
    fontFamily: "Consolas",
    backgroundColor: "rgba(251, 252, 255, 0.08)",
    borderRadius: radius.xs,
    paddingHorizontal: 4
  },
  codeBlock: {
    color: palette.ink,
    fontFamily: "Consolas",
    backgroundColor: "rgba(251, 252, 255, 0.08)",
    borderRadius: radius.xs,
    padding: 8
  }
});
