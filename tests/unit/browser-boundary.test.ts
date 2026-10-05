import { readFileSync } from 'node:fs';
import { ESLint } from 'eslint';
import ts from 'typescript';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

const linter = new ESLint({
  // Virtual probes have no on-disk project membership; use the production guards.
  overrideConfig: [
    { ...tseslint.configs.disableTypeChecked, files: ['src/ui/**/*.ts'] },
  ],
});

describe('production browser compiler', () => {
  function diagnostics(file: string) {
    const config = ts.readConfigFile('tsconfig.json', (path) =>
      ts.sys.readFile(path),
    );
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
    const program = ts.createProgram([file], parsed.options);
    return ts.getPreEmitDiagnostics(program);
  }

  it('compiles a positive DOM fixture', () => {
    expect(diagnostics('tests/fixtures/architecture/browser/valid.ts')).toEqual(
      [],
    );
  });

  it('rejects Node globals without ambient Node types', () => {
    const errors = diagnostics(
      'tests/fixtures/architecture/browser/node-globals.ts',
    );
    const messages = errors.map((error) =>
      ts.flattenDiagnosticMessageText(error.messageText, ' '),
    );
    for (const name of ['process', 'Buffer', '__dirname']) {
      expect(messages.some((message) => message.includes(name))).toBe(true);
    }
    expect(errors).toHaveLength(3);
  });
});

describe('production browser Node import guard', () => {
  it('allows browser code and UI packages', async () => {
    const results = await linter.lintText(
      'import "react"; export const title = document.title;',
      { filePath: 'src/ui/probe.ts' },
    );
    expect(results.flatMap((result) => result.messages)).toEqual([]);
  });

  it('rejects the test-only node:fs fixture', async () => {
    const results = await linter.lintText(
      readFileSync(
        'tests/fixtures/architecture/browser/node-module.ts',
        'utf8',
      ),
      { filePath: 'src/ui/probe.ts' },
    );
    expect(
      results
        .flatMap((result) => result.messages)
        .map((message) => message.ruleId),
    ).toContain('browser/no-node-imports');
  });

  it.each([
    ['bare filesystem import', 'import "fs";'],
    ['filesystem subpath', 'import "fs/promises";'],
    ['child process import', 'import "node:child_process";'],
    ['Node re-export', 'export * from "node:fs";'],
    ['dynamic Node import', 'void import("node:fs");'],
    ['computed dynamic import', 'void import("node:" + "fs");'],
    ['template dynamic import', 'void import(`node:fs`);'],
    ['Node import type', 'export type Stats = import("node:fs").Stats;'],
  ])('rejects %s', async (_label, code) => {
    const results = await linter.lintText(code, {
      filePath: 'src/ui/probe.ts',
    });
    expect(
      results
        .flatMap((result) => result.messages)
        .map((message) => message.ruleId),
    ).toContain('browser/no-node-imports');
  });
});
