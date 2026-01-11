#!/usr/bin/env npx tsx

import { ENTROPY_PER_CHAR, markovId } from '../markov/index.js';
import {
  alphanumeric,
  claude,
  gpt4o,
  llama4,
  lowercaseAlphanumeric,
} from '../src/dictionaries/index.js';
import { buildVocabulary } from '../src/index.js';
import { estimateTokenIdEntropy } from './lib/entropy.js';

interface Vocabulary {
  name: string;
  tokens: string[];
}

const VOCABULARIES: Vocabulary[] = [
  { name: 'gpt4o', tokens: gpt4o },
  { name: 'claude', tokens: claude },
  { name: 'llama4', tokens: llama4 },
  { name: 'lowercaseAlphanumeric', tokens: lowercaseAlphanumeric },
  { name: 'alphanumeric', tokens: alphanumeric },
  { name: 'small', tokens: buildVocabulary(gpt4o, { filter: (t: string) => t.length <= 3})}
];

const SAMPLES = 5000;
const TOKEN_COUNTS = [4, 7]; // Common ID lengths

console.log('Token-Efficient IDs - Entropy Analysis');
console.log('======================================\n');

// Test dictionary-based vocabularies
for (const { name, tokens } of VOCABULARIES) {
  const filtered = tokens.filter((t) => t.length > 0);
  const K = filtered.length;
  const naivePerToken = Math.log2(K);

  console.log(`${name}: ${K.toLocaleString()} tokens (${naivePerToken.toFixed(2)} bits/token naive)`);
  console.log('-'.repeat(60));
  console.log('N tokens | Naive (bits) | Actual (bits) | Efficiency | Lost');
  console.log('---------|--------------|---------------|------------|-----');

  for (const N of TOKEN_COUNTS) {
    const naive = N * naivePerToken;
    const actual = estimateTokenIdEntropy(N, filtered, { samples: SAMPLES });
    const efficiency = (actual / naive) * 100;
    const lost = naive - actual;

    console.log(
      `${String(N).padStart(8)} | ${naive.toFixed(2).padStart(12)} | ${actual.toFixed(2).padStart(13)} | ${efficiency.toFixed(1).padStart(9)}% | ${lost.toFixed(2).padStart(4)}`
    );
  }
  console.log('');
}

// Test Markov generator
console.log('Markov (bigram-based): lowercase letters only');
console.log('-'.repeat(60));
console.log(`Entropy per character: ${ENTROPY_PER_CHAR.toFixed(4)} bits`);
console.log('');
console.log('Char length | Entropy (bits) | Equivalent uniform chars (log2(26))');
console.log('------------|----------------|------------------------------------');

for (const len of [16, 24, 37, 50]) {
  const entropy = ENTROPY_PER_CHAR * len;
  const equivUniform = entropy / Math.log2(26);
  console.log(
    `${String(len).padStart(11)} | ${entropy.toFixed(2).padStart(14)} | ${equivUniform.toFixed(1).padStart(35)}`
  );
}

console.log('');
console.log('Sample Markov IDs:');
for (let i = 0; i < 5; i++) {
  console.log(`  ${markovId(37)}`);
}
