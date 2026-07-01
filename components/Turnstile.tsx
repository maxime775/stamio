import { useEffect, useId, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";

type Props = {
  siteKey?: string;
  onToken: (token: string) => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (selector: string, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function Turnstile({ siteKey, onToken }: Props) {
  const id = `turnstile-${useId().replace(/:/g, "")}`;
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || !siteKey) return;

    function renderWidget() {
      if (!window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(`#${id}`, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        theme: "light"
      });
    }

    if (!document.querySelector("script[data-turnstile]")) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = "true";
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      renderWidget();
    }

    const interval = window.setInterval(renderWidget, 250);
    return () => {
      window.clearInterval(interval);
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [id, onToken, siteKey]);

  if (Platform.OS !== "web") return null;

  return (
    <View style={styles.box}>
      <View nativeID={id} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 68,
    justifyContent: "center",
    alignItems: "center"
  }
});
