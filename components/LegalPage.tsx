import type { ReactNode } from "react";
import { Link, type Href } from "expo-router";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { PageShell } from "@/components/PageShell";
import { fontFamilyMedium, fontFamilySemibold, fontFamilyBold, palette, radius } from "@/lib/design";

type ParagraphBlock = { type: "paragraph"; content: ReactNode };
type SubheadingBlock = { type: "subheading"; title: string };
type ListBlock = { type: "list"; items: ReactNode[] };
type CalloutBlock = { type: "callout"; lines: ReactNode[] };
type TableBlock = {
  type: "table";
  label: string;
  columns: [string, string];
  rows: [ReactNode, ReactNode][];
};

export type LegalBlock = ParagraphBlock | SubheadingBlock | ListBlock | CalloutBlock | TableBlock;
export type LegalSection = { title: string; blocks: LegalBlock[] };

type LegalPageProps = {
  eyebrow: string;
  title: string;
  updatedAt: string;
  intro: string;
  summary?: ReactNode[];
  sections: LegalSection[];
  footerNote?: string;
};

export function legalParagraph(content: ReactNode): ParagraphBlock {
  return { type: "paragraph", content };
}

export function legalSubheading(title: string): SubheadingBlock {
  return { type: "subheading", title };
}

export function legalList(items: ReactNode[]): ListBlock {
  return { type: "list", items };
}

export function legalCallout(lines: ReactNode[]): CalloutBlock {
  return { type: "callout", lines };
}

export function legalTable(label: string, columns: [string, string], rows: [ReactNode, ReactNode][]): TableBlock {
  return { type: "table", label, columns, rows };
}

export function LegalPage({ eyebrow, title, updatedAt, intro, summary, sections, footerNote }: LegalPageProps) {
  return (
    <PageShell>
      <View style={styles.document} role="document">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text role="heading" style={styles.title}>{title}</Text>
          <Text style={styles.updatedAt}>{updatedAt}</Text>
          <Text style={styles.intro}>{intro}</Text>
          {summary ? <View role="note" style={styles.summary}>{summary.map((line, index) => (
            <Text key={index} style={styles.summaryText}>{line}</Text>
          ))}</View> : null}
        </View>
        <View style={styles.content}>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text role="heading" style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionBody}>
                {section.blocks.map((block, index) => <LegalBlockView key={`${section.title}-${index}`} block={block} />)}
              </View>
            </View>
          ))}
        </View>
        {footerNote ? <Text style={styles.footerNote}>{footerNote}</Text> : null}
      </View>
    </PageShell>
  );
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.type === "subheading") {
    return <Text role="heading" style={styles.subheading}>{block.title}</Text>;
  }
  if (block.type === "list") {
    return <View role="list" style={styles.list}>{block.items.map((item, index) => (
      <View key={index} role="listitem" style={styles.listItem}>
        <Text aria-hidden style={styles.bullet}>•</Text>
        <Text style={styles.listText}>{item}</Text>
      </View>
    ))}</View>;
  }
  if (block.type === "callout") {
    return <View role="note" style={styles.callout}>{block.lines.map((line, index) => (
      <Text key={index} style={styles.calloutText}>{line}</Text>
    ))}</View>;
  }
  if (block.type === "table") return <LegalTable block={block} />;
  return <Text style={styles.paragraph}>{block.content}</Text>;
}

function LegalTable({ block }: { block: TableBlock }) {
  const compact = useWindowDimensions().width < 680;
  return (
    <View accessibilityLabel={block.label} role="table" style={styles.table}>
      {!compact ? (
        <View role="row" style={styles.tableHeader}>
          {block.columns.map((column) => <Text key={column} role="columnheader" style={styles.tableHeaderCell}>{column}</Text>)}
        </View>
      ) : null}
      <View role="rowgroup">
        {block.rows.map((row, index) => compact ? (
          <View key={index} role="row" style={styles.mobileTableRow}>
            <Text role="rowheader" style={styles.mobileTableLabel}>{block.columns[0]}</Text>
            <Text role="cell" style={styles.mobileTableValue}>{row[0]}</Text>
            <Text role="rowheader" style={styles.mobileTableLabel}>{block.columns[1]}</Text>
            <Text role="cell" style={styles.mobileTableValue}>{row[1]}</Text>
          </View>
        ) : (
          <View key={index} role="row" style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
            <Text role="cell" style={styles.tableCell}>{row[0]}</Text>
            <Text role="cell" style={styles.tableCell}>{row[1]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function LegalInlineLink({ href, children }: { href: Href; children: ReactNode }) {
  return <Link href={href} style={styles.link}>{children}</Link>;
}

export function LegalEmailLink({ email }: { email: "contact@stamio.fr" | "maxime@stamio.fr" | "privacy@stamio.fr" }) {
  return <Link href={`mailto:${email}` as Href} style={styles.link}>{email}</Link>;
}

const styles = StyleSheet.create({
  document: { width: "100%", maxWidth: 860, gap: 12 },
  header: { gap: 12 },
  eyebrow: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 40, lineHeight: 47, letterSpacing: -1 },
  updatedAt: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 20 },
  intro: { color: palette.inkSecondary, fontSize: 16, lineHeight: 26, maxWidth: 800 },
  summary: { alignSelf: "flex-start", maxWidth: "100%", flexShrink: 1, borderLeftWidth: 2, borderLeftColor: palette.primary, backgroundColor: palette.primarySoft, paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.xs, gap: 4 },
  summaryText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 21 },
  content: { gap: 30, paddingTop: 18 },
  section: { gap: 14, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 22 },
  sectionTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 21, lineHeight: 29 },
  sectionBody: { gap: 12 },
  subheading: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 16, lineHeight: 23, marginTop: 5 },
  paragraph: { color: palette.muted, fontSize: 14, lineHeight: 23 },
  list: { gap: 8, paddingLeft: 2 },
  listItem: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingRight: 4 },
  bullet: { color: palette.primaryStrong, fontSize: 16, lineHeight: 23, width: 10 },
  listText: { color: palette.muted, fontSize: 14, lineHeight: 23, flex: 1, minWidth: 0 },
  callout: { alignSelf: "flex-start", maxWidth: "100%", flexShrink: 1, borderLeftWidth: 2, borderLeftColor: palette.primary, backgroundColor: palette.primarySoft, borderRadius: radius.xs, paddingHorizontal: 13, paddingVertical: 10, gap: 4 },
  calloutText: { color: palette.inkSecondary, fontSize: 13, lineHeight: 21 },
  table: { width: "100%", borderWidth: 1, borderColor: palette.lineStrong, borderRadius: radius.sm, overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: palette.primarySoft, borderBottomWidth: 1, borderBottomColor: palette.lineStrong },
  tableHeaderCell: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 12, lineHeight: 18, paddingHorizontal: 14, paddingVertical: 11, flex: 1 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: palette.line },
  tableRowAlternate: { backgroundColor: palette.surfaceSubtle },
  tableCell: { color: palette.muted, fontSize: 12, lineHeight: 19, paddingHorizontal: 14, paddingVertical: 11, flex: 1, minWidth: 0 },
  mobileTableRow: { paddingHorizontal: 14, paddingVertical: 13, gap: 4, borderBottomWidth: 1, borderBottomColor: palette.line },
  mobileTableLabel: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, lineHeight: 15, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 3 },
  mobileTableValue: { color: palette.muted, fontSize: 13, lineHeight: 20 },
  link: { color: palette.primaryStrong, fontFamily: fontFamilyMedium, textDecorationLine: "underline", textDecorationColor: palette.primaryStrong },
  footerNote: { color: palette.muted, fontSize: 11, lineHeight: 18, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 16, marginTop: 8 }
});
