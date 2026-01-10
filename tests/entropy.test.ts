import assert from 'node:assert';
import { describe, it } from 'node:test';
import { estimateTokenIdEntropy } from '../entropy.js';

describe('estimateTokenIdEntropy', () => {
  // Highly ambiguous vocabulary: [a, aa, aaa, aaaa, aaaaa]
  // This creates many possible segmentations for the same string
  const tokens = ['a', 'aa', 'aaa', 'aaaa', 'aaaaa'];
  const K = tokens.length;
  const SAMPLES = 50000;

  it('N=1: no ambiguity, should equal log2(K)', () => {
    const naive = Math.log2(K);
    const actual = estimateTokenIdEntropy(1, tokens, { samples: SAMPLES });

    console.log(`N=1: naive=${naive.toFixed(4)}, actual=${actual.toFixed(4)}`);
    assert.strictEqual(actual, naive);
  });

  it('N=7: should match expected entropy', () => {
    const naive = 7 * Math.log2(K);
    const actual = estimateTokenIdEntropy(7, tokens, { samples: SAMPLES });

    console.log(`N=6: naive=${naive.toFixed(4)}, actual=${actual.toFixed(4)}`);

    // Compute the Shannon entropy (in bits) of the random **concatenated string** formed by independently sampling (N=7) tokens uniformly (with replacement) from the vocabulary ({\text{"a"},\text{"aa"},\text{"aaa"},\text{"aaaa"},\text{"aaaaa"}}) and joining them with no separator; i.e., find (H(Y)) where (Y = T_1T_2\cdots T_7).
    const expected = 3.9494629667599566

    assert.ok(Math.abs(actual - expected) < 0.001);
  });
});
