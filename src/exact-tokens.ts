// Exact-token ID generator using rejection sampling
// Generates IDs that tokenize to exactly N tokens for GPT-4o

import { encode } from 'gpt-tokenizer/model/gpt-4o';

/**
 * Count the number of GPT-4o tokens in a string
 */
export function countTokens(str: string): number {
  return encode(str).length;
}

/**
 * Estimate the entropy of exact-token ID generation.
 *
 * The naive entropy is tokenCount * log2(vocabSize), but rejection sampling
 * reduces entropy because we're conditioning on a subset of outputs.
 *
 * actual_entropy = naive_entropy + log2(acceptance_rate)
 *
 * @param vocabulary - The vocabulary to sample from
 * @param tokenCount - Target number of tokens
 * @param samples - Number of samples for estimating acceptance rate (default: 1000)
 * @returns Estimated entropy in bits
 */
export function estimateExactTokensEntropy(
  vocabulary: string[],
  tokenCount: number,
  samples: number = 1000
): number {
  const tokens = vocabulary.filter((t) => t.length > 0);
  if (tokens.length === 0) return 0;

  const naiveEntropy = tokenCount * Math.log2(tokens.length);

  // Estimate acceptance rate by generating candidates
  let accepted = 0;

  for (let i = 0; i < samples; i++) {
    // Generate a candidate by sampling tokenCount vocab tokens
    const parts: string[] = [];
    for (let j = 0; j < tokenCount; j++) {
      const idx = Math.floor(Math.random() * tokens.length);
      parts.push(tokens[idx]);
    }

    const candidate = parts.join('');
    if (countTokens(candidate) === tokenCount) {
      accepted++;
    }
  }

  const acceptanceRate = accepted / samples;

  if (acceptanceRate === 0) {
    return 0;
  }

  // Entropy loss from rejection sampling = -log2(acceptance_rate)
  const entropyLoss = -Math.log2(acceptanceRate);

  return Math.max(0, naiveEntropy - entropyLoss);
}

export interface ExactTokensOptions {
  /** Vocabulary to sample from */
  vocabulary: string[];
  /** Exact number of tokens the output should have */
  tokenCount: number;
  /** Maximum rejection attempts before giving up (default: 1000) */
  maxAttempts?: number;
}

/**
 * Initialize an ID generator that produces strings with exactly N GPT-4o tokens.
 * Uses rejection sampling: generates candidate IDs and keeps only those that
 * tokenize to exactly the specified token count.
 *
 * @example
 * ```ts
 * import { initExactTokens } from 'token-efficient-ids/exact-tokens'
 * import { gpt4o } from 'token-efficient-ids/dictionaries'
 *
 * const generateId = initExactTokens({
 *   vocabulary: gpt4o,
 *   tokenCount: 4
 * })
 *
 * const id = generateId() // Always tokenizes to exactly 4 tokens
 * ```
 */
export function initExactTokens(options: ExactTokensOptions): () => string {
  const { vocabulary, tokenCount, maxAttempts = 10000 } = options;

  // Filter out empty strings
  const tokens = vocabulary.filter((t) => t.length > 0);
  if (tokens.length === 0) {
    throw new Error('Vocabulary must contain at least one non-empty token');
  }

  return (): string => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Sample tokenCount random tokens and join them
      const parts: string[] = [];
      for (let i = 0; i < tokenCount; i++) {
        const idx = Math.floor(Math.random() * tokens.length);
        parts.push(tokens[idx]);
      }

      const candidate = parts.join('');

      // Accept if it tokenizes to exactly tokenCount tokens
      if (countTokens(candidate) === tokenCount) {
        // console.log('nth attempt', attempt);
        process.stdout.write('.');
        return candidate;
      }
    }

    throw new Error(
      `Failed to generate ID with exactly ${tokenCount} tokens after ${maxAttempts} attempts`
    );
  };
}
