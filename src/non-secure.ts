import { loadTokens, type ModelId } from './tokenizers.js';

/**
 * Non-secure random byte generator using Math.random().
 * Faster than crypto but not suitable for security-sensitive applications.
 */
function random(bytes: number): Uint8Array {
  const result = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) {
    result[i] = (Math.random() * 256) | 0;
  }
  return result;
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

export interface GeneratorOptions {
  /** Model tokenizer to use (default: 'gpt-4o') */
  model?: ModelId;
  /** Number of tokens in generated ID (default: 4) */
  size?: number;
}

/**
 * Create a custom non-secure ID generator.
 *
 * @example
 * ```ts
 * const claudeId = customTokenId({ model: 'claude' })
 * claudeId() // Uses Claude tokenizer, Math.random()
 * ```
 */
export function customTokenId(options: GeneratorOptions = {}) {
  const model = options.model ?? 'gpt-4o';
  const defaultSize = options.size ?? 4;

  const tokens = loadTokens(model);
  const bitsPerToken = Math.ceil(Math.log2(tokens.length));
  const bytesPerToken = Math.ceil(bitsPerToken / 8);
  const mask = (1 << bitsPerToken) - 1;
  const step = Math.ceil((1.6 * bytesPerToken * defaultSize) / 0.8);

  return (size = defaultSize): string => {
    let id = '';
    let selected = 0;

    while (selected < size) {
      const bytes = random(step);
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

let defaultGenerator: ((size?: number) => string) | null = null;

/**
 * Generate a token-efficient ID using Math.random().
 *
 * Faster than the secure version but not suitable for security-sensitive applications.
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
