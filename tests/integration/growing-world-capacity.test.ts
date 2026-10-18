// Native wire-capacity proof; deliberately not an actual learner trajectory.
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { chromium } from 'playwright-core';
import type { Browser, BrowserContext } from 'playwright-core';
import { build } from 'vite';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startProofServer } from '../../scripts/browser-proof/server.mjs';
import type { ProofServer } from '../../scripts/browser-proof/server.mjs';
import type { runGrowingWorldCapacityProof } from '../fixtures/synthetic/growing-world-capacity';

const channel = process.env.PHASE3C_BROWSER ?? 'chrome';
const directory = resolve('.cache/growing-world-capacity');
const sourceFiles = [
  'src/application/synthetic-loop/record.ts',
  'src/application/synthetic-loop/answer.ts',
  'src/application/synthetic-loop/types.ts',
  'src/application/synthetic-loop/session.ts',
  'src/application/growing-world.ts',
  'src/application/repository/validation.ts',
  'src/domain/replay/canonical.ts',
  'src/domain/growing-world/support.ts',
  'src/domain/growing-world/content.ts',
  'src/domain/growing-world/journey.ts',
  'src/infrastructure/persistence/adapter.ts',
  'src/infrastructure/persistence/layout.ts',
  'src/infrastructure/persistence/synthetic-loop-database.ts',
  'tests/browser/phase3c/runtime.ts',
  'tests/browser/phase3c/main.tsx',
  'vite.slice.config.ts',
  'tests/fixtures/synthetic/growing-world-capacity.ts',
  'tests/integration/growing-world-capacity.test.ts',
];
let browser: Browser;
let context: BrowserContext;
let server: ProofServer;
let startingHashes: Record<string, string>;
const cases: { name: string; outcome: string }[] = [];
const summaries: (Awaited<ReturnType<typeof runGrowingWorldCapacityProof>> & {
  prefix: string;
  oldTargetReaderBlocked: boolean;
})[] = [];
let externalRequests = 0;
let pageErrors = 0;

async function hashes(): Promise<Record<string, string>> {
  return Object.fromEntries<string>(
    await Promise.all(
      sourceFiles.map(async (path): Promise<readonly [string, string]> => [
        path,
        createHash('sha256')
          .update(await readFile(path))
          .digest('hex'),
      ]),
    ),
  );
}

beforeAll(async () => {
  expect(['chrome', 'msedge']).toContain(channel);
  await mkdir(directory, { recursive: true });
  startingHashes = await hashes();
  const previousLabel = process.env.PWA_RELEASE_LABEL;
  try {
    process.env.PWA_RELEASE_LABEL = 'growing-capacity-current';
    await build({
      configFile: 'vite.slice.config.ts',
      logLevel: 'error',
      build: { outDir: resolve(directory, 'site') },
    });
    process.env.PWA_RELEASE_LABEL = 'growing-capacity-old-reader';
    await build({
      configFile: 'vite.slice.config.ts',
      logLevel: 'error',
      build: { outDir: resolve(directory, 'old-reader') },
      plugins: [
        {
          name: 'synthetic-old-payload-reader',
          generateBundle(_options, bundle) {
            const reader = bundle['learner-reader.json'];
            if (!reader || reader.type !== 'asset')
              throw new Error('Synthetic reader declaration missing');
            reader.source = JSON.stringify({
              schema: 'phase3c-learner-reader-v1',
              layout: 2,
              recordSchema: 'phase3c-synthetic-loop-v1',
            });
          },
        },
      ],
    });
  } finally {
    if (previousLabel === undefined) delete process.env.PWA_RELEASE_LABEL;
    else process.env.PWA_RELEASE_LABEL = previousLabel;
  }
  // Separate test-only module; never change the playable shell or production.
  await build({
    configFile: false,
    publicDir: false,
    logLevel: 'error',
    build: {
      outDir: resolve(directory, 'site'),
      emptyOutDir: false,
      target: 'es2023',
      lib: {
        entry: resolve('tests/fixtures/synthetic/growing-world-capacity.ts'),
        formats: ['es'],
        fileName: () => 'capacity-harness.js',
      },
    },
  });
  server = await startProofServer({
    distDirectory: resolve(directory, 'site'),
    fixtureDirectory: resolve('tests/e2e/fixtures'),
    productionReleases: (['/', '/math-adventure/'] as const).flatMap(
      (prefix, index) => [
        {
          name: `p${index}-current`,
          prefix,
          directory: resolve(directory, 'site'),
        },
        {
          name: `p${index}-old`,
          prefix,
          directory: resolve(directory, 'old-reader'),
        },
      ],
    ),
  });
  browser = await chromium.launch({ channel, headless: true, timeout: 15_000 });
});

beforeEach(async () => {
  context = await browser.newContext({
    serviceWorkers: 'allow',
    acceptDownloads: false,
  });
  context.on('page', (page) => page.on('pageerror', () => pageErrors++));
  context.on('request', (request) => {
    if (new URL(request.url()).origin !== server.origin) externalRequests++;
  });
  await context.route('**/*', async (route) =>
    new URL(route.request().url()).origin !== server.origin
      ? route.abort('blockedbyclient')
      : route.continue(),
  );
});

afterEach(async (task) => {
  cases.push({
    name: task.task.name,
    outcome: task.task.result?.state ?? 'unknown',
  });
  await context?.close();
});

afterAll(async () => {
  const sourceHashes = await hashes();
  const sourcesStable =
    JSON.stringify(sourceHashes) === JSON.stringify(startingHashes);
  await writeFile(
    resolve(directory, `${channel}-evidence.json`),
    `${JSON.stringify(
      {
        result:
          cases.length === 2 &&
          cases.every((item) => item.outcome === 'pass') &&
          summaries.length === 2 &&
          sourcesStable &&
          externalRequests === 0 &&
          pageErrors === 0
            ? 'PASS'
            : 'FAIL',
        channel,
        browserVersion: browser?.version(),
        sourceHashes,
        sourcesStable,
        cases,
        summaries,
        externalRequests,
        pageErrors,
        mechanism:
          'Installed browser via playwright-core; native IndexedDB adapter execute/close/reopen; artificial bounded synthetic wire fixtures; verified waiting old-reader shell rejected',
        limits:
          'Capacity and compatibility evidence only; repeated semantic fixtures do not establish an actual learner trajectory, readiness, retention or educational effectiveness',
      },
      null,
      2,
    )}\n`,
  );
  await browser?.close();
  await server?.close();
});

describe(`installed ${channel} growing-world native wire capacity`, () => {
  for (const [index, prefix] of (['/', '/math-adventure/'] as const).entries())
    it(`${prefix} full legacy/chapter journals survive shared receipt allowance and reject an old payload-reader target`, async () => {
      server.setProductionRelease(prefix, `p${index}-current`);
      const page = await context.newPage();
      expect(
        (await page.goto(`${server.origin}${prefix}#developer`))?.status(),
      ).toBe(200);
      await page.waitForFunction(
        () =>
          window.phase3cProof?.offline()?.shell === 'ready' &&
          !window.phase3cProof.offline()?.frozen,
      );
      await page.addScriptTag({
        type: 'module',
        url: `${server.origin}${prefix}capacity-harness.js`,
      });
      await page.waitForFunction(() => !!window.growingWorldCapacityProof);
      const summary = await page.evaluate(() =>
        window.growingWorldCapacityProof(),
      );
      expect(summary).toMatchObject({
        marker: 'synthetic-only-wire-capacity',
        legacyEvents: 64,
        chapterEvents: 72,
        supportContexts: 232,
        completedCount: 136,
        successfulCommands: 2084,
        receiptCount: 2084,
        receiptLimit: 4096,
        profileRevisions: [1044, 1040],
        storageEpoch: 0,
        preservedLegacy: true,
        reopened: true,
        exactRetryDidNotReapply: true,
        otherProfilePreserved: true,
        oldNativeReaderError: 'invalid_record',
        capacityReached: true,
      });
      expect(summary.preparedCanonicalLength).toBeLessThan(
        summary.canonicalOutputLimit,
      );
      expect(summary.finalCanonicalLength).toBeLessThan(
        summary.canonicalOutputLimit,
      );
      expect(summary.commandFingerprintLengths).toHaveLength(3);
      expect(
        summary.commandFingerprintLengths.every(
          (length) => length < summary.canonicalOutputLimit,
        ),
      ).toBe(true);
      expect(summary.finalCanonicalSha256).toMatch(/^[a-f0-9]{64}$/);
      await page.locator('[data-profile]').first().click();
      await page.waitForFunction(
        () =>
          window.phase3cProof.state().record?.completedCount === 136 &&
          !window.phase3cProof.state().busy,
      );
      const before = await page.evaluate(
        () => window.phase3cProof.state().snapshot,
      );
      const release = (await page.evaluate(() => window.phase3cProof.offline()))
        ?.releaseId;
      server.setProductionRelease(prefix, `p${index}-old`);
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration(
          location.href,
        );
        if (!registration) throw new Error('Owned synthetic worker missing');
        await registration.update();
      });
      await page.waitForFunction(
        () => window.phase3cProof.offline()?.update === 'waiting',
      );
      const details = page.locator('.offline-controls details');
      if (!(await details.evaluate((element) => element.hasAttribute('open'))))
        await details.locator('summary').click();
      await details.locator('[data-offline-action=update]').click();
      await page.waitForFunction(
        () => window.phase3cProof.offline()?.update === 'blocked',
      );
      expect(
        (await page.evaluate(() => window.phase3cProof.offline()))?.releaseId,
      ).toBe(release);
      expect(
        await page.evaluate(() => window.phase3cProof.state().snapshot),
      ).toEqual(before);
      expect(
        (await page.evaluate(() => window.phase3cProof.state())).frozen,
      ).toBe(false);
      summaries.push({ ...summary, prefix, oldTargetReaderBlocked: true });
    }, 60_000);
});
