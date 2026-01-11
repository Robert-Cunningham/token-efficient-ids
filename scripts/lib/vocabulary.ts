import { loadTokens, ModelId } from './tokenizers.js';

export function buildVocabularyFromWeighted(
  filter: (token: string) => boolean,
  vocabularies: { model: ModelId; weight: number }[],
  outputSize: number
): string[] {
  const scores = new Map<string, number>();

  for (const { model, weight } of vocabularies) {
    const tokens = loadTokens(model);
    for (const token of tokens) {
      if (filter(token)) {
        scores.set(token, (scores.get(token) ?? 0) + weight);
      }
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, outputSize)
    .map(([token]) => token);
}
