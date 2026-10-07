// Separately invoked installed-browser child presentation proof. Every context
// and profile is synthetic; evidence retains hashes/counts, never browser records,
// screenshots, audio, traces, profiles or accessibility-tree dumps.
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
import type { LoopFamilyId } from '../../src/application/synthetic-loop';
import type { LoopPresentation } from '../../src/ui/synthetic-loop/TaskView';
import {
  CHILD_FAMILIES,
  childAnswerKey,
  wrongChildAnswer,
} from './helpers/phase3c-child-oracle';
import type { ChildAnswerKey } from './helpers/phase3c-child-oracle';

const channel = process.env.PHASE3C_BROWSER ?? 'chrome';
const expectedCaseCount = CHILD_FAMILIES.length + 10;
const evidenceDirectory = resolve('.cache/phase3c-child-browser');
const artifactDirectory = resolve(evidenceDirectory, 'child-site');
const proofSources = [
  'tests/integration/phase3c-child-ux.test.ts',
  'tests/integration/helpers/phase3c-child-oracle.ts',
  'tests/browser/phase3c/main.tsx',
  'tests/browser/phase3c/ChildShell.tsx',
  'tests/browser/phase3c/runtime.ts',
  'tests/browser/phase3c/shell.css',
  'src/ui/synthetic-loop/ChildTaskView.tsx',
  'src/ui/synthetic-loop/ChildPrimitives.tsx',
  'src/ui/synthetic-loop/child-layout.ts',
  'src/ui/synthetic-loop/child-answers.ts',
  'src/ui/synthetic-loop/child-task.css',
  'src/presentation/localisation/child-copy.ts',
  'src/ui/synthetic-loop/TaskView.tsx',
  'src/ui/synthetic-loop/slice.css',
  'src/application/synthetic-loop/answer.ts',
  'src/application/synthetic-loop/session.ts',
  'src/application/synthetic-loop/record.ts',
  'src/domain/families/proofs.ts',
  'src/domain/families/slice.ts',
  'tests/oracle/family-proof.ts',
  'vite.slice.config.ts',
  'scripts/pwa-build.ts',
];
const hashes: Record<string, string> = {};
const cases: { name: string; outcome: string }[] = [];
const evidence: Record<string, unknown> = {
  channel,
  result: 'PENDING',
  scope:
    'synthetic child presentation in installed desktop Chrome/Edge; owner confirmation remains required',
  mergePolicy: 'owner_merge',
  actualAssistiveTechnology:
    'UNAVAILABLE: DOM/ARIA/keyboard checks do not establish delivered screen-reader output',
  actualDisconnectedRestart:
    'UNAVAILABLE: this presentation proof makes no physical-disconnection claim',
  nativeLanguageReview: 'PENDING: three prototype-draft locales only',
  cases,
};
let browser: Browser;
let context: BrowserContext;
let server: ProofServer;
let externalAttempts = 0;
let outboundLearnerRequests = 0;
let pageErrors = 0;

async function inventory(
  directory: string,
): Promise<{ path: string; bytes: number; sha256: string }[]> {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    expect(entry.isSymbolicLink()).toBe(false);
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await inventory(path)));
    else {
      expect(entry.isFile()).toBe(true);
      const bytes = await readFile(path);
      files.push({
        path: relative(evidenceDirectory, path).replaceAll('\\', '/'),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

beforeAll(async () => {
  expect(['chrome', 'msedge']).toContain(channel);
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    resolve(evidenceDirectory, `${channel}-child-ux-evidence.json`),
    JSON.stringify(evidence),
  );
  for (const file of proofSources)
    hashes[file] = createHash('sha256')
      .update(await readFile(file))
      .digest('hex');
  const previousLabel = process.env.PWA_RELEASE_LABEL;
  try {
    process.env.PWA_RELEASE_LABEL = 'phase3c-child-ux-proof-v1';
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
    'playwright-core installed channel; no browser download';
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
  const finalHashes: Record<string, string> = {};
  for (const file of proofSources)
    finalHashes[file] = createHash('sha256')
      .update(await readFile(file))
      .digest('hex');
  evidence.sourceHashes = finalHashes;
  evidence.sourcesStable = proofSources.every(
    (file) => hashes[file] === finalHashes[file],
  );
  evidence.artifacts = await inventory(artifactDirectory);
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
      ? 'PASS — CHILD PRESENTATION ENGINEERING ONLY'
      : 'FAIL';
  await writeFile(
    resolve(evidenceDirectory, `${channel}-child-ux-evidence.json`),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
});

async function open(prefix: '/' | '/math-adventure/' = '/'): Promise<Page> {
  const page = await context.newPage();
  expect((await page.goto(`${server.origin}${prefix}`))?.status()).toBe(200);
  await page.waitForFunction(
    () =>
      !!window.phase3cProof &&
      window.phase3cProof.offline()?.shell === 'ready' &&
      !window.phase3cProof.offline()?.frozen,
  );
  expect(
    await page.locator('main').getAttribute('data-presentation-view'),
  ).toBe('child');
  return page;
}

async function settled(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      !window.phase3cProof.state().busy &&
      !window.phase3cProof.offline()?.frozen,
  );
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

async function profile(page: Page, index = 0): Promise<void> {
  await page.locator('[data-profile]').nth(index).click();
  await page.waitForFunction(
    (profileId) =>
      window.phase3cProof.state().record?.profileId === profileId &&
      !window.phase3cProof.state().busy,
    index === 0 ? 'SYNTHETIC-PLAYER-1' : 'SYNTHETIC-PLAYER-2',
  );
  await page.locator('#slice-task-heading').waitFor();
  await settled(page);
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
  await settled(page);
  await view(page, 'child');
  await page
    .locator(`[data-task-family="${family}"] #slice-task-heading`)
    .waitFor();
}

async function policy(page: Page): Promise<void> {
  await view(page, 'developer');
  const details = page.locator('[data-developer-controls]');
  if (!(await details.evaluate((element) => element.hasAttribute('open'))))
    await details.locator('summary').click();
  await page.locator('[data-mode=policy]').click();
  await page.waitForFunction(
    () =>
      window.phase3cProof.state().record?.mode === 'synthetic-policy' &&
      !window.phase3cProof.state().busy,
  );
  await settled(page);
  expect((await state(page)).record?.mode).toBe('synthetic-policy');
  await view(page, 'child');
}

async function answer(page: Page, key: ChildAnswerKey): Promise<void> {
  await page.locator(`[data-child-answer="${key}"]`).click();
  await settled(page);
  await page.waitForFunction(
    () => document.querySelector('#slice-feedback')?.textContent !== '',
  );
}

async function childContract(page: Page): Promise<void> {
  expect(
    await page
      .locator(
        'select, input[type=checkbox], input[type=radio], textarea, input[type=file]',
      )
      .count(),
  ).toBe(0);
  expect(
    await page
      .locator(
        '[data-developer-controls], [data-inspection], [data-recommendation], [data-locale-resolution], .slice-attributes, .offline-controls details',
      )
      .count(),
  ).toBe(0);
  expect(await page.locator('[data-family]').count()).toBe(0);
  const text = await page.locator('main').innerText();
  const accessible = await page.locator('main').ariaSnapshot();
  expect(text).not.toMatch(
    /SYNTHETIC-PLAYER|phase3c-synthetic-loop|phase3b-synthetic-policy|inaccessibleScope|geometry\.quadrilateral|squared lengths|non-right angle/i,
  );
  expect(accessible).not.toMatch(
    /SYNTHETIC-PLAYER|phase3c-synthetic-loop|phase3b-synthetic-policy|inaccessibleScope|geometry\.quadrilateral/i,
  );
  expect(await page.locator('[data-child-nav]').count()).toBe(3);
}

function contrastRatio(foreground: string, background: string): number {
  const luminance = (css: string) => {
    const channels = css.match(/[\d.]+/g)?.map(Number);
    if (
      !channels ||
      channels.length !== 3 ||
      channels.some((value) => value < 0 || value > 255)
    )
      throw new Error('Expected opaque browser RGB colour');
    const linear = channels.map((value) => {
      const fraction = value / 255;
      return fraction <= 0.04045
        ? fraction / 12.92
        : ((fraction + 0.055) / 1.055) ** 2.4;
    });
    const [red, green, blue] = linear;
    if (red === undefined || green === undefined || blue === undefined)
      throw new Error('RGB channels missing');
    return red * 0.2126 + green * 0.7152 + blue * 0.0722;
  };
  const first = luminance(foreground),
    second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

async function progressiveHelp(
  page: Page,
  requireInteractiveDots = false,
): Promise<void> {
  const before = await presentation(page),
    beforeState = await state(page);
  const help = page.locator('.hint-button');
  expect(await help.getAttribute('aria-controls')).toBe('slice-hint');
  expect(await help.getAttribute('aria-expanded')).toBe('false');
  for (const tier of [1, 2, 3]) {
    await help.focus();
    await page.keyboard.press('Enter');
    expect(await page.locator('#slice-hint').isVisible()).toBe(true);
    expect(await help.getAttribute('aria-expanded')).toBe('true');
    expect(
      await help.evaluate((button) => document.activeElement === button),
      `${before.familyId} must preserve help focus after tier ${tier}`,
    ).toBe(true);
    expect(
      await page.locator('#slice-hint').getAttribute('data-hint-tier'),
    ).toBe(String(tier));
    expect(
      await page.locator('.child-task').getAttribute('data-child-visual-tier'),
    ).toBe(String(tier));
    expect(await page.locator('.child-task [data-visual-help]').count()).toBe(
      1,
    );
    expect(await presentation(page)).toEqual(before);
    expect((await state(page)).record).toEqual(beforeState.record);
    expect((await state(page)).explorationCount).toBe(
      beforeState.explorationCount,
    );
    expect(await page.locator('#slice-feedback').textContent()).toBe('');
    if (tier === 3) {
      if (requireInteractiveDots)
        expect(
          await page.locator('button.child-token .child-dot').count(),
          'The fixed addition witness must actually exercise interactive dot contrast',
        ).toBeGreaterThan(0);
      for (const dot of await page
        .locator('button.child-token .child-dot')
        .all()) {
        const colours = await dot.evaluate((element) => ({
          foreground: getComputedStyle(element).color,
          background: getComputedStyle(element.parentElement as HTMLElement)
            .backgroundColor,
        }));
        expect(
          contrastRatio(colours.foreground, colours.background),
          `${before.familyId} interactive help dot contrast`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  }
  for (const stage of [1, 2, 3, 1]) {
    await page.keyboard.press('Enter');
    expect(
      await help.evaluate((button) => document.activeElement === button),
    ).toBe(true);
    expect(
      await page.locator('#slice-hint').getAttribute('data-hint-tier'),
    ).toBe(String(stage));
    expect(
      await page.locator('.child-task').getAttribute('data-child-hint-tier'),
    ).toBe('3');
    expect(
      await page.locator('.child-task').getAttribute('data-child-visual-tier'),
    ).toBe(String(stage));
    if (before.task.kind === 'numeralRecognition') {
      expect(
        await page
          .locator('.child-answer-card .child-token')
          .evaluateAll(
            (tokens, maximumVisualTier) =>
              tokens.every(
                (token) =>
                  (getComputedStyle(token).borderStyle === 'dashed') ===
                  maximumVisualTier,
              ),
            stage === 3,
          ),
        'Numeral visual replay must show only its current scaffolding stage',
      ).toBe(true);
      if (stage === 1)
        expect(
          await page
            .locator('.child-numeral')
            .evaluate((element) => getComputedStyle(element).borderStyle),
        ).toBe('dashed');
    }
    expect(await page.locator('.child-task [data-visual-help]').count()).toBe(
      1,
    );
    expect(await presentation(page)).toEqual(before);
    expect((await state(page)).record).toEqual(beforeState.record);
    expect(await page.locator('#slice-feedback').textContent()).toBe('');
  }
}

describe(`installed ${channel} child presentation`, () => {
  it('starts with fixed badge identities and no learner store, catalog or diagnostics', async () => {
    const page = await open();
    expect((await state(page)).record).toBeNull();
    expect(await page.locator('[data-profile]').count()).toBe(2);
    expect(await page.locator('[data-profile] svg polygon').count()).toBe(2);
    expect(await page.locator('[data-profile]').allTextContents()).toEqual([
      'Αστέρι',
      'Τρίγωνο',
    ]);
    expect(
      await page
        .locator(
          'select, input[type=checkbox], input[type=radio], [data-developer-controls]',
        )
        .count(),
    ).toBe(0);
    expect(await page.locator('main').ariaSnapshot()).not.toContain(
      'SYNTHETIC-PLAYER',
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
    await childContract(page);
    const first = (await state(page)).record;
    await profile(page, 1);
    expect((await state(page)).record?.completedCount).toBe(0);
    expect((await state(page)).record?.events).toHaveLength(0);
    await profile(page, 0);
    expect((await state(page)).record).toEqual(first);
  });

  for (const family of CHILD_FAMILIES)
    it(`${family} uses immediate direct cards, independent truth and progressive visual help`, async () => {
      const page = await open();
      await profile(page);
      await activity(page, family);
      await childContract(page);
      const task = await presentation(page),
        expected = childAnswerKey(task);
      expect(await page.locator('[data-child-answer]').count()).toBeGreaterThan(
        1,
      );
      expect(
        await page
          .locator(
            'button[type=submit], [data-correct], [data-expected-answer], .slice-task pre',
          )
          .count(),
      ).toBe(0);
      expect(await page.locator('#slice-feedback').textContent()).toBe('');
      expect(await page.locator('#slice-feedback').getAttribute('role')).toBe(
        'status',
      );
      expect(
        await page.locator('#slice-feedback').getAttribute('aria-live'),
      ).toBe('polite');
      expect(
        await page.locator('#slice-feedback').getAttribute('aria-atomic'),
      ).toBe('true');
      for (const card of await page.locator('[data-child-answer]').all()) {
        const box = await card.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
        expect(
          (await card.getAttribute('aria-label')) ?? (await card.innerText()),
        ).not.toBe('');
        const colours = await card.evaluate((button) => {
          const text =
            button.querySelector('.child-answer-number') ??
            button.querySelector('span:last-child') ??
            button;
          const style = getComputedStyle(text),
            buttonStyle = getComputedStyle(button);
          return {
            foreground: style.color,
            background: buttonStyle.backgroundColor,
            fontPx: Number.parseFloat(style.fontSize),
            weight: Number.parseInt(style.fontWeight, 10),
          };
        });
        const requiredContrast =
          colours.fontPx >= 24 ||
          (colours.fontPx >= 18.66 && colours.weight >= 700)
            ? 3
            : 4.5;
        expect(
          contrastRatio(colours.foreground, colours.background),
          `${family} visible answer-card text contrast`,
        ).toBeGreaterThanOrEqual(requiredContrast);
      }
      await answer(page, wrongChildAnswer(expected));
      expect((await state(page)).record?.lastCompletion).toMatchObject({
        correct: false,
        evidence: 'manual',
      });
      expect((await state(page)).record?.events).toHaveLength(0);
      const retry = page.locator('[data-child-retry]');
      await retry.click();
      expect(await presentation(page)).toEqual(task);
      expect(await page.locator('#slice-feedback').textContent()).toBe('');
      await progressiveHelp(page, family === 'number.addition');
      if (task.task.kind === 'numeralRecognition') {
        for (const card of await page.locator('[data-child-answer]').all()) {
          const descriptionId = await card.getAttribute('aria-describedby');
          expect(descriptionId).toBeTruthy();
          const description = page.locator(`[id="${descriptionId}"]`);
          expect(await description.count()).toBe(1);
          expect(await description.getAttribute('aria-hidden')).toBeNull();
          expect((await description.textContent())?.length).toBeGreaterThan(0);
          const hidden = await description.evaluate((element) => {
            const bounds = element.getBoundingClientRect(),
              style = getComputedStyle(element);
            return {
              width: bounds.width,
              height: bounds.height,
              position: style.position,
              clipped: style.clipPath !== 'none',
              display: style.display,
            };
          });
          expect(hidden.width).toBeLessThanOrEqual(1);
          expect(hidden.height).toBeLessThanOrEqual(1);
          expect(hidden.position).toBe('absolute');
          expect(hidden.clipped).toBe(true);
          expect(hidden.display).not.toBe('none');
        }
      }
      await answer(page, expected);
      const completed = await state(page);
      expect(completed.record?.lastCompletion).toMatchObject({
        correct: true,
        evidence: 'manual',
      });
      expect(completed.record?.completedCount).toBe(2);
      expect(completed.record?.events).toHaveLength(0);
      expect(completed.record?.derived.recommendation).toBeNull();
      expect(completed.saved).toBe(true);
      evidence[family] = {
        wrongRejected: true,
        oracleAccepted: true,
        directSingleAction: true,
        visualHelpTiers: 3,
        evidence: 'manual',
        developerDiagnosticHidden: true,
      };
    });

  it('never credits child shape matching as full quadrilateral classification evidence', async () => {
    const page = await open();
    await profile(page, 1);
    await policy(page);
    await view(page, 'developer');
    await page.locator('[data-developer-controls] summary').click();
    await page.locator('[data-action=unsaved]').click();
    await settled(page);
    expect((await state(page)).saved).toBe(false);
    const shapes = new Set<ChildAnswerKey>();
    const samples: {
      ordinal: number;
      shape: ChildAnswerKey;
      replayHash: string;
    }[] = [];
    for (let sample = 0; sample < 512 && shapes.size < 3; sample++) {
      await view(page, 'developer');
      await page.locator('[data-family="geometry.quadrilateral"]').click();
      await settled(page);
      const task = await presentation(page),
        expected = childAnswerKey(task);
      samples.push({
        ordinal: (await state(page)).record?.taskOrdinal ?? -1,
        shape: expected,
        replayHash: createHash('sha256')
          .update(task.replay.seedHex)
          .digest('hex'),
      });
      if (shapes.has(expected)) continue;
      await view(page, 'child');
      shapes.add(expected);
      expect(
        await page.locator('[data-child-answer]').allTextContents(),
      ).not.toContain('A');
      expect(
        await page
          .locator(
            '.slice-attributes, .child-task pre, .child-task table, .child-task svg text',
          )
          .count(),
      ).toBe(0);
      await page.locator('.hint-button').click();
      await answer(page, expected);
      expect((await state(page)).record?.lastCompletion).toMatchObject({
        correct: true,
        evidence: 'excluded',
        reasonCode: 'inaccessibleScope',
      });
      const event = (await state(page)).record?.events.at(-1);
      expect(event?.kind).toBe('observation');
      if (event?.kind === 'observation') {
        expect(event.input.accessible).toBe(false);
        expect(event.input.correct).toBe(true);
        expect(event.input.mathematicalHintTier).toBe(1);
      }
      expect((await state(page)).record?.derived.concepts).toEqual({});
      expect((await state(page)).record?.derived.diagnostics).toHaveLength(0);
      expect((await state(page)).saved).toBe(false);
    }
    evidence.geometrySearch = {
      sampleLimit: 512,
      observedSamples: samples.length,
      uniqueReplayHashes: new Set(samples.map((sample) => sample.replayHash))
        .size,
      sampleSequenceHash: createHash('sha256')
        .update(JSON.stringify(samples))
        .digest('hex'),
      firstClassWitnesses: [...shapes]
        .sort()
        .map((shape) => samples.find((sample) => sample.shape === shape)),
      profileOrdinal: 2,
      storage:
        'explicit unsaved synthetic session; this case does not certify rectangle persistence',
    };
    expect([...shapes].sort()).toEqual([
      'parallelogram',
      'rectangle',
      'square',
    ]);
    await childContract(page);
    evidence.geometryEvidence = {
      observedMatchKinds: [...shapes].sort(),
      correctMatchesExcluded: true,
      fullClassificationCredit: 0,
    };
  }, 90_000);

  it('keeps mathematical visual help separate from neutral unit traversal', async () => {
    const page = await open();
    await profile(page);
    await policy(page);
    await activity(page, 'number.addition');
    await page.locator('.hint-button').click();
    await answer(page, childAnswerKey(await presentation(page)));
    expect((await state(page)).record?.lastCompletion).toMatchObject({
      correct: true,
      evidence: 'supportedSuccess',
      reasonCode: 'mathematicalSupport',
    });
    const event = (await state(page)).record?.events.at(-1);
    if (event?.kind !== 'observation')
      throw new Error('Expected mathematical-help observation');
    expect(event.input.mathematicalHintTier).toBe(1);
    expect(event.input.solutionExposed).toBe(false);
    await activity(page, 'number.addition');
    await progressiveHelp(page);
    await answer(page, childAnswerKey(await presentation(page)));
    const replayEvent = (await state(page)).record?.events.at(-1);
    if (replayEvent?.kind !== 'observation')
      throw new Error('Expected maximum-help observation');
    expect(replayEvent.input.mathematicalHintTier).toBe(3);
    expect(replayEvent.input.solutionExposed).toBe(false);
    expect((await state(page)).record?.lastCompletion?.evidence).not.toBe(
      'independentSuccess',
    );
    await activity(page, 'measurement.unit-length');
    const firstUnitAnnouncement = await page
      .locator('[data-unit-navigation]')
      .textContent();
    await page.locator('[data-unit-step]').first().click();
    expect(
      await page.locator('[data-unit-navigation]').getAttribute('aria-live'),
    ).toBe('polite');
    expect(
      await page.locator('[data-unit-navigation]').getAttribute('aria-atomic'),
    ).toBe('true');
    expect(await page.locator('[data-unit-navigation]').textContent()).not.toBe(
      firstUnitAnnouncement,
    );
    expect(
      await page.locator('[data-unit-navigation]').textContent(),
    ).not.toMatch(/[0-9]/);
    expect(
      await page
        .locator('[data-child-unit-control][aria-pressed=true]')
        .count(),
    ).toBe(1);
    const unitControls = page.locator('[data-child-unit-control]'),
      nextUnit = page.locator('[data-unit-step]');
    await nextUnit.focus();
    for (let index = 1; index < (await unitControls.count()); index++) {
      await page.keyboard.press('Enter');
      expect(
        await nextUnit.evaluate((button) => document.activeElement === button),
      ).toBe(true);
    }
    expect(await unitControls.last().getAttribute('aria-pressed')).toBe('true');
    expect(await nextUnit.isEnabled()).toBe(true);
    await page.keyboard.press('Space');
    expect(
      await nextUnit.evaluate((button) => document.activeElement === button),
    ).toBe(true);
    expect(await unitControls.first().getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(
      await page.locator('[data-unit-navigation]').textContent(),
    ).not.toMatch(/[0-9]/);
    await answer(page, childAnswerKey(await presentation(page)));
    expect((await state(page)).record?.lastCompletion?.evidence).toBe(
      'independentSuccess',
    );
    const unitEvent = (await state(page)).record?.events.at(-1);
    if (unitEvent?.kind !== 'observation')
      throw new Error('Expected accessible unit observation');
    expect(unitEvent.input.mathematicalHintTier).toBe(0);
    expect(unitEvent.input.accessibilitySupports).toEqual([
      'alternateControls',
    ]);
  });

  it('keeps all five increments limited and a fresh other badge manual with no evidence', async () => {
    const page = await open();
    await profile(page);
    await policy(page);
    for (const family of CHILD_FAMILIES.slice(3)) {
      await activity(page, family);
      await answer(page, childAnswerKey(await presentation(page)));
      expect((await state(page)).record?.lastCompletion).toMatchObject({
        correct: true,
        evidence: 'limitedEvidence',
      });
      expect((await state(page)).record?.events).toHaveLength(0);
    }
    expect((await state(page)).record?.derived.concepts).toEqual({});
    await profile(page, 1);
    expect((await state(page)).record?.mode).toBe('manual');
    await answer(page, childAnswerKey(await presentation(page)));
    expect((await state(page)).record?.lastCompletion?.evidence).toBe('manual');
    expect((await state(page)).record?.events).toHaveLength(0);
    expect(
      await page.locator('[data-child-evidence-mode]').innerText(),
    ).toContain('δεν μετρούν');
  });

  it('uses Explore as honest session-only exposure without storing an observation', async () => {
    const page = await open();
    await profile(page);
    await policy(page);
    await page.locator('[data-child-nav=explore]').click();
    await settled(page);
    const before = await state(page);
    await answer(page, childAnswerKey(await presentation(page)));
    const after = await state(page);
    expect(after.sessionOnlyCompletion).toMatchObject({
      correct: true,
      evidence: 'sessionOnly',
    });
    expect(after.explorationCount).toBe(1);
    expect(after.record).toEqual(before.record);
    expect(
      await page.locator('[data-child-evidence-mode]').innerText(),
    ).toContain('δεν μετρούν');
    await profile(page, 1);
    expect((await state(page)).explorationCount).toBe(0);
    expect((await state(page)).record?.events).toHaveLength(0);
  });

  it('supports keyboard cards, visible focus, safe retry and simple navigation', async () => {
    const page = await open();
    await page.locator('[data-profile]').first().focus();
    await page.keyboard.press('Enter');
    await settled(page);
    expect(
      await page
        .locator('#slice-task-heading')
        .evaluate((heading) => document.activeElement === heading),
    ).toBe(true);
    await page.locator('[data-child-nav=shapes]').focus();
    await page.keyboard.press('Space');
    await settled(page);
    expect((await state(page)).record?.selectedFamily).toBe(
      'geometry.quadrilateral',
    );
    expect(
      await page
        .locator('#slice-task-heading')
        .evaluate((heading) => document.activeElement === heading),
    ).toBe(true);
    const expected = childAnswerKey(await presentation(page)),
      card = page.locator(
        `[data-child-answer="${wrongChildAnswer(expected)}"]`,
      );
    await card.focus();
    const focused = await card.evaluate((button) => {
      const style = getComputedStyle(button),
        bounds = button.getBoundingClientRect();
      return {
        outline: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
        visible: bounds.width > 0 && bounds.height > 0,
        active: document.activeElement === button,
      };
    });
    expect(focused).toMatchObject({ active: true, visible: true });
    expect(focused.outline).not.toBe('none');
    expect(focused.outlineWidth).toBeGreaterThanOrEqual(2);
    await page.keyboard.press('Enter');
    await settled(page);
    expect((await state(page)).record?.lastCompletion?.correct).toBe(false);
    const wrongFocus = await page.evaluate(() => ({
      useful:
        document.activeElement?.hasAttribute('data-child-retry') ||
        document.activeElement?.id === 'slice-feedback',
      tag: document.activeElement?.tagName,
    }));
    await page.locator('[data-child-retry]').focus();
    await page.keyboard.press('Enter');
    expect(await page.locator('#slice-feedback').textContent()).toBe('');
    await page.locator(`[data-child-answer="${expected}"]`).focus();
    await page.keyboard.press('Space');
    await settled(page);
    expect((await state(page)).record?.lastCompletion?.correct).toBe(true);
    const correctFocus = await page.evaluate(() => ({
      useful: document.activeElement?.getAttribute('data-action') === 'next',
      tag: document.activeElement?.tagName,
    }));
    await page.locator('[data-action=next]').focus();
    await page.keyboard.press('Enter');
    expect(
      await page
        .locator('#slice-task-heading')
        .evaluate((heading) => document.activeElement === heading),
    ).toBe(true);
    await page.locator('[data-action=stop]').focus();
    await page.keyboard.press('Enter');
    await settled(page);
    expect(
      await page
        .locator('[data-action=resume]')
        .evaluate((button) => document.activeElement === button),
    ).toBe(true);
    await page.keyboard.press('Enter');
    await settled(page);
    expect(
      await page
        .locator('#slice-task-heading')
        .evaluate((heading) => document.activeElement === heading),
    ).toBe(true);
    await page.locator('[data-child-nav=play]').click();
    await settled(page);
    expect((await state(page)).record?.selectedFamily).toBe('number.addition');
    await childContract(page);
    evidence.keyboard = {
      nativeEnterAndSpace: true,
      navigationHeadingFocus: true,
      stoppedResumeFocus: true,
      usefulRetry: true,
      actualScreenReaderDelivery: 'UNAVAILABLE',
      answerFeedbackFocus: { wrong: wrongFocus, correct: correctFocus },
    };
    expect(
      wrongFocus.useful,
      'keyboard wrong answer must keep focus on useful retry or feedback',
    ).toBe(true);
    expect(
      correctFocus.useful,
      'keyboard correct answer must focus next action',
    ).toBe(true);
  });

  for (const prefix of ['/', '/math-adventure/'] as const)
    it(`reflows all eight families at ${prefix} in narrow portrait, landscape and 200% text`, async () => {
      const page = await open(prefix);
      await profile(page);
      const observations: {
        family: string;
        width: number;
        height: number;
        rootTextPx: number;
      }[] = [];
      for (const family of CHILD_FAMILIES) {
        await activity(page, family);
        await page.locator('.hint-button').click();
        for (const size of [
          { width: 320, height: 780, rootTextPx: 16 },
          { width: 320, height: 780, rootTextPx: 32 },
          { width: 780, height: 320, rootTextPx: 32 },
          { width: 960, height: 800, rootTextPx: 32 },
        ]) {
          await page.setViewportSize({
            width: size.width,
            height: size.height,
          });
          await page.evaluate((rootTextPx) => {
            document.documentElement.style.fontSize = `${rootTextPx}px`;
          }, size.rootTextPx);
          const measured = await page.evaluate(() => {
            const isClippedDescription = (element: Element) => {
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return (
                rect.width <= 1 &&
                rect.height <= 1 &&
                style.position === 'absolute' &&
                style.clipPath !== 'none' &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                element.getAttribute('aria-hidden') === null
              );
            };
            const readableWords = (label: Element) => {
              const walker = document.createTreeWalker(
                label,
                NodeFilter.SHOW_TEXT,
              );
              for (
                let node = walker.nextNode();
                node;
                node = walker.nextNode()
              ) {
                const hidden = node.parentElement?.closest('.visually-hidden');
                if (hidden && isClippedDescription(hidden)) continue;
                for (const word of (node.textContent ?? '').matchAll(/\S+/g)) {
                  const range = document.createRange();
                  range.setStart(node, word.index);
                  range.setEnd(node, word.index + word[0].length);
                  if (range.getClientRects().length !== 1) return false;
                }
              }
              return true;
            };
            const cards = [
              ...document.querySelectorAll<HTMLElement>(
                '[data-child-answer], .hint-button, [data-child-nav], [data-profile]',
              ),
            ];
            const bounds = cards.map((card) => card.getBoundingClientRect());
            return {
              overflow:
                document.documentElement.scrollWidth > window.innerWidth + 1,
              rootTextPx: Number.parseFloat(
                getComputedStyle(document.documentElement).fontSize,
              ),
              minimumTarget: bounds.every(
                (rect) => rect.width >= 44 && rect.height >= 44,
              ),
              horizontallyContained: bounds.every(
                (rect) =>
                  rect.left >= -1 && rect.right <= window.innerWidth + 1,
              ),
              noClippedAnswerText: cards.every(
                (card) =>
                  card.scrollWidth <= card.clientWidth + 1 &&
                  card.scrollHeight <= card.clientHeight + 1,
              ),
              badgeLabelsReadable: [
                ...document.querySelectorAll('.child-badge > span'),
              ].every((label) => {
                const range = document.createRange();
                range.selectNodeContents(label);
                return range.getClientRects().length === 1;
              }),
              mathematicalLabelsReadable: [
                ...document.querySelectorAll(
                  '.child-task h2, .child-help p, .child-answer-card > span:last-child, .child-part-frame h3, .child-comparison-groups h3, .child-pairing > .child-pair-row:first-child > span:not([aria-hidden])',
                ),
              ].every(readableWords),
              accessibilityDescriptionsClipped: [
                ...document.querySelectorAll('.child-task .visually-hidden'),
              ].every(isClippedDescription),
              reducedMotion: matchMedia('(prefers-reduced-motion: reduce)')
                .matches,
            };
          });
          expect(measured).toEqual({
            overflow: false,
            rootTextPx: size.rootTextPx,
            minimumTarget: true,
            horizontallyContained: true,
            noClippedAnswerText: true,
            badgeLabelsReadable: true,
            mathematicalLabelsReadable: true,
            accessibilityDescriptionsClipped: true,
            reducedMotion: true,
          });
          const last = page.locator('[data-child-answer]').last();
          await last.scrollIntoViewIfNeeded();
          expect(await last.isVisible()).toBe(true);
          observations.push({ family, ...size });
        }
        await page.setViewportSize({ width: 960, height: 800 });
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '16px';
        });
      }
      await page.emulateMedia({ forcedColors: 'active' });
      await page.keyboard.press('Tab');
      await page.locator('[data-child-answer]').first().focus();
      expect(
        await page
          .locator('[data-child-answer]')
          .first()
          .evaluate(
            (button) =>
              document.activeElement === button &&
              getComputedStyle(button).outlineStyle !== 'none',
          ),
      ).toBe(true);
      evidence[`layout${prefix}`] = {
        observations,
        mechanism:
          'CSS root font-size 16px to 32px; 200% text mechanism, not native browser zoom',
        forcedColoursKeyboardFocus: true,
      };
    }, 60_000);

  it('keeps three draft locales and UI/instruction roles independent without child settings controls', async () => {
    const page = await open();
    await profile(page);
    const observations: { ui: string; instruction: string }[] = [];
    for (const [ui, instruction] of [
      ['el-GR', 'en-GB'],
      ['en-GB', 'de-DE'],
      ['de-DE', 'el-GR'],
    ] as const) {
      await view(page, 'developer');
      const details = page.locator('[data-developer-controls]');
      if (!(await details.evaluate((element) => element.hasAttribute('open'))))
        await details.locator('summary').click();
      await page.locator('[data-language-role=uiLocale]').selectOption(ui);
      await settled(page);
      await page
        .locator('[data-language-role=instructionLocale]')
        .selectOption(instruction);
      await settled(page);
      await view(page, 'child');
      expect(await page.locator('main').getAttribute('lang')).toBe(ui);
      expect(await page.locator('.child-task').getAttribute('lang')).toBe(
        instruction,
      );
      await childContract(page);
      observations.push({ ui, instruction });
    }
    evidence.localeRoles = { observations, nativeReview: 'PENDING' };
  });

  it('retains exact quadrilateral diagnostics behind deliberate developer entry', async () => {
    const page = await open();
    await profile(page);
    await activity(page, 'geometry.quadrilateral');
    const before = await presentation(page);
    await childContract(page);
    await view(page, 'developer');
    expect(await page.locator('[data-family]').count()).toBe(8);
    expect(await page.locator('.slice-attributes p').count()).toBe(8);
    expect(
      await page.locator('.slice-answer input[type=checkbox]').count(),
    ).toBe(3);
    expect(await page.locator('.slice-scene text').allTextContents()).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);
    expect(await presentation(page)).toEqual(before);
    await view(page, 'child');
    await childContract(page);
    expect(await presentation(page)).toEqual(before);
    evidence.developerBoundary = {
      deliberateEntry: true,
      exactDiagnosticFactsRetained: 8,
      engineeringCatalogRetained: 8,
      noChildDiagnosticDOM: true,
    };
  });
});
