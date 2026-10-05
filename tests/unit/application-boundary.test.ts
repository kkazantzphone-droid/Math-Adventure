import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';
import ts from 'typescript';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

const linter = new ESLint({
  // Virtual probes have no on-disk project membership; retain production guards.
  overrideConfig: [
    {
      ...tseslint.configs.disableTypeChecked,
      files: ['src/application/**/*.{ts,tsx}', 'src/domain/**/*.ts'],
    },
  ],
});

async function ruleIds(code: string, filePath = 'src/application/probe.ts') {
  return (await linter.lintText(code, { filePath })).flatMap((result) =>
    result.messages.map((message) => message.ruleId),
  );
}

describe('application import boundary', () => {
  it.each([
    'export { marker } from "./ports";',
    'import type { Port } from "./ports"; export type Marker = Port;',
    'void import("../domain/core/result");',
    'export * from "../domain/core/result";',
    'export const pending: Promise<number> = Promise.resolve(Math.floor(2));',
    'export function explicit(port: { now: () => number }): number { return port.now(); }',
  ])(
    'allows pure domain, internal contracts and explicit inputs: %s',
    async (code) => {
      expect(await ruleIds(code)).toEqual([]);
    },
  );

  it('permits inline domain import types at the architecture boundary', async () => {
    expect(
      await ruleIds(
        'export type Marker = import("../domain/core/result").DomainError;',
      ),
    ).not.toContain('application/port-imports');
  });

  it('rejects the on-disk forbidden import fixture', async () => {
    expect(
      await ruleIds(
        readFileSync(
          'tests/fixtures/architecture/application/forbidden-imports.ts',
          'utf8',
        ),
      ),
    ).toContain('application/port-imports');
  });

  it.each([
    ['React', 'import "react";'],
    ['ReactDOM', 'import "react-dom";'],
    ['dot-prefixed package', 'import ".external";'],
    ['UI', 'import "../ui/App";'],
    ['composition', 'export * from "../composition/main";'],
    ['adapter', 'import "../infrastructure/storage";'],
    ['presentation', 'import "../presentation/notation";'],
    ['filesystem', 'import "node:fs";'],
    ['bare Node module', 'import "fs/promises";'],
    ['timer module', 'import "node:timers/promises";'],
    ['require import', 'import fs = require("node:fs"); export { fs };'],
    ['test fake', 'import "../../tests/fakes/repository";'],
    ['re-export escape', 'export { Port } from "../infrastructure/storage";'],
    ['dynamic escape', 'void import("../ui/App");'],
    ['computed import', 'void import("./" + "ports");'],
    ['template import', 'void import(`./ports`);'],
    [
      'type declaration',
      'import type { Port } from "../infrastructure/storage"; export type Marker = Port;',
    ],
    ['import type', 'export type Marker = import("react").ReactNode;'],
    [
      'dynamic adapter type',
      'export type Marker = import("../infrastructure/storage").Port;',
    ],
    ['JSX module', 'export * from "./ports.tsx";'],
    ['nested path escape', 'export * from "./nested/../../ui/App";'],
    ['prefix collision', 'export * from "../application-extra/ports";'],
  ])('rejects %s in every import form', async (_label, code) => {
    expect(await ruleIds(code)).toContain('application/port-imports');
  });

  it.each([
    'import "../application/ports";',
    'import type { Port } from "../application/ports"; export type Marker = Port;',
    'export * from "../application/ports";',
    'void import("../application/ports");',
    'export type Marker = import("../application/ports").Port;',
  ])('preserves the domain-to-application prohibition: %s', async (code) => {
    expect(await ruleIds(code, 'src/domain/probe.ts')).toContain(
      'domain/pure-imports',
    );
  });

  it('rejects the on-disk domain-to-application fixture', async () => {
    expect(
      await ruleIds(
        readFileSync(
          'tests/fixtures/architecture/domain/application.ts',
          'utf8',
        ),
        'src/domain/probe.ts',
      ),
    ).toContain('domain/pure-imports');
  });
});

describe('application hidden input guard', () => {
  it('rejects the on-disk clock/random/timer fixture', async () => {
    expect(
      await ruleIds(
        readFileSync(
          'tests/fixtures/architecture/application/hidden-inputs.ts',
          'utf8',
        ),
      ),
    ).toContain('no-restricted-globals');
  });

  it.each([
    'export const input = process.platform;',
    'export const input = window;',
    'export const input = document.title;',
    'export const input = navigator.language;',
    'export const input = location.href;',
    'export const input = indexedDB;',
    'export const input = localStorage;',
    'export const input = sessionStorage;',
    'export const input = caches;',
    'export const input = speechSynthesis;',
    'export const input = Date.now();',
    'export const input = new Date();',
    'export const input = performance.now();',
    'export const input = Math.random();',
    'export const input = Math["random"]();',
    'export const { random } = Math;',
    'export const input = crypto.randomUUID();',
    'export const input = crypto.getRandomValues(new Uint8Array(1));',
    'export const input = globalThis.Date.now();',
    'export const input = globalThis.Math.random();',
    'export const input = globalThis.crypto.randomUUID();',
    'export const input = setTimeout;',
    'export const input = clearTimeout;',
    'export const input = setInterval;',
    'export const input = clearInterval;',
    'export const input = requestAnimationFrame;',
    'export const input = queueMicrotask;',
    'export const input = fetch;',
  ])('rejects implicit platform inputs and scheduling: %s', async (code) => {
    expect(await ruleIds(code)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^no-restricted-(globals|properties)$/),
      ]),
    );
  });

  it('rejects application JSX', async () => {
    expect(
      await ruleIds(
        readFileSync('tests/fixtures/architecture/application/jsx.tsx', 'utf8'),
        'src/application/probe.tsx',
      ),
    ).toContain('no-restricted-syntax');
  });
});

describe('ES-only application compiler', () => {
  function diagnostics(files: string[]) {
    const config = ts.readConfigFile('tsconfig.application.json', (file) =>
      ts.sys.readFile(file),
    );
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
    return ts.getPreEmitDiagnostics(ts.createProgram(files, parsed.options));
  }

  it('accepts domain types, an injected port and Promise/Map', () => {
    expect(
      diagnostics(['tests/fixtures/architecture/application/valid.ts']),
    ).toEqual([]);
  });

  it('has no browser, Node, React ambient types or JSX', () => {
    const errors = diagnostics([
      'tests/fixtures/architecture/application/browser.ts',
      'tests/fixtures/architecture/application/node-globals.ts',
      'tests/fixtures/architecture/application/react-ambient.ts',
      'tests/fixtures/architecture/application/jsx.tsx',
    ]);
    const messages = errors.map((error) =>
      ts.flattenDiagnosticMessageText(error.messageText, ' '),
    );
    for (const name of [
      'document',
      'window',
      'indexedDB',
      'localStorage',
      'process',
      'Buffer',
      '__dirname',
      'React',
      'JSX',
    ]) {
      expect(messages.some((message) => message.includes(name))).toBe(true);
    }
    expect(errors.map((error) => error.code)).toContain(17004);
  });
});

describe('bounded application/domain dependency review', () => {
  it('finds no source cycles or domain/application inversion', () => {
    const root = path.resolve('src');
    const domain = path.join(root, 'domain');
    const application = path.join(root, 'application');
    const files: string[] = [];

    function collect(directory: string): void {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) collect(file);
        else if (/\.tsx?$/.test(entry.name)) files.push(file);
        expect(files.length).toBeLessThanOrEqual(128);
      }
    }
    collect(domain);
    collect(application);

    const options: ts.CompilerOptions = {
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowImportingTsExtensions: true,
    };
    const graph = new Map<string, string[]>();
    const issues: string[] = [];
    for (const file of files) {
      const code = readFileSync(file, 'utf8');
      expect(code.length).toBeLessThanOrEqual(1_000_000);
      const source = ts.createSourceFile(
        file,
        code,
        ts.ScriptTarget.ES2023,
        true,
      );
      const dependencies = new Set<string>();

      function dependency(specifier: ts.Node): void {
        if (!ts.isStringLiteral(specifier)) {
          issues.push(`Computed import in ${path.relative(root, file)}`);
          return;
        }
        const resolved = ts.resolveModuleName(
          specifier.text,
          file,
          options,
          ts.sys,
        ).resolvedModule?.resolvedFileName;
        if (!resolved) {
          issues.push(`Unresolved import in ${path.relative(root, file)}`);
          return;
        }
        const target = path.resolve(resolved);
        if (!files.includes(target)) {
          issues.push(`Layer escape from ${path.relative(root, file)}`);
        } else {
          dependencies.add(target);
          if (
            file.startsWith(`${domain}${path.sep}`) &&
            target.startsWith(`${application}${path.sep}`)
          ) {
            issues.push(
              `Domain/application inversion in ${path.relative(root, file)}`,
            );
          }
        }
      }

      function visit(node: ts.Node): void {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
          if (node.moduleSpecifier) dependency(node.moduleSpecifier);
        } else if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
          const argument = node.arguments[0];
          if (argument) dependency(argument);
        } else if (
          ts.isImportTypeNode(node) &&
          ts.isLiteralTypeNode(node.argument)
        ) {
          dependency(node.argument.literal);
        } else if (
          ts.isImportEqualsDeclaration(node) &&
          ts.isExternalModuleReference(node.moduleReference) &&
          node.moduleReference.expression
        ) {
          dependency(node.moduleReference.expression);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
      graph.set(file, [...dependencies]);
    }

    const visited = new Set<string>();
    const active = new Set<string>();
    function review(file: string): void {
      if (active.has(file)) {
        issues.push(`Source cycle through ${path.relative(root, file)}`);
        return;
      }
      if (visited.has(file)) return;
      active.add(file);
      for (const target of graph.get(file) ?? []) review(target);
      active.delete(file);
      visited.add(file);
    }
    for (const file of files) review(file);
    expect(issues).toEqual([]);
  });
});
