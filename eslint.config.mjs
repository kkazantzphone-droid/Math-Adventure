import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import browserBoundary from './scripts/browser-boundary.mjs';
import domainBoundary from './scripts/domain-boundary.mjs';

const nodeGlobals = [
  'process',
  'Buffer',
  'global',
  '__dirname',
  '__filename',
  'require',
  'module',
  'exports',
  'setImmediate',
  'clearImmediate',
];

export default defineConfig([
  globalIgnores([
    'dist/**',
    'coverage/**',
    '.cache/**',
    '.pnpm-store/**',
    'tests/fixtures/architecture/**',
  ]),
  js.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', URL: 'readonly' },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: [
          './tsconfig.json',
          './tsconfig.domain.json',
          './tsconfig.tools.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': true },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { browser: browserBoundary },
    rules: {
      'browser/no-node-imports': 'error',
      'no-restricted-globals': ['error', ...nodeGlobals],
    },
  },
  {
    files: ['src/**/*.tsx'],
    extends: [hooks.configs.flat.recommended, refresh.configs.vite],
  },
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    plugins: { domain: domainBoundary },
    rules: {
      'domain/pure-imports': 'error',
      'no-restricted-globals': [
        'error',
        ...nodeGlobals,
        'window',
        'document',
        'navigator',
        'localStorage',
        'indexedDB',
        'fetch',
        'Date',
        'globalThis',
      ],
      'no-eval': 'error',
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Inject explicit seeds in a later approved checkpoint.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'JSXElement', message: 'Domain code cannot contain JSX.' },
        { selector: 'JSXFragment', message: 'Domain code cannot contain JSX.' },
      ],
    },
  },
]);
