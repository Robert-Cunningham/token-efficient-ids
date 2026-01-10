#!/bin/bash

# Download tokenizer.json files from HuggingFace

set -e

TOKENIZERS_DIR="tokenizers"
mkdir -p "$TOKENIZERS_DIR"

echo "Downloading tokenizers..."

# Function to download a tokenizer
download() {
  local model_id=$1
  local repo=$2
  local output="$TOKENIZERS_DIR/$model_id.json"

  if [ -f "$output" ]; then
    echo "  [skip] $model_id (already exists)"
    return
  fi

  echo "  [download] $model_id from $repo"
  curl -sL "https://huggingface.co/$repo/resolve/main/tokenizer.json" -o "$output"
}

# OpenAI (via Xenova)
download "gpt-3" "Xenova/gpt-3"
download "gpt-4" "Xenova/gpt-4"
download "gpt-4o" "Xenova/gpt-4o"

# Anthropic (via Xenova)
download "claude" "Xenova/claude-tokenizer"

# Meta Llama (via Xenova)
download "llama" "Xenova/llama-tokenizer"
download "llama-2" "Xenova/llama2-tokenizer"
download "llama-3" "Xenova/llama3-tokenizer"
download "llama-3.1" "Xenova/Meta-Llama-3.1-Tokenizer"
download "llama-3.2" "Xenova/Llama-3.2-Tokenizer"
download "llama-4" "Xenova/llama4-tokenizer"

# Mistral (via Xenova)
download "mistral-v1" "Xenova/mistral-tokenizer-v1"
download "mistral-v3" "Xenova/mistral-tokenizer-v3"
download "mistral-nemo" "Xenova/Mistral-Nemo-Instruct-Tokenizer"

# Google (via Xenova)
download "gemma" "Xenova/gemma-tokenizer"
download "gemma-2" "Xenova/gemma-2-tokenizer"

# Other (via Xenova)
download "grok-1" "Xenova/grok-1-tokenizer"
download "command-r" "Xenova/c4ai-command-r-v01-tokenizer"
download "command-r-plus" "Xenova/c4ai-command-r-plus-08-2024-tokenizer"
download "dbrx" "Xenova/dbrx-instruct-tokenizer"
download "internlm2" "Xenova/internlm2-tokenizer"
download "nemotron" "Xenova/Nemotron-4-340B-Instruct-Tokenizer"

# DeepSeek (Official)
download "deepseek-v3" "deepseek-ai/DeepSeek-V3"
download "deepseek-r1" "deepseek-ai/DeepSeek-R1"

# Qwen (Official)
download "qwen-2.5" "Qwen/Qwen2.5-72B-Instruct"
download "qwen-3" "Qwen/Qwen3-8B"

# Microsoft Phi (Official)
download "phi-4" "microsoft/Phi-4-mini-instruct"

# Moonshot Kimi (Community)
download "kimi-k2" "Zaynoid/Kimi-K2-Thinking-Tokenizer"

# 01.AI Yi (Official) - Note: Yi uses tokenizer.model (sentencepiece), need tokenizer.json
download "yi" "01-ai/Yi-1.5-34B"

echo "Done! Downloaded tokenizers to $TOKENIZERS_DIR/"
ls -lh "$TOKENIZERS_DIR"
