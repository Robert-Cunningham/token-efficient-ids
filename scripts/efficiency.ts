import { nanoid } from 'nanoid';
import fs from 'node:fs';
import { ENTROPY_PER_CHAR, markovId } from '../markov/index.js';
import { tokenId } from '../src/generator';
import { measureEfficiency } from "./lib/efficiency";

interface IDSource {
  name: string;
  generator: () => string;
  entropyBits: number;
}

const ID_SOURCES: IDSource[] = [
  // { name: 'tokenId()', generator: () => tokenId(), entropyBits: 70 },
  { name: 'tokenId(7)', generator: () => tokenId(7), entropyBits: 122 },
  // { name: 'claude tokenId', generator: claudeId, entropyBits: 70 },
  // { name: 'llama-3 tokenId', generator: llamaId, entropyBits: 70 },
  { name: 'nanoid()', generator: () => nanoid(), entropyBits: 126 },
  // { name: 'nanoid(10)', generator: () => nanoid(10), entropyBits: 60 },
  { name: 'crypto.randomUUID()', generator: () => crypto.randomUUID(), entropyBits: 122 },
  { name: 'markov(37)', generator: () => markovId(37), entropyBits: ENTROPY_PER_CHAR * 37 },
];

const ID_COUNT = 1_000;

const OPENROUTER_MODELS = [
  'openai/gpt-5-nano',
  'anthropic/claude-haiku-4.5',
  'google/gemini-3-flash-preview',
];

async function runBenchmark() {
  const results = {};

  // Initialize results structure
  for (const model of OPENROUTER_MODELS) {
    results[model] = {};
  }

  // Build all test tasks
  const tasks = OPENROUTER_MODELS.flatMap((model) =>
    ID_SOURCES.map((source) => ({ model, source }))
  );

  // Run all measurements in parallel
  console.error(`Running ${tasks.length} measurements in parallel...`);
  const measurements = await Promise.all(
    tasks.map(async ({ model, source }) => {
      const metrics = await measureEfficiency(model, ID_COUNT, source.generator);
      console.error(`  ${model} / ${source.name}: ${metrics.avgTokensPerID} tokens/ID`);
      return {
        model,
        sourceName: source.name,
        metrics: {
          ...metrics,
          entropyBits: source.entropyBits,
        },
      };
    })
  );

  // Populate results from measurements
  for (const { model, sourceName, metrics } of measurements) {
    results[model][sourceName] = metrics;
  }

  return results;
}

runBenchmark()
  .then((results) => {
    const output = JSON.stringify(results, null, 2);
    const outputPath = 'efficiency-results.json';
    fs.writeFileSync(outputPath, output);
    console.error(`Results written to ${outputPath}`);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });