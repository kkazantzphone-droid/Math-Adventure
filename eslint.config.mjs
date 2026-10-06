import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import applicationBoundary from './scripts/application-boundary.mjs';
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
          './tsconfig.application.json',
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
    files: ['tests/e2e/*.mjs'],
    languageOptions: {
      globals: {
        navigator: 'readonly',
        document: 'readonly',
        window: 'readonly',
        self: 'readonly',
        crypto: 'readonly',
        ServiceWorker: 'readonly',
        fetch: 'readonly',
        location: 'readonly',
        caches: 'readonly',
        MessageChannel: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
  {
    files: ['tests/e2e/fixtures/sw-*.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
      },
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
    files: ['src/application/**/*.{ts,tsx}'],
    plugins: { application: applicationBoundary },
    rules: {
      'application/port-imports': 'error',
      'no-restricted-globals': [
        'error',
        ...nodeGlobals,
        'window',
        'document',
        'navigator',
        'location',
        'localStorage',
        'sessionStorage',
        'indexedDB',
        'caches',
        'speechSynthesis',
        'SpeechSynthesisUtterance',
        'fetch',
        'WebSocket',
        'Date',
        'performance',
        'crypto',
        'globalThis',
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'queueMicrotask',
      ],
      'no-eval': 'error',
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Supply explicit inputs through application ports or arguments.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXElement',
          message: 'Application code cannot contain JSX.',
        },
        {
          selector: 'JSXFragment',
          message: 'Application code cannot contain JSX.',
        },
      ],
    },
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
