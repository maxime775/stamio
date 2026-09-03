import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type Ref, type SetStateAction } from "react";
import {
  Animated,
  Easing,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type PointerEvent as ReactNativePointerEvent,
  type ViewStyle
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Copy, Ellipsis, MessageCircleMore, Share2, XBrandIcon } from "@/lib/icons";
import { ACCOUNT_MENU_CLOSE_DELAY_MS, cancelAccountMenuClose, scheduleAccountMenuClose } from "@/lib/accountMenuHover";
import { STAMIO_CORE_COLORS, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";
import { getQuestionSharePayload, getWhatsAppShareUrl, getXShareUrl } from "@/lib/questionSharing";
import { useReducedMotion } from "@/lib/useReducedMotion";

type TriggerRenderProps = {
  accessibilityLabel: string;
  expanded: boolean;
  onBlur: () => void;
  onFocus: () => void;
  onPress: () => void;
  triggerRef: Ref<View>;
};

type Props = {
  question: string;
  seriesSlug: string;
  renderTrigger?: (props: TriggerRenderProps) => ReactNode;
};

type MenuPlacement = {
  alignRight: boolean;
  openAbove: boolean;
  railLeft: number | null;
};

const EDITORIAL_AMBER = STAMIO_CORE_COLORS.editorialAmber;
const COMPACT_MENU_GAP = 6;
const RAIL_TRIGGER_GAP = 14;
const VIEWPORT_MARGIN = 8;
const DESKTOP_RAIL_MIN_WIDTH = 760;
const MOBILE_NAV_HEIGHT = 60;
const MOBILE_SHEET_GAP = 12;
const MOBILE_SHEET_MAX_WIDTH = 360;
const COPY_FEEDBACK_MS = 1800;
const RAIL_OPEN_DURATION_MS = 180;
const RAIL_CLOSE_DURATION_MS = 140;
const RAIL_STAGGER_MS = 25;

export function QuestionShareMenu({ question, seriesSlug, renderTrigger }: Props) {
  const payload = useMemo(() => getQuestionSharePayload(question, seriesSlug), [question, seriesSlug]);
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const safeAreaInsets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const wrapperRef = useRef<View | null>(null);
  const menuRef = useRef<View | null>(null);
  const triggerRef = useRef<View | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressFocusOpenRef = useRef(false);
  const railOpacity = useRef(new Animated.Value(0)).current;
  const underlineProgress = useRef(new Animated.Value(0)).current;
  const itemAnimations = useMemo(() => [0, 1, 2, 3].map(() => new Animated.Value(0)), []);
  const [open, setOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inlineHovered, setInlineHovered] = useState(false);
  const [inlineFocused, setInlineFocused] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [hoverCapable, setHoverCapable] = useState(false);
  const [triggerSize, setTriggerSize] = useState({ width: 0, height: 0 });
  const [menuSize, setMenuSize] = useState({ width: 0, height: 0 });
  const [placement, setPlacement] = useState<MenuPlacement>({ alignRight: false, openAbove: false, railLeft: null });
  const [webShareAvailable, setWebShareAvailable] = useState(false);
  const horizontalRail = !renderTrigger && Platform.OS === "web" && viewportWidth >= DESKTOP_RAIL_MIN_WIDTH;
  const mobileSheet = !renderTrigger && Platform.OS === "web" && !horizontalRail;
  const triggerActive = menuMounted || inlineHovered || inlineFocused;

  function clearCloseTimer() {
    cancelAccountMenuClose(closeTimerRef);
  }

  function containsShareTarget(target: EventTarget | null) {
    if (typeof Node === "undefined" || !(target instanceof Node)) return false;
    const wrapper = wrapperRef.current as unknown as { contains?: (node: Node) => boolean } | null;
    const menu = menuRef.current as unknown as { contains?: (node: Node) => boolean } | null;
    return Boolean(wrapper?.contains?.(target) || menu?.contains?.(target));
  }

  function openMenu() {
    clearCloseTimer();
    if (mobileSheet) setActiveItem(null);
    setMenuMounted(true);
    setOpen(true);
  }

  function closeMenu() {
    clearCloseTimer();
    setOpen(false);
    if (mobileSheet) setMenuMounted(false);
  }

  function openMenuFromPointer(event: ReactNativePointerEvent) {
    if (event.nativeEvent.pointerType === "touch" || !hoverCapable) return;
    openMenu();
  }

  function scheduleCloseFromPointer(event: ReactNativePointerEvent) {
    if (event.nativeEvent.pointerType === "touch" || !hoverCapable) return;
    scheduleAccountMenuClose({
      timerRef: closeTimerRef,
      delay: ACCOUNT_MENU_CLOSE_DELAY_MS,
      shouldRemainOpen: () => Platform.OS === "web" && typeof document !== "undefined" && containsShareTarget(document.activeElement),
      onClose: () => setOpen(false)
    });
  }

  function handleTriggerFocus() {
    setInlineFocused(true);
    if (mobileSheet || suppressFocusOpenRef.current) return;
    openMenu();
  }

  function handleTriggerBlur() {
    setInlineFocused(false);
  }

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateHoverCapability = () => setHoverCapable(query.matches);
    updateHoverCapability();
    query.addEventListener?.("change", updateHoverCapability);
    return () => query.removeEventListener?.("change", updateHoverCapability);
  }, []);

  useEffect(() => {
    setWebShareAvailable(Platform.OS === "web" && typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => () => {
    clearCloseTimer();
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, []);

  useEffect(() => {
    clearCloseTimer();
    setOpen(false);
    setMenuMounted(false);
    setCopied(false);
    railOpacity.setValue(0);
    itemAnimations.forEach((animation) => animation.setValue(0));
  }, [itemAnimations, payload?.url, railOpacity]);

  useEffect(() => {
    if (!menuMounted) return;
    if (mobileSheet) {
      if (!open) setMenuMounted(false);
      return;
    }
    railOpacity.stopAnimation();
    itemAnimations.forEach((animation) => animation.stopAnimation());

    if (reducedMotion) {
      railOpacity.setValue(open ? 1 : 0);
      itemAnimations.forEach((animation) => animation.setValue(open ? 1 : 0));
      if (!open) setMenuMounted(false);
      return;
    }

    if (open) {
      Animated.parallel([
        Animated.timing(railOpacity, {
          toValue: 1,
          duration: RAIL_OPEN_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.stagger(RAIL_STAGGER_MS, itemAnimations.map((animation) => Animated.timing(animation, {
          toValue: 1,
          duration: RAIL_CLOSE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })))
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(railOpacity, {
        toValue: 0,
        duration: RAIL_CLOSE_DURATION_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }),
      ...itemAnimations.map((animation) => Animated.timing(animation, {
        toValue: 0,
        duration: RAIL_CLOSE_DURATION_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }))
    ]).start(({ finished }) => {
      if (finished) setMenuMounted(false);
    });
  }, [itemAnimations, menuMounted, mobileSheet, open, railOpacity, reducedMotion]);

  useEffect(() => {
    underlineProgress.stopAnimation();
    Animated.timing(underlineProgress, {
      toValue: triggerActive ? 1 : 0,
      duration: reducedMotion ? 1 : 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [reducedMotion, triggerActive, underlineProgress]);

  useEffect(() => {
    if (!menuMounted || mobileSheet || Platform.OS !== "web" || typeof document === "undefined") return;

    function closeFromOutsidePointer(event: PointerEvent) {
      if (containsShareTarget(event.target)) {
        clearCloseTimer();
        return;
      }
      closeMenu();
    }

    function closeFromOutsideFocus(event: FocusEvent) {
      if (containsShareTarget(event.target)) {
        clearCloseTimer();
        return;
      }
      closeMenu();
    }

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      suppressFocusOpenRef.current = true;
      const trigger = triggerRef.current as unknown as HTMLElement | null;
      trigger?.focus?.();
      requestAnimationFrame(() => {
        suppressFocusOpenRef.current = false;
      });
    }

    document.addEventListener("pointerdown", closeFromOutsidePointer);
    document.addEventListener("focusin", closeFromOutsideFocus);
    window.addEventListener("keydown", closeFromEscape, true);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutsidePointer);
      document.removeEventListener("focusin", closeFromOutsideFocus);
      window.removeEventListener("keydown", closeFromEscape, true);
    };
  }, [menuMounted, mobileSheet]);

  useEffect(() => {
    if (!menuMounted || mobileSheet || menuSize.width === 0 || menuSize.height === 0) return;
    wrapperRef.current?.measureInWindow((x, y, width, height) => {
      if (horizontalRail) {
        const preferredLeft = width + RAIL_TRIGGER_GAP;
        const leftFallback = -menuSize.width - RAIL_TRIGGER_GAP;
        const fitsRight = x + preferredLeft + menuSize.width <= viewportWidth - VIEWPORT_MARGIN;
        const fitsLeft = x + leftFallback >= VIEWPORT_MARGIN;
        const clampedLeft = Math.min(
          viewportWidth - VIEWPORT_MARGIN - menuSize.width - x,
          Math.max(VIEWPORT_MARGIN - x, preferredLeft)
        );
        setPlacement({
          alignRight: false,
          openAbove: false,
          railLeft: fitsRight ? preferredLeft : fitsLeft ? leftFallback : clampedLeft
        });
        return;
      }

      const alignRight = x + menuSize.width > viewportWidth - VIEWPORT_MARGIN;
      const roomBelow = viewportHeight - (y + height + COMPACT_MENU_GAP) - VIEWPORT_MARGIN;
      const roomAbove = y - COMPACT_MENU_GAP - VIEWPORT_MARGIN;
      setPlacement({
        alignRight,
        openAbove: roomBelow < menuSize.height && roomAbove >= menuSize.height,
        railLeft: null
      });
    });
  }, [horizontalRail, menuMounted, menuSize.height, menuSize.width, mobileSheet, viewportHeight, viewportWidth]);

  if (!payload) return null;

  async function copyLink() {
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload!.url);
      } else {
        await Clipboard.setStringAsync(payload!.url);
      }
      if (mobileSheet) {
        closeMenu();
        return;
      }
      setCopied(true);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      setCopied(false);
    }
  }

  function openExternalShare(url: string) {
    closeMenu();
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (opened) opened.opener = null;
      return;
    }
    void Linking.openURL(url);
  }

  async function openNativeShare() {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    closeMenu();
    try {
      await navigator.share(payload!);
    } catch {
      // Cancelling the native share sheet is an expected no-op.
    }
  }

  const menuPosition: ViewStyle = horizontalRail ? {
    left: placement.railLeft ?? triggerSize.width + RAIL_TRIGGER_GAP,
    top: Math.round((triggerSize.height - menuSize.height) / 2),
    maxWidth: viewportWidth - VIEWPORT_MARGIN * 2
  } : {
    left: placement.alignRight ? undefined : 0,
    right: placement.alignRight ? 0 : undefined,
    top: placement.openAbove ? undefined : triggerSize.height + COMPACT_MENU_GAP,
    bottom: placement.openAbove ? triggerSize.height + COMPACT_MENU_GAP : undefined,
    maxWidth: viewportWidth - VIEWPORT_MARGIN * 2
  };
  const bridgePosition: ViewStyle = horizontalRail ? {
    left: (placement.railLeft ?? triggerSize.width + RAIL_TRIGGER_GAP) < 0 ? -RAIL_TRIGGER_GAP : triggerSize.width,
    top: 0,
    width: RAIL_TRIGGER_GAP,
    height: Math.max(triggerSize.height, menuSize.height)
  } : {
    left: 0,
    right: 0,
    height: COMPACT_MENU_GAP,
    top: placement.openAbove ? undefined : triggerSize.height,
    bottom: placement.openAbove ? triggerSize.height : undefined
  };
  const triggerProps: TriggerRenderProps = {
    accessibilityLabel: "Partager cette question",
    expanded: open,
    onBlur: handleTriggerBlur,
    onFocus: handleTriggerFocus,
    onPress: openMenu,
    triggerRef
  };
  const mobileSheetWidth = Math.min(MOBILE_SHEET_MAX_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2);
  const menuItems = (
    <>
      <ShareMenuItem
        animation={itemAnimations[0]}
        compact={!horizontalRail}
        centerLabel={mobileSheet}
        immediate={mobileSheet}
        label={copied ? "Lien copié" : "Copier le lien"}
        icon={<Copy size={18} color={palette.inkSecondary} strokeWidth={1.8} />}
        active={activeItem === "copy"}
        onActiveChange={(active) => setActiveItem(active ? "copy" : null)}
        onPress={() => void copyLink()}
      />
      <ShareMenuItem
        animation={itemAnimations[1]}
        compact={!horizontalRail}
        centerLabel={mobileSheet}
        immediate={mobileSheet}
        label="X"
        icon={<XBrandIcon size={16} color={palette.inkSecondary} />}
        active={activeItem === "x"}
        onActiveChange={(active) => setActiveItem(active ? "x" : null)}
        onPress={() => openExternalShare(getXShareUrl(payload))}
      />
      <ShareMenuItem
        animation={itemAnimations[2]}
        compact={!horizontalRail}
        centerLabel={mobileSheet}
        immediate={mobileSheet}
        label="WhatsApp"
        icon={<MessageCircleMore size={18} color={palette.inkSecondary} strokeWidth={1.8} />}
        active={activeItem === "whatsapp"}
        onActiveChange={(active) => setActiveItem(active ? "whatsapp" : null)}
        onPress={() => openExternalShare(getWhatsAppShareUrl(payload))}
      />
      {webShareAvailable ? (
        <ShareMenuItem
          animation={itemAnimations[3]}
          compact={!horizontalRail}
          centerLabel={mobileSheet}
          immediate={mobileSheet}
          label="Plus d'options"
          icon={<Ellipsis size={18} color={palette.inkSecondary} strokeWidth={1.8} />}
          active={activeItem === "more"}
          onActiveChange={(active) => setActiveItem(active ? "more" : null)}
          onPress={() => void openNativeShare()}
        />
      ) : null}
    </>
  );

  return (
    <View
      ref={wrapperRef}
      onLayout={updateSize(setTriggerSize)}
      onPointerEnter={openMenuFromPointer}
      onPointerLeave={scheduleCloseFromPointer}
      style={styles.wrapper}
    >
      {renderTrigger ? renderTrigger(triggerProps) : (
        <Pressable
          ref={triggerRef}
          accessibilityLabel={triggerProps.accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onHoverIn={() => setInlineHovered(true)}
          onHoverOut={() => setInlineHovered(false)}
          onFocus={handleTriggerFocus}
          onBlur={handleTriggerBlur}
          onPress={openMenu}
          style={({ pressed }) => StyleSheet.flatten([
            styles.inlineTrigger,
            (triggerActive || pressed) && styles.inlineTriggerActive
          ])}
        >
          <Share2 size={16} color={EDITORIAL_AMBER} strokeWidth={1.8} />
          <View style={styles.inlineLabelWrap}>
            <Text style={styles.inlineLabel}>Partager</Text>
            <Animated.View style={StyleSheet.flatten([
              styles.inlineUnderline,
              { transform: [{ scaleX: underlineProgress }] }
            ])} />
          </View>
        </Pressable>
      )}

      {menuMounted && !mobileSheet ? <View pointerEvents="box-only" style={StyleSheet.flatten([styles.hoverBridge, bridgePosition])} /> : null}

      {menuMounted && !mobileSheet ? (
        <Animated.View
          ref={menuRef}
          accessibilityLabel="Options de partage"
          accessibilityRole="menu"
          onLayout={updateSize(setMenuSize)}
          onPointerEnter={openMenuFromPointer}
          onPointerLeave={scheduleCloseFromPointer}
          pointerEvents={open ? "auto" : "none"}
          style={StyleSheet.flatten([
            horizontalRail ? styles.desktopRail : styles.compactMenu,
            menuPosition,
            { opacity: railOpacity }
          ])}
        >
          {menuItems}
        </Animated.View>
      ) : null}

      {mobileSheet && menuMounted ? (
        <Modal transparent visible onRequestClose={closeMenu} statusBarTranslucent>
          <View style={styles.mobileOverlay}>
            <Pressable
              accessibilityLabel="Fermer les options de partage"
              accessibilityRole="button"
              onPress={closeMenu}
              style={styles.mobileBackdrop}
            />
            <Animated.View
              ref={menuRef}
              accessibilityLabel="Options de partage"
              accessibilityRole="menu"
              accessibilityViewIsModal
              onLayout={updateSize(setMenuSize)}
              pointerEvents={open ? "auto" : "none"}
              style={StyleSheet.flatten([
                styles.compactMenu,
                styles.mobileSheet,
                {
                  bottom: MOBILE_NAV_HEIGHT + MOBILE_SHEET_GAP + safeAreaInsets.bottom,
                  left: Math.round((viewportWidth - mobileSheetWidth) / 2),
                  opacity: 1,
                  width: mobileSheetWidth
                }
              ])}
            >
              {menuItems}
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function ShareMenuItem({ animation, compact, centerLabel = false, immediate = false, label, icon, active, onActiveChange, onPress }: {
  animation: Animated.Value;
  compact: boolean;
  centerLabel?: boolean;
  immediate?: boolean;
  label: string;
  icon: ReactNode;
  active: boolean;
  onActiveChange: (active: boolean) => void;
  onPress: () => void;
}) {
  return (
    <Animated.View style={immediate ? styles.menuItemImmediate : {
      opacity: animation,
      transform: [{ translateX: animation.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }]
    }}>
      <Pressable
        accessibilityRole="menuitem"
        onHoverIn={() => onActiveChange(true)}
        onHoverOut={() => onActiveChange(false)}
        onFocus={() => onActiveChange(true)}
        onBlur={() => onActiveChange(false)}
        onPress={onPress}
        style={({ pressed }) => StyleSheet.flatten([
          styles.menuItem,
          compact ? styles.compactMenuItem : styles.railItem,
          centerLabel && styles.mobileMenuItem,
          !active && styles.menuItemResting,
          compact && active && styles.compactMenuItemActive,
          pressed && styles.menuItemPressed
        ])}
      >
        <View pointerEvents="none" style={styles.menuIcon}>{icon}</View>
        {centerLabel ? (
          <View pointerEvents="none" style={styles.mobileMenuLabelWrap}>
            <Text numberOfLines={1} style={styles.menuLabel}>{label}</Text>
          </View>
        ) : <Text numberOfLines={1} style={styles.menuLabel}>{label}</Text>}
      </Pressable>
    </Animated.View>
  );
}

function updateSize(setSize: Dispatch<SetStateAction<{ width: number; height: number }>>) {
  return (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => current.width === width && current.height === height ? current : { width, height });
  };
}

const webPointerStyle = Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : null;

const styles = StyleSheet.create({
  wrapper: { position: "relative", alignSelf: "flex-start", zIndex: 45 },
  inlineTrigger: {
    alignSelf: "flex-start",
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: 0,
    opacity: 1,
    ...webPointerStyle
  },
  inlineTriggerActive: { opacity: 0.8 },
  inlineLabelWrap: { position: "relative", paddingBottom: 2 },
  inlineLabel: { color: EDITORIAL_AMBER, fontFamily: fontFamilySemibold, fontSize: 13, lineHeight: 18 },
  inlineUnderline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: EDITORIAL_AMBER,
    transformOrigin: "left center"
  },
  hoverBridge: { position: "absolute", backgroundColor: "transparent", zIndex: 46 },
  desktopRail: {
    position: "absolute",
    alignSelf: "flex-start",
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 14,
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    zIndex: 50
  },
  compactMenu: {
    position: "absolute",
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceRaised,
    padding: 5,
    borderWidth: 0,
    shadowColor: "#00060E",
    shadowOpacity: 0.26,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 10,
    zIndex: 50
  },
  mobileOverlay: { flex: 1 },
  mobileBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 6, 15, 0.62)", zIndex: 1 },
  mobileSheet: {
    position: "absolute",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: palette.lineStrong,
    zIndex: 3
  },
  menuItemImmediate: { opacity: 1 },
  menuItem: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "transparent",
    ...webPointerStyle
  },
  railItem: { paddingHorizontal: 0 },
  compactMenuItem: { alignSelf: "stretch", paddingHorizontal: 9, borderRadius: radius.xs },
  mobileMenuItem: { position: "relative" },
  mobileMenuLabelWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  compactMenuItemActive: { backgroundColor: palette.surfaceSubtle },
  menuItemResting: { opacity: 0.76 },
  menuItemPressed: { opacity: 0.6 },
  menuIcon: { width: 18, height: 20, alignItems: "center", justifyContent: "center" },
  menuLabel: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 18 }
});
