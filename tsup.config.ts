import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'non-secure': 'src/non-secure.ts',
    dictionaries: 'src/dictionaries/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
});
