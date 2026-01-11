#!/usr/bin/env npx tsx

import { customTokenId } from '../src/generator.js';
import { measureEfficiency } from './lib/efficiency.js';
import { estimateTokenIdEntropy } from './lib/entropy.js';
import { buildVocabularyFromWeighted } from './lib/vocabulary.js';

// Filter: only lowercase ASCII letters
const lowercaseOnly = (token: string): boolean => {
  for (const char of token) {
    const code = char.charCodeAt(0);
    if (code < 97 || code > 122) return false; // 'a' = 97, 'z' = 122
  }
  return true;
};

// Build vocabulary from OpenAI and Claude, weighted equally
const VOCAB_SIZE = 10_000;
const TOKEN_COUNT = 4;

const vocab = buildVocabularyFromWeighted(
  lowercaseOnly,
  [
    { model: 'gpt-4o', weight: 1 },
    { model: 'claude', weight: 1 },
  ],
  VOCAB_SIZE
);

// Create ID generator using the custom vocabulary
const generateId = customTokenId({ tokens: vocab, size: TOKEN_COUNT });

console.log(`Built vocabulary: ${vocab.length} lowercase-only tokens`);
console.log(`Sample tokens: ${vocab.slice(0, 10).join(', ')}`);
console.log(`Sample IDs: ${Array.from({ length: 5 }, () => generateId()).join(', ')}`);
console.log();

// Estimate entropy for different token counts
const SAMPLES = 5000;
console.log(`Estimating entropy (${SAMPLES} samples)...`);
console.log();
console.log('N  | Naive (bits) | Actual (bits) | Efficiency | Lost (bits)');
console.log('---|--------------|---------------|------------|------------');

const K = vocab.length;
for (let N = 1; N <= 5; N++) {
  const naive = N * Math.log2(K);
  const actual = estimateTokenIdEntropy(N, vocab, { samples: SAMPLES });
  const efficiency = (actual / naive) * 100;
  const lost = naive - actual;

  console.log(
    `${N}  | ${naive.toFixed(2).padStart(12)} | ${actual.toFixed(4).padStart(13)} | ${efficiency.toFixed(4).padStart(9)}% | ${lost.toFixed(4).padStart(10)}`
  );
}

// Test OpenRouter efficiency
const OPENROUTER_MODELS = [
  'openai/gpt-5-nano',
  'anthropic/claude-haiku-4.5',
];

const ID_COUNT = 500;

console.log();
console.log(`Measuring OpenRouter efficiency (${ID_COUNT} IDs, ${TOKEN_COUNT} tokens each)...`);
console.log();

async function runOpenRouterTests() {
  for (const model of OPENROUTER_MODELS) {
    try {
      const metrics = await measureEfficiency(model, ID_COUNT, generateId);
      console.log(`${model}:`);
      console.log(`  Avg tokens/ID: ${metrics.avgTokensPerID.toFixed(2)}`);
      console.log(`  Avg bytes/ID:  ${metrics.avgBytesPerID.toFixed(2)}`);
      console.log(`  Avg chars/ID:  ${metrics.avgCharsPerID.toFixed(2)}`);
      console.log();
    } catch (error) {
      console.error(`${model}: Error - ${error instanceof Error ? error.message : error}`);
    }
  }
}

runOpenRouterTests().catch(console.error);
