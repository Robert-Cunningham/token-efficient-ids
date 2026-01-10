import { webcrypto as crypto } from 'node:crypto';
import { loadTokens, type ModelId } from './tokenizers.js';

// Pool-based random generation (like nanoid) to minimize crypto syscalls
const POOL_SIZE_MULTIPLIER = 128;
let pool: Uint8Array<ArrayBuffer> | null = null;
let poolOffset = 0;

function fillPool(bytes: number): void {
  if (!pool || pool.length < bytes) {
    pool = new Uint8Array(bytes * POOL_SIZE_MULTIPLIER);
    crypto.getRandomValues(pool);
    poolOffset = 0;
  } else if (poolOffset + bytes > pool.length) {
    crypto.getRandomValues(pool);
    poolOffset = 0;
  }
  poolOffset += bytes;
}

export function random(bytes: number): Uint8Array {
  fillPool((bytes |= 0));
  return pool!.subarray(poolOffset - bytes, poolOffset);
}

/**
 * Select a token from the vocabulary using random bytes.
 * Uses rejection sampling for uniform distribution.
 */
function selectToken(
  tokens: string[],
  randomBytes: Uint8Array,
  offset: number,
  bytesPerToken: number,
  mask: number
): string | null {
  // Read bytes and combine into integer
  let value = 0;
  for (let i = 0; i < bytesPerToken; i++) {
    value = (value << 8) | randomBytes[offset + i];
  }

  // Mask to exact bits needed
  value = value & mask;

  // Reject if >= vocab size (ensures uniform distribution)
  if (value >= tokens.length) return null;

  return tokens[value];
}

export interface GeneratorOptions {
  /** Model tokenizer to use (default: 'gpt-4o') */
  model?: ModelId;
  /** Number of tokens in generated ID (default: 4) */
  size?: number;
  /** Custom random byte generator */
  random?: (bytes: number) => Uint8Array;
}

/**
 * Create a custom ID generator with full control over randomness.
 *
 * @example
 * ```ts
 * const seededId = customRandom({
 *   model: 'gpt-4o',
 *   random: (bytes) => mySeededRng(bytes)
 * })
 * seededId() // Deterministic with seed
 * ```
 */
export function customRandom(options: GeneratorOptions = {}) {
  const model = options.model ?? 'gpt-4o';
  const defaultSize = options.size ?? 4;
  const getRandom = options.random ?? random;

  const tokens = loadTokens(model);
  const bitsPerToken = Math.ceil(Math.log2(tokens.length));
  const bytesPerToken = Math.ceil(bitsPerToken / 8);
  const mask = (1 << bitsPerToken) - 1;

  // Redundancy factor for rejection sampling (1.6 is optimal per nanoid benchmarks)
  const step = Math.ceil((1.6 * bytesPerToken * defaultSize) / 0.8);

  return (size = defaultSize): string => {
    let id = '';
    let selected = 0;

    while (selected < size) {
      const bytes = getRandom(step);
      let offset = 0;

      while (offset + bytesPerToken <= bytes.length && selected < size) {
        const token = selectToken(tokens, bytes, offset, bytesPerToken, mask);
        offset += bytesPerToken;

        if (token !== null) {
          id += token;
          selected++;
        }
      }
    }

    return id;
  };
}

/**
 * Create a custom ID generator for a specific model.
 *
 * @example
 * ```ts
 * const claudeId = customTokenId({ model: 'claude' })
 * claudeId()    // Uses Claude tokenizer
 * claudeId(6)   // 6 tokens
 * ```
 */
export function customTokenId(options: Omit<GeneratorOptions, 'random'> = {}) {
  return customRandom({ ...options, random });
}

// Cached default generator for performance
let defaultGenerator: ((size?: number) => string) | null = null;

/**
 * Generate a token-efficient ID.
 *
 * Uses gpt-4o tokenizer by default. Each token provides ~17.6 bits of entropy.
 * - 4 tokens (default): ~70 bits entropy
 * - 7 tokens: ~123 bits entropy (comparable to UUID)
 *
 * @example
 * ```ts
 * tokenId()     // 4 tokens, ~70 bits
 * tokenId(7)    // 7 tokens, ~123 bits
 * ```
 */
export function tokenId(size = 4): string {
  if (!defaultGenerator) {
    defaultGenerator = customTokenId({ model: 'gpt-4o' });
  }
  return defaultGenerator(size);
}
