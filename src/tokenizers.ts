import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All supported model IDs
export const MODELS = [
  // OpenAI
  'gpt-3',
  'gpt-4',
  'gpt-4o',
  // Anthropic
  'claude',
  // Meta Llama
  'llama',
  'llama-2',
  'llama-3',
  'llama-3.1',
  'llama-3.2',
  'llama-4',
  // Mistral
  'mistral-v1',
  'mistral-v3',
  'mistral-nemo',
  // Google
  'gemma',
  'gemma-2',
  // xAI
  'grok-1',
  // Cohere
  'command-r',
  'command-r-plus',
  // Databricks
  'dbrx',
  // Shanghai AI
  'internlm2',
  // NVIDIA
  'nemotron',
  // DeepSeek
  'deepseek-v3',
  'deepseek-r1',
  // Alibaba
  'qwen-2.5',
  'qwen-3',
  // Microsoft
  'phi-4',
  // Moonshot
  'kimi-k2',
  // 01.AI
  'yi',
] as const;

export type ModelId = (typeof MODELS)[number];

// Tokenizer JSON structure
interface TokenizerJson {
  model: {
    vocab: Record<string, number>;
  };
  added_tokens: Array<{
    id: number;
    content: string;
    special: boolean;
  }>;
}

// Cache for loaded tokenizers
const tokenizerCache = new Map<ModelId, string[]>();

/**
 * Get the path to a tokenizer file
 */
function getTokenizerPath(model: ModelId): string {
  // In development, tokenizers are relative to src
  // In production (dist), they're relative to dist
  const tokenizerDir = path.resolve(__dirname, '..', 'tokenizers');
  return path.join(tokenizerDir, `${model}.json`);
}

/**
 * Load tokens for a model (internal use only)
 * Returns an array of token strings, sorted by token ID, excluding special tokens
 */
export function loadTokens(model: ModelId): string[] {
  // Check cache first
  const cached = tokenizerCache.get(model);
  if (cached) {
    return cached;
  }

  const tokenizerPath = getTokenizerPath(model);

  if (!fs.existsSync(tokenizerPath)) {
    throw new Error(
      `Tokenizer file not found for model "${model}". ` +
        `Expected path: ${tokenizerPath}. ` +
        `Run "pnpm download" to download tokenizer files.`
    );
  }

  const data: TokenizerJson = JSON.parse(fs.readFileSync(tokenizerPath, 'utf-8'));

  // Get vocabulary: { token: id, ... }
  const vocab = data.model.vocab;

  // Get special tokens to exclude
  const specialTokens = new Set(
    (data.added_tokens || []).filter((t) => t.special).map((t) => t.content)
  );

  // Convert to array, filter special tokens, sort by ID
  const tokens = Object.entries(vocab)
    .filter(([token]) => !specialTokens.has(token))
    .sort((a, b) => a[1] - b[1])
    .map(([token]) => token);

  // Cache the result
  tokenizerCache.set(model, tokens);

  return tokens;
}

/**
 * Get the vocabulary size for a model (excluding special tokens)
 */
export function getVocabSize(model: ModelId): number {
  return loadTokens(model).length;
}

/**
 * Check if a model ID is valid
 */
export function isValidModel(model: string): model is ModelId {
  return MODELS.includes(model as ModelId);
}

/**
 * Clear the tokenizer cache
 */
export function clearCache(): void {
  tokenizerCache.clear();
}
