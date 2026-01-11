#!/usr/bin/env npx tsx

import crypto from 'node:crypto';
import fs from 'node:fs';
import { customTokenId, tokenId } from '../src/generator.js';

// For comparison
import { nanoid } from 'nanoid';
import { ENTROPY_PER_CHAR, markovId } from '../markov/index.js';
import { claude, llama4 } from '../src/dictionaries/index.js';

const ID_COUNT = 1_000;

const OPENROUTER_MODELS = [
  'openai/gpt-5-nano',
  'anthropic/claude-haiku-4.5',
  'google/gemini-3-flash-preview',
];

// Pre-create custom generators
const claudeId = customTokenId({ tokens: claude });
const llamaId = customTokenId({ tokens: llama4 });

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

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterResponse {
  usage?: TokenUsage;
  error?: { message: string; code?: number; metadata?: unknown };
}

async function measureTokens(content: string, model: string): Promise<number> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      max_tokens: 16,
      usage: { include: true },
    }),
  });

  const data = (await response.json()) as OpenRouterResponse;

  if (data.error) {
    throw new Error(`OpenRouter API error: ${JSON.stringify(data.error, null, 2)}`);
  }

  if (!data.usage) {
    throw new Error('No usage data in response');
  }

  return data.usage.prompt_tokens;
}

function generateIds(generator: () => string, count: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(generator());
  }
  return ids;
}

export interface Metrics {
  avgTokensPerID: number;
  avgBytesPerID: number;
  avgCharsPerID: number;
}

/**
 * Measure token efficiency for an ID generator against a specific model.
 *
 * @param model - OpenRouter model identifier (e.g., 'openai/gpt-4o')
 * @param idCount - Number of IDs to generate for measurement
 * @param generator - Function that generates a single ID
 * @returns Metrics with average tokens and bytes per ID
 */
const textEncoder = new TextEncoder();

export async function measureEfficiency(
  model: string,
  idCount: number,
  generator: () => string
): Promise<Metrics> {
  const ids = generateIds(generator, idCount);
  const content = ids.join('\n');
  const totalBytes = textEncoder.encode(content).length;
  const totalChars = [...content].length;

  const totalTokens = await measureTokens(content, model);

  return {
    avgTokensPerID: totalTokens / idCount,
    avgBytesPerID: totalBytes / idCount,
    avgCharsPerID: totalChars / idCount,
  };
}

interface BenchmarkMetrics extends Metrics {
  entropyBits: number;
}

type Results = Record<string, Record<string, BenchmarkMetrics>>;

async function runBenchmark(): Promise<Results> {
  const results: Results = {};

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