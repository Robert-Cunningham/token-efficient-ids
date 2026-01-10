#!/usr/bin/env npx tsx

import crypto from 'node:crypto';
import { Bench } from 'tinybench';

import { customTokenId, tokenId } from './src/generator.js';
import { customTokenId as nonSecureCustom, tokenId as nonSecureTokenId } from './src/non-secure.js';

// For comparison
import { nanoid } from 'nanoid';

const bench = new Bench({ time: 1000 }); // Run each benchmark for 1 second

// Pre-create custom generators (to not measure setup time)
const claudeId = customTokenId({ model: 'claude' });
const llamaId = customTokenId({ model: 'llama-3' });
const smallId = customTokenId({ model: 'gpt-4o', size: 2 });
const nonSecureClaudeId = nonSecureCustom({ model: 'claude' });

bench
  // Comparisons (secure)
  .add('crypto.randomUUID', () => {
    crypto.randomUUID();
  })
  .add('nanoid', () => {
    nanoid();
  })
  .add('nanoid(10)', () => {
    nanoid(10);
  })

  // token-efficient-ids (secure)
  .add('tokenId', () => {
    tokenId();
  })
  .add('tokenId(7)', () => {
    tokenId(7);
  })
  .add('tokenId(2)', () => {
    smallId();
  })
  .add('customTokenId (claude)', () => {
    claudeId();
  })
  .add('customTokenId (llama-3)', () => {
    llamaId();
  })

  // Non-secure
  .add('tokenId/non-secure', () => {
    nonSecureTokenId();
  })
  .add('tokenId/non-secure (claude)', () => {
    nonSecureClaudeId();
  });

// Format output like nanoid
const longestTask = bench.tasks.reduce(
  (max, task) => Math.max(max, task.name.length),
  0
);

console.log('Benchmarking ID generators...\n');
console.log('Secure:\n');

await bench.run();

const table = bench.table()
console.table(table)