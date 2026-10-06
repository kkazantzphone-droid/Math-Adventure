// DEV/TEST only. No browser download, real profile, or production PWA behavior.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve, relative } from 'node:path';
import { runBrowserProof } from '../../tests/e2e/browser-proof.mjs';
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
  assert.equal(
    artifacts.length,
    4,
    'Proof fixtures must stay out of production',
  );
  assert(artifacts.some((file) => file.path === 'index.html'));
  assert(artifacts.some((file) => file.path === 'THIRD_PARTY_NOTICES.txt'));
  assert(
    artifacts.some((file) => /^assets\/index-[\w-]+\.js$/.test(file.path)),
  );
  assert(
    artifacts.some((file) => /^assets\/index-[\w-]+\.css$/.test(file.path)),
  );
  const { chromium } = await import('playwright-core');
  const server = await startProofServer({
    distDirectory: resolve('dist'),
    fixtureDirectory: resolve('tests/e2e/fixtures'),
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
    for (const prefix of ['/', '/math-adventure/'])
      cases.push(await runBrowserProof(browser, server, prefix));
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
