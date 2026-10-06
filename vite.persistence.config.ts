// Explicit, separate synthetic developer build. Never a production entry.
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: resolve('tests/browser/phase3'),
  define: { __PHASE3_SYNTHETIC_CAPABILITY__: 'true' },
  build: {
    outDir: resolve('.cache/phase3-browser/site'),
    emptyOutDir: true,
    target: 'es2023',
  },
  test: {
    root: resolve('.'),
    include: ['tests/integration/phase3-persistence.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
