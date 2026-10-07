import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { build, type Plugin } from 'vite';

export interface ShellFile {
  readonly path: string;
  readonly bytes: Uint8Array;
}

export function hashBytes(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function declareRelease(
  files: readonly ShellFile[],
  shellId: string,
  workerBytes: string,
) {
  if (!/^[a-f0-9]{64}$/.test(shellId))
    throw new Error('Invalid shell identity');
  if (files.length < 4 || files.length > 64)
    throw new Error('Invalid essential inventory');
  const paths = new Set<string>();
  const essential = [...files]
    .sort((left, right) => (left.path < right.path ? -1 : 1))
    .map((file) => {
      if (
        !/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(file.path) ||
        file.path.length > 160 ||
        file.path.split('/').some((part) => part === '.' || part === '..') ||
        file.path.includes('//') ||
        paths.has(file.path) ||
        file.path === 'sw.js' ||
        file.path === 'release.json' ||
        file.bytes.length < 1 ||
        file.bytes.length > 8 * 1024 * 1024
      )
        throw new Error('Invalid essential resource');
      paths.add(file.path);
      return {
        path: file.path,
        sha256: hashBytes(file.bytes),
        bytes: file.bytes.length,
      };
    });
  if (
    essential.reduce((total, file) => total + file.bytes, 0) >
      16 * 1024 * 1024 ||
    !paths.has('index.html') ||
    !paths.has('manifest.webmanifest') ||
    !paths.has('icons/math-adventure.svg') ||
    !paths.has('THIRD_PARTY_NOTICES.txt')
  )
    throw new Error('Incomplete shell inventory');
  const body = {
    protocolVersion: 1,
    shellId,
    schemaVersion: 1,
    compatibleSchema: { min: 1, max: 1 },
    prototypeLocales: ['el-GR', 'en-GB', 'de-DE'],
    essential,
  };
  const identity = hashBytes(
    JSON.stringify({ ...body, workerCodeSha256: hashBytes(workerBytes) }),
  );
  return { ...body, releaseId: `sha256-${identity}` };
}

export function productionPwa(
  options: { readonly workerEntry?: string } = {},
): Plugin {
  let projectRoot = '';
  let outputDirectory = '';
  const label = process.env.PWA_RELEASE_LABEL ?? 'phase1e-v1';
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(label))
    throw new Error('Invalid nonpersonal release label');

  async function inventory(directory: string): Promise<ShellFile[]> {
    const files: ShellFile[] = [];
    async function visit(current: string): Promise<void> {
      for (const entry of await readdir(current, { withFileTypes: true })) {
        const path = resolve(current, entry.name);
        if (entry.isSymbolicLink()) throw new Error('Unexpected asset symlink');
        if (entry.isDirectory()) await visit(path);
        else if (entry.isFile())
          files.push({
            path: relative(directory, path).replaceAll('\\', '/'),
            bytes: await readFile(path),
          });
        else throw new Error('Unexpected asset type');
      }
    }
    await visit(directory);
    return files.sort((left, right) => (left.path < right.path ? -1 : 1));
  }

  return {
    name: 'math-adventure-production-pwa',
    apply: 'build',
    configResolved(config) {
      projectRoot = config.root;
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [
          {
            tag: 'meta',
            attrs: { name: 'math-adventure-build', content: label },
            injectTo: 'head',
          },
        ];
      },
    },
    async closeBundle() {
      const workerOutput = await build({
        configFile: false,
        root: projectRoot,
        publicDir: false,
        logLevel: 'error',
        build: {
          write: false,
          minify: false,
          target: 'es2023',
          lib: {
            entry:
              options.workerEntry ??
              resolve(
                projectRoot,
                'src/infrastructure/offline/worker-entry.ts',
              ),
            name: 'MathAdventureWorker',
            formats: ['iife'],
          },
        },
      });
      if (!Array.isArray(workerOutput) || workerOutput.length !== 1)
        throw new Error('Unexpected worker bundle');
      const chunks = workerOutput[0]?.output;
      const worker = chunks?.[0];
      if (chunks?.length !== 1 || worker?.type !== 'chunk')
        throw new Error('Worker must be one local script');
      const before = await inventory(outputDirectory);
      const shellId = hashBytes(
        JSON.stringify(
          before.map((file) => ({
            path: file.path,
            sha256: hashBytes(file.bytes),
          })),
        ),
      );
      const htmlPath = resolve(outputDirectory, 'index.html');
      const html = await readFile(htmlPath, 'utf8');
      if (html.includes('math-adventure-shell') || !html.includes('</head>'))
        throw new Error('Unexpected shell markup');
      await writeFile(
        htmlPath,
        html.replace(
          '</head>',
          `<meta name="math-adventure-shell" content="${shellId}"></head>`,
        ),
      );
      const descriptor = declareRelease(
        await inventory(outputDirectory),
        shellId,
        worker.code,
      );
      await writeFile(
        resolve(outputDirectory, 'release.json'),
        `${JSON.stringify(descriptor, null, 2)}\n`,
      );
      await writeFile(
        resolve(outputDirectory, 'sw.js'),
        `globalThis.__MATH_ADVENTURE_RELEASE__ = ${JSON.stringify(descriptor)};\n${worker.code}\n`,
      );
    },
  };
}
