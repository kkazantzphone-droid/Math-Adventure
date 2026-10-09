// Installed-browser evidence over disposable, fixed synthetic profiles only.
// Retained evidence is bounded counts/source hashes; no record/tree/media dumps.
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
import { relative, resolve } from 'node:path';
import { startProofServer } from '../../scripts/browser-proof/server.mjs';
import type { ProofServer } from '../../scripts/browser-proof/server.mjs';
import type {
  LoopFamilyId,
  SyntheticLoopRecord,
} from '../../src/application/synthetic-loop';
import type { LoopPresentation } from '../../src/ui/synthetic-loop/TaskView';
import {
  CHILD_FAMILIES,
  childAnswerKey,
  wrongChildAnswer,
} from './helpers/phase3c-child-oracle';
import type { ChildAnswerKey } from './helpers/phase3c-child-oracle';
import {
  CHILD_LANGUAGE_EXPECTATIONS,
  PLAYABLE_CHILD_LOCALES,
} from './helpers/multilingual-child-expectations';
import type { PlayableChildLocale } from './helpers/multilingual-child-expectations';

const channel = process.env.PHASE3C_BROWSER ?? 'chrome';
const evidenceDirectory = resolve('.cache/multilingual-child-browser');
const artifactDirectory = resolve(evidenceDirectory, 'site');
const expectedCaseCount = CHILD_FAMILIES.length * 4 + 16;
const sourceFiles = [
  'tests/integration/multilingual-child.test.ts',
  'tests/integration/helpers/multilingual-child-expectations.ts',
  'tests/integration/helpers/phase3c-child-oracle.ts',
  'tests/browser/phase3c/main.tsx',
  'tests/browser/phase3c/ChildShell.tsx',
  'tests/browser/phase3c/runtime.ts',
  'tests/browser/phase3c/shell.css',
  'src/ui/synthetic-loop/LanguageControls.tsx',
  'src/ui/synthetic-loop/ChildTaskView.tsx',
  'src/ui/synthetic-loop/ChildPrimitives.tsx',
  'src/ui/synthetic-loop/TaskView.tsx',
  'src/ui/synthetic-loop/slice.css',
  'src/ui/styles.css',
  'src/ui/speech/SpeechControls.tsx',
  'src/ui/speech/SpeechAvailabilityNotice.tsx',
  'src/ui/synthetic-loop/child-layout.ts',
  'src/ui/synthetic-loop/child-answers.ts',
  'src/ui/synthetic-loop/child-task.css',
  'src/presentation/localisation/child-copy.ts',
  'src/presentation/localisation/slice-copy.ts',
  'src/presentation/localisation/locales.ts',
  'src/presentation/localisation/language-controls-copy.ts',
  'src/presentation/speech/plans.ts',
  'src/application/synthetic-loop/session.ts',
  'src/application/synthetic-loop/record.ts',
  'src/application/synthetic-loop/seed.ts',
  'src/application/synthetic-loop/answer.ts',
  'src/infrastructure/persistence/synthetic-loop-database.ts',
  'src/infrastructure/persistence/adapter.ts',
  'src/infrastructure/offline/browserOffline.ts',
  'src/infrastructure/offline/shell-worker.ts',
  'src/infrastructure/speech/browserSpeech.ts',
  'tests/oracle/family-proof.ts',
  'vite.slice.config.ts',
  'scripts/pwa-build.ts',
];
const cases: { name: string; outcome: string }[] = [];
const observations: { kind: string; count: number }[] = [];
const evidence: Record<string, unknown> = {
  channel,
  result: 'PENDING',
  scope:
    'Three draft languages; eight existing families; installed desktop synthetic child surface; no official-language certification',
  nativeLanguageReview:
    'UNAVAILABLE: authored draft expectations do not establish native review',
  actualAssistiveTechnology:
    'UNAVAILABLE: DOM names/roles and keyboard checks do not establish delivered screen-reader output',
  nativeZoom: 'UNAVAILABLE: observed 200% deliberate root text scaling only',
  physicalDisconnection:
    'UNAVAILABLE: native browser offline mode and cached navigation/reopen are bounded browser evidence',
  cases,
  observations,
};
let initialHashes: Record<string, string>;
let browser: Browser;
let context: BrowserContext;
let server: ProofServer;
let externalAttempts = 0;
let outboundLearnerRequests = 0;
let pageErrors = 0;

async function sourceHashes(): Promise<Record<string, string>> {
  return Object.fromEntries(
    await Promise.all(
      sourceFiles.map(
        async (path) =>
          [
            path,
            createHash('sha256')
              .update(await readFile(path))
              .digest('hex'),
          ] as const,
      ),
    ),
  );
}

async function artifacts(
  directory: string,
): Promise<{ path: string; bytes: number; sha256: string }[]> {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    expect(entry.isSymbolicLink()).toBe(false);
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await artifacts(path)));
    else {
      expect(entry.isFile()).toBe(true);
      const bytes = await readFile(path);
      result.push({
        path: relative(evidenceDirectory, path).replaceAll('\\', '/'),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    }
  }
  return result.sort((left, right) =>
    left.path.localeCompare(right.path, 'en'),
  );
}

beforeAll(async () => {
  expect(['chrome', 'msedge']).toContain(channel);
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    resolve(evidenceDirectory, `${channel}-multilingual-evidence.json`),
    JSON.stringify(evidence),
  );
  initialHashes = await sourceHashes();
  const previousLabel = process.env.PWA_RELEASE_LABEL;
  try {
    process.env.PWA_RELEASE_LABEL = 'multilingual-child-proof-v1';
    await build({
      configFile: 'vite.slice.config.ts',
      logLevel: 'error',
      build: { outDir: artifactDirectory },
    });
  } finally {
    if (previousLabel === undefined) delete process.env.PWA_RELEASE_LABEL;
    else process.env.PWA_RELEASE_LABEL = previousLabel;
  }
  server = await startProofServer({
    distDirectory: artifactDirectory,
    fixtureDirectory: resolve('tests/e2e/fixtures'),
  });
  browser = await chromium.launch({ channel, headless: true, timeout: 15_000 });
  evidence.browserVersion = browser.version();
  evidence.browserMechanism =
    'playwright-core installed channel, no browser download; NODE_ENV=test React renderer';
});

beforeEach(async () => {
  context = await browser.newContext({
    serviceWorkers: 'allow',
    acceptDownloads: false,
    viewport: { width: 960, height: 800 },
    reducedMotion: 'reduce',
  });
  context.on('page', (page) => page.on('pageerror', () => pageErrors++));
  context.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== server.origin) externalAttempts++;
    if (
      url.search ||
      !['GET', 'HEAD'].includes(request.method()) ||
      request.postData() !== null
    )
      outboundLearnerRequests++;
  });
  // HTTP cache is disabled; offline navigation exercises the actual worker cache.
  await context.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== server.origin)
      await route.abort('blockedbyclient');
    else await route.continue();
  });
});

afterEach(async (task) => {
  cases.push({
    name: task.task.name,
    outcome: task.task.result?.state ?? 'unknown',
  });
  await context?.close();
});

afterAll(async () => {
  await context?.close();
  await browser?.close();
  await server?.close();
  const finalHashes = await sourceHashes();
  evidence.sourceHashes = finalHashes;
  evidence.sourcesStable = sourceFiles.every(
    (path) => initialHashes[path] === finalHashes[path],
  );
  evidence.artifacts = await artifacts(artifactDirectory);
  evidence.network = {
    externalAttempts,
    outboundLearnerRequests,
    pageErrors,
    receivedRequests: server?.requestCount(),
    droppedObservations: server?.droppedObservationCount(),
  };
  evidence.result =
    cases.length === expectedCaseCount &&
    cases.every((item) => item.outcome === 'pass') &&
    evidence.sourcesStable &&
    externalAttempts === 0 &&
    outboundLearnerRequests === 0 &&
    pageErrors === 0 &&
    server?.droppedObservationCount() === 0
      ? 'PASS — MULTILINGUAL CHILD BROWSER ENGINEERING'
      : 'FAIL';
  await writeFile(
    resolve(evidenceDirectory, `${channel}-multilingual-evidence.json`),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
});

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      !!window.phase3cProof &&
      window.phase3cProof.offline()?.shell === 'ready' &&
      !window.phase3cProof.offline()?.frozen &&
      !window.phase3cProof.state().busy,
  );
}

async function open(prefix: '/' | '/math-adventure/' = '/'): Promise<Page> {
  const page = await context.newPage();
  expect((await page.goto(`${server.origin}${prefix}`))?.status()).toBe(200);
  await ready(page);
  expect(
    await page.locator('main').getAttribute('data-presentation-view'),
  ).toBe('child');
  return page;
}

async function state(page: Page) {
  return page.evaluate(() => window.phase3cProof.state());
}

async function presentation(page: Page): Promise<LoopPresentation> {
  const task = await page.evaluate(() => window.phase3cProof.presentation());
  if (!task || !('task' in task) || 'answerContract' in task)
    throw new Error('Public semantic task unavailable');
  return task;
}

async function language(
  page: Page,
  locale: PlayableChildLocale,
): Promise<void> {
  await page.locator(`[data-child-language="${locale}"]`).click();
  await page.waitForFunction(
    (locale) =>
      document.querySelector('main')?.getAttribute('lang') === locale &&
      !window.phase3cProof.state().busy,
    locale,
  );
}

async function profile(page: Page, index = 0): Promise<void> {
  await page.locator('[data-profile]').nth(index).click();
  await page.waitForFunction(
    (profileId) =>
      window.phase3cProof.state().record?.profileId === profileId &&
      !window.phase3cProof.state().busy,
    index === 0 ? 'SYNTHETIC-PLAYER-1' : 'SYNTHETIC-PLAYER-2',
  );
  await page.locator('#slice-task-heading').waitFor();
}

async function view(page: Page, target: 'child' | 'developer'): Promise<void> {
  if (
    (await page.locator('main').getAttribute('data-presentation-view')) !==
    target
  )
    await page.locator('[data-action=presentation-view]').click();
  expect(
    await page.locator('main').getAttribute('data-presentation-view'),
  ).toBe(target);
}

async function activity(page: Page, family: LoopFamilyId): Promise<void> {
  await view(page, 'developer');
  await page.locator(`[data-family="${family}"]`).click();
  await ready(page);
  await view(page, 'child');
  expect((await presentation(page)).familyId).toBe(family);
}

async function answer(page: Page, value: ChildAnswerKey): Promise<void> {
  await page.locator(`[data-child-answer="${value}"]`).click();
  await ready(page);
  await page.waitForFunction(
    () => document.querySelector('#slice-feedback')?.textContent !== '',
  );
}

function withoutPreferences(record: SyntheticLoopRecord | null) {
  if (!record) throw new Error('Synthetic record unavailable');
  return { ...record, preferences: null };
}

function contrastRatio(foreground: string, background: string): number {
  const luminance = (colour: string) => {
    const rgb = colour.match(/[\d.]+/g)?.map(Number);
    if (!rgb || rgb.length !== 3) throw new Error('Expected opaque RGB colour');
    const linear = rgb.map((value) => {
      const fraction = value / 255;
      return fraction <= 0.04045
        ? fraction / 12.92
        : ((fraction + 0.055) / 1.055) ** 2.4;
    });
    return (
      (linear[0] ?? 0) * 0.2126 +
      (linear[1] ?? 0) * 0.7152 +
      (linear[2] ?? 0) * 0.0722
    );
  };
  const first = luminance(foreground),
    second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

async function assertLanguage(
  page: Page,
  ui: PlayableChildLocale,
  instruction = ui,
): Promise<void> {
  expect(await page.locator('main').getAttribute('lang')).toBe(ui);
  expect(await page.locator('html').getAttribute('lang')).toBe(ui);
  expect(await page.locator('.child-task').getAttribute('lang')).toBe(
    instruction,
  );
  expect(await page.locator('[data-child-help]').getAttribute('lang')).toBe(ui);
  expect(await page.locator('#slice-feedback').getAttribute('lang')).toBe(ui);
  expect((await page.locator('[data-child-help]').innerText()).trim()).toBe(
    CHILD_LANGUAGE_EXPECTATIONS[ui].help,
  );
  expect(await page.locator('[data-profile]').allTextContents()).toEqual(
    CHILD_LANGUAGE_EXPECTATIONS[ui].badges,
  );
  const nav = await page.locator('[data-child-nav]').allTextContents();
  expect(nav.map((label) => label.replace(/[▶◇✦]/g, '').trim())).toEqual(
    CHILD_LANGUAGE_EXPECTATIONS[ui].navigation,
  );
  // Names in each language are intentionally visible in the language chooser.
  // Everywhere else, English/German child text must not leak unexplained Greek.
  if (ui !== 'el-GR' && instruction !== 'el-GR') {
    const labels = await page
      .locator(
        '.child-task, .child-navigation, .child-profiles, .slice-actions, [data-save-state], [data-child-speech-availability]',
      )
      .allTextContents();
    expect(labels.join('\n')).not.toMatch(/\p{Script=Greek}/u);
    expect(await page.locator('.child-task').ariaSnapshot()).not.toMatch(
      /\p{Script=Greek}/u,
    );
  }
  expect(
    await page
      .locator('[data-developer-controls], [data-inspection], select')
      .count(),
  ).toBe(0);
}

async function assertPromptAndOptions(
  page: Page,
  family: LoopFamilyId,
  locale: PlayableChildLocale,
): Promise<void> {
  const expected = CHILD_LANGUAGE_EXPECTATIONS[locale];
  const index = CHILD_FAMILIES.indexOf(family);
  expect(await page.locator('#slice-task-heading').innerText()).toBe(
    expected.prompts[index],
  );
  if (family === 'geometry.quadrilateral')
    expect(
      await page
        .locator('[data-child-answer] > span:last-child')
        .allTextContents(),
    ).toEqual(expected.shapes);
  if (family === 'number.comparison')
    expect(
      await page
        .locator('[data-child-answer] > span:last-child')
        .allTextContents(),
    ).toEqual(expected.comparison);
  if (family === 'number.numeral') {
    const task = await presentation(page);
    if (task.task.kind !== 'numeralRecognition')
      throw new Error('Numeral public task unavailable');
    const cards = await page.locator('[data-child-answer]').all();
    for (let index = 0; index < cards.length; index++) {
      const card = cards[index],
        choice = task.task.choices[index];
      if (!card || !choice)
        throw new Error('Numeral rendered/public choice mismatch');
      expect(await card.getAttribute('aria-label')).toBe(
        `${expected.group} ${index + 1}`,
      );
      const id = await card.getAttribute('aria-describedby');
      expect(id).toBeTruthy();
      expect(await page.locator(`[id="${id}"]`).textContent()).toBe(
        choice.items.length
          ? choice.items.map(() => expected.dot).join('. ')
          : expected.empty,
      );
    }
  }
}

describe(`installed ${channel} multilingual child journey`, () => {
  it('offers understandable keyboard language choices before badges without planned playable claims', async () => {
    const page = await open();
    expect((await state(page)).record).toBeNull();
    for (const locale of PLAYABLE_CHILD_LOCALES) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(() =>
          document.activeElement?.getAttribute('data-child-language'),
        ),
      ).toBe(locale);
    }
    for (const profileId of ['SYNTHETIC-PLAYER-1', 'SYNTHETIC-PLAYER-2']) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(() =>
          document.activeElement?.getAttribute('data-profile'),
        ),
      ).toBe(profileId);
    }
    expect(
      await page.locator('[data-child-language]').allTextContents(),
    ).toEqual(
      PLAYABLE_CHILD_LOCALES.map(
        (locale) => CHILD_LANGUAGE_EXPECTATIONS[locale].name,
      ),
    );
    expect(
      await page
        .locator('[data-child-language]')
        .evaluateAll((buttons) =>
          buttons.every(
            (button) =>
              !!(
                button.compareDocumentPosition(
                  document.querySelector('[data-profile]') as Element,
                ) & Node.DOCUMENT_POSITION_FOLLOWING
              ),
          ),
        ),
    ).toBe(true);
    for (const locale of PLAYABLE_CHILD_LOCALES) {
      const button = page.locator(`[data-child-language="${locale}"]`);
      expect(await button.getAttribute('lang')).toBe(locale);
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
      await button.focus();
      await page.keyboard.press('Enter');
      expect(await button.getAttribute('aria-pressed')).toBe('true');
      const colours = await button.evaluate((element) => ({
        foreground: getComputedStyle(element).color,
        background: getComputedStyle(element).backgroundColor,
      }));
      expect(
        contrastRatio(colours.foreground, colours.background),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        await button.evaluate(
          (element) =>
            document.activeElement === element &&
            getComputedStyle(element).outlineStyle !== 'none',
        ),
      ).toBe(true);
      expect((await state(page)).record).toBeNull();
      expect(await page.locator('[data-profile]').allTextContents()).toEqual(
        CHILD_LANGUAGE_EXPECTATIONS[locale].badges,
      );
    }
    expect(
      await page
        .locator(
          '[data-child-language="fr-FR"], [data-child-language="es-ES"], [data-child-language="it-IT"], [data-child-language="pt-PT"]',
        )
        .count(),
    ).toBe(0);
    expect(await page.locator('main').ariaSnapshot()).not.toMatch(
      /el-GR|en-GB|de-DE|SYNTHETIC-PLAYER/,
    );
    expect(
      await page.evaluate(async () =>
        (await indexedDB.databases()).some(
          (database) =>
            database.name === 'math-adventure.synthetic.phase3c.loop-v1',
        ),
      ),
    ).toBe(false);
    await profile(page);
    expect((await state(page)).record?.preferences).toEqual({
      uiLocale: 'de-DE',
      instructionLocale: 'de-DE',
      numberSpeechLocale: 'de-DE',
    });
  });

  for (const locale of PLAYABLE_CHILD_LOCALES)
    for (const family of CHILD_FAMILIES) {
      it(`${locale} ${family} has coherent prompts, choices, progressive help and truth-based retry/success`, async () => {
        const page = await open();
        await language(page, locale);
        await profile(page);
        await activity(page, family);
        await assertLanguage(page, locale);
        await assertPromptAndOptions(page, family, locale);
        const beforeTask = await presentation(page),
          before = await state(page);
        const expectedAnswer = childAnswerKey(beforeTask);
        expect(await page.locator('#slice-feedback').textContent()).toBe('');
        const help = page.locator('[data-child-help]');
        for (const tier of [1, 2, 3]) {
          await help.focus();
          await page.keyboard.press('Enter');
          expect(await page.locator('#slice-hint p').innerText()).toBe(
            CHILD_LANGUAGE_EXPECTATIONS[locale].hints[
              CHILD_FAMILIES.indexOf(family)
            ]?.[tier - 1],
          );
          expect(
            await page
              .locator('.child-task')
              .getAttribute('data-child-visual-tier'),
          ).toBe(String(tier));
          expect(
            await help.evaluate(
              (element) => document.activeElement === element,
            ),
          ).toBe(true);
          expect(await presentation(page)).toEqual(beforeTask);
          expect((await state(page)).record).toEqual(before.record);
        }
        await answer(page, wrongChildAnswer(expectedAnswer));
        expect((await state(page)).record?.lastCompletion).toMatchObject({
          correct: false,
          evidence: 'manual',
        });
        expect(await page.locator('#slice-feedback').innerText()).toContain(
          CHILD_LANGUAGE_EXPECTATIONS[locale].retry,
        );
        const retry = page.locator('[data-child-retry]');
        expect(await retry.innerText()).toBe(
          CHILD_LANGUAGE_EXPECTATIONS[locale].retry,
        );
        expect(
          await retry.evaluate((element) => document.activeElement === element),
        ).toBe(true);
        await page.keyboard.press('Enter');
        expect(await page.locator('#slice-feedback').textContent()).toBe('');
        expect(await presentation(page)).toEqual(beforeTask);
        await answer(page, expectedAnswer);
        expect(await page.locator('#slice-feedback').innerText()).toContain(
          CHILD_LANGUAGE_EXPECTATIONS[locale].success,
        );
        const completed = await state(page);
        expect(completed.record?.lastCompletion).toMatchObject({
          correct: true,
          evidence: 'manual',
        });
        expect(completed.record?.completedCount).toBe(
          (before.record?.completedCount ?? 0) + 2,
        );
        expect(completed.record?.events).toEqual(before.record?.events);
        expect(completed.record?.derived).toEqual(before.record?.derived);
        expect(
          await page
            .locator('[data-action=next]')
            .evaluate((element) => document.activeElement === element),
        ).toBe(true);
        observations.push({
          kind: `${locale}:${family}:help-and-feedback`,
          count: 5,
        });
      });
    }

  for (const family of CHILD_FAMILIES)
    it(`${family} preserves replay, maximum help, current visual stage and feedback through live language switches`, async () => {
      const page = await open();
      await profile(page);
      await activity(page, family);
      for (let stage = 0; stage < 4; stage++)
        await page.locator('[data-child-help]').click();
      expect(
        await page.locator('.child-task').getAttribute('data-child-hint-tier'),
      ).toBe('3');
      expect(
        await page
          .locator('.child-task')
          .getAttribute('data-child-visual-tier'),
      ).toBe('1');
      const task = await presentation(page),
        mathematicalState = withoutPreferences((await state(page)).record);
      for (const locale of PLAYABLE_CHILD_LOCALES) {
        await language(page, locale);
        await assertLanguage(page, locale);
        await assertPromptAndOptions(page, family, locale);
        expect(await presentation(page)).toEqual(task);
        expect(withoutPreferences((await state(page)).record)).toEqual(
          mathematicalState,
        );
        expect(
          await page
            .locator('.child-task')
            .getAttribute('data-child-hint-tier'),
        ).toBe('3');
        expect(
          await page
            .locator('.child-task')
            .getAttribute('data-child-visual-tier'),
        ).toBe('1');
        expect(await page.locator('#slice-hint p').innerText()).toBe(
          CHILD_LANGUAGE_EXPECTATIONS[locale].hints[
            CHILD_FAMILIES.indexOf(family)
          ]?.[0],
        );
      }
      await answer(page, wrongChildAnswer(childAnswerKey(task)));
      const retryState = withoutPreferences((await state(page)).record);
      await language(page, 'en-GB');
      expect(await page.locator('#slice-feedback').innerText()).toContain(
        CHILD_LANGUAGE_EXPECTATIONS['en-GB'].retry,
      );
      expect(withoutPreferences((await state(page)).record)).toEqual(
        retryState,
      );
      expect(await presentation(page)).toEqual(task);
      await page.locator('[data-child-retry]').click();
      await answer(page, childAnswerKey(task));
      const successState = withoutPreferences((await state(page)).record);
      await language(page, 'de-DE');
      expect(await page.locator('#slice-feedback').innerText()).toContain(
        CHILD_LANGUAGE_EXPECTATIONS['de-DE'].success,
      );
      expect(withoutPreferences((await state(page)).record)).toEqual(
        successState,
      );
      expect(await presentation(page)).toEqual(task);
    });

  it('persists each badge language independently across reload and reopen without altering progress', async () => {
    const page = await open();
    await language(page, 'en-GB');
    await profile(page);
    await answer(page, childAnswerKey(await presentation(page)));
    const star = (await state(page)).record;
    await profile(page, 1);
    await language(page, 'de-DE');
    await activity(page, 'number.counting');
    await answer(page, childAnswerKey(await presentation(page)));
    const triangle = (await state(page)).record;
    await page.reload();
    await ready(page);
    await profile(page);
    expect((await state(page)).record).toEqual(star);
    await assertLanguage(page, 'en-GB');
    await profile(page, 1);
    expect((await state(page)).record).toEqual(triangle);
    await assertLanguage(page, 'de-DE');
    await page.close();
    const reopened = await open();
    await profile(reopened, 1);
    expect((await state(reopened)).record).toEqual(triangle);
    await profile(reopened);
    expect((await state(reopened)).record).toEqual(star);
  });

  it('keeps useful keyboard focus after a saved language choice and respects deliberate focus moves during its write', async () => {
    const page = await open();
    await profile(page);
    const task = await presentation(page);
    const english = page.locator('[data-child-language="en-GB"]');
    await page.evaluate(() => window.phase3cProof.holdWrites(true));
    await english.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () =>
        window.phase3cProof.held() === 1 && window.phase3cProof.state().busy,
    );
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    expect(await english.isDisabled()).toBe(true);
    await page.evaluate(() => window.phase3cProof.holdWrites(false));
    await ready(page);
    expect(
      await english.evaluate((element) => document.activeElement === element),
    ).toBe(true);
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() =>
        document.activeElement?.getAttribute('data-child-language'),
      ),
    ).toBe('de-DE');
    expect(await presentation(page)).toEqual(task);
    const committed = withoutPreferences((await state(page)).record);
    await page.evaluate(() => window.phase3cProof.holdWrites(true));
    const greek = page.locator('[data-child-language="el-GR"]');
    await greek.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () =>
        window.phase3cProof.held() === 1 && window.phase3cProof.state().busy,
    );
    const badge = page.locator('[data-profile]').nth(1);
    await badge.focus();
    await page.evaluate(() => window.phase3cProof.holdWrites(false));
    await ready(page);
    expect(
      await badge.evaluate((element) => document.activeElement === element),
    ).toBe(true);
    expect((await state(page)).record?.preferences.uiLocale).toBe('el-GR');
    expect(withoutPreferences((await state(page)).record)).toEqual(committed);
    expect(await presentation(page)).toEqual(task);
  });

  it('keeps advanced interface, instruction and speech roles independent with accurate child language regions', async () => {
    const page = await open();
    await profile(page);
    const task = await presentation(page),
      before = withoutPreferences((await state(page)).record);
    for (const [uiLocale, instructionLocale, numberSpeechLocale] of [
      ['el-GR', 'en-GB', 'de-DE'],
      ['en-GB', 'de-DE', 'el-GR'],
      ['de-DE', 'el-GR', 'en-GB'],
    ] as const) {
      await view(page, 'developer');
      const details = page.locator('[data-developer-controls]');
      if (!(await details.evaluate((element) => element.hasAttribute('open'))))
        await details.locator('summary').click();
      for (const [role, locale] of Object.entries({
        uiLocale,
        instructionLocale,
        numberSpeechLocale,
      })) {
        await page
          .locator(`[data-language-role="${role}"]`)
          .selectOption(locale);
        await ready(page);
      }
      await view(page, 'child');
      await assertLanguage(page, uiLocale, instructionLocale);
      await assertPromptAndOptions(page, 'number.addition', instructionLocale);
      expect((await state(page)).record?.preferences).toEqual({
        uiLocale,
        instructionLocale,
        numberSpeechLocale,
      });
      expect(withoutPreferences((await state(page)).record)).toEqual(before);
      expect(await presentation(page)).toEqual(task);
    }
    await language(page, 'en-GB');
    expect((await state(page)).record?.preferences).toEqual({
      uiLocale: 'en-GB',
      instructionLocale: 'en-GB',
      numberSpeechLocale: 'en-GB',
    });
    await view(page, 'developer');
    const details = page.locator('[data-developer-controls]');
    if (!(await details.evaluate((element) => element.hasAttribute('open'))))
      await details.locator('summary').click();
    const advanced = page.locator('[data-language-role=numberSpeechLocale]');
    expect(await advanced.locator('option').count()).toBe(7);
    for (const locale of ['fr-FR', 'es-ES', 'it-IT', 'pt-PT'])
      expect(
        await advanced.locator(`option[value="${locale}"]`).innerText(),
      ).toContain('planned');
    await advanced.selectOption('de-DE');
    await ready(page);
    await view(page, 'child');
    await assertLanguage(page, 'en-GB');
    expect(
      await page.locator('.child-languages .child-language-note').innerText(),
    ).toBe('Different languages are selected.');
    expect(
      await page.locator('[data-child-language][aria-pressed=true]').count(),
    ).toBe(0);
    expect(await presentation(page)).toEqual(task);
    expect(withoutPreferences((await state(page)).record)).toEqual(before);
    await language(page, 'en-GB');
    expect(
      await page.locator('.child-languages .child-language-note').count(),
    ).toBe(0);
    expect((await state(page)).record?.preferences).toEqual({
      uiLocale: 'en-GB',
      instructionLocale: 'en-GB',
      numberSpeechLocale: 'en-GB',
    });
    expect(await presentation(page)).toEqual(task);
  });

  it('shows accurate fallback language and no unsupported instruction replay for all four planned packs', async () => {
    const page = await open();
    await profile(page);
    const task = await presentation(page),
      before = withoutPreferences((await state(page)).record);
    for (const locale of ['fr-FR', 'es-ES', 'it-IT', 'pt-PT']) {
      await view(page, 'developer');
      const details = page.locator('[data-developer-controls]');
      if (!(await details.evaluate((element) => element.hasAttribute('open'))))
        await details.locator('summary').click();
      await page
        .locator('[data-language-role=instructionLocale]')
        .selectOption(locale);
      await ready(page);
      await view(page, 'child');
      expect(await page.locator('.child-task').getAttribute('lang')).toBe(
        'el-GR',
      );
      expect(await page.locator('.speech-controls').count()).toBe(0);
      expect(
        await page.locator('[data-child-speech-availability]').isVisible(),
      ).toBe(true);
      expect(
        await page.locator('[data-child-language][aria-pressed=true]').count(),
      ).toBe(0);
      expect((await state(page)).record?.preferences.instructionLocale).toBe(
        locale,
      );
      expect(withoutPreferences((await state(page)).record)).toEqual(before);
      expect(await presentation(page)).toEqual(task);
    }
  });

  for (const locale of PLAYABLE_CHILD_LOCALES)
    it(`${locale} remains usable with truthful local speech availability and no automatic playback`, async () => {
      const page = await open();
      await language(page, locale);
      await profile(page);
      await activity(page, 'number.numeral');
      await page.waitForFunction(
        () =>
          !document
            .querySelector('[data-child-speech-availability]')
            ?.textContent?.match(/Checking|Ελέγχουμε|Wir suchen/),
      );
      const localAvailable = await page.evaluate(
        (locale) =>
          typeof speechSynthesis !== 'undefined' &&
          speechSynthesis
            .getVoices()
            .some(
              (voice) =>
                voice.lang.toLowerCase() === locale.toLowerCase() &&
                voice.localService === true,
            ),
        locale,
      );
      expect(
        await page.locator('[data-child-speech-availability]').count(),
      ).toBe(localAvailable ? 0 : 1);
      if (!localAvailable) {
        const note = await page
          .locator('[data-child-speech-availability]')
          .innerText();
        expect(note).toBe(
          {
            'el-GR':
              'Η ερώτηση δεν μπορεί να ακουστεί εδώ. Μπορείς να παίξεις.',
            'en-GB':
              'Reading this question aloud is unavailable here. You can still play.',
            'de-DE':
              'Die Frage kann hier nicht vorgelesen werden. Du kannst trotzdem spielen.',
          }[locale],
        );
        expect(await page.locator('.speech-controls').count()).toBe(0);
      }
      expect(
        await page.evaluate(
          () =>
            typeof speechSynthesis === 'undefined' ||
            (!speechSynthesis.speaking && !speechSynthesis.pending),
        ),
      ).toBe(true);
      await page.locator('[data-child-help]').click();
      await answer(page, childAnswerKey(await presentation(page)));
      expect((await state(page)).record?.lastCompletion?.correct).toBe(true);
      expect(
        await page.evaluate(
          () =>
            typeof speechSynthesis === 'undefined' ||
            (!speechSynthesis.speaking && !speechSynthesis.pending),
        ),
      ).toBe(true);
      observations.push({
        kind: `${locale}:reported-exact-local-voice-available`,
        count: localAvailable ? 1 : 0,
      });
    });

  for (const prefix of ['/', '/math-adventure/'] as const)
    it(`switches cached ${prefix} child languages offline, reloads and reopens without network or progress loss`, async () => {
      const page = await open(prefix);
      await language(page, 'en-GB');
      await profile(page);
      await answer(page, childAnswerKey(await presentation(page)));
      const before = withoutPreferences((await state(page)).record);
      const requestsBefore = server.requestCount();
      await context.setOffline(true);
      for (const locale of ['de-DE', 'el-GR', 'en-GB'] as const) {
        await language(page, locale);
        await assertLanguage(page, locale);
        expect(withoutPreferences((await state(page)).record)).toEqual(before);
      }
      const committed = (await state(page)).record;
      expect((await page.reload())?.fromServiceWorker()).toBe(true);
      await ready(page);
      await profile(page);
      expect((await state(page)).record).toEqual(committed);
      await assertLanguage(page, 'en-GB');
      await page.close();
      const reopened = await context.newPage();
      expect(
        (await reopened.goto(`${server.origin}${prefix}`))?.fromServiceWorker(),
      ).toBe(true);
      await ready(reopened);
      await profile(reopened);
      expect((await state(reopened)).record).toEqual(committed);
      await language(reopened, 'de-DE');
      await assertLanguage(reopened, 'de-DE');
      expect(withoutPreferences((await state(reopened)).record)).toEqual(
        before,
      );
      expect(server.requestCount()).toBe(requestsBefore);
      await context.setOffline(false);
      observations.push({
        kind: `${prefix}:worker-cache-offline-reload-and-reopen`,
        count: 2,
      });
    });

  for (const locale of PLAYABLE_CHILD_LOCALES)
    it(`${locale} retains committed language and mathematics on failed preference save and exposes localized adult recovery`, async () => {
      const page = await open();
      await language(page, locale);
      await profile(page);
      const record = (await state(page)).record,
        task = await presentation(page);
      await page.evaluate(() => window.phase3cProof.fault('abort'));
      const attemptedLocale = locale === 'en-GB' ? 'de-DE' : 'en-GB';
      await page.locator(`[data-child-language="${attemptedLocale}"]`).click();
      await ready(page);
      expect((await state(page)).error).toBe('storage_unavailable');
      expect((await state(page)).saved).toBe(false);
      expect((await state(page)).record).toEqual(record);
      expect(await presentation(page)).toEqual(task);
      await assertLanguage(page, locale);
      expect(
        await page.locator('[data-save-state]').getAttribute('data-save-state'),
      ).not.toBe('saved');
      const recoveryCopy = await page.locator('[data-save-state]').innerText();
      expect(recoveryCopy.trim().length).toBeGreaterThan(0);
      if (locale !== 'el-GR')
        expect(recoveryCopy).not.toMatch(/\p{Script=Greek}/u);
      await page.evaluate(() => window.phase3cProof.fault(undefined));
      await view(page, 'developer');
      const details = page.locator('[data-developer-controls]');
      if (!(await details.evaluate((element) => element.hasAttribute('open'))))
        await details.locator('summary').click();
      await page.locator('[data-action=reconcile]').click();
      await ready(page);
      await view(page, 'child');
      expect((await state(page)).saved).toBe(true);
      expect((await state(page)).record).toEqual(record);
      await language(page, attemptedLocale);
      expect((await state(page)).record?.preferences.uiLocale).toBe(
        attemptedLocale,
      );
    });

  for (const locale of PLAYABLE_CHILD_LOCALES)
    it(`${locale} language controls and all families retain readable reflow, keyboard targets and focus at narrow and enlarged text sizes`, async () => {
      const page = await open();
      await language(page, locale);
      await profile(page);
      let count = 0;
      for (const family of CHILD_FAMILIES) {
        await activity(page, family);
        for (let tier = 0; tier < 3; tier++)
          await page.locator('[data-child-help]').click();
        for (const size of [
          { width: 320, height: 720, text: 16 },
          { width: 375, height: 812, text: 32 },
          { width: 780, height: 320, text: 32 },
        ]) {
          await page.setViewportSize({
            width: size.width,
            height: size.height,
          });
          await page.evaluate((text) => {
            document.documentElement.style.fontSize = `${text}px`;
          }, size.text);
          const measured = await page.evaluate(() => {
            const buttons = [
              ...document.querySelectorAll<HTMLElement>(
                '[data-child-language], [data-profile], [data-child-nav], [data-child-answer], [data-child-help], [data-action=skip], [data-action=stop]',
              ),
            ];
            const bounds = buttons.map((button) =>
              button.getBoundingClientRect(),
            );
            return {
              horizontalOverflow:
                document.documentElement.scrollWidth > window.innerWidth + 1,
              targets: bounds.every(
                (rect) => rect.width >= 44 && rect.height >= 44,
              ),
              contained: bounds.every(
                (rect) =>
                  rect.left >= -1 && rect.right <= window.innerWidth + 1,
              ),
              readable: buttons.every(
                (button) =>
                  button.scrollWidth <= button.clientWidth + 1 &&
                  button.scrollHeight <= button.clientHeight + 1,
              ),
              reducedMotion: matchMedia('(prefers-reduced-motion: reduce)')
                .matches,
            };
          });
          expect(
            measured,
            `${locale} ${family} ${size.width}px, root text ${size.text}px`,
          ).toEqual({
            horizontalOverflow: false,
            targets: true,
            contained: true,
            readable: true,
            reducedMotion: true,
          });
          const last = page.locator('[data-child-answer]').last();
          await last.scrollIntoViewIfNeeded();
          await page.keyboard.press('Tab');
          await last.focus();
          expect(
            await last.evaluate(
              (element) =>
                document.activeElement === element &&
                getComputedStyle(element).outlineStyle !== 'none',
            ),
          ).toBe(true);
          count++;
        }
        await page.setViewportSize({ width: 960, height: 800 });
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '16px';
        });
      }
      observations.push({
        kind: `${locale}:320px-and-200%-root-text-portrait-landscape`,
        count,
      });
    }, 60_000);
});
