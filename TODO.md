# Token Efficient IDs

This repository generates token-efficient IDs. Major LLMs like GitHub, Anthropic, DeepSeek have tokenizers. And ... You can squeeze more bits per token into an ID by making sure that your ID uses, you know, tokens like T-H-E-R-E instead of, you know, J-X-W-2-1 ...

# Language: JS

# Todo
- [x] Get token files for a bunch of LLMs
- [x] Build LLM-specific id functions 
- [ ] write a ~notebook to choose our custom vocabulary (optimize for low-overlap, no spaces if possible, etc)
- [ ] Find tokens that have high overlap
- [ ] Write a general / recommended id function, which compresses well everywhere
- [x] Test 1000 ids against OpenRouter APIs to find tokenization counts
- [ ] write a readme (2/3rds of the work here)

# Warning
BPE tokenizers do not guarantee the best tokenization of a given sequence. Instead, they apply merges in learned priority order, which can increase total token count. For example, the string " Godscı", created from the tokens [" Gods", "cı"], actually tokenizes into three tokens [" God", "sc", "ı"] because the "sc" merge has higher priority and is applied first, preventing the " Gods" merge.

# Idea
For individual LLMs, the best thing would be to simply generate a random string of K tokens from that LLM's list (maybe with some user-specified constraints, like all lowercase or no special characters). I guess you should also be able to specify max-length to avoid making super aggressive length tokens, if you want.

Take the N tokens which are most common in the tokenizer files.