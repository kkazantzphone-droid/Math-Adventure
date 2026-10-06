// Deliberate synthetic developer entry; the ordinary build has no capability.
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { productionPwa } from './scripts/pwa-build';

export default defineConfig({
  root: resolve('tests/browser/phase3c'),
  publicDir: resolve('public'),
  base: './',
  plugins: [
    react(),
    {
      name: 'synthetic-learner-reader-declaration',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'learner-reader.json',
          source: JSON.stringify({
            schema: 'phase3c-learner-reader-v1',
            layout: 2,
            recordSchema: 'phase3c-synthetic-loop-v1',
          }),
        });
      },
    },
    productionPwa({
      workerEntry: resolve('src/infrastructure/offline/worker-entry.ts'),
    }),
  ],
  define: { __PHASE3C_SYNTHETIC_CAPABILITY__: 'true' },
  build: {
    outDir: resolve('.cache/phase3c-browser/site'),
    emptyOutDir: true,
    target: 'es2023',
  },
  test: {
    root: resolve('.'),
    include: ['tests/integration/phase3c-loop.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
