// Token-Efficient IDs
// Generate IDs optimized for LLM token efficiency

import { webcrypto as crypto } from 'node:crypto';
import { createAllowFilter, type AllowOptions } from './filter.js';

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

function random(bytes: number): Uint8Array {
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
  let value = 0;
  for (let i = 0; i < bytesPerToken; i++) {
    value = (value << 8) | randomBytes[offset + i];
  }
  value = value & mask;
  if (value >= tokens.length) return null;
  return tokens[value];
}

// ============================================================================
// New API
// ============================================================================

export interface InitOptions {
  /** Vocabulary to use for ID generation */
  vocabulary: string[];
  /** Number of tokens per generated ID (default: 4) */
  count?: number;
  /** Custom random byte generator (defaults to crypto.getRandomValues) */
  random?: (bytes: number) => Uint8Array;
}

/**
 * Initialize an ID generator with the given options.
 *
 * @example
 * ```ts
 * import { init } from 'token-efficient-ids'
 * import { lowercaseStandard } from 'token-efficient-ids/dictionaries'
 *
 * const generateId = init({
 *   vocabulary: lowercaseStandard,
 *   count: 4
 * })
 *
 * generateId() // => "foobar123xyz"
 * ```
 */
export function init(options: InitOptions): () => string {
  const { vocabulary, count = 4, random: getRandom = random } = options;

  // Filter out empty strings
  const tokens = vocabulary.filter((t) => t.length > 0);
  if (tokens.length === 0) {
    throw new Error('Vocabulary must contain at least one non-empty token');
  }

  const bitsPerToken = Math.ceil(Math.log2(tokens.length));
  const bytesPerToken = Math.ceil(bitsPerToken / 8);
  const mask = (1 << bitsPerToken) - 1;

  // Redundancy factor for rejection sampling (1.6 is optimal per nanoid benchmarks)
  const step = Math.ceil((1.6 * bytesPerToken * count) / 0.8);

  return (): string => {
    const parts: string[] = [];
    let selected = 0;

    while (selected < count) {
      const bytes = getRandom(step);
      let offset = 0;

      while (offset + bytesPerToken <= bytes.length && selected < count) {
        const token = selectToken(tokens, bytes, offset, bytesPerToken, mask);
        offset += bytesPerToken;

        if (token !== null) {
          parts.push(token);
          selected++;
        }
      }
    }

    return parts.join('');
  };
}

// ============================================================================
// Vocabulary helpers
// ============================================================================

export interface BuildVocabularyOptions {
  /** Filter function to include/exclude tokens */
  filter?: (token: string) => boolean;
  /** Token filtering options (alternative to filter function) */
  allow?: AllowOptions;
  /** Maximum number of tokens to include */
  count?: number;
}

/**
 * Build a filtered/limited vocabulary from an existing vocabulary.
 *
 * @example
 * ```ts
 * import { buildVocabulary } from 'token-efficient-ids'
 * import { gpt4oVocab } from 'token-efficient-ids/dictionaries'
 *
 * // Filter to only lowercase tokens, limit to 4096
 * const vocab = buildVocabulary(gpt4oVocab, {
 *   allow: { uppercase: false, unicode: false },
 *   count: 4096
 * })
 * ```
 */
export function buildVocabulary(
  vocabulary: string[],
  options: BuildVocabularyOptions = {}
): string[] {
  let result = vocabulary;

  // Apply filter
  if (options.filter) {
    result = result.filter(options.filter);
  } else if (options.allow) {
    const filter = createAllowFilter(options.allow);
    result = result.filter(filter);
  }

  // Filter out empty strings
  result = result.filter((t) => t.length > 0);

  // Limit count
  if (options.count !== undefined && options.count < result.length) {
    result = result.slice(0, options.count);
  }

  return result;
}

// ============================================================================
// Re-exports
// ============================================================================

export type { AllowOptions } from './filter.js';
