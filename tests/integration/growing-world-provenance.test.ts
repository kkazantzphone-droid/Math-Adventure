// Independent browser review: help views are provenance, never assessment events.
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
import type { Browser, BrowserContext, Page } from 'playwright-core';
import { build } from 'vite';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startProofServer } from '../../scripts/browser-proof/server.mjs';
import type { ProofServer } from '../../scripts/browser-proof/server.mjs';
import type { ChapterPresentation } from '../../src/application/growing-world';
import { growingJourneyForRecord } from '../../src/application/synthetic-loop';

const channel = process.env.PHASE3C_BROWSER ?? 'chrome';
// Channel-specific output also isolates this focused rerun from an older suite.
const directory = resolve('.cache/growing-world-provenance', channel);
const sourceFiles = [
  'src/application/growing-world.ts',
  'src/domain/growing-world/content.ts',
  'src/domain/growing-world/journey.ts',
  'src/domain/growing-world/support.ts',
  'src/infrastructure/persistence/synthetic-loop-database.ts',
  'src/ui/synthetic-loop/ChapterTaskView.tsx',
  'tests/browser/phase3c/main.tsx',
  'tests/browser/phase3c/runtime.ts',
  'vite.slice.config.ts',
  'tests/integration/growing-world-provenance.test.ts',
];
let browser: Browser;
let context: BrowserContext;
let server: ProofServer;
let startingHashes: Record<string, string>;
const cases: { name: string; outcome: string }[] = [];
let externalRequests = 0;
let pageErrors = 0;

async function hashes(): Promise<Record<string, string>> {
  const sessionFiles = (await readdir('src/application/synthetic-loop'))
    .filter((path) => path.endsWith('.ts'))
    .map((path) => `src/application/synthetic-loop/${path}`);
  return Object.fromEntries<string>(
    await Promise.all(
      [...sourceFiles, ...sessionFiles]
        .sort()
        .map(async (path): Promise<readonly [string, string]> => [
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
  await build({
    configFile: 'vite.slice.config.ts',
    logLevel: 'error',
    build: { outDir: resolve(directory, 'site') },
  });
  server = await startProofServer({
    distDirectory: resolve(directory, 'site'),
    fixtureDirectory: resolve('tests/e2e/fixtures'),
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
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === server.origin
      ? route.continue()
      : route.abort('blockedbyclient'),
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
          cases.length === 5 &&
          cases.every((item) => item.outcome === 'pass') &&
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
        externalRequests,
        pageErrors,
        mechanism:
          'Independent installed-browser journeys; disposable synthetic IndexedDB profiles; actual UI help/save/selection/reload; owned loopback server; NODE_ENV=test renderer',
        limits:
          'Bounded support provenance and evidence classification only; no physical restart, real learners, educational validity, native-language, AT or UX acceptance claim',
      },
      null,
      2,
    )}\n`,
  );
  await browser?.close();
  await server?.close();
});

async function settled(page: Page) {
  await page.waitForFunction(
    () =>
      !!window.phase3cProof &&
      !window.phase3cProof.state().busy &&
      !window.phase3cProof.offline()?.frozen,
  );
}

async function task(page: Page): Promise<ChapterPresentation> {
  return page.evaluate(() => {
    const proof = window.phase3cProof as typeof window.phase3cProof & {
      chapterTask(): ChapterPresentation | null;
    };
    const current = proof.chapterTask();
    if (!current || current.task.kind !== 'makeTen')
      throw new Error('Synthetic provenance fixture task unavailable');
    return current;
  });
}

async function badge(page: Page, index = 0) {
  await page.locator('[data-profile]').nth(index).click();
  await settled(page);
  await page.locator('#slice-task-heading').waitFor();
}

async function chooseMakeTen(page: Page, guided = false) {
  await page.locator('[data-action="discoveries"]').click();
  if (
    guided &&
    (await page.locator('[data-journey-mode]').getAttribute('aria-pressed')) ===
      'false'
  ) {
    await page.locator('[data-journey-mode]').click();
    await settled(page);
  }
  await page.locator('[data-discovery-family="number.make-ten"]').click();
  await settled(page);
  await page.locator('[data-chapter-family="number.make-ten"]').waitFor();
}

async function openChapter() {
  const page = await context.newPage();
  expect((await page.goto(server.origin))?.status()).toBe(200);
  await page.waitForFunction(
    () => window.phase3cProof?.offline()?.shell === 'ready',
  );
  await page.locator('[data-child-language="en-GB"]').click();
  await badge(page);
  await chooseMakeTen(page, true);
  return page;
}

async function help(page: Page, count = 3) {
  for (let index = 0; index < count; index++) {
    await page.locator('[data-child-help]').click();
    await settled(page);
  }
}

async function expectNoAssessment(page: Page) {
  const state = await page.evaluate(() => window.phase3cProof.state());
  expect(state.record?.completedCount).toBe(0);
  expect(state.record?.events).toEqual([]);
  expect(state.record?.schema).toBe('growing-world-synthetic-loop-v2');
  if (state.record?.schema !== 'growing-world-synthetic-loop-v2')
    throw new Error('Synthetic provenance record unavailable');
  expect(state.record.chapterEvents).toEqual([]);
  expect(growingJourneyForRecord(state.record)).toMatchObject({
    ok: true,
    value: { assessmentCount: 0, limitedEvidence: true },
  });
}

async function respondCorrectly(page: Page) {
  const current = await task(page);
  if (current.task.kind !== 'makeTen') throw new Error('Synthetic task kind');
  await page
    .locator(`[data-child-answer="${10 - current.task.first}"]`)
    .click();
  await settled(page);
  await page.waitForFunction(
    () => !!window.phase3cProof.state().record?.lastCompletion,
  );
  const state = await page.evaluate(() => window.phase3cProof.state());
  if (state.record?.schema !== 'growing-world-synthetic-loop-v2')
    throw new Error('Synthetic provenance record unavailable');
  return state.record;
}

describe(`installed ${channel} independent chapter help provenance`, () => {
  it('preserves unsubmitted worked help through same-badge, other-badge and reload paths', async () => {
    const page = await openChapter();
    const original = await task(page);
    await help(page);
    await expectNoAssessment(page);
    await badge(page);
    expect(await task(page)).toEqual(original);
    expect(
      await page
        .locator('[data-chapter-family]')
        .getAttribute('data-child-hint-tier'),
    ).toBe('3');
    await badge(page, 1);
    await chooseMakeTen(page);
    expect(
      await page
        .locator('[data-chapter-family]')
        .getAttribute('data-child-hint-tier'),
    ).toBe('0');
    await badge(page);
    expect(await task(page)).toEqual(original);
    expect(
      await page
        .locator('[data-chapter-family]')
        .getAttribute('data-child-hint-tier'),
    ).toBe('3');
    await page.reload();
    await settled(page);
    await badge(page);
    expect(await task(page)).toEqual(original);
    expect(
      await page
        .locator('[data-chapter-family]')
        .getAttribute('data-child-hint-tier'),
    ).toBe('3');
    await expectNoAssessment(page);
    const record = await respondCorrectly(page);
    expect(record.chapterEvents).toHaveLength(1);
    expect(record.chapterEvents[0]).toMatchObject({
      correct: true,
      mathematicalHintTier: 3,
      solutionExposed: true,
    });
    expect(growingJourneyForRecord(record)).toMatchObject({
      ok: true,
      value: {
        classifications: [{ outcome: 'excluded', reason: 'solutionExposed' }],
      },
    });
  });

  it('preserves semantic help across fresh activity and alternate representation without contaminating other cases', async () => {
    const page = await openChapter();
    const original = await task(page);
    if (original.task.kind !== 'makeTen')
      throw new Error('Synthetic task kind');
    const first = original.task.first;
    await help(page);
    let found = false;
    for (let index = 0; index < 64; index++) {
      await chooseMakeTen(page);
      const current = await task(page);
      if (current.task.kind !== 'makeTen')
        throw new Error('Synthetic task kind');
      const tier = await page
        .locator('[data-chapter-family]')
        .getAttribute('data-child-hint-tier');
      expect(tier).toBe(current.task.first === first ? '3' : '0');
      if (
        current.task.first === first &&
        current.task.representation !== original.task.representation
      ) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    await expectNoAssessment(page);
    const record = await respondCorrectly(page);
    expect(record.chapterEvents[0]?.solutionExposed).toBe(true);
    const result = growingJourneyForRecord(record);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.readiness[0]?.independentCases).toBe(0);
  }, 60_000);

  it('reveals worked help only after commit and restores keyboard focus without stealing a deliberate move', async () => {
    const page = await openChapter();
    const initial = await task(page);
    await help(page, 2);
    await page.evaluate(() => window.phase3cProof.holdWrites(true));
    await page.locator('[data-child-help]').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.phase3cProof.held() > 0);
    expect(
      await page
        .locator('[data-chapter-family]')
        .getAttribute('data-child-hint-tier'),
    ).toBe('2');
    expect(await page.locator('[data-world-worked]').count()).toBe(0);
    await page.evaluate(() => window.phase3cProof.holdWrites(false));
    await settled(page);
    expect(
      await page
        .locator('[data-chapter-family]')
        .getAttribute('data-child-hint-tier'),
    ).toBe('3');
    expect(await page.locator('[data-world-worked]').isVisible()).toBe(true);
    await page.waitForFunction(
      () => document.activeElement?.hasAttribute('data-child-help'),
      undefined,
      { timeout: 5_000 },
    );

    // A different semantic case needs a new saved tier, so the second held
    // transition can exercise deliberate focus movement independently.
    let fresh = false;
    for (let index = 0; index < 16; index++) {
      await chooseMakeTen(page);
      const current = await task(page);
      if (
        current.task.kind === 'makeTen' &&
        initial.task.kind === 'makeTen' &&
        current.task.first !== initial.task.first
      ) {
        fresh = true;
        break;
      }
    }
    expect(fresh).toBe(true);
    await help(page, 2);
    await page.evaluate(() => window.phase3cProof.holdWrites(true));
    await page.locator('[data-child-help]').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.phase3cProof.held() > 0);
    // Profile buttons remain available while the ordinary command is busy.
    // Merely moving focus does not switch a badge or create evidence.
    await page.locator('[data-profile]').nth(1).focus();
    await page.evaluate(() => window.phase3cProof.holdWrites(false));
    await settled(page);
    expect(
      await page
        .locator('[data-profile]')
        .nth(1)
        .evaluate((element) => element === document.activeElement),
    ).toBe(true);
    await expectNoAssessment(page);
  });

  it('keeps a failed support save from exposing a worked answer or losing the persisted lower tier', async () => {
    const page = await openChapter();
    await help(page, 2);
    await page.evaluate(() => window.phase3cProof.fault('abort'));
    await page.locator('[data-child-help]').click();
    await page.waitForFunction(
      () => window.phase3cProof.state().error === 'storage_unavailable',
    );
    expect(
      await page
        .locator('[data-chapter-family]')
        .getAttribute('data-child-hint-tier'),
    ).toBe('2');
    expect(await page.locator('[data-world-worked]').count()).toBe(0);
    await page.evaluate(() => window.phase3cProof.fault(undefined));
    await page.reload();
    await settled(page);
    await badge(page);
    expect(
      await page
        .locator('[data-chapter-family]')
        .getAttribute('data-child-hint-tier'),
    ).toBe('2');
    await expectNoAssessment(page);
  });

  it('clears session support only on explicit new session and still makes no mastery claim', async () => {
    const page = await openChapter();
    await help(page);
    const original = await task(page);
    const before = await page.evaluate(
      () => window.phase3cProof.state().record,
    );
    await page.locator('[data-action="stop"]').click();
    await settled(page);
    await page.locator('[data-action="resume"]').click();
    await settled(page);
    expect(
      await page
        .locator('[data-chapter-family]')
        .getAttribute('data-child-hint-tier'),
    ).toBe('0');
    expect((await task(page)).replay.seedHex).not.toBe(original.replay.seedHex);
    const resumed = await page.evaluate(
      () => window.phase3cProof.state().record,
    );
    expect(resumed?.completedCount).toBe(0);
    expect(
      resumed?.schema === 'growing-world-synthetic-loop-v2' &&
        resumed.chapterEvents,
    ).toEqual([]);
    const record = await respondCorrectly(page);
    expect(record.sessionOrdinal).toBe((before?.sessionOrdinal ?? 0) + 1);
    expect(record.chapterEvents).toHaveLength(1);
    expect(record.chapterEvents[0]).toMatchObject({
      mathematicalHintTier: 0,
      solutionExposed: false,
    });
    const result = growingJourneyForRecord(record);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.readiness[0]).toMatchObject({
        independentCases: 1,
        readyForInvitation: false,
        limitedEvidence: true,
      });
      expect(result.value.educatorReview).toBe('required');
    }
  });
});
