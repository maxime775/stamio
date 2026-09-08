import { THEMES } from "./product";
import type { PollWithStats, ThemeSlug } from "./types";

export type ThemeVoteTotal = {
  theme: ThemeSlug;
  votes: number;
};

export function aggregateVotesByTheme(polls: readonly Pick<PollWithStats, "theme" | "totalVotes">[]): ThemeVoteTotal[] {
  const totals = Object.fromEntries(THEMES.map(({ slug }) => [slug, 0])) as Record<ThemeSlug, number>;
  for (const poll of polls) {
    if (poll.theme) totals[poll.theme] += poll.totalVotes;
  }
  return THEMES.map(({ slug }) => ({ theme: slug, votes: totals[slug] }));
}

export function getAggregatedVotesLabel(value: number) {
  return value === 1 ? "vote agrégé" : "votes agrégés";
}

export function formatAggregatedVotes(value: number) {
  return `${value} ${getAggregatedVotesLabel(value)}`;
}
