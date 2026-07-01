import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Link, usePathname, useRouter, type Href } from "expo-router";
import { BarChart3, CircleUserRound, Home, Info, Layers3, LogIn, UserPlus } from "lucide-react-native";
import { useAuth } from "@/components/AuthProvider";

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
              <Link key={item.href} href={item.href as Href} asChild>
                <Pressable style={StyleSheet.flatten([styles.navItem, pathname.startsWith(item.href) && styles.navItemActive])}>
                  <Text style={StyleSheet.flatten([styles.navText, pathname.startsWith(item.href) && styles.navTextActive])}>{item.label}</Text>
                </Pressable>
              </Link>
            ))}
          </View>
        ) : null}

        <View style={styles.account}>
          {user && emailVerified ? (
            <Pressable onPress={() => go("/account")} style={styles.accountButton}>
              <CircleUserRound size={17} color="#E2E8F0" />
              {!compact ? <Text style={styles.accountText}>Mon compte</Text> : null}
            </Pressable>
          ) : (
            <>
              {!compact ? (
                <Pressable onPress={() => go("/auth/login")} style={styles.secondaryButton}>
                  <LogIn size={16} color="#CBD5E1" />
                  <Text style={styles.secondaryText}>Se connecter</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => go("/auth/signup")} style={styles.primaryButton}>
                <UserPlus size={16} color="#F8FAFC" />
                {!compact ? <Text style={styles.primaryText}>Créer un compte</Text> : null}
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
              <Pressable key={item.href} onPress={() => go(item.href)} style={styles.bottomItem}>
                <Icon size={19} color={active ? "#0F766E" : "#64748B"} />
                <Text style={StyleSheet.flatten([styles.bottomLabel, active && styles.bottomLabelActive])}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 72,
    paddingHorizontal: 20,
    backgroundColor: "rgba(7, 17, 31, 0.96)",
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
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20, 184, 166, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(167, 243, 208, 0.22)"
  },
  brandMarkText: { color: "#A7F3D0", fontSize: 18, fontWeight: "900" },
  brandText: { color: "#F8FAFC", fontSize: 21, fontWeight: "900", letterSpacing: 0 },
  centerNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, flex: 1 },
  navItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  navItemActive: { backgroundColor: "rgba(20, 184, 166, 0.14)" },
  navText: { color: "#94A3B8", fontSize: 14, fontWeight: "800" },
  navTextActive: { color: "#A7F3D0" },
  account: { minWidth: 128, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  accountButton: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)"
  },
  accountText: { color: "#E2E8F0", fontWeight: "900" },
  secondaryButton: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)"
  },
  secondaryText: { color: "#CBD5E1", fontWeight: "800" },
  primaryButton: {
    minHeight: 40,
    minWidth: 40,
    paddingHorizontal: 13,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#0F766E"
  },
  primaryText: { color: "#F8FAFC", fontWeight: "900" },
  bottomNav: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    minHeight: 64,
    borderRadius: 22,
    backgroundColor: "rgba(8, 13, 27, 0.97)",
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
  bottomLabel: { color: "#94A3B8", fontSize: 10, fontWeight: "800" },
  bottomLabelActive: { color: "#A7F3D0" }
});
