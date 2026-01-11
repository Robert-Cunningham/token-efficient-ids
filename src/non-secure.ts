// Token-Efficient IDs (Non-Secure)
// Uses Math.random() - faster but not cryptographically secure

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

export interface InitOptions {
  /** Vocabulary to use for ID generation */
  vocabulary: string[];
  /** Number of tokens per generated ID (default: 4) */
  count?: number;
}

/**
 * Initialize a non-secure ID generator with the given options.
 * Uses Math.random() - faster but not cryptographically secure.
 *
 * @example
 * ```ts
 * import { init } from 'token-efficient-ids/non-secure'
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
  const { vocabulary, count = 4 } = options;

  // Filter out empty strings
  const tokens = vocabulary.filter((t) => t.length > 0);
  if (tokens.length === 0) {
    throw new Error('Vocabulary must contain at least one non-empty token');
  }

  const bitsPerToken = Math.ceil(Math.log2(tokens.length));
  const bytesPerToken = Math.ceil(bitsPerToken / 8);
  const mask = (1 << bitsPerToken) - 1;

  // Redundancy factor for rejection sampling
  const step = Math.ceil((1.6 * bytesPerToken * count) / 0.8);

  return (): string => {
    const parts: string[] = [];
    let selected = 0;

    while (selected < count) {
      const bytes = random(step);
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
