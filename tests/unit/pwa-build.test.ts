import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { declareRelease, type ShellFile } from '../../scripts/pwa-build';

const files: readonly ShellFile[] = [
  { path: 'index.html', bytes: Buffer.from('<html>shell</html>') },
  { path: 'manifest.webmanifest', bytes: Buffer.from('{}') },
  { path: 'icons/math-adventure.svg', bytes: Buffer.from('<svg/>') },
  { path: 'THIRD_PARTY_NOTICES.txt', bytes: Buffer.from('license') },
];
const shellId = '1'.repeat(64);

describe('production release generation', () => {
  it('binds each declared essential resource to its actual bytes', () => {
    const release = declareRelease(files, shellId, 'worker');
    for (const file of files) {
      const declared = release.essential.find(
        (item) => item.path === file.path,
      );
      expect(declared?.bytes).toBe(file.bytes.byteLength);
      expect(declared?.sha256).toBe(
        createHash('sha256').update(file.bytes).digest('hex'),
      );
    }
    expect(release.prototypeLocales).toEqual(['el-GR', 'en-GB', 'de-DE']);
    expect(release.schemaVersion).toBe(1);
    expect(release.compatibleSchema).toEqual({ min: 1, max: 1 });
  });

  it('is order independent and changes identity when worker behavior changes', () => {
    const release = declareRelease(files, shellId, 'worker-a');
    expect(declareRelease([...files].reverse(), shellId, 'worker-a')).toEqual(
      release,
    );
    expect(declareRelease(files, shellId, 'worker-b').releaseId).not.toBe(
      release.releaseId,
    );
    expect(
      declareRelease(files, '2'.repeat(64), 'worker-a').releaseId,
    ).not.toBe(release.releaseId);
  });

  it('changes identity when any shell asset changes', () => {
    const release = declareRelease(files, shellId, 'worker');
    for (const changed of files) {
      const modified = files.map((file) =>
        file === changed ? { ...file, bytes: Buffer.from('changed') } : file,
      );
      expect(declareRelease(modified, shellId, 'worker').releaseId).not.toBe(
        release.releaseId,
      );
    }
  });

  it.each([
    '../secret',
    'icons/../secret',
    '/absolute',
    'https://example.invalid/x',
    'x?query',
    'x#fragment',
    'icons//x',
    'sw.js',
    'release.json',
  ])('rejects unsafe or control-plane path %s', (path) => {
    expect(() =>
      declareRelease(
        [...files, { path, bytes: Buffer.from('x') }],
        shellId,
        'worker',
      ),
    ).toThrow('Invalid essential resource');
  });

  it('rejects duplicate, incomplete, empty and invalid inventories', () => {
    const first = files[0];
    if (first === undefined) throw new Error('Missing synthetic fixture');
    expect(() =>
      declareRelease([...files, first], shellId, 'worker'),
    ).toThrow();
    expect(() => declareRelease(files.slice(1), shellId, 'worker')).toThrow();
    expect(() =>
      declareRelease(
        [...files, { path: 'empty', bytes: new Uint8Array() }],
        shellId,
        'worker',
      ),
    ).toThrow();
    expect(() => declareRelease(files, 'invalid', 'worker')).toThrow();
  });
});
