import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';

describe('synthetic persistence containment', () => {
  it('ordinary composition transitively imports neither persistence nor adaptation', () => {
    const seen = new Set<string>();
    function visit(file: string): void {
      if (seen.has(file)) return;
      seen.add(file);
      expect(file.replaceAll('\\', '/')).not.toMatch(
        /persistence|phase3|adaptation/,
      );
      const source = readFileSync(file, 'utf8');
      const imports = ts.preProcessFile(source).importedFiles;
      for (const imported of imports) {
        if (!imported.fileName.startsWith('.')) continue;
        const path = resolve(dirname(file), imported.fileName);
        const candidate = [
          path,
          `${path}.ts`,
          `${path}.tsx`,
          `${path}/index.ts`,
        ].find((p) => existsSync(p) && statSync(p).isFile());
        if (candidate && !candidate.endsWith('.css')) visit(candidate);
      }
    }
    visit(resolve('src/composition/main.tsx'));
    expect(seen.size).toBeGreaterThan(20);
  });
  it('requires a separate developer build and loopback capability without learner input', () => {
    const entry = readFileSync('tests/browser/phase3/harness.ts', 'utf8');
    const html = readFileSync('tests/browser/phase3/index.html', 'utf8');
    const normal = readFileSync('vite.config.ts', 'utf8');
    expect(entry).toContain('__PHASE3_SYNTHETIC_CAPABILITY__');
    expect(entry).toContain("location.hostname === '127.0.0.1'");
    expect(entry).not.toContain('URLSearchParams');
    expect(html).not.toMatch(/<input|<textarea|type="file"/);
    expect(normal).not.toContain('phase3');
  });
});
