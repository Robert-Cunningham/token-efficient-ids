#!/usr/bin/env npx tsx

import { estimateTokenIdEntropy } from './entropy.js';
import { loadTokens } from './lib/tokenizers.js';

// Load gpt-4o tokens (properly decoded, special tokens excluded)
// Filter out empty strings which can occur from BPE decoding edge cases
const tokens = loadTokens('gpt-4o').filter((t) => t.length > 0);
const K = tokens.length;

console.log(`gpt-4o tokenizer: ${K.toLocaleString()} tokens`);
console.log(`Naive entropy per token: log2(${K}) = ${Math.log2(K).toFixed(4)} bits\n`);

const SAMPLES = 10000;
console.log(`Computing entropy for N = 1 to 7 concatenated tokens (${SAMPLES} samples)...\n`);
console.log('N  | Naive (bits) | Actual (bits) | Efficiency | Lost (bits)');
console.log('---|--------------|---------------|------------|------------');

for (let N = 1; N <= 7; N++) {
  const naive = N * Math.log2(K);
  const actual = estimateTokenIdEntropy(N, tokens, { samples: SAMPLES });
  const efficiency = (actual / naive) * 100;
  const lost = naive - actual;

  console.log(
    `${N}  | ${naive.toFixed(2).padStart(12)} | ${actual.toFixed(4).padStart(13)} | ${efficiency.toFixed(4).padStart(9)}% | ${lost.toFixed(4).padStart(10)}`
  );
}
