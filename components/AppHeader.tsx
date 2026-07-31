import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type PointerEvent as ReactNativePointerEvent } from "react-native";
import { Link, usePathname, useRouter, type Href } from "expo-router";
import { BarChart3, CircleUserRound, Home, Info, Layers3, LayoutDashboard, LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react-native";
import { useAuth } from "@/components/AuthProvider";
import { SiteContainer } from "@/components/SiteContainer";
import { StamioLogo } from "@/components/StamioLogo";
import { getAdminStatus, prefetchLatestResults, prefetchThemePolls, signOutUser } from "@/lib/api";
import { ACCOUNT_MENU_CLOSE_DELAY_MS, cancelAccountMenuClose, scheduleAccountMenuClose as scheduleAccountMenuCloseTimer } from "@/lib/accountMenuHover";
import { STAMIO_CORE_COLORS, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";

const LOGO_VISUAL_LEFT_INSET_RATIO = (8 + (9 - 2.75) * 1.08) / 84;

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

export function HeaderTextAction({
  label,
  accessibilityLabel,
  accessibilityHint,
  icon,
  iconPosition = "start",
  onPress
}: {
  label: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed, hovered }) => StyleSheet.flatten([
        styles.secondaryButton,
        hovered && styles.actionHovered,
        pressed && styles.actionPressed
      ])}
    >
      {iconPosition === "start" ? icon : null}
      <Text style={styles.secondaryText}>{label}</Text>
      {iconPosition === "end" ? icon : null}
    </Pressable>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, emailVerified } = useAuth();
  const userId = user?.id ?? null;
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const accountMenuWrapRef = useRef<View | null>(null);
  const accountButtonRef = useRef<View | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearMenuCloseTimer() {
    cancelAccountMenuClose(closeTimerRef);
  }

  function containsAccountMenuTarget(target: EventTarget | null) {
    const wrapper = accountMenuWrapRef.current as unknown as { contains?: (node: Node) => boolean } | null;
    return target instanceof Node && Boolean(wrapper?.contains?.(target));
  }

  function openAccountMenuFromHover() {
    if (compact || !hoverCapable) return;
    clearMenuCloseTimer();
    setAccountMenuOpen(true);
  }

  function handleAccountMenuPointerEnter(event: ReactNativePointerEvent) {
    if (event.nativeEvent.pointerType === "touch") return;
    openAccountMenuFromHover();
  }

  function scheduleAccountMenuClose() {
    if (compact || !hoverCapable) return;
    scheduleAccountMenuCloseTimer({
      timerRef: closeTimerRef,
      delay: ACCOUNT_MENU_CLOSE_DELAY_MS,
      shouldRemainOpen: () => Platform.OS === "web" && containsAccountMenuTarget(document.activeElement),
      onClose: () => setAccountMenuOpen(false)
    });
  }

  function handleAccountMenuPointerLeave(event: ReactNativePointerEvent) {
    if (event.nativeEvent.pointerType === "touch") return;
    scheduleAccountMenuClose();
  }

  function toggleAccountMenu() {
    clearMenuCloseTimer();
    setAccountMenuOpen((open) => !open);
  }

  useEffect(() => {
    let active = true;
    if (!userId || !emailVerified) {
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
  }, [emailVerified, userId]);

  useEffect(() => {
    clearMenuCloseTimer();
    setAccountMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateHoverCapability = () => setHoverCapable(query.matches);
    updateHoverCapability();
    query.addEventListener?.("change", updateHoverCapability);
    return () => query.removeEventListener?.("change", updateHoverCapability);
  }, []);

  useEffect(() => () => clearMenuCloseTimer(), []);

  useEffect(() => {
    if (!accountMenuOpen || Platform.OS !== "web") return;

    function closeFromOutsidePointer(event: PointerEvent) {
      if (containsAccountMenuTarget(event.target)) {
        clearMenuCloseTimer();
        return;
      }
      clearMenuCloseTimer();
      setAccountMenuOpen(false);
    }

    function closeFromOutsideFocus(event: FocusEvent) {
      if (containsAccountMenuTarget(event.target)) {
        clearMenuCloseTimer();
        return;
      }
      clearMenuCloseTimer();
      setAccountMenuOpen(false);
    }

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      clearMenuCloseTimer();
      setAccountMenuOpen(false);
      const button = accountButtonRef.current as unknown as { focus?: () => void } | null;
      button?.focus?.();
    }

    document.addEventListener("pointerdown", closeFromOutsidePointer);
    document.addEventListener("focusin", closeFromOutsideFocus);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutsidePointer);
      document.removeEventListener("focusin", closeFromOutsideFocus);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [accountMenuOpen]);

  function go(href: string) {
    clearMenuCloseTimer();
    setAccountMenuOpen(false);
    router.push(href as Href);
  }

  async function handleSignOut() {
    clearMenuCloseTimer();
    setAccountMenuOpen(false);
    await signOutUser();
    router.replace("/" as Href);
  }

  return (
    <>
      <View style={styles.header}>
        <SiteContainer style={styles.headerInner}>
        <Link href="/" asChild>
          <Pressable
            accessibilityLabel="Stamio"
            style={StyleSheet.flatten([
              styles.brand,
              { marginLeft: -(compact ? 40 : 48) * LOGO_VISUAL_LEFT_INSET_RATIO },
              compact && styles.brandCompact
            ])}
          >
            <StamioLogo height={compact ? 40 : 48} />
          </Pressable>
        </Link>

        {!compact ? (
          <View style={styles.centerNav}>
            {centerNav.map((item) => (
              <DesktopNavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
            ))}
          </View>
        ) : null}

        <View style={StyleSheet.flatten([styles.account, compact && styles.accountCompact])}>
          {user && emailVerified ? (
            <>
              {isAdmin && !compact ? (
                <Pressable onPress={() => go("/admin")} style={styles.secondaryButton}>
                  <ShieldCheck size={16} color={palette.primaryStrong} />
                  <Text style={styles.secondaryText}>Admin</Text>
                </Pressable>
              ) : null}
              <View
                ref={accountMenuWrapRef}
                onPointerEnter={handleAccountMenuPointerEnter}
                onPointerLeave={handleAccountMenuPointerLeave}
                style={styles.accountMenuWrap}
              >
                <AccountMenuButton
                  buttonRef={accountButtonRef}
                  compact={compact}
                  expanded={accountMenuOpen}
                  onPress={toggleAccountMenu}
                />
                {accountMenuOpen && !compact ? <View pointerEvents="box-only" style={styles.accountMenuBridge} /> : null}
                {accountMenuOpen ? (
                  <View
                    accessibilityRole="menu"
                    nativeID="account-menu"
                    style={styles.accountMenu}
                  >
                    <Pressable accessibilityRole="menuitem" onPress={() => go("/account")} style={({ hovered, pressed }) => StyleSheet.flatten([styles.menuItem, hovered && styles.menuItemHovered, pressed && styles.menuItemPressed])}>
                      <Text style={styles.menuItemText}>Mon espace</Text>
                      <LayoutDashboard size={15} color={palette.inkSecondary} />
                    </Pressable>
                    <Pressable accessibilityRole="menuitem" onPress={() => go("/account/informations")} style={({ hovered, pressed }) => StyleSheet.flatten([styles.menuItem, hovered && styles.menuItemHovered, pressed && styles.menuItemPressed])}>
                      <Text style={styles.menuItemText}>Mes informations</Text>
                      <UserRound size={15} color={palette.inkSecondary} />
                    </Pressable>
                    <View style={styles.menuSeparator} />
                    <Pressable accessibilityRole="menuitem" onPress={handleSignOut} style={({ hovered, pressed }) => StyleSheet.flatten([styles.menuItem, hovered && styles.menuDangerHovered, pressed && styles.menuItemPressed])}>
                      <Text style={styles.menuDangerText}>Se déconnecter</Text>
                      <LogOut size={15} color={palette.dangerText} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <>
              {!compact ? (
                <HeaderTextAction
                  label="Se connecter"
                  icon={<LogIn size={16} color={palette.ink} />}
                  onPress={() => go("/auth/login")}
                />
              ) : null}
              <Pressable onPress={() => go("/auth/signup")} style={({ pressed, hovered }) => StyleSheet.flatten([styles.primaryButton, hovered && styles.primaryButtonHovered, pressed && styles.actionPressed])}>
                <Text style={styles.primaryText}>S’inscrire</Text>
              </Pressable>
            </>
          )}
        </View>
        </SiteContainer>
      </View>

      {compact ? (
        <View style={styles.bottomNav}>
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            if (item.href === "/account") {
              return (
                <Pressable key={item.href} onPress={() => go(item.href)} onPressIn={() => warmRoute(item.href)} onFocus={() => warmRoute(item.href)} style={styles.bottomItem}>
                  <Icon size={18} color={active ? palette.primaryStrong : palette.muted} />
                  <Text style={StyleSheet.flatten([styles.bottomLabel, active && styles.bottomLabelActive])}>{item.label}</Text>
                </Pressable>
              );
            }
            return <Link key={item.href} href={item.href as Href} asChild>
              <Pressable onPressIn={() => warmRoute(item.href)} onFocus={() => warmRoute(item.href)} style={styles.bottomItem}>
                <Icon size={18} color={active ? palette.primaryStrong : palette.muted} />
                <Text style={StyleSheet.flatten([styles.bottomLabel, active && styles.bottomLabelActive])}>{item.label}</Text>
              </Pressable>
            </Link>;
          })}
        </View>
      ) : null}
    </>
  );
}

function DesktopNavLink({ item, active }: { item: (typeof centerNav)[number]; active: boolean }) {
  const [hovered, setHovered] = useState(false);
  const line = useRef(new Animated.Value(active ? 1 : 0)).current;
  const underlineVisible = active || hovered;
  useEffect(() => {
    Animated.timing(line, { toValue: underlineVisible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [line, underlineVisible]);
  return <Link href={item.href as Href} asChild>
    <Pressable
      aria-current={active ? "page" : undefined}
      accessibilityState={{ selected: active }}
      onHoverIn={() => {
        setHovered(true);
        warmRoute(item.href);
      }}
      onFocus={() => warmRoute(item.href)}
      onPressIn={() => warmRoute(item.href)}
      onHoverOut={() => setHovered(false)}
      style={styles.navItem}
    >
      <Text style={StyleSheet.flatten([styles.navText, active && styles.navTextActive])}>{item.label}</Text>
      <Animated.View style={StyleSheet.flatten([styles.navLine, { transform: [{ scaleX: line }] }])} />
    </Pressable>
  </Link>;
}

function AccountMenuButton({
  buttonRef,
  compact,
  expanded,
  onPress
}: {
  buttonRef: React.MutableRefObject<View | null>;
  compact: boolean;
  expanded: boolean;
  onPress: () => void;
}) {
  const line = useRef(new Animated.Value(0)).current;
  function animate(toValue: number) {
    Animated.timing(line, { toValue, duration: 220, useNativeDriver: true }).start();
  }
  return (
    <Pressable
      ref={(node) => {
        buttonRef.current = node;
      }}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onPress}
      onHoverIn={() => animate(1)}
      onHoverOut={() => animate(0)}
      onFocus={() => animate(1)}
      onBlur={() => animate(0)}
      style={({ pressed }) => StyleSheet.flatten([
        styles.accountButton,
        !compact && styles.accountButtonDesktop,
        pressed && styles.actionPressed
      ])}
    >
      <CircleUserRound size={17} color={palette.ink} />
      {!compact ? <Text style={styles.accountText}>Mon compte</Text> : null}
      <Animated.View style={StyleSheet.flatten([
        styles.navLine,
        styles.accountLine,
        !compact && styles.accountLineDesktop,
        { transform: [{ scaleX: line }] }
      ])} />
    </Pressable>
  );
}

function warmRoute(href: string) {
  if (href === "/themes") prefetchThemePolls("all");
  if (href === "/results") prefetchLatestResults();
}

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    backgroundColor: "rgba(8, 11, 16, 0.98)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.18)",
    zIndex: 5
  },
  headerInner: { minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 18 },
  brand: { flexDirection: "row", alignItems: "center", minWidth: 178 },
  brandCompact: { minWidth: 0 },
  centerNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, flex: 1 },
  navItem: { paddingHorizontal: 14, paddingVertical: 11, position: "relative" },
  navLine: { position: "absolute", left: 14, right: 14, bottom: 4, height: 2, borderRadius: 1, backgroundColor: palette.primaryStrong },
  navText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 13 },
  navTextActive: { color: palette.ink },
  account: { minWidth: 128, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  accountCompact: { minWidth: 0 },
  accountMenuWrap: { position: "relative", zIndex: 30 },
  accountMenuBridge: { position: "absolute", top: 40, left: 0, right: 0, height: 6, zIndex: 34 },
  accountButton: {
    minHeight: 40,
    borderRadius: radius.sm,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
    borderWidth: 0,
    position: "relative"
  },
  accountButtonDesktop: { paddingRight: 0 },
  accountLine: { backgroundColor: STAMIO_CORE_COLORS.editorialAmber },
  accountLineDesktop: { right: 0 },
  accountText: { color: palette.ink, fontFamily: fontFamilyMedium },
  accountMenu: {
    position: "absolute",
    top: 46,
    right: 0,
    minWidth: 172,
    borderRadius: radius.sm,
    backgroundColor: "rgba(10, 16, 23, 0.98)",
    borderWidth: 0,
    paddingVertical: 5,
    paddingHorizontal: 5,
    zIndex: 35
  },
  menuItem: { minHeight: 38, paddingHorizontal: 9, borderRadius: radius.sm, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 9 },
  menuItemHovered: { backgroundColor: palette.surfaceRaised },
  menuDangerHovered: { backgroundColor: palette.dangerSoft },
  menuItemPressed: { opacity: 0.72 },
  menuItemText: { color: palette.ink, fontFamily: fontFamilyMedium, fontSize: 13, textAlign: "right", flexGrow: 1 },
  menuDangerText: { color: palette.dangerText, fontFamily: fontFamilyMedium, fontSize: 13, textAlign: "right", flexGrow: 1 },
  menuSeparator: { height: 1, backgroundColor: palette.line, marginVertical: 4, marginHorizontal: 9 },
  secondaryButton: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "transparent",
    borderWidth: 0
  },
  secondaryText: { color: palette.ink, fontFamily: fontFamilyMedium },
  primaryButton: {
    minHeight: 40,
    minWidth: 40,
    paddingHorizontal: 13,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0
  },
  primaryButtonHovered: { backgroundColor: palette.primary },
  actionHovered: { backgroundColor: palette.surfaceRaised },
  actionPressed: { opacity: 0.78 },
  primaryText: { color: palette.ink, fontFamily: fontFamilySemibold },
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
