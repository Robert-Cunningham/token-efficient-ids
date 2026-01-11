#!/usr/bin/env npx tsx

import { nanoid } from 'nanoid';
import fs from 'node:fs';
import { gpt4o } from '../src/dictionaries/index.js';
import { estimateExactTokensEntropy, initExactTokens } from '../src/exact-tokens.js';
import { createAllowFilter } from '../src/filter.js';
import { tokenId } from '../src/generator.js';
import { init } from '../src/index.js';
import { measureEfficiency } from './lib/efficiency.js';
import { estimateTokenIdEntropy } from './lib/entropy.js';
import { buildVocabularyFromWeighted } from './lib/vocabulary.js';

// Pre-build vocabularies so they can be used in both generator and entropy calculation
const lowercaseMerged = buildVocabularyFromWeighted(
  createAllowFilter({unicode: false, punctuation: false, uppercase: false, whitespace: false, numbers: false }),
  [{ model: 'gpt-4o', weight: 1 }, { model: 'claude', weight: 1}, {model: 'deepseek-v3', weight: 1}, {model: 'llama-4', weight: 1 }, {model: 'qwen-3', weight: 1}],
  1000000000
);

const openaiLowercase = buildVocabularyFromWeighted(
  createAllowFilter({unicode: false, punctuation: false }),
  [{ model: 'gpt-4o', weight: 1 }],
  1000000000
);

const openaiNoSpaces = buildVocabularyFromWeighted(
  createAllowFilter({unicode: false, punctuation: false, whitespace: false }),
  [{ model: 'gpt-4o', weight: 1 }],
  1000000000
);

/*
console.time('exactly 8 tokens');
const generator = initExactTokens({ vocabulary: lowercaseMerged, tokenCount: 8 });
for (let i = 0; i < 100; i++) {
  console.log('exactly 8 tokens', generator());
}
console.timeEnd('exactly 8 tokens');
*/

// console.log(lowercaseVocab.slice(1000, 1010));

// process.exit(0);

interface IDSource {
  name: string;
  generator: () => string;
  computeEntropy: () => number;
}

const ID_SOURCES: IDSource[] = [
  {
    name: 'token(8)',
    generator: () => tokenId(8),
    computeEntropy: () => estimateTokenIdEntropy(8, gpt4o, { samples: 3000 }),
  },
  {
    name: 'lowercase-token(8)',
    generator: init({ vocabulary: lowercaseMerged, count: 8 }),
    computeEntropy: () => estimateTokenIdEntropy(8, lowercaseMerged, { samples: 3000 }),
  },
  /*
  {
    name: 'openai-lowercase-token(8)',
    generator: init({ vocabulary: openaiLowercase, count: 8 }),
    computeEntropy: () => estimateTokenIdEntropy(8, openaiLowercase, { samples: 3000 }),
  },
  {
    name: 'openai-no-spaces(8)',
    generator: init({ vocabulary: openaiNoSpaces, count: 8 }),
    computeEntropy: () => estimateTokenIdEntropy(8, openaiNoSpaces, { samples: 3000 }),
  },
  */
  {
    name: 'exact-tokens(8)',
    generator: initExactTokens({ vocabulary: lowercaseMerged, tokenCount: 8 }),
    // Entropy adjusted for rejection sampling loss
    computeEntropy: () => estimateExactTokensEntropy(lowercaseMerged, 8, 2000),
  },
  {
    name: 'nanoid()',
    generator: () => nanoid(),
    // nanoid(21) uses 64-char alphabet, 21 chars = 21 * log2(64) = 126 bits
    // No collisions possible since each char is independent
    computeEntropy: () => 21 * Math.log2(64),
  },
  {
    name: 'random-bigint',
    generator: () => {
      const bytes = new Uint8Array(16); // 128 bits
      crypto.getRandomValues(bytes);
      let n = 0n;
      for (const b of bytes) n = (n << 8n) | BigInt(b);
      return n.toString();
    },
    // 128 bits of entropy, represented as decimal digits
    computeEntropy: () => 128,
  },
  /*
  {
    name: 'crypto.randomUUID()',
    generator: () => crypto.randomUUID(),
    // UUID v4 has 122 bits of randomness (128 - 6 version/variant bits)
    computeEntropy: () => 122,
  },
  {
    name: 'markov(37)',
    generator: () => markovId(37),
    computeEntropy: () => ENTROPY_PER_CHAR * 37,
  },
  */
];

const ID_COUNT = 1_000;

const OPENROUTER_MODELS = [
  'openai/gpt-5-nano',
  'anthropic/claude-haiku-4.5',
  'google/gemini-3-flash-preview',
  'deepseek/deepseek-v3.2',
];

interface SourceResult {
  entropyBits: number;
  tokensPerId: Record<string, number>;
  bytesPerId: number;
  charsPerId: number;
  examples: string[];
}

type Results = Record<string, SourceResult>;

async function runBenchmark(): Promise<Results> {
  const results: Results = {};

  // First, compute entropy and generate examples for each source
  console.error('Computing entropy for each source...');
  for (const source of ID_SOURCES) {
    console.error(`  ${source.name}...`);
    const entropy = source.computeEntropy();
    const examples = [source.generator(), source.generator(), source.generator()];
    results[source.name] = {
      entropyBits: entropy,
      tokensPerId: {},
      bytesPerId: 0,
      charsPerId: 0,
      examples,
    };
    console.error(`    ${entropy.toFixed(2)} bits`);
  }

  // Build all test tasks
  const tasks = OPENROUTER_MODELS.flatMap((model) =>
    ID_SOURCES.map((source) => ({ model, source }))
  );

  // Run all efficiency measurements in parallel
  console.error(`\nRunning ${tasks.length} efficiency measurements in parallel...`);
  const measurements = await Promise.all(
    tasks.map(async ({ model, source }) => {
      const metrics = await measureEfficiency(model, ID_COUNT, source.generator);
      const entropyBits = results[source.name].entropyBits;
      const bitsPerToken = entropyBits / metrics.avgTokensPerID;
      console.error(`  ${model} / ${source.name}: ${metrics.avgTokensPerID.toFixed(2)} tokens/ID (${bitsPerToken.toFixed(1)} bits/token)`);
      return {
        model,
        sourceName: source.name,
        metrics,
      };
    })
  );

  // Populate results from measurements
  for (const { model, sourceName, metrics } of measurements) {
    results[sourceName].tokensPerId[model] = metrics.avgTokensPerID;
    // bytes/chars are the same across models, just use the last one
    results[sourceName].bytesPerId = metrics.avgBytesPerID;
    results[sourceName].charsPerId = metrics.avgCharsPerID;
  }

  return results;
}

runBenchmark()
  .then((results) => {
    const output = JSON.stringify(results, null, 2);
    const outputPath = 'compare-results.json';
    fs.writeFileSync(outputPath, output);
    console.error(`\nResults written to ${outputPath}`);

    // Print summary table
    console.log('\n=== Summary ===\n');
    console.log('Source               | Entropy | Avg Tokens | Bits/Token | Chars');
    console.log('---------------------|---------|------------|------------|------');
    for (const [name, data] of Object.entries(results)) {
      const tokenCounts = Object.values(data.tokensPerId);
      const avgTokens = tokenCounts.reduce((sum, t) => sum + t, 0) / tokenCounts.length;
      const bitsPerToken = data.entropyBits / avgTokens;
      console.log(
        `${name.padEnd(20)} | ${data.entropyBits.toFixed(0).padStart(7)} | ${avgTokens.toFixed(2).padStart(10)} | ${bitsPerToken.toFixed(1).padStart(10)} | ${data.charsPerId.toFixed(0).padStart(5)}`
      );
      console.log(`  examples: ${data.examples.join(', ')}`);
    }
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
