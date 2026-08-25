export function getAggregatedVotesLabel(value: number) {
  return value === 1 ? "vote agrégé" : "votes agrégés";
}

export function formatAggregatedVotes(value: number) {
  return `${value} ${getAggregatedVotesLabel(value)}`;
}
