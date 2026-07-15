import { memo } from "react";
import { HeroThemeNetwork3D } from "@/components/HeroThemeNetwork3D";
import type { OpenPollStats } from "@/lib/types";

export const FeaturedTopicsTicker = memo(function FeaturedTopicsTicker({ stats }: { stats: OpenPollStats | null }) {
  return <HeroThemeNetwork3D stats={stats} />;
});
