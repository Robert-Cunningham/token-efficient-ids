# Prompts
1. 
Can you please start by downloading a bunch of tokenizer files for the major LLMs? Maybe you can find them from the same source as "tiktokenizer"? I want to be able to call a function like listTokens for GPT and get back a list of tokens in GPT-4 or GPT-4o or whatever, but for a ton of LLMs.

This is simply the first building block of a library which will ultimately generate ids using those tokens, so don't expose the list tokens api please; just set it up to be used internally. Also please use tsup to set up the package.

that's good, but can you also do more modern open source LLMs? for example deepseek v3, nemotron 3, kimi k2, qwen 235b, etc

2. 
Great, now can you please design an id generator that uses those tokens? Take substantial inspiration from https://github.com/ai/nanoid; in particular, notice how
* you can call the function directly to get reasonable defaults
* you can configure the generator with a config function which returns the generator function
* it has good distribution properties (i.e. not random % alphabet)
* there's secure and non-secure support
* Also write similar (and similarly terse) documentation.

3.
Great. Now, can you please write a benchmark.ts file (like nanoid's) that benchmarks the performance of generating ids?

4.
Great. Can you please write a file called efficieny.ts, which uses the openrouter fetch APIs to test how many tokens are used by 1e4 of our ids, nanoid's ids, uuidv4s, etc? Basically I want to create a chart from this which maps config/lib => {entropy per id, average tokens per id, average bytes per id}.

Please set max_tokens in the response to zero or one; I don't want to spend a lot of money on this.

https://openrouter.ai/docs/guides/guides/usage-accounting

Can you pelase adjust efficiency.ts so that it writes the results to a json file, and runs the tests in parallel?

5. 
can you please add a typecheck command

6.
Can you please make the id generator object configurable, so that it accepts the following arguments?

{
	delimeter: string, // delimeter between tokens
	filter: (string) => boolean, // overrides filter individual tokens
	count: number, // how many tokens per id
	allow: {
		unicode: boolean, (non-ascii)
		whitespace: boolean,
		punctuation: boolean (non-A-Za-z0-9 ascii)
		numbers: boolean, (0-9)
		uppercase: boolean,
	}
}