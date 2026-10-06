import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/** Includes type imports and re-exports: containment is stronger than tree shaking. */
function sourceDependencies(entry: string): ReadonlySet<string> {
  const repositoryRoot = resolve('.');
  const seen = new Set<string>();
  const options: ts.CompilerOptions = {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
  };
  function visit(file: string): void {
    const path = relative(repositoryRoot, file).replaceAll('\\', '/');
    if (seen.has(path)) return;
    seen.add(path);
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    function imported(specifier: ts.Node): void {
      if (!ts.isStringLiteralLike(specifier))
        throw new Error('Uninspectable dynamic containment dependency');
      if (!specifier.text.startsWith('.')) return;
      if (/\.(css|svg|png|webp)$/.test(specifier.text)) return;
      const resolved = ts.resolveModuleName(
        specifier.text,
        file,
        options,
        ts.sys,
      ).resolvedModule;
      if (!resolved) throw new Error('Unresolved local containment dependency');
      visit(resolved.resolvedFileName);
    }
    function walk(node: ts.Node): void {
      if (ts.isImportDeclaration(node)) imported(node.moduleSpecifier);
      else if (ts.isExportDeclaration(node) && node.moduleSpecifier)
        imported(node.moduleSpecifier);
      else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const specifier = node.arguments[0];
        if (!specifier) throw new Error('Missing dynamic import specifier');
        imported(specifier);
      } else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument)
      )
        imported(node.argument.literal);
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
  visit(resolve(entry));
  return seen;
}

describe('local Phase 3C catalog preservation containment', () => {
  it.each(['src/composition/main.tsx', 'tests/browser/phase3/harness.ts'])(
    '%s never transitively imports the unintegrated catalog',
    (entry) => {
      const dependencies = sourceDependencies(entry);
      expect(dependencies.size).toBeGreaterThan(20);
      expect(dependencies.has('src/application/slice-family.ts')).toBe(false);
      expect(dependencies.has('src/domain/families/slice.ts')).toBe(false);
    },
  );
});
