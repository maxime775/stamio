import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import Head from "expo-router/head";
import { PollScreen } from "@/app/poll/[pollId]";
import { resolvePublicQuestion, type PublicPollResolution } from "@/lib/api";
import { getHistoricalResultPath, getQuestionPath, validatePollSeriesSlug } from "@/lib/publicPollUrls";

export default function PublicQuestionRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [resolution, setResolution] = useState<PublicPollResolution | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let active = true;
    setResolution(null);
    setResolving(true);

    if (!slug || validatePollSeriesSlug(slug)) {
      setResolving(false);
      return () => { active = false; };
    }

    resolvePublicQuestion(slug).then((nextResolution) => {
      if (!active) return;
      if (nextResolution?.route_kind === "resultats") {
        router.replace(getHistoricalResultPath(nextResolution.series_slug, nextResolution.wave_number) as Href);
        return;
      }
      setResolution(nextResolution);
      setResolving(false);
    });

    return () => { active = false; };
  }, [router, slug]);

  return (
    <>
      {!resolving && !resolution ? <Head><meta name="robots" content="noindex, follow" /></Head> : null}
      <PollScreen
        pollId={resolution?.poll_id ?? null}
        resolving={resolving}
        canonicalPath={resolution ? getQuestionPath(resolution.series_slug) : undefined}
      />
    </>
  );
}
