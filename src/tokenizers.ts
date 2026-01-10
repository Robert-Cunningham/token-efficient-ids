import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GPT-2 bytes_to_unicode reverse mapping
// Maps Unicode code points back to original bytes
function buildUnicodeToBytes(): Map<number, number> {
  const map = new Map<number, number>();

  // Bytes that map to themselves (printable ranges)
  // 33-126 (! to ~), 161-172 (¡ to ¬), 174-255 (® to ÿ)
  for (let b = 33; b <= 126; b++) map.set(b, b);
  for (let b = 161; b <= 172; b++) map.set(b, b);
  for (let b = 174; b <= 255; b++) map.set(b, b);

  // Bytes that get remapped to 256+ range
  // Order: 0-32, 127-160, 173
  let n = 0;
  for (let b = 0; b <= 32; b++) map.set(256 + n++, b);
  for (let b = 127; b <= 160; b++) map.set(256 + n++, b);
  map.set(256 + n, 173);

  return map;
}

const UNICODE_TO_BYTES = buildUnicodeToBytes();

/**
 * Decode a BPE token from GPT-2 byte encoding to actual string
 */
function decodeToken(token: string): string {
  const bytes: number[] = [];
  for (const char of token) {
    const codePoint = char.codePointAt(0)!;
    const byte = UNICODE_TO_BYTES.get(codePoint);
    if (byte !== undefined) {
      bytes.push(byte);
    } else {
      // Character not in mapping - encode as UTF-8
      const encoded = new TextEncoder().encode(char);
      bytes.push(...encoded);
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

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

  // Convert to array, filter special tokens, sort by ID, decode BPE encoding
  const tokens = Object.entries(vocab)
    .filter(([token]) => !specialTokens.has(token))
    .sort((a, b) => a[1] - b[1])
    .map(([token]) => decodeToken(token));

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
