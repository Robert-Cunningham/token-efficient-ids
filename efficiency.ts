#!/usr/bin/env npx tsx

import crypto from 'node:crypto';
import fs from 'node:fs';

import { customTokenId, tokenId } from './src/generator.js';

// For comparison
import { nanoid } from 'nanoid';

const ID_COUNT = 1_000;

const OPENROUTER_MODELS = [
  'openai/gpt-5-nano',
  'anthropic/claude-haiku-4.5',
  'google/gemini-3-flash-preview',
];

// Pre-create custom generators
const claudeId = customTokenId({ model: 'claude' });
const llamaId = customTokenId({ model: 'llama-3' });

interface IDSource {
  name: string;
  generator: () => string;
  entropyBits: number;
}

const ID_SOURCES: IDSource[] = [
  { name: 'tokenId()', generator: () => tokenId(), entropyBits: 70 },
  { name: 'tokenId(7)', generator: () => tokenId(7), entropyBits: 122 },
  { name: 'claude tokenId', generator: claudeId, entropyBits: 70 },
  { name: 'llama-3 tokenId', generator: llamaId, entropyBits: 70 },
  { name: 'nanoid()', generator: () => nanoid(), entropyBits: 126 },
  { name: 'nanoid(10)', generator: () => nanoid(10), entropyBits: 60 },
  { name: 'crypto.randomUUID()', generator: () => crypto.randomUUID(), entropyBits: 122 },
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

interface Metrics {
  entropyBits: number;
  avgTokensPerID: number;
  avgBytesPerID: number;
}

type Results = Record<string, Record<string, Metrics>>;

async function runBenchmark(): Promise<Results> {
  const results: Results = {};

  // Initialize results structure
  for (const model of OPENROUTER_MODELS) {
    results[model] = {};
  }

  // Pre-generate all IDs and content
  const idData = ID_SOURCES.map((source) => {
    const ids = generateIds(source.generator, ID_COUNT);
    const content = ids.join('\n');
    return {
      source,
      content,
      totalBytes: content.length,
    };
  });

  // Build all test tasks
  const tasks = OPENROUTER_MODELS.flatMap((model) =>
    idData.map((data) => ({ model, ...data }))
  );

  // Run all measurements in parallel
  console.error(`Running ${tasks.length} measurements in parallel...`);
  const measurements = await Promise.all(
    tasks.map(async ({ model, source, content, totalBytes }) => {
      const idsTokens = await measureTokens(content, model);
      console.error(`  ${model} / ${source.name}: ${idsTokens / ID_COUNT} tokens/ID`);
      return {
        model,
        sourceName: source.name,
        metrics: {
          entropyBits: source.entropyBits,
          avgTokensPerID: idsTokens / ID_COUNT,
          avgBytesPerID: totalBytes / ID_COUNT,
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

// Main
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
