import { ESLint } from 'eslint';
import ts from 'typescript';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

const linter = new ESLint({
  // Virtual probes have no on-disk project membership; use the same boundary rules.
  overrideConfig: [
    { ...tseslint.configs.disableTypeChecked, files: ['src/domain/**/*.ts'] },
  ],
});

describe('future domain import boundary', () => {
  it('allows pure code and relative domain imports', async () => {
    const results = await linter.lintText('export { marker } from "./value";', {
      filePath: 'src/domain/probe.ts',
    });
    expect(results.flatMap((result) => result.messages)).toEqual([]);
  });

  it('allows a relative domain import type', async () => {
    const results = await linter.lintText(
      'import type { Value } from "./value"; export type Marker = Value;',
      { filePath: 'src/domain/probe.ts' },
    );
    expect(results.flatMap((result) => result.messages)).toEqual([]);
  });

  it.each([
    ['React', 'import "react";'],
    ['relative UI escape', 'export * from "../ui/App";'],
    ['adapter escape', 'import "../infrastructure/storage";'],
    ['re-export escape', 'export { marker } from "../../tests/fixture";'],
    ['dynamic escape', 'void import("../ui/App");'],
    ['computed dynamic import', 'void import("./" + "value");'],
    ['external import type', 'export type Value = import("react").ReactNode;'],
    [
      'adapter import type',
      'export type Value = import("../infrastructure/storage").Value;',
    ],
  ])('rejects %s', async (_label, code) => {
    const results = await linter.lintText(code, {
      filePath: 'src/domain/probe.ts',
    });
    expect(
      results
        .flatMap((result) => result.messages)
        .map((message) => message.ruleId),
    ).toContain('domain/pure-imports');
  });

  it.each([
    'export const marker = Date.now();',
    'export const marker = Math.random();',
    'export const marker = globalThis.Date.now();',
    'export const marker = globalThis.Math.random();',
  ])('rejects hidden clocks and randomness: %s', async (code) => {
    const results = await linter.lintText(code, {
      filePath: 'src/domain/probe.ts',
    });
    expect(
      results
        .flatMap((result) => result.messages)
        .some(
          (message) =>
            message.ruleId === 'no-restricted-globals' ||
            message.ruleId === 'no-restricted-properties',
        ),
    ).toBe(true);
  });
});

describe('browser-free domain compiler', () => {
  function diagnostics(file: string) {
    const config = ts.readConfigFile('tsconfig.domain.json', (path) =>
      ts.sys.readFile(path),
    );
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
    const program = ts.createProgram([file], parsed.options);
    return ts.getPreEmitDiagnostics(program);
  }

  it('compiles a positive pure fixture', () => {
    expect(diagnostics('tests/fixtures/architecture/domain/valid.ts')).toEqual(
      [],
    );
  });

  it('rejects a browser API fixture without DOM types', () => {
    expect(
      diagnostics('tests/fixtures/architecture/domain/browser.ts').map(
        (diagnostic) => diagnostic.code,
      ),
    ).toContain(2584);
  });
});
