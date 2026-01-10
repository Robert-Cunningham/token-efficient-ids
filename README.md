# Token-Efficient IDs

A tiny, secure, URL-friendly ID generator optimized for LLM token efficiency.

```js
import { tokenId } from 'token-efficient-ids'
const id = tokenId() // => "ĠhelloĠworldĠfoobar"
```

- **Token-efficient**: 4 tokens instead of 8-15 for same entropy
- **Secure**: Uses `crypto.getRandomValues()`
- **Customizable**: 28 LLM tokenizers included

## Why?

When IDs appear in LLM context, traditional IDs waste tokens:

| Method | Characters | LLM Tokens | Entropy |
|--------|------------|------------|---------|
| UUID v4 | 36 | ~12 | 122 bits |
| nanoid | 21 | ~8 | 126 bits |
| **tokenId(4)** | ~15 | **4** | 70 bits |
| **tokenId(7)** | ~25 | **7** | 123 bits |

Each token in a `tokenId` is a single LLM token, so you get maximum entropy per token.

## Install

```bash
npm install token-efficient-ids
```

## Usage

### Basic

```js
import { tokenId } from 'token-efficient-ids'

tokenId()   // 4 tokens, ~70 bits entropy
tokenId(7)  // 7 tokens, ~123 bits entropy (UUID-equivalent)
```

### Custom Model

```js
import { customTokenId } from 'token-efficient-ids'

const claudeId = customTokenId({ model: 'claude' })
claudeId()  // Uses Claude's tokenizer

const llamaId = customTokenId({ model: 'llama-4', size: 6 })
llamaId()   // 6 Llama-4 tokens
```

### Non-Secure

For non-security-critical uses (2x faster):

```js
import { tokenId } from 'token-efficient-ids/non-secure'
tokenId()  // Uses Math.random()
```

### Custom Random

```js
import { customRandom } from 'token-efficient-ids'

const seededId = customRandom({
  model: 'gpt-4o',
  size: 4,
  random: (bytes) => mySeededRng(bytes)
})
```

## Models

28 tokenizers included:

| Provider | Models |
|----------|--------|
| OpenAI | gpt-3, gpt-4, gpt-4o |
| Anthropic | claude |
| Meta | llama, llama-2, llama-3, llama-3.1, llama-3.2, llama-4 |
| Mistral | mistral-v1, mistral-v3, mistral-nemo |
| Google | gemma, gemma-2 |
| DeepSeek | deepseek-v3, deepseek-r1 |
| Alibaba | qwen-2.5, qwen-3 |
| Microsoft | phi-4 |
| Others | grok-1, command-r, command-r-plus, dbrx, internlm2, nemotron, kimi-k2, yi |

## API

### `tokenId(size?: number): string`

Generate an ID using the default model (gpt-4o).

- `size` — Number of tokens (default: 4)

### `customTokenId(options): (size?: number) => string`

Create a generator for a specific model.

- `options.model` — Model ID (default: 'gpt-4o')
- `options.size` — Default token count (default: 4)

### `customRandom(options): (size?: number) => string`

Create a generator with custom randomness.

- `options.model` — Model ID (default: 'gpt-4o')
- `options.size` — Default token count (default: 4)
- `options.random` — Custom random byte generator

### `MODELS: string[]`

List of all available model IDs.

## How It Works

1. Loads the tokenizer vocabulary for the specified model
2. Uses rejection sampling for uniform distribution across vocab
3. Concatenates randomly selected tokens into the ID

Each token provides ~17.6 bits of entropy (for 200k vocab), so 4 tokens ≈ 70 bits.

## License

MIT
