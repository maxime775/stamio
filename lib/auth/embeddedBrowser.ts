export type AuthDestination = "signup" | "signin";

export type EmbeddedBrowserApp =
  | "instagram"
  | "twitter"
  | "tiktok"
  | "facebook"
  | "android-webview"
  | "ios-webview";

export type EmbeddedBrowserDetection = {
  isEmbedded: boolean;
  app: EmbeddedBrowserApp | null;
};

const NOT_EMBEDDED: EmbeddedBrowserDetection = { isEmbedded: false, app: null };

export function detectEmbeddedBrowser(userAgent: string): EmbeddedBrowserDetection {
  const ua = userAgent.trim();
  if (!ua) return NOT_EMBEDDED;

  if (/\bInstagram\b/i.test(ua)) return embedded("instagram");
  if (/\bTwitter(?:Android| for iPhone)?\b/i.test(ua)) return embedded("twitter");
  if (/\bTikTok\b|\bmusical_ly(?:_|\/|\s|$)|\bBytedanceWebview\b/i.test(ua)) return embedded("tiktok");
  if (/\bFBAN\/|\bFBAV\/|\bFB_IAB\/|\bFB4A\b|\bFBIOS\b/i.test(ua)) return embedded("facebook");

  const isAndroid = /\bAndroid\b/i.test(ua);
  const isAndroidWebView = isAndroid && (
    /;\s*wv\)/i.test(ua)
    || /\bVersion\/4\.0\b[\s\S]*\bChrome\/[^\s]+[\s\S]*\bMobile Safari\//i.test(ua)
  );
  if (isAndroidWebView) return embedded("android-webview");

  const isIos = /\b(?:iPhone|iPad|iPod)\b/i.test(ua);
  const isIosWebKitView = isIos
    && /\bAppleWebKit\//i.test(ua)
    && /\bMobile\//i.test(ua)
    && !/\bSafari\/|\bCriOS\/|\bFxiOS\/|\bEdgiOS\/|\bOPiOS\/|\bDuckDuckGo\/|\bGSA\//i.test(ua);
  if (isIosWebKitView) return embedded("ios-webview");

  return NOT_EMBEDDED;
}

export function detectCurrentEmbeddedBrowser(): EmbeddedBrowserDetection {
  if (typeof navigator === "undefined") return NOT_EMBEDDED;
  return detectEmbeddedBrowser(navigator.userAgent ?? "");
}

export function isCurrentEmbeddedBrowser() {
  return detectCurrentEmbeddedBrowser().isEmbedded;
}

export function ensurePasskeyCeremonyAllowed(userAgent?: string) {
  const detection = userAgent === undefined
    ? detectCurrentEmbeddedBrowser()
    : detectEmbeddedBrowser(userAgent);
  if (detection.isEmbedded) throw new Error("embedded_browser_blocked");
}

export function normalizeAuthDestination(value?: string): AuthDestination {
  return value === "signup" ? "signup" : "signin";
}

export function getAuthDestination(destination: AuthDestination) {
  return destination === "signup" ? "/auth/signup" : "/auth/login";
}

export function getAuthContinueHref(destination: AuthDestination) {
  return `/auth/continue?next=${destination}`;
}

export function getPasskeyEnrollmentResumeHref(params: { flow?: string; next?: string }) {
  const query: string[] = [];
  if (params.flow) query.push(`flow=${encodeURIComponent(params.flow)}`);
  if (params.next) query.push(`next=${encodeURIComponent(params.next)}`);
  return `/auth/passkey-enrollment${query.length > 0 ? `?${query.join("&")}` : ""}`;
}

function embedded(app: EmbeddedBrowserApp): EmbeddedBrowserDetection {
  return { isEmbedded: true, app };
}
