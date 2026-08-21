import { memo, type ReactNode } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { NonBreakingFinalPunctuation } from "@/components/NonBreakingFinalPunctuation";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette } from "@/lib/design";

type Props = {
  value?: string | null;
  compact?: boolean;
};

type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "link"; label: string; url: string };

export const MarkdownContent = memo(function MarkdownContent({ value, compact = false }: Props) {
  const blocks = parseBlocks(value ?? "");
  if (blocks.length === 0) return null;

  return (
    <View style={StyleSheet.flatten([styles.root, compact && styles.rootCompact])}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return <Text key={index} style={styles.heading}>{renderInline(block.text, index)}</Text>;
        }
        if (block.type === "quote") {
          return (
            <View key={index} style={styles.quote}>
              <Text style={styles.quoteText}>{renderInline(block.text, index)}</Text>
            </View>
          );
        }
        if (block.type === "list") {
          return (
            <View key={index} style={styles.list}>
              {block.items.map((item, itemIndex) => (
                <View key={`${index}-${itemIndex}`} style={styles.listRow}>
                  <Text style={styles.marker}>{block.ordered ? `${itemIndex + 1}.` : "•"}</Text>
                  <Text style={styles.paragraph}>{renderInline(item, itemIndex)}</Text>
                </View>
              ))}
            </View>
          );
        }
        return <Text key={index} style={styles.paragraph}>{renderInline(block.text, index)}</Text>;
      })}
    </View>
  );
});

function renderInline(text: string, keyPrefix: number): ReactNode[] {
  return parseInline(text).map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.type === "bold") return <Text key={key} style={styles.bold}><NonBreakingFinalPunctuation value={token.value} /></Text>;
    if (token.type === "italic") return <Text key={key} style={styles.italic}><NonBreakingFinalPunctuation value={token.value} /></Text>;
    if (token.type === "link") {
      return (
        <Text key={key} accessibilityRole="link" onPress={() => void Linking.openURL(token.url)} style={styles.link}>
          <NonBreakingFinalPunctuation value={token.label} />
        </Text>
      );
    }
    return <Text key={key}><NonBreakingFinalPunctuation value={token.value} /></Text>;
  });
}

function parseBlocks(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Array<
    | { type: "paragraph"; text: string }
    | { type: "heading"; text: string }
    | { type: "quote"; text: string }
    | { type: "list"; ordered: boolean; items: string[] }
  > = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", text: heading[2].trim() });
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines = [line.replace(/^>\s?/, "").trim()];
      while (index + 1 < lines.length && lines[index + 1].trim().startsWith(">")) {
        index += 1;
        quoteLines.push(lines[index].trim().replace(/^>\s?/, "").trim());
      }
      blocks.push({ type: "quote", text: quoteLines.join(" ") });
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      const items = [(unordered ?? ordered)?.[1].trim() ?? ""];
      while (index + 1 < lines.length) {
        const next = lines[index + 1].trim();
        const nextMatch = isOrdered ? /^\d+\.\s+(.+)$/.exec(next) : /^[-*]\s+(.+)$/.exec(next);
        if (!nextMatch) break;
        index += 1;
        items.push(nextMatch[1].trim());
      }
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }

    const paragraphLines = [line];
    while (index + 1 < lines.length) {
      const next = lines[index + 1].trim();
      if (!next || /^(#{1,3})\s+/.test(next) || next.startsWith(">") || /^[-*]\s+/.test(next) || /^\d+\.\s+/.test(next)) break;
      index += 1;
      paragraphLines.push(next);
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /\[([^\]]+)]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) tokens.push({ type: "text", value: text.slice(cursor, match.index) });
    if (match[1] && match[2] && isSafeUrl(match[2])) tokens.push({ type: "link", label: match[1], url: match[2] });
    else if (match[3]) tokens.push({ type: "bold", value: match[3] });
    else if (match[4]) tokens.push({ type: "italic", value: match[4] });
    else tokens.push({ type: "text", value: match[0] });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) tokens.push({ type: "text", value: text.slice(cursor) });
  return tokens;
}

function isSafeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  root: { gap: 9, maxWidth: 760 },
  rootCompact: { gap: 7 },
  paragraph: { color: palette.inkSecondary, fontSize: 14, lineHeight: 22 },
  heading: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 16, lineHeight: 22, marginTop: 2 },
  bold: { color: palette.ink, fontFamily: fontFamilySemibold },
  italic: { fontStyle: "italic" },
  link: { color: palette.primaryStrong, fontFamily: fontFamilyMedium, textDecorationLine: "underline" },
  quote: { borderLeftWidth: 2, borderLeftColor: palette.lineStrong, paddingLeft: 10, paddingVertical: 2, backgroundColor: "transparent" },
  quoteText: { color: palette.muted, fontSize: 14, lineHeight: 22, fontStyle: "italic" },
  list: { gap: 5 },
  listRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  marker: { width: 20, color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13, lineHeight: 22 }
});
