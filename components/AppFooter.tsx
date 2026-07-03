import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { fontFamily, fontFamilyBold, fontFamilyMedium, palette } from "@/lib/design";

const links = [
  ["Accueil", "/"],
  ["Nos thèmes", "/themes"],
  ["Derniers résultats", "/results"],
  ["Qui sommes-nous", "/about"],
  ["Mon compte", "/account"]
] as const;

const legalLinks = [
  ["Mentions légales", "/mentions-legales"],
  ["Confidentialité", "/confidentialite"],
  ["Conditions d’utilisation", "/conditions-utilisation"]
] as const;

export function AppFooter() {
  const router = useRouter();
  return (
    <View style={styles.footer}>
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>Sayit</Text>
        <Text style={styles.tagline}>Des opinions vérifiées. Des débats ouverts. Une lecture plus claire de ce que nous pensons.</Text>
      </View>
      <View style={styles.links}>
        {links.map(([label, href]) => (
          <Pressable key={href} onPress={() => router.push(href as Href)} style={styles.linkHit}>
            <Text style={styles.link}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.legal}>
        {legalLinks.map(([label, href]) => <Pressable key={href} onPress={() => router.push(href as Href)} style={styles.legalHit}>
          <Text style={styles.legalLink}>{label}</Text>
        </Pressable>)}
      </View>
      <Text style={styles.copyright}>© 2026 Sayit. Tous droits réservés.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { marginTop: 56, paddingTop: 28, paddingBottom: 24, borderTopWidth: 1, borderTopColor: palette.line, gap: 20 },
  brandBlock: { maxWidth: 620, gap: 7 },
  brand: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 21 },
  tagline: { color: palette.muted, fontFamily, fontSize: 14, lineHeight: 22 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  linkHit: { paddingVertical: 7, paddingRight: 18 },
  link: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  legal: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  legalHit: { paddingVertical: 4 },
  legalLink: { color: "#77879B", fontFamily, fontSize: 12 },
  copyright: { color: "#65758A", fontFamily, fontSize: 12 }
});
