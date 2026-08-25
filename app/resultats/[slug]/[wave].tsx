import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import Head from "expo-router/head";
import { PollScreen } from "@/app/poll/[pollId]";
import { resolvePublicHistoricalResult, type PublicPollResolution } from "@/lib/api";
import { getHistoricalResultPath, validatePollSeriesSlug } from "@/lib/publicPollUrls";

export default function PublicHistoricalResultRoute() {
  const { slug, wave } = useLocalSearchParams<{ slug: string; wave: string }>();
  const waveNumber = useMemo(() => parseWaveNumber(wave), [wave]);
  const [resolution, setResolution] = useState<PublicPollResolution | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let active = true;
    setResolution(null);
    setResolving(true);

    if (!slug || validatePollSeriesSlug(slug) || waveNumber === null) {
      setResolving(false);
      return () => { active = false; };
    }

    resolvePublicHistoricalResult(slug, waveNumber).then((nextResolution) => {
      if (!active) return;
      setResolution(nextResolution);
      setResolving(false);
    });

    return () => { active = false; };
  }, [slug, waveNumber]);

  return (
    <>
      {!resolving && !resolution ? <Head><meta name="robots" content="noindex, follow" /></Head> : null}
      <PollScreen
        pollId={resolution?.poll_id ?? null}
        resolving={resolving}
        resultsOnly
        canonicalPath={resolution ? getHistoricalResultPath(resolution.series_slug, resolution.wave_number) : undefined}
      />
    </>
  );
}

export function parseWaveNumber(value: string | undefined) {
  const match = /^vague-([1-9]\d*)$/.exec(value ?? "");
  return match ? Number(match[1]) : null;
}
