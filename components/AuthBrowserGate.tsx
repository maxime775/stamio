import { useState, type ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { AuthForm } from "@/components/AuthForm";
import { HeroActionButton } from "@/components/HeroActionButton";
import { PageShell } from "@/components/PageShell";
import {
  getAuthContinueHref,
  detectCurrentEmbeddedBrowser,
  type AuthDestination,
  type EmbeddedBrowserApp
} from "@/lib/auth/embeddedBrowser";
import { fontFamilyMedium, palette } from "@/lib/design";

type GateTarget = { next: AuthDestination } | { resumeHref: string };

type GateProps = GateTarget & {
  children: ReactNode;
};

type InterstitialProps = {
  app: EmbeddedBrowserApp | null;
  href: string;
};

export function AuthBrowserGate(props: GateProps) {
  const detection = detectCurrentEmbeddedBrowser();
  if (!detection.isEmbedded) return <>{props.children}</>;

  const href = "resumeHref" in props
    ? props.resumeHref
    : getAuthContinueHref(props.next);

  return (
    <PageShell compact>
      <ExternalBrowserAuth app={detection.app} href={href} />
    </PageShell>
  );
}

export function ExternalBrowserAuth({ app, href }: InterstitialProps) {
  const [openAttempted, setOpenAttempted] = useState(false);

  function openBrowser() {
    setOpenAttempted(true);
    if (typeof window === "undefined") return;
    const url = new URL(href, window.location.href);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  return (
    <AuthForm
      title="Continuez dans votre navigateur"
      subtitle="Pour créer votre clé d'accès avec Face ID ou votre appareil, ouvrez Stamio dans Safari, Chrome ou votre navigateur habituel."
      maxWidth={390}
      compact
    >
      <HeroActionButton
        compact
        elevated={false}
        fullWidth
        label="Continuer dans mon navigateur"
        onPress={openBrowser}
        showArrow={false}
        variant="primary"
      />
      <Text style={styles.help}>
        {openAttempted
          ? getPostOpenHelp(app)
          : "Si rien ne s'ouvre, touchez ••• puis « Ouvrir dans le navigateur »."}
      </Text>
    </AuthForm>
  );
}

function getPostOpenHelp(app: EmbeddedBrowserApp | null) {
  if (app === "instagram") return "Si Stamio reste ouvert dans Instagram, touchez ••• puis « Ouvrir dans le navigateur ».";
  if (app === "twitter") return "Si Stamio reste ouvert dans X, touchez ••• puis « Ouvrir dans le navigateur ».";
  if (app === "tiktok") return "Si Stamio reste ouvert dans TikTok, touchez ••• puis « Ouvrir dans le navigateur ».";
  if (app === "facebook") return "Si Stamio reste ouvert dans Facebook, touchez ••• puis « Ouvrir dans le navigateur ».";
  return "Si Stamio reste ouvert dans cette application, touchez ••• puis « Ouvrir dans le navigateur ».";
}

const styles = StyleSheet.create({
  help: {
    color: palette.muted,
    fontFamily: fontFamilyMedium,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center"
  }
});
