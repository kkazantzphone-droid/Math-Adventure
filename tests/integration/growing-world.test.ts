// Real installed-browser journeys over disposable synthetic profiles only.
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
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startProofServer } from '../../scripts/browser-proof/server.mjs';
import type { ProofServer } from '../../scripts/browser-proof/server.mjs';
import type { ChapterPresentation } from '../../src/application/growing-world';
import type { ChapterFamilyId } from '../../src/domain/growing-world/content';
import { growingJourneyForRecord } from '../../src/application/synthetic-loop/record';

const channel = process.env.PHASE3C_BROWSER ?? 'chrome';
const directory = resolve('.cache/growing-world-browser');
const locales = ['el-GR', 'en-GB', 'de-DE'] as const;
const families: readonly ChapterFamilyId[] = [
  'number.make-ten',
  'number.part-whole',
  'groups.equal',
  'groups.missing',
  'measurement.array-area',
  'powers.square-side',
];
const sourceFiles = [
  'src/domain/growing-world/content.ts',
  'src/domain/growing-world/journey.ts',
  'src/domain/growing-world/explore.ts',
  'src/application/growing-world.ts',
  'src/application/synthetic-loop/record.ts',
  'src/application/synthetic-loop/session.ts',
  'src/application/synthetic-loop/answer.ts',
  'src/application/synthetic-loop/seed.ts',
  'src/application/synthetic-loop/types.ts',
  'src/ui/synthetic-loop/ChapterTaskView.tsx',
  'src/ui/synthetic-loop/ExploreWorld.tsx',
  'src/ui/synthetic-loop/GrowthJourney.tsx',
  'src/ui/synthetic-loop/growing-world.css',
  'src/presentation/localisation/growing-world-copy.ts',
  'src/presentation/speech/plans.ts',
  'tests/browser/phase3c/main.tsx',
  'tests/browser/phase3c/runtime.ts',
  'tests/browser/phase3c/shell.css',
  'vite.slice.config.ts',
  'tests/integration/growing-world.test.ts',
];
let browser: Browser;
let context: BrowserContext;
let server: ProofServer;
let initialHashes: Record<string, string>;
const cases: { name: string; outcome: string }[] = [];
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
  initialHashes = await hashes();
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
    viewport: { width: 1000, height: 850 },
    reducedMotion: 'reduce',
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
  await writeFile(
    resolve(directory, `${channel}-evidence.json`),
    `${JSON.stringify(
      {
        result:
          cases.length === 29 &&
          cases.every((item) => item.outcome === 'pass') &&
          externalRequests === 0 &&
          pageErrors === 0 &&
          JSON.stringify(initialHashes) === JSON.stringify(sourceHashes)
            ? 'PASS'
            : 'FAIL',
        channel,
        browserVersion: browser?.version(),
        sourceHashes,
        sourcesStable:
          JSON.stringify(initialHashes) === JSON.stringify(sourceHashes),
        cases,
        externalRequests,
        pageErrors,
        mechanism:
          'Installed browser via playwright-core; disposable synthetic contexts; NODE_ENV=test renderer; browser network-disabled cached navigation; deliberate root text scaling',
        limits:
          'No native language, educational effectiveness, actual AT delivery, native zoom or physical disconnection certification',
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
async function help(page: Page, tier?: 1 | 2 | 3) {
  const previous = Number(
    await page
      .locator('[data-chapter-family]')
      .getAttribute('data-child-hint-tier'),
  );
  expect([0, 1, 2, 3]).toContain(previous);
  const expectedTier = tier ?? Math.min(3, previous + 1);
  await page.locator('[data-child-help]').click();
  await settled(page);
  await page.waitForFunction(
    (expected) =>
      document
        .querySelector('[data-chapter-family]')
        ?.getAttribute('data-child-hint-tier') === String(expected),
    expectedTier,
  );
}
async function open(page: Page, prefix = '/') {
  expect((await page.goto(`${server.origin}${prefix}`))?.status()).toBe(200);
  await page.waitForFunction(
    () => window.phase3cProof?.offline()?.shell === 'ready',
  );
}
async function profile(page: Page, index = 0) {
  await page.locator('[data-profile]').nth(index).click();
  await settled(page);
  await page.locator('#slice-task-heading').waitFor();
}
async function choose(page: Page, family: ChapterFamilyId) {
  if (!(await page.locator(`[data-discovery-family="${family}"]`).isVisible()))
    await page.locator('[data-action="discoveries"]').click();
  if (
    (await page.locator('[data-journey-mode]').getAttribute('aria-pressed')) ===
    'false'
  ) {
    await page.locator('[data-journey-mode]').click();
    await settled(page);
  }
  if (!(await page.locator(`[data-discovery-family="${family}"]`).isVisible()))
    await page.locator('[data-action="discoveries"]').click();
  await page.locator(`[data-discovery-family="${family}"]`).click();
  await settled(page);
  await page.waitForFunction(
    (family) =>
      window.phase3cProof.state().record?.selectedFamily === family &&
      !window.phase3cProof.state().busy,
    family,
  );
}
async function chapter(page: Page): Promise<ChapterPresentation> {
  return page.evaluate(() => {
    const proof = window.phase3cProof as typeof window.phase3cProof & {
      chapterTask(): ChapterPresentation | null;
    };
    const task = proof.chapterTask();
    if (!task) throw new Error('Synthetic chapter missing');
    return task;
  });
}
/** Independent integer relationships, using no domain validator/generator/helper. */
function answer(presentation: ChapterPresentation): number {
  const task = presentation.task;
  switch (task.kind) {
    case 'makeTen':
      return 10 - task.first;
    case 'missingPart':
      return task.total - task.known;
    case 'equalGroups':
      return task.groups * task.each;
    case 'missingGroup':
      return task.total / task.groups;
    case 'arrayArea':
      return task.rows * task.columns;
    case 'squareSide': {
      for (let side = 1; side <= 6; side++)
        if (side * side === task.total) return side;
      throw new Error('Non-square');
    }
  }
}
async function respond(page: Page, value: number) {
  await page.locator(`[data-child-answer="${value}"]`).click();
  await settled(page);
  await page.waitForFunction(
    () =>
      !!window.phase3cProof.state().record?.lastCompletion &&
      !window.phase3cProof.state().busy,
  );
}

describe('growing mathematical world — integrated bounded evidence', () => {
  it('preserves explicit just-play choice through discovery and Explore-to-practice navigation', async () => {
    const page = await context.newPage();
    await open(page);
    await profile(page);
    await page.locator('[data-action="discoveries"]').click();
    await page.locator('[data-discovery-family="number.make-ten"]').click();
    await settled(page);
    await respond(page, answer(await chapter(page)));
    let record = (await page.evaluate(() => window.phase3cProof.state()))
      .record;
    expect(record?.mode).toBe('manual');
    expect(
      record &&
        growingJourneyForRecord(record).ok &&
        (record.schema === 'growing-world-synthetic-loop-v2'
          ? record.chapterEvents.length
          : -1),
    ).toBe(0);
    await page.locator('[data-child-nav="explore"]').click();
    await page.locator('[data-world-practice="number.make-ten"]').click();
    await settled(page);
    expect(
      (await page.evaluate(() => window.phase3cProof.state())).record?.mode,
    ).toBe('manual');
    await page.locator('[data-action="discoveries"]').click();
    await page.locator('[data-journey-mode]').click();
    await settled(page);
    await page.locator('[data-discovery-family="groups.equal"]').click();
    await settled(page);
    await respond(page, answer(await chapter(page)));
    record = (await page.evaluate(() => window.phase3cProof.state())).record;
    expect(record?.mode).toBe('synthetic-policy');
    expect(
      record?.schema === 'growing-world-synthetic-loop-v2' &&
        record.chapterEvents.length,
    ).toBe(1);
  });
  for (const locale of locales)
    for (const family of families)
      it(`${locale} ${family}: independent task, visual help, retry and worked distinction`, async () => {
        const page = await context.newPage();
        await open(page);
        await page.locator(`[data-child-language="${locale}"]`).click();
        await profile(page);
        await choose(page, family);
        const before = await chapter(page);
        expect(before.familyId).toBe(family);
        expect('answerContract' in before).toBe(false);
        await respond(page, 0);
        expect(
          (await page.evaluate(() => window.phase3cProof.state())).record
            ?.lastCompletion?.correct,
        ).toBe(false);
        await page.locator('[data-child-retry]').click();
        await help(page, 1);
        await help(page, 2);
        await help(page, 3);
        expect(await chapter(page)).toEqual(before);
        await respond(page, answer(before));
        const state = await page.evaluate(() => window.phase3cProof.state());
        expect(state.record?.lastCompletion?.correct).toBe(true);
        if (!state.record) throw new Error('record missing');
        const journey = growingJourneyForRecord(state.record);
        expect(journey.ok).toBe(true);
        if (journey.ok) {
          expect(
            journey.value.readiness.every(
              (item) => item.independentCases === 0,
            ),
          ).toBe(true);
          expect(journey.value.limitedEvidence).toBe(true);
        }
      });

  it('different actual synthetic histories invite a connected inverse or useful support, independently of badge identity', async () => {
    const page = await context.newPage();
    await open(page);
    await profile(page);
    await choose(page, 'groups.equal');
    for (let index = 0; index < 30; index++) {
      if (index === 2) {
        await page.locator('[data-action="stop"]').click();
        await settled(page);
        await page.locator('[data-action="resume"]').click();
        await settled(page);
      }
      await respond(page, answer(await chapter(page)));
      const record = (await page.evaluate(() => window.phase3cProof.state()))
        .record;
      if (!record) throw new Error('Missing synthetic record');
      const journey = growingJourneyForRecord(record);
      if (
        journey.ok &&
        journey.value.readiness.find((item) => item.familyId === 'groups.equal')
          ?.readyForInvitation
      )
        break;
      await page.locator('[data-action="next"]').click();
    }
    const first = (await page.evaluate(() => window.phase3cProof.state()))
      .record;
    if (!first) throw new Error('Missing synthetic record');
    const ready = growingJourneyForRecord(first);
    expect(
      ready.ok &&
        ready.value.invitations.some(
          (item) =>
            item.familyId === 'groups.missing' &&
            item.reason === 'connectedReadiness',
        ),
    ).toBe(true);
    expect(
      first.derived.concepts['addition.part-whole']?.attained ?? 'Unseen',
    ).toBe('Unseen');
    await profile(page, 1);
    await choose(page, 'groups.equal');
    for (let index = 0; index < 3; index++) {
      await help(page);
      await respond(page, answer(await chapter(page)));
      if (index < 2) await page.locator('[data-action="next"]').click();
    }
    const second = (await page.evaluate(() => window.phase3cProof.state()))
      .record;
    if (!second) throw new Error('Missing synthetic record');
    const support = growingJourneyForRecord(second);
    expect(
      support.ok &&
        support.value.invitations.some(
          (item) =>
            item.familyId === 'groups.equal' && item.reason === 'support',
        ),
    ).toBe(true);
    expect(
      support.ok &&
        support.value.readiness.find((item) => item.familyId === 'groups.equal')
          ?.independentCases,
    ).toBe(0);
    await profile(page, 0);
    const returned = (await page.evaluate(() => window.phase3cProof.state()))
      .record;
    expect(returned && growingJourneyForRecord(returned)).toEqual(ready);
  }, 60_000);

  it('live language changes preserve new mathematical task, maximum help and evidence; badges reopen independently', async () => {
    const page = await context.newPage();
    await open(page);
    await profile(page);
    await choose(page, 'number.part-whole');
    await help(page);
    const before = await chapter(page);
    for (const locale of locales) {
      await page.locator(`[data-child-language="${locale}"]`).click();
      await settled(page);
      expect(await chapter(page)).toEqual(before);
      expect(
        await page
          .locator('[data-chapter-family]')
          .getAttribute('data-child-hint-tier'),
      ).toBe('1');
    }
    await respond(page, answer(before));
    const record = (await page.evaluate(() => window.phase3cProof.state()))
      .record;
    await profile(page, 1);
    expect(
      (await page.evaluate(() => window.phase3cProof.state())).record
        ?.completedCount,
    ).toBe(0);
    await profile(page, 0);
    expect(
      (await page.evaluate(() => window.phase3cProof.state())).record
        ?.completedCount,
    ).toBe(record?.completedCount);
    expect(
      (await page.evaluate(() => window.phase3cProof.state())).record
        ?.preferences.uiLocale,
    ).toBe('de-DE');
  });

  for (const locale of locales)
    it(`${locale}: reversible Explore conserves totals, changes arrays, keeps all saved evidence unchanged`, async () => {
      const page = await context.newPage();
      await open(page);
      await page.locator(`[data-child-language="${locale}"]`).click();
      await profile(page);
      const before = await page.evaluate(() => window.phase3cProof.state());
      await page.locator('[data-child-nav="explore"]').click();
      await page.locator('[data-explore-world]').waitFor();
      const initial = await page
        .locator('[data-world-relationship]:visible')
        .textContent();
      await page.locator('[data-world-action="moveLeft"]').click();
      expect(
        await page.locator('[data-world-relationship]:visible').textContent(),
      ).not.toBe(initial);
      await page.locator('[data-world-action="undo"]').click();
      expect(
        await page.locator('[data-world-relationship]:visible').textContent(),
      ).toBe(initial);
      await page.locator('[data-world-workshop="arrays"]').click();
      const array = await page
        .locator('[data-world-relationship]:visible')
        .textContent();
      await page.locator('[data-world-action="turn"]').click();
      expect(
        await page.locator('[data-world-relationship]:visible').textContent(),
      ).not.toBe(array);
      await page.locator('[data-world-action="undo"]').click();
      expect(
        await page.locator('[data-world-relationship]:visible').textContent(),
      ).toBe(array);
      await page.locator('[data-world-action="square"]').click();
      await page.locator('[data-world-action="oneSide"]').click();
      await page.locator('[data-world-action="symbols"]').click();
      expect(
        await page.locator('[data-world-symbols]').textContent(),
      ).toContain('√');
      const after = await page.evaluate(() => window.phase3cProof.state());
      expect(after.record).toEqual(before.record);
      expect(after.snapshot?.revision).toBe(before.snapshot?.revision);
      expect(after.explorationCount).toBe(before.explorationCount);
    });

  for (const locale of locales)
    it(`${locale}: new controls reflow at 320px and deliberate 200% text with keyboard focus`, async () => {
      const page = await context.newPage();
      await open(page);
      await page.locator(`[data-child-language="${locale}"]`).click();
      await profile(page);
      await page.setViewportSize({ width: 320, height: 850 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      for (const family of families) {
        await choose(page, family);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const boxes = await page
          .locator('[data-child-answer]')
          .evaluateAll((items) =>
            items.map((item) => {
              const box = item.getBoundingClientRect();
              return { width: box.width, height: box.height };
            }),
          );
        expect(boxes.every((box) => box.width >= 44 && box.height >= 44)).toBe(
          true,
        );
      }
      await page.locator('[data-child-nav="explore"]').focus();
      await page.keyboard.press('Enter');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });

  for (const prefix of ['/', '/math-adventure/'])
    it(`${prefix}: new saved chapter and preferences reopen from actual worker cache with browser network disabled`, async () => {
      const page = await context.newPage();
      await open(page, prefix);
      await profile(page);
      await choose(page, 'groups.equal');
      const task = await chapter(page);
      await respond(page, answer(task));
      const before = await page.evaluate(() => window.phase3cProof.state());
      await context.setOffline(true);
      await page.reload();
      await settled(page);
      await profile(page);
      const after = await page.evaluate(() => window.phase3cProof.state());
      expect(after.record?.preferences).toEqual(before.record?.preferences);
      expect(after.record?.completedCount).toBe(before.record?.completedCount);
      expect(after.record?.schema).toBe('growing-world-synthetic-loop-v2');
      expect(after.record && growingJourneyForRecord(after.record)).toEqual(
        before.record && growingJourneyForRecord(before.record),
      );
    });
});
