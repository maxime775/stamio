export type FinalFrenchPunctuationParts = {
  leadingText: string;
  nonBreakingTail: string;
};

export function splitFinalFrenchPunctuation(value: string): FinalFrenchPunctuationParts | null {
  const match = /^([\s\S]*?)(\S+)\s+([?!:;])$/u.exec(value);
  if (!match) return null;

  return {
    leadingText: match[1],
    nonBreakingTail: `${match[2]}\u202F${match[3]}`
  };
}
