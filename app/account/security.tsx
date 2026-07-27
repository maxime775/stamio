import { Redirect } from "expo-router";

export default function LegacySecurityRedirect() {
  return <Redirect href="/account/informations?section=security" />;
}
