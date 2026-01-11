#!/usr/bin/env npx tsx


// For comparison

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
  const totalBytes = await countBytes(content);
  const totalChars = [...content].length;

  const totalTokens = await measureTokens(content, model);

  return {
    avgTokensPerID: totalTokens / idCount,
    avgBytesPerID: totalBytes / idCount,
    avgCharsPerID: totalChars / idCount,
  };
}

export async function countBytes(content: string): Promise<number> {
  return textEncoder.encode(content).length;
}
