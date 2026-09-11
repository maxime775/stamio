import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { AuthForm } from "@/components/AuthForm";
import { PageShell } from "@/components/PageShell";
import {
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
};

export function AuthBrowserGate(props: GateProps) {
  const detection = detectCurrentEmbeddedBrowser();
  if (!detection.isEmbedded) return <>{props.children}</>;

  return (
    <PageShell compact>
      <ExternalBrowserAuth app={detection.app} />
    </PageShell>
  );
}

export function ExternalBrowserAuth({ app }: InterstitialProps) {
  return (
    <AuthForm
      title="Continuez dans votre navigateur"
      subtitle="Pour créer votre clé d'accès avec Face ID ou votre appareil, ouvrez Stamio dans Safari, Chrome ou votre navigateur habituel."
      maxWidth={390}
      compact
    >
      <Text style={styles.help}>{getEmbeddedBrowserInstruction(app)}</Text>
    </AuthForm>
  );
}

function getEmbeddedBrowserInstruction(app: EmbeddedBrowserApp | null) {
  if (app === "instagram") return "Dans Instagram, touchez ••• puis choisissez l'option pour ouvrir la page dans votre navigateur.";
  if (app === "tiktok") return "Dans TikTok, ouvrez le menu de la page puis choisissez l'option pour ouvrir Stamio dans votre navigateur.";
  if (app === "twitter") return "Dans X, ouvrez le menu de la page puis choisissez l'option pour ouvrir Stamio dans votre navigateur.";
  if (app === "facebook") return "Dans Facebook, ouvrez le menu de la page puis choisissez l'option pour ouvrir Stamio dans votre navigateur.";
  return "Utilisez le menu de cette page pour l'ouvrir dans votre navigateur.";
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
