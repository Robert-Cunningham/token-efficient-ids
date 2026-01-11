// Bigram-based Markov chain ID generator
// Uses English bigram frequencies to generate pronounceable IDs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Type for the bigram data: [bigram, frequency]
type BigramEntry = [string, number];

// Load bigrams from JSON file
const __dirname = dirname(fileURLToPath(import.meta.url));
const bigrams: BigramEntry[] = JSON.parse(
  readFileSync(join(__dirname, 'bigrams.json'), 'utf-8')
);

// Build transition matrix and unigram frequencies from bigram data
function buildTransitionMatrix(data: BigramEntry[]): {
  transitions: Map<string, { chars: string[]; cdf: number[] }>;
  unigrams: { chars: string[]; cdf: number[] };
} {
  // Count frequencies for transitions: P(next | current)
  const transitionCounts = new Map<string, Map<string, number>>();
  const unigramCounts = new Map<string, number>();

  for (const [bigram, freq] of data) {
    if (bigram.length !== 2 || freq <= 0) continue;

    const [first, second] = bigram;

    // Build transition counts
    if (!transitionCounts.has(first)) {
      transitionCounts.set(first, new Map());
    }
    const nextCounts = transitionCounts.get(first)!;
    nextCounts.set(second, (nextCounts.get(second) || 0) + freq);

    // Build unigram counts (frequency of each character appearing first)
    unigramCounts.set(first, (unigramCounts.get(first) || 0) + freq);
  }

  // Convert to CDF format for efficient sampling
  const transitions = new Map<string, { chars: string[]; cdf: number[] }>();

  for (const [char, nextCounts] of transitionCounts) {
    const chars: string[] = [];
    const cdf: number[] = [];
    let cumulative = 0;
    let total = 0;

    for (const [, count] of nextCounts) {
      total += count;
    }

    for (const [nextChar, count] of nextCounts) {
      chars.push(nextChar);
      cumulative += count / total;
      cdf.push(cumulative);
    }

    // Ensure last CDF value is exactly 1
    if (cdf.length > 0) {
      cdf[cdf.length - 1] = 1;
    }

    transitions.set(char, { chars, cdf });
  }

  // Build unigram CDF
  const unigramChars: string[] = [];
  const unigramCdf: number[] = [];
  let cumulative = 0;
  let total = 0;

  for (const [, count] of unigramCounts) {
    total += count;
  }

  for (const [char, count] of unigramCounts) {
    unigramChars.push(char);
    cumulative += count / total;
    unigramCdf.push(cumulative);
  }

  if (unigramCdf.length > 0) {
    unigramCdf[unigramCdf.length - 1] = 1;
  }

  return {
    transitions,
    unigrams: { chars: unigramChars, cdf: unigramCdf },
  };
}

// Calculate Markov chain entropy per character
// H = -Σ π(i) * Σ P(j|i) * log2(P(j|i))
function calculateEntropyPerChar(data: BigramEntry[]): number {
  // Build probability distributions
  const transitionCounts = new Map<string, Map<string, number>>();
  const unigramCounts = new Map<string, number>();
  let totalBigrams = 0;

  for (const [bigram, freq] of data) {
    if (bigram.length !== 2 || freq <= 0) continue;

    const [first, second] = bigram;
    totalBigrams += freq;

    if (!transitionCounts.has(first)) {
      transitionCounts.set(first, new Map());
    }
    transitionCounts.get(first)!.set(second, freq);
    unigramCounts.set(first, (unigramCounts.get(first) || 0) + freq);
  }

  // Calculate entropy: H = -Σ π(i) * Σ P(j|i) * log2(P(j|i))
  let entropy = 0;

  for (const [char, nextCounts] of transitionCounts) {
    const pi = unigramCounts.get(char)! / totalBigrams; // Stationary distribution ≈ unigram freq
    let charTotal = 0;

    for (const [, count] of nextCounts) {
      charTotal += count;
    }

    let conditionalEntropy = 0;
    for (const [, count] of nextCounts) {
      const pNext = count / charTotal; // P(j|i)
      if (pNext > 0) {
        conditionalEntropy -= pNext * Math.log2(pNext);
      }
    }

    entropy += pi * conditionalEntropy;
  }

  return entropy;
}

// Sample from a CDF using binary search
function sampleFromCdf(chars: string[], cdf: number[], rand: number): string {
  let low = 0;
  let high = cdf.length - 1;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (cdf[mid] < rand) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return chars[low];
}

// Initialize data structures
const { transitions, unigrams } = buildTransitionMatrix(bigrams as BigramEntry[]);

/**
 * Estimated entropy per character for Markov-generated IDs.
 * Based on the conditional entropy of English bigram frequencies.
 */
export const ENTROPY_PER_CHAR = calculateEntropyPerChar(bigrams as BigramEntry[]);

/**
 * Generate a Markov chain ID using English bigram frequencies.
 *
 * @param length - Number of characters to generate
 * @returns A string of the specified length following bigram probabilities
 *
 * @example
 * ```ts
 * markovId(16) // => "thentionanderes"
 * ```
 */
export function markovId(length: number): string {
  if (length <= 0) return '';

  const result: string[] = [];

  // Sample first character from unigram distribution
  let current = sampleFromCdf(unigrams.chars, unigrams.cdf, Math.random());
  result.push(current);

  // Sample subsequent characters from transition probabilities
  for (let i = 1; i < length; i++) {
    const transition = transitions.get(current);

    if (transition && transition.chars.length > 0) {
      current = sampleFromCdf(transition.chars, transition.cdf, Math.random());
    } else {
      // Fallback to unigram sampling if no valid transitions
      current = sampleFromCdf(unigrams.chars, unigrams.cdf, Math.random());
    }

    result.push(current);
  }

  return result.join('');
}
