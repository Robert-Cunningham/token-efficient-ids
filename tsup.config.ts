import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'non-secure': 'src/non-secure.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
});
