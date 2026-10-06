// DEV/TEST only. No browser download, real profile, or production PWA behavior.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve, relative } from 'node:path';
import { runBrowserProof } from '../../tests/e2e/browser-proof.mjs';
import { runProductionProof } from '../../tests/e2e/production-proof.mjs';
import { beginEvidence, writeEvidence } from './evidence.mjs';
import { startProofServer } from './server.mjs';

const evidenceDirectory = resolve('.cache/browser-proof');
const pending = await beginEvidence(evidenceDirectory);

async function inventory(directory) {
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else {
        const bytes = await readFile(path);
        files.push({
          path: relative(directory, path).replaceAll('\\', '/'),
          bytes: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        });
      }
    }
  }
  await visit(directory);
  return files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

async function execute() {
  const channel = process.env.BROWSER_PROOF_CHANNEL ?? 'chrome';
  assert(
    ['chrome', 'msedge', 'chromium'].includes(channel),
    'Unsupported channel',
  );
  const require = createRequire(import.meta.url);
  const packageVersion = require('playwright-core/package.json').version;
  assert.equal(packageVersion, '1.63.0', 'Use the reviewed exact package pin');
  // Optional pinned Chromium uses this ignored local cache; run never downloads.
  process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(evidenceDirectory, 'browsers');
  // This command owns its build so even build failures invalidate previous PASS.
  execFileSync(
    process.execPath,
    [
      resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js'),
      'build',
    ],
    { stdio: 'inherit' },
  );
  const artifacts = await inventory(resolve('dist'));
  assert(artifacts.length > 4, 'Production PWA needs declared local artifacts');
  assert(artifacts.some((file) => file.path === 'index.html'));
  assert(artifacts.some((file) => file.path === 'THIRD_PARTY_NOTICES.txt'));
  assert(
    artifacts.some((file) => /^assets\/index-[\w-]+\.js$/.test(file.path)),
  );
  assert(
    artifacts.some((file) => /^assets\/index-[\w-]+\.css$/.test(file.path)),
  );
  assert(artifacts.some((file) => file.path === 'sw.js'));
  assert(artifacts.some((file) => file.path === 'release.json'));
  assert(artifacts.some((file) => file.path === 'manifest.webmanifest'));
  assert(artifacts.every((file) => !file.path.includes('__browser-proof')));
  const releases = [];
  for (const [name, directory, label] of [
    ['a', resolve('dist'), null],
    ['b', resolve(evidenceDirectory, 'releases/b'), 'proof-v2'],
    ['c', resolve(evidenceDirectory, 'releases/c'), 'proof-v3'],
  ]) {
    if (label)
      execFileSync(
        process.execPath,
        [
          resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js'),
          'build',
          '--outDir',
          directory,
        ],
        { stdio: 'inherit', env: { ...process.env, PWA_RELEASE_LABEL: label } },
      );
    const descriptor = JSON.parse(
      await readFile(resolve(directory, 'release.json'), 'utf8'),
    );
    const releaseArtifacts = await inventory(directory);
    assert.equal(descriptor.protocolVersion, 1);
    assert.match(descriptor.releaseId, /^sha256-[a-f0-9]{64}$/);
    assert.match(descriptor.shellId, /^[a-f0-9]{64}$/);
    assert.equal(descriptor.schemaVersion, 1);
    assert.deepEqual(descriptor.prototypeLocales, ['el-GR', 'en-GB', 'de-DE']);
    assert.deepEqual(
      descriptor.essential.map((file) => file.path).sort(),
      releaseArtifacts
        .filter((file) => !['release.json', 'sw.js'].includes(file.path))
        .map((file) => file.path)
        .sort(),
      'Every application artifact must belong to the coherent declared shell',
    );
    for (const file of descriptor.essential) {
      const artifact = releaseArtifacts.find((item) => item.path === file.path);
      assert(artifact);
      assert.equal(artifact.sha256, file.sha256);
      assert.equal(artifact.bytes, file.bytes);
    }
    releases.push({ name, directory, descriptor, artifacts: releaseArtifacts });
  }
  assert.equal(
    new Set(releases.map((release) => release.descriptor.releaseId)).size,
    3,
  );
  const { chromium } = await import('playwright-core');
  const server = await startProofServer({
    distDirectory: resolve('dist'),
    fixtureDirectory: resolve('tests/e2e/fixtures'),
    productionReleases: releases.flatMap((release) => [
      {
        name: `root-${release.name}`,
        prefix: '/',
        directory: release.directory,
      },
      {
        name: `subpath-${release.name}`,
        prefix: '/math-adventure/',
        directory: release.directory,
      },
    ]),
  });
  let browser;
  try {
    browser = await chromium.launch({
      channel,
      headless: true,
      chromiumSandbox: true,
      timeout: 15_000,
      downloadsPath: resolve(evidenceDirectory, 'downloads'),
      tracesDir: resolve(evidenceDirectory, 'traces'),
    });
    const cases = [];
    for (const prefix of ['/', '/math-adventure/']) {
      cases.push({
        ...(await runBrowserProof(browser, server, prefix)),
        productionLifecycle: await runProductionProof(
          browser,
          server,
          prefix,
          releases,
        ),
      });
    }
    assert.equal(
      server.droppedObservationCount(),
      0,
      'Request evidence cannot be truncated',
    );
    return {
      ...pending,
      technology: {
        package: 'playwright-core',
        version: packageVersion,
        channel,
        browserVersion: browser.version(),
      },
      loopbackOnly: true,
      artifacts,
      releaseVariants: releases.map(
        ({ name, descriptor, artifacts: files }) => ({
          name,
          releaseId: descriptor.releaseId,
          shellId: descriptor.shellId,
          artifacts: files,
        }),
      ),
      cases,
      result: 'PASS',
    };
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      await server.close();
    }
  }
}

try {
  const report = await execute();
  await writeEvidence(evidenceDirectory, report);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await writeEvidence(evidenceDirectory, {
    ...pending,
    result: 'FAIL',
    error: {
      name: error instanceof Error ? error.name : 'Error',
      message:
        error instanceof Error ? error.message.slice(0, 512) : 'Proof failed',
    },
  });
  throw error;
}
