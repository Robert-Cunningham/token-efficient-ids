# Token Efficient IDs

This repository generates token-efficient IDs. Major LLMs like GitHub, Anthropic, DeepSeek have tokenizers. And ... You can squeeze more bits per token into an ID by making sure that your ID uses, you know, tokens like T-H-E-R-E instead of, you know, J-X-W-2-1 ...

# Language: JS

# Todo
* Get token files for a bunch of LLMs
* Build LLM-specific id functions
* Find tokens that have high overlap
* Write a general / recommended id function, which compresses well everywhere
* Test 1000 ids against OpenRouter APIs to find tokenization counts

# Idea
For individual LLMs, the best thing would be to simply generate a random string of K tokens from that LLM's list (maybe with some user-specified constraints, like all lowercase or no special characters). I guess you should also be able to specify max-length to avoid making super aggressive length tokens, if you want.

Take the N tokens which are most common in the tokenizer files.

# Prompts
Can you please start by downloading a bunch of tokenizer files for the major LLMs? Maybe you can find them from the same source as "tiktokenizer"? I want to be able to call a function like listTokens for GPT and get back a list of tokens in GPT-4 or GPT-4o or whatever, but for a ton of LLMs.

This is simply the first building block of a library which will ultimately generate ids using those tokens, so don't expose the list tokens api please; just set it up to be used internally. Also please use tsup to set up the package.

that's good, but can you also do more modern open source LLMs? for example deepseek v3, nemotron 3, kimi k2, qwen 235b, etc