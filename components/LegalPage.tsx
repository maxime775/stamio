import { StyleSheet, Text, View } from "react-native";
import { PageShell } from "@/components/PageShell";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

type Section = { title: string; paragraphs: string[] };

export function LegalPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: Section[] }) {
  return (
    <PageShell>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.intro}>{intro}</Text>
        <View style={styles.notice}><Text style={styles.noticeText}>Document type à adapter et faire valider avant publication.</Text></View>
      </View>
      <View style={styles.content}>
        {sections.map((section) => <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.paragraphs.map((paragraph) => <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>)}
        </View>)}
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  header: { maxWidth: 820, gap: 12 },
  eyebrow: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 40, lineHeight: 47, letterSpacing: -1 },
  intro: { color: palette.inkSecondary, fontSize: 16, lineHeight: 25 },
  notice: { alignSelf: "flex-start", borderLeftWidth: 2, borderLeftColor: palette.primary, backgroundColor: palette.primarySoft, paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.xs },
  noticeText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 12 },
  content: { maxWidth: 820, gap: 28, paddingTop: 12 },
  section: { gap: 10, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 20 },
  sectionTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 20 },
  paragraph: { color: palette.muted, fontSize: 14, lineHeight: 23 }
});
