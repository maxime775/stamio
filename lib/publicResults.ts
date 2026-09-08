import type { PollResult } from "./types";

// Presentation only, for the displayed poll/wave. Never filter its history.
export const PUBLIC_RESULTS_MIN_VOTES = 10;

export function getTotalVotes(results: readonly Pick<PollResult, "votes">[]) {
  return results.reduce((total, result) => total + Number(result.votes ?? 0), 0);
}

export function canShowPublicResults(totalVotes: number) {
  return totalVotes >= PUBLIC_RESULTS_MIN_VOTES;
}
