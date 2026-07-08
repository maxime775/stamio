import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Link, usePathname, useRouter, type Href } from "expo-router";
import { BarChart3, CircleUserRound, Home, Info, Layers3, LogIn, ShieldCheck } from "lucide-react-native";
import { useAuth } from "@/components/AuthProvider";
import { getAdminStatus, prefetchLatestResults, prefetchThemePolls } from "@/lib/api";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

const centerNav = [
  { label: "Nos thèmes", href: "/themes", icon: Layers3 },
  { label: "Les derniers résultats", href: "/results", icon: BarChart3 },
  { label: "Qui sommes-nous", href: "/about", icon: Info }
];

const mobileNav = [
  { label: "Accueil", href: "/", icon: Home },
  ...centerNav,
  { label: "Compte", href: "/account", icon: CircleUserRound }
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, emailVerified } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user || !emailVerified) {
      setIsAdmin(false);
      return () => {
        active = false;
      };
    }
    getAdminStatus().then((value) => {
      if (active) setIsAdmin(value);
    });
    return () => {
      active = false;
    };
  }, [emailVerified, user]);

  function go(href: string) {
    router.push(href as Href);
  }

  return (
    <>
      <View style={styles.header}>
        <Pressable onPress={() => go("/")} style={styles.brand}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>S</Text>
          </View>
          <Text style={styles.brandText}>Sayit</Text>
        </Pressable>

        {!compact ? (
          <View style={styles.centerNav}>
            {centerNav.map((item) => (
              <DesktopNavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
            ))}
          </View>
        ) : null}

        <View style={styles.account}>
          {user && emailVerified ? (
            <>
              {isAdmin && !compact ? (
                <Pressable onPress={() => go("/admin")} style={styles.secondaryButton}>
                  <ShieldCheck size={16} color={palette.primaryStrong} />
                  <Text style={styles.secondaryText}>Admin</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => go("/account")} style={styles.accountButton}>
                <CircleUserRound size={17} color={palette.inkSecondary} />
                {!compact ? <Text style={styles.accountText}>Mon compte</Text> : null}
              </Pressable>
            </>
          ) : (
            <>
              {!compact ? (
                <Pressable onPress={() => go("/auth/login")} style={styles.secondaryButton}>
                  <LogIn size={16} color={palette.inkSecondary} />
                  <Text style={styles.secondaryText}>Se connecter</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => go("/auth/signup")} style={styles.primaryButton}>
                <Text style={styles.primaryText}>S’inscrire</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {compact ? (
        <View style={styles.bottomNav}>
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Pressable key={item.href} onPress={() => go(item.href)} onPressIn={() => warmRoute(item.href)} onFocus={() => warmRoute(item.href)} style={styles.bottomItem}>
                <Icon size={18} color={active ? palette.primaryStrong : palette.muted} />
                <Text style={StyleSheet.flatten([styles.bottomLabel, active && styles.bottomLabelActive])}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </>
  );
}

function DesktopNavLink({ item, active }: { item: (typeof centerNav)[number]; active: boolean }) {
  const line = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => { Animated.timing(line, { toValue: active ? 1 : 0, duration: 220, useNativeDriver: true }).start(); }, [active, line]);
  function hover(value: number) { Animated.timing(line, { toValue: value, duration: 220, useNativeDriver: true }).start(); }
  return <Link href={item.href as Href} asChild>
    <Pressable onHoverIn={() => { hover(1); warmRoute(item.href); }} onFocus={() => warmRoute(item.href)} onPressIn={() => warmRoute(item.href)} onHoverOut={() => hover(active ? 1 : 0)} style={styles.navItem}>
      <Text style={StyleSheet.flatten([styles.navText, active && styles.navTextActive])}>{item.label}</Text>
      <Animated.View style={StyleSheet.flatten([styles.navLine, { transform: [{ scaleX: line }] }])} />
    </Pressable>
  </Link>;
}

function warmRoute(href: string) {
  if (href === "/themes") prefetchThemePolls("all");
  if (href === "/results") prefetchLatestResults();
}

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    paddingHorizontal: 24,
    backgroundColor: "rgba(8, 11, 16, 0.98)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.18)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    zIndex: 5
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 128 },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: palette.lineStrong
  },
  brandMarkText: { color: palette.primaryStrong, fontFamily: fontFamilyBold, fontSize: 16 },
  brandText: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 19, letterSpacing: -0.3 },
  centerNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, flex: 1 },
  navItem: { paddingHorizontal: 14, paddingVertical: 11, position: "relative" },
  navLine: { position: "absolute", left: 14, right: 14, bottom: 4, height: 2, borderRadius: 1, backgroundColor: palette.primaryStrong },
  navText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 13 },
  navTextActive: { color: palette.ink },
  account: { minWidth: 128, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  accountButton: {
    minHeight: 40,
    borderRadius: radius.sm,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)"
  },
  accountText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium },
  secondaryButton: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)"
  },
  secondaryText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium },
  primaryButton: {
    minHeight: 40,
    minWidth: 40,
    paddingHorizontal: 13,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary,
  },
  primaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 60,
    borderRadius: 0,
    backgroundColor: "rgba(8, 11, 16, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    zIndex: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }
  },
  bottomItem: { alignItems: "center", justifyContent: "center", gap: 3, flex: 1 },
  bottomLabel: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 9 },
  bottomLabelActive: { color: palette.primaryStrong }
});
