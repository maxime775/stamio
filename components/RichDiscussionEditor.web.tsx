import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type ReactNode } from "react";
import { Linking, Platform, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Extension, type JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { STAMIO_CORE_COLORS, fontFamily, fontFamilyBold, fontFamilyMedium, palette, radius } from "@/lib/design";
import { getActiveDiscussionMention, prependReplyMention, splitDiscussionMentions } from "@/lib/discussionMentions";

export const RICH_TEXT_PREFIX = "STAMIO_RICH_TEXT_V1:";

export type RichTextFormatAction = "bold" | "italic" | "link" | "quote" | "bullet" | "numbered" | "code";
export type RichTextActiveFormats = Partial<Record<RichTextFormatAction, boolean>>;

export type RichDiscussionMentionAnchor = {
  left: number;
  top: number;
  minTop: number;
  bottom: number;
};

export type RichTextNode = JSONContent;

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

const EMPTY_DOC: RichTextNode = { type: "doc", content: [{ type: "paragraph" }] };
const STYLE_ELEMENT_ID = "stamio-rich-discussion-editor-styles";
const VALID_MENTION_CLASS = "stamio-valid-discussion-mention";

export const RichDiscussionEditor = forwardRef<RichDiscussionEditorHandle, RichDiscussionEditorProps>(function RichDiscussionEditor({
  disabled = false,
  mentionUsernames,
  placeholder,
  style,
  onChangeText,
  onActiveFormatsChange,
  onFocusChange,
  onMentionQueryChange,
  onMentionAnchorChange,
  onMentionKeyDown
}, ref) {
  const containerRef = useRef<View | null>(null);
  const mentionUsernamesRef = useRef(mentionUsernames);
  mentionUsernamesRef.current = mentionUsernames;
  const mentionDecorationExtension = useMemo(() => createMentionDecorationExtension(mentionUsernamesRef), []);
  const mentionKeyDownRef = useRef(onMentionKeyDown);
  mentionKeyDownRef.current = onMentionKeyDown;
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined" || document.getElementById(STYLE_ELEMENT_ID)) return;
    const element = document.createElement("style");
    element.id = STYLE_ELEMENT_ID;
    element.textContent = `
.stamio-rich-discussion-editor,
.stamio-rich-discussion-editor.ProseMirror,
.stamio-rich-discussion-editor .ProseMirror,
.stamio-rich-discussion-editor[contenteditable="true"] {
  min-height: 88px;
  color: #FBFCFF !important;
  -webkit-text-fill-color: #FBFCFF;
  caret-color: ${palette.primaryStrong};
  font-family: ${fontFamilyMedium}, ${fontFamily}, Arial, sans-serif;
  font-size: 15px;
  line-height: 22px;
  font-weight: 500;
  outline: none !important;
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  appearance: none;
  -webkit-appearance: none;
  white-space: pre-wrap;
  word-break: break-word;
}
.stamio-rich-discussion-editor:focus,
.stamio-rich-discussion-editor:focus-visible,
.stamio-rich-discussion-editor.ProseMirror-focused,
.stamio-rich-discussion-editor.ProseMirror:focus,
.stamio-rich-discussion-editor.ProseMirror:focus-visible,
.stamio-rich-discussion-editor .ProseMirror:focus,
.stamio-rich-discussion-editor .ProseMirror:focus-visible,
.stamio-rich-discussion-editor .ProseMirror-focused,
.stamio-rich-discussion-editor[contenteditable="true"]:focus,
.stamio-rich-discussion-editor[contenteditable="true"]:focus-visible {
  outline: none !important;
  border: 0 !important;
  box-shadow: none !important;
}
.stamio-rich-discussion-editor *,
.stamio-rich-discussion-editor.ProseMirror * {
  box-sizing: border-box;
}
.stamio-rich-discussion-editor p,
.stamio-rich-discussion-editor.ProseMirror p,
.stamio-rich-discussion-editor .ProseMirror p {
  margin: 0 0 8px;
  color: inherit;
  font: inherit;
}
.stamio-rich-discussion-editor p:last-child,
.stamio-rich-discussion-editor.ProseMirror p:last-child,
.stamio-rich-discussion-editor .ProseMirror p:last-child {
  margin-bottom: 0;
}
.stamio-rich-discussion-editor ul,
.stamio-rich-discussion-editor ol,
.stamio-rich-discussion-editor.ProseMirror ul,
.stamio-rich-discussion-editor.ProseMirror ol,
.stamio-rich-discussion-editor .ProseMirror ul,
.stamio-rich-discussion-editor .ProseMirror ol {
  margin: 0 0 8px 20px;
  padding: 0;
  color: inherit;
  font: inherit;
}
.stamio-rich-discussion-editor li,
.stamio-rich-discussion-editor.ProseMirror li,
.stamio-rich-discussion-editor .ProseMirror li {
  margin: 0 0 4px;
  padding-left: 2px;
  color: inherit;
  font: inherit;
}
.stamio-rich-discussion-editor strong,
.stamio-rich-discussion-editor.ProseMirror strong,
.stamio-rich-discussion-editor .ProseMirror strong {
  color: #FBFCFF;
  -webkit-text-fill-color: #FBFCFF;
  font-family: ${fontFamilyBold}, ${fontFamilyMedium}, Arial, sans-serif;
  font-weight: 700;
}
.stamio-rich-discussion-editor em,
.stamio-rich-discussion-editor.ProseMirror em,
.stamio-rich-discussion-editor .ProseMirror em {
  color: inherit;
  -webkit-text-fill-color: inherit;
  font-style: italic;
}
.stamio-rich-discussion-editor blockquote,
.stamio-rich-discussion-editor.ProseMirror blockquote,
.stamio-rich-discussion-editor .ProseMirror blockquote {
  margin: 0 0 8px;
  padding: 2px 0 2px 10px;
  border-left: 2px solid ${palette.lineStrong};
  color: ${palette.muted};
  -webkit-text-fill-color: ${palette.muted};
  font-style: italic;
}
.stamio-rich-discussion-editor blockquote *,
.stamio-rich-discussion-editor.ProseMirror blockquote *,
.stamio-rich-discussion-editor .ProseMirror blockquote * {
  color: ${palette.muted};
  -webkit-text-fill-color: ${palette.muted};
}
.stamio-rich-discussion-editor code,
.stamio-rich-discussion-editor.ProseMirror code,
.stamio-rich-discussion-editor .ProseMirror code {
  color: #FBFCFF;
  -webkit-text-fill-color: #FBFCFF;
  font-family: Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  background: rgba(251, 252, 255, 0.08);
  border: 1px solid rgba(143, 184, 198, 0.16);
  border-radius: ${radius.xs}px;
  padding: 1px 4px;
}
.stamio-rich-discussion-editor a,
.stamio-rich-discussion-editor.ProseMirror a,
.stamio-rich-discussion-editor .ProseMirror a {
  color: ${palette.primaryStrong};
  -webkit-text-fill-color: ${palette.primaryStrong};
  text-decoration: underline;
}
.stamio-rich-discussion-editor .${VALID_MENTION_CLASS},
.stamio-rich-discussion-editor .${VALID_MENTION_CLASS} * {
  color: ${STAMIO_CORE_COLORS.editorialAmber} !important;
  -webkit-text-fill-color: ${STAMIO_CORE_COLORS.editorialAmber} !important;
}
.stamio-rich-discussion-editor p.is-editor-empty:first-child::before,
.stamio-rich-discussion-editor.ProseMirror p.is-editor-empty:first-child::before,
.stamio-rich-discussion-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: rgba(251, 252, 255, 0.48);
  -webkit-text-fill-color: rgba(251, 252, 255, 0.48);
  pointer-events: none;
  height: 0;
}
`;
    document.head.appendChild(element);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        codeBlock: false
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank"
        }
      }),
      Placeholder.configure({ placeholder }),
      mentionDecorationExtension
    ],
    content: EMPTY_DOC,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "stamio-rich-discussion-editor"
      },
      handleKeyDown: (_view, event) => mentionKeyDownRef.current?.(event.key) ?? false
    },
    onUpdate: ({ editor: currentEditor }) => reportEditorState(currentEditor, containerRef.current, onChangeText, onActiveFormatsChange, onMentionQueryChange, onMentionAnchorChange),
    onSelectionUpdate: ({ editor: currentEditor }) => {
      onActiveFormatsChange(getActiveFormats(currentEditor));
      reportEditorMention(currentEditor, containerRef.current, onMentionQueryChange, onMentionAnchorChange);
    },
    onFocus: ({ editor: currentEditor }) => {
      onFocusChange(true);
      reportEditorMention(currentEditor, containerRef.current, onMentionQueryChange, onMentionAnchorChange);
    },
    onBlur: () => onFocusChange(false)
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(editor.state.tr.setMeta("discussionMentionUsernamesChanged", true));
  }, [editor, mentionUsernames]);

  useEffect(() => {
    if (!editor || Platform.OS !== "web" || typeof window === "undefined") return;
    const updateAnchor = () => onMentionAnchorChange(getEditorMentionAnchor(editor, containerRef.current));
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);
    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [editor, onMentionAnchorChange]);

  useImperativeHandle(ref, () => ({
    applyFormat(format) {
      if (!editor || disabled) return;
      applyFormat(editor, format);
      onActiveFormatsChange(getActiveFormats(editor));
      onChangeText(editor.getText());
    },
    clear() {
      if (!editor) return;
      editor.commands.setContent(EMPTY_DOC);
      onChangeText("");
      onActiveFormatsChange({});
      onMentionQueryChange(null);
      onMentionAnchorChange(null);
    },
    getSerializedBody() {
      if (!editor || isRichTextDocEmpty(editor.getJSON() as RichTextNode)) return null;
      return `${RICH_TEXT_PREFIX}${JSON.stringify(editor.getJSON())}`;
    },
    getText() {
      return editor?.getText() ?? "";
    },
    focus() {
      editor?.commands.focus(undefined, { scrollIntoView: false });
    },
    prependMention(username) {
      if (!editor || disabled) return;
      const result = prependReplyMention(editor.getText(), username);
      if (result.inserted) editor.chain().focus("start", { scrollIntoView: false }).insertContent(`@${username} `).run();
      else editor.commands.focus(undefined, { scrollIntoView: false });
    },
    replaceActiveMention(username) {
      if (!editor || disabled || !editor.state.selection.empty) return false;
      const mention = getEditorMention(editor);
      if (!mention) return false;
      const cursor = editor.state.selection.from;
      const replaceEnd = editor.state.doc.textBetween(cursor, Math.min(cursor + 1, editor.state.doc.content.size)) === " " ? cursor + 1 : cursor;
      editor.chain().focus(undefined, { scrollIntoView: false }).insertContentAt(
        { from: cursor - (mention.end - mention.start), to: replaceEnd },
        `@${username} `
      ).run();
      return true;
    }
  }), [disabled, editor, onActiveFormatsChange, onChangeText, onMentionAnchorChange, onMentionQueryChange]);

  return (
    <View ref={containerRef} style={style}>
      {editor ? <EditorContent editor={editor} /> : null}
    </View>
  );
});

function createMentionDecorationExtension(mentionUsernamesRef: { current: readonly string[] }) {
  return Extension.create({
    name: "discussionMentionDecorations",
    addProseMirrorPlugins() {
      return [new Plugin({
        props: {
          decorations: (state) => getDiscussionMentionDecorations(state.doc, mentionUsernamesRef.current)
        }
      })];
    }
  });
}

function getDiscussionMentionDecorations(doc: ProseMirrorNode, mentionUsernames: readonly string[]) {
  const decorations: Decoration[] = [];
  doc.descendants((node, blockPosition) => {
    if (!node.isTextblock) return;
    let textRun = "";
    let textRunStart = 0;
    let nextTextOffset = -1;
    const flushTextRun = () => {
      if (textRun) addMentionDecorations(decorations, textRun, textRunStart, mentionUsernames);
      textRun = "";
      nextTextOffset = -1;
    };
    node.descendants((child, childOffset) => {
      if (!child.isText || !child.text) {
        if (child.isInline) flushTextRun();
        return false;
      }
      if (textRun && childOffset !== nextTextOffset) flushTextRun();
      if (!textRun) textRunStart = blockPosition + 1 + childOffset;
      textRun += child.text;
      nextTextOffset = childOffset + child.nodeSize;
      return false;
    });
    flushTextRun();
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

function addMentionDecorations(decorations: Decoration[], text: string, textPosition: number, mentionUsernames: readonly string[]) {
  let offset = 0;
  for (const segment of splitDiscussionMentions(text, mentionUsernames)) {
    if (segment.username) {
      decorations.push(Decoration.inline(
        textPosition + offset,
        textPosition + offset + segment.text.length,
        { class: VALID_MENTION_CLASS }
      ));
    }
    offset += segment.text.length;
  }
}

function reportEditorState(editor: Editor, container: View | null, onChangeText: (text: string) => void, onActiveFormatsChange: (formats: RichTextActiveFormats) => void, onMentionQueryChange: (query: string | null) => void, onMentionAnchorChange: (anchor: RichDiscussionMentionAnchor | null) => void) {
  onChangeText(editor.getText());
  onActiveFormatsChange(getActiveFormats(editor));
  reportEditorMention(editor, container, onMentionQueryChange, onMentionAnchorChange);
}

function reportEditorMention(editor: Editor, container: View | null, onMentionQueryChange: (query: string | null) => void, onMentionAnchorChange: (anchor: RichDiscussionMentionAnchor | null) => void) {
  onMentionQueryChange(getEditorMentionQuery(editor));
  onMentionAnchorChange(getEditorMentionAnchor(editor, container));
}

function getEditorMention(editor: Editor) {
  if (!editor.state.selection.empty) return null;
  const cursor = editor.state.selection.from;
  const textBeforeCursor = editor.state.doc.textBetween(0, cursor, "\n", "\n");
  return getActiveDiscussionMention(textBeforeCursor, textBeforeCursor.length);
}

function getEditorMentionQuery(editor: Editor) {
  return getEditorMention(editor)?.query ?? null;
}

function getEditorMentionAnchor(editor: Editor, container: View | null): RichDiscussionMentionAnchor | null {
  if (!getEditorMention(editor) || !container) return null;
  const element = container as unknown as HTMLElement;
  const frame = element.parentElement;
  if (!frame || typeof frame.getBoundingClientRect !== "function") return null;
  try {
    const caret = editor.view.coordsAtPos(editor.state.selection.from);
    const frameBounds = frame.getBoundingClientRect();
    const editorBounds = element.getBoundingClientRect();
    return {
      left: Math.max(0, caret.right - frameBounds.left + 3),
      top: Math.max(0, caret.top - frameBounds.top + 4),
      minTop: Math.max(0, editorBounds.top - frameBounds.top + 4),
      bottom: Math.max(0, frameBounds.height - 5)
    };
  } catch {
    return null;
  }
}

function getActiveFormats(editor: Editor): RichTextActiveFormats {
  return {
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    link: editor.isActive("link"),
    quote: editor.isActive("blockquote"),
    bullet: editor.isActive("bulletList"),
    numbered: editor.isActive("orderedList"),
    code: editor.isActive("code")
  };
}

function applyFormat(editor: Editor, format: RichTextFormatAction) {
  if (format === "bold") editor.chain().focus().toggleBold().run();
  if (format === "italic") editor.chain().focus().toggleItalic().run();
  if (format === "quote") editor.chain().focus().toggleBlockquote().run();
  if (format === "bullet") editor.chain().focus().toggleBulletList().run();
  if (format === "numbered") editor.chain().focus().toggleOrderedList().run();
  if (format === "code") editor.chain().focus().toggleCode().run();
  if (format === "link") applyLink(editor);
}

function applyLink(editor: Editor) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const previousUrl = editor.getAttributes("link").href;
  const url = window.prompt("Lien", typeof previousUrl === "string" ? previousUrl : "https://");
  if (url === null) return;
  const normalizedUrl = normalizeSafeUrl(url);
  if (!normalizedUrl) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  const { empty } = editor.state.selection;
  if (empty) {
    editor.chain().focus().insertContent({
      type: "text",
      text: "lien",
      marks: [{ type: "link", attrs: { href: normalizedUrl } }]
    }).run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href: normalizedUrl }).run();
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

function isRichTextDocEmpty(doc: RichTextNode) {
  return getTextFromRichNode(doc).trim().length === 0;
}

function getTextFromRichNode(node: RichTextNode): string {
  if (typeof node.text === "string") return node.text;
  return (node.content ?? []).map(getTextFromRichNode).join(node.type === "paragraph" ? "\n" : "");
}

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
