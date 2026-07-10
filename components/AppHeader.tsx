import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Link, usePathname, useRouter, type Href } from "expo-router";
import { BarChart3, CircleUserRound, Home, Info, Layers3, LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react-native";
import { useAuth } from "@/components/AuthProvider";
import { StamioLogo } from "@/components/StamioLogo";
import { getAdminStatus, prefetchLatestResults, prefetchThemePolls, signOutUser } from "@/lib/api";
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

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

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [pathname]);

  function go(href: string) {
    setAccountMenuOpen(false);
    router.push(href as Href);
  }

  async function handleSignOut() {
    setAccountMenuOpen(false);
    await signOutUser();
    router.replace("/" as Href);
  }

  return (
    <>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Stamio" onPress={() => go("/")} style={styles.brand}>
          <StamioLogo height={32} />
          <Text style={styles.brandText}>Stamio</Text>
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
              <View style={styles.accountMenuWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: accountMenuOpen }}
                  onPress={() => setAccountMenuOpen((open) => !open)}
                  style={styles.accountButton}
                >
                  <CircleUserRound size={17} color={palette.inkSecondary} />
                  {!compact ? <Text style={styles.accountText}>Mon compte</Text> : null}
                </Pressable>
                {accountMenuOpen ? (
                  <View style={styles.accountMenu}>
                    <Pressable onPress={() => go("/account")} style={styles.menuItem}>
                      <UserRound size={15} color={palette.inkSecondary} />
                      <Text style={styles.menuItemText}>Mes informations</Text>
                    </Pressable>
                    <View style={styles.menuSeparator} />
                    <Pressable onPress={handleSignOut} style={styles.menuItem}>
                      <LogOut size={15} color={palette.dangerText} />
                      <Text style={styles.menuDangerText}>Se déconnecter</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
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

      {accountMenuOpen ? <Pressable accessibilityLabel="Fermer le menu compte" onPress={() => setAccountMenuOpen(false)} style={styles.menuBackdrop} /> : null}

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
  brandText: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 19, letterSpacing: -0.3 },
  centerNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, flex: 1 },
  navItem: { paddingHorizontal: 14, paddingVertical: 11, position: "relative" },
  navLine: { position: "absolute", left: 14, right: 14, bottom: 4, height: 2, borderRadius: 1, backgroundColor: palette.primaryStrong },
  navText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 13 },
  navTextActive: { color: palette.ink },
  account: { minWidth: 128, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  accountMenuWrap: { position: "relative", zIndex: 30 },
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
  accountMenu: {
    position: "absolute",
    top: 46,
    right: 0,
    width: 190,
    borderRadius: radius.sm,
    backgroundColor: "rgba(10, 16, 23, 0.98)",
    borderWidth: 1,
    borderColor: palette.lineStrong,
    paddingVertical: 6,
    zIndex: 35,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  menuItem: { minHeight: 40, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  menuItemText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  menuDangerText: { color: palette.dangerText, fontFamily: fontFamilyMedium, fontSize: 13 },
  menuSeparator: { height: 1, backgroundColor: palette.line, marginVertical: 4 },
  menuBackdrop: { position: "absolute", top: 64, left: 0, right: 0, bottom: 0, zIndex: 4, backgroundColor: "transparent" },
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
