/**
 * Estimate the Shannon entropy (in **bits**) of a string ID formed by:
 *
 *   y = "".join(_.times(count, () => _.sample(tokens)))
 *
 * i.e. you draw `count = N` tokens **uniformly with replacement** from a vocabulary
 * array `tokens` (length `K`) and concatenate their string forms with **no separator**.
 *
 * ---
 * ## Why the entropy is *not* just `N * log2(K)`
 * Let:
 *   - X = (T1, …, TN) be the random **token sequence**, where each Ti is uniform over K choices.
 *   - Y = f(X) be the **concatenated string**, `Y = T1 || T2 || ... || TN`.
 *
 * The token-sequence entropy is exactly:
 *
 *   H(X) = N * log2(K)
 *
 * But concatenation can be **many-to-one**: different token sequences can yield the same string
 * (ambiguous segmentations). This reduces the entropy of Y.
 *
 * Define the *preimage size*:
 *
 *   m(y) = #{ x in tokens^N : f(x) = y }
 *
 * i.e. the number of length-N token sequences whose concatenation equals `y`.
 *
 * Because X is uniform over K^N sequences, conditioning on Y=y yields a uniform distribution
 * over those m(y) sequences, so:
 *
 *   H(X | Y = y) = log2(m(y))
 *
 * Therefore:
 *
 *   H(Y) = H(X) - H(X|Y)
 *        = N*log2(K) - E[ log2(m(Y)) ]
 *
 * This function estimates H(Y) via Monte Carlo:
 *   1) sample M random sequences X,
 *   2) compute y = f(X),
 *   3) compute m(y) exactly by counting segmentations of y into exactly N tokens,
 *   4) average log2(m(y)) over samples.
 *
 * ---
 * ## How m(y) is computed (exactly)
 * We build a trie over the token strings, then run dynamic programming over the concatenated
 * string y:
 *
 *   dp[i][n] = number of ways to segment y[0..i) into exactly n tokens
 *
 * and return dp[L][N] where L = y.length.
 *
 * To be robust if `tokens` contains duplicate strings, each trie terminal stores a
 * multiplicity (how many entries equal that string), and matches contribute that multiplicity
 * to the count. (If tokens are unique—as typical for BPE vocab—multiplicity is 1.)
 *
 * ---
 * ## Notes / assumptions
 * - `tokens` must not contain the empty string `""` (that would create infinitely many
 *   segmentations by inserting empty tokens). This function throws if it finds one.
 * - This estimates the entropy of the **raw concatenated JS string**. If you apply any
 *   normalization or encoding (lowercasing, Unicode normalization, URL encoding, etc.),
 *   do that consistently before counting, because it can change entropy substantially.
 * - Returns an estimate in bits, clamped to [0, N*log2(K)] to avoid tiny floating noise.
 *
 * @param count   N, the number of tokens concatenated.
 * @param tokens  Vocabulary tokens to sample from (length K).
 * @param options.samples  Monte Carlo sample count M (default 5000).
 * @param options.rng      Optional RNG returning uniform floats in [0,1) (default Math.random).
 * @returns Estimated Shannon entropy H(Y) in bits.
 */
export function estimateTokenIdEntropy(
  count: number,
  tokens: string[],
  options: { samples?: number; rng?: () => number } = {}
): number {
  const { samples = 5000, rng = Math.random } = options;

  if (!Number.isFinite(count) || count < 0 || Math.floor(count) !== count) {
    throw new Error(`count must be a non-negative integer; got ${count}`);
  }
  if (!Array.isArray(tokens) || tokens.length === 0) return 0;
  if (tokens.some((t) => t.length === 0)) {
    throw new Error(`tokens must not contain the empty string "" (infinite collisions).`);
  }
  if (!Number.isFinite(samples) || samples <= 0 || Math.floor(samples) !== samples) {
    throw new Error(`options.samples must be a positive integer; got ${samples}`);
  }

  const K = tokens.length;
  const trie = getOrBuildTrie(tokens);

  let sumLog2m = 0;

  for (let s = 0; s < samples; s++) {
    // Sample count tokens uniformly (like _.sample with replacement)
    const parts = new Array<string>(count);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(rng() * K);
      parts[i] = tokens[idx]!;
    }
    const y = parts.join("");

    // Count how many length-count token sequences map to the same concatenated string.
    const m = countSegmentationsExactN(y, count, trie);

    // m should be >= 1 because the sampled sequence is always one valid segmentation.
    sumLog2m += log2BigInt(m);
  }

  const upper = count === 0 ? 0 : count * Math.log2(K); // H(X) = N*log2(K)
  const est = upper - sumLog2m / samples;               // H(Y) = H(X) - E[log2 m(Y)]

  // Clamp to avoid tiny floating-point overshoots.
  return Math.max(0, Math.min(upper, est));
}

/* ----------------------------- internals ----------------------------- */

type TrieNode = {
  children: Map<string, TrieNode>;
  terminalCount: bigint; // multiplicity of token strings ending here
};

function makeNode(): TrieNode {
  return { children: new Map(), terminalCount: 0n };
}

// Cache tries by array identity so repeated calls are fast if you reuse the same tokens array.
const TRIE_CACHE = new WeakMap<string[], TrieNode>();

function getOrBuildTrie(tokens: string[]): TrieNode {
  const cached = TRIE_CACHE.get(tokens);
  if (cached) return cached;

  const root = makeNode();
  for (const tok of tokens) {
    let node = root;
    // Use UTF-16 code units (charAt) to match JS string indexing semantics.
    for (let i = 0; i < tok.length; i++) {
      const ch = tok.charAt(i);
      let next = node.children.get(ch);
      if (!next) {
        next = makeNode();
        node.children.set(ch, next);
      }
      node = next;
    }
    node.terminalCount += 1n;
  }

  TRIE_CACHE.set(tokens, root);
  return root;
}

function countSegmentationsExactN(s: string, N: number, trie: TrieNode): bigint {
  const L = s.length;
  // dp[i][n] = number of ways to segment s[0..i) into exactly n tokens
  const dp: bigint[][] = Array.from({ length: L + 1 }, () =>
    Array<bigint>(N + 1).fill(0n)
  );
  dp[0][0] = 1n;

  for (let i = 0; i < L; i++) {
    for (let n = 0; n < N; n++) {
      const ways = dp[i]![n]!;
      if (ways === 0n) continue;

      let node = trie;
      for (let j = i; j < L; j++) {
        const ch = s.charAt(j);
        const next = node.children.get(ch);
        if (!next) break;
        node = next;

        if (node.terminalCount > 0n) {
          dp[j + 1]![n + 1]! += ways * node.terminalCount;
        }
      }
    }
  }

  return dp[L]![N]!;
}

// Compute log2(BigInt) approximately but accurately enough for entropy estimates.
// Exact when x <= Number.MAX_SAFE_INTEGER.
function log2BigInt(x: bigint): number {
  if (x <= 0n) return -Infinity;
  if (x <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Math.log2(Number(x));
  }

  // bitLen = floor(log2(x)) + 1
  const bitLen = x.toString(2).length;

  // Take top 53 bits to form a double-precision mantissa.
  const take = 53;
  const shift = BigInt(bitLen - take);
  const top = Number(x >> shift); // top is in [2^52, 2^53)
  return (bitLen - take) + Math.log2(top);
}