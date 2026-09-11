import { Redirect, useLocalSearchParams } from "expo-router";
import { AuthBrowserGate } from "@/components/AuthBrowserGate";
import {
  getAuthDestination,
  normalizeAuthDestination
} from "@/lib/auth/embeddedBrowser";

export default function ContinueAuthPage() {
  const params = useLocalSearchParams<{ next?: string | string[] }>();
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = normalizeAuthDestination(rawNext);

  return (
    <AuthBrowserGate next={next}>
      <Redirect href={getAuthDestination(next)} />
    </AuthBrowserGate>
  );
}
