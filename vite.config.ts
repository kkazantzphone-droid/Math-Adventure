import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { productionPwa } from './scripts/pwa-build.ts';

export default defineConfig({
  plugins: [react(), productionPwa()],
  // Relative asset URLs keep the static shell portable at root or a subpath.
  base: './',
  build: {
    target: 'es2023',
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/property/**/*.test.ts'],
    clearMocks: true,
  },
});
