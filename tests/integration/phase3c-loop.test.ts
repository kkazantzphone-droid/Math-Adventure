// Separately invoked installed-browser proof. All profiles and browser contexts
// are synthetic. No screenshot, audio, trace, browser profile or record dump is retained.
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
  SyntheticLoopState,
} from '../../src/application/synthetic-loop';
import type { LoopPresentation } from '../../src/ui/synthetic-loop/TaskView';
import type { OfflineSnapshot } from '../../src/presentation/offline/controller';
import type { WriteFault } from '../../src/infrastructure/persistence/adapter';
import { SYNTHETIC_PROFILE_IDS } from '../../src/domain/adaptation/types';
import { PROOF_FAMILY_IDS } from '../../src/domain/families/proofs';
import { SLICE_FAMILY_IDS } from '../../src/domain/families/slice';
import type { SliceFamilyId } from '../../src/domain/families/slice';
import { formatMessage } from '../../src/presentation/localisation/format';
import {
  countCombinedTokens,
  countUnitIntervals,
  quadrilateralClasses,
} from '../oracle/family-proof';
import {
  oracleSliceCase,
  referenceSliceDimensions,
} from '../oracle/slice-families';

declare global {
  interface Window {
    phase3cProof: {
      state(): SyntheticLoopState;
      presentation(): LoopPresentation | null;
      offline(): OfflineSnapshot | null;
      fault(value: WriteFault): void;
      holdWrites(value: boolean): void;
      held(): number;
      refresh(): void;
    };
  }
}

const channel = process.env.PHASE3C_BROWSER ?? 'chrome';
const expectedCaseCount = 36;
const families: readonly LoopFamilyId[] = [
  ...PROOF_FAMILY_IDS,
  ...SLICE_FAMILY_IDS,
];
const evidenceDirectory = resolve('.cache/phase3c-browser');
const proofSources = [
  'tests/integration/phase3c-loop.test.ts',
  'tests/browser/phase3c/main.tsx',
  'tests/browser/phase3c/runtime.ts',
  'src/ui/synthetic-loop/TaskView.tsx',
  'src/ui/offline/OfflineControls.tsx',
  'src/application/synthetic-loop/session.ts',
  'src/application/synthetic-loop/answer.ts',
  'src/application/synthetic-loop/record.ts',
  'src/application/synthetic-loop/seed.ts',
  'src/infrastructure/offline/browserOffline.ts',
  'src/infrastructure/offline/shell-worker.ts',
  'src/infrastructure/persistence/adapter.ts',
  'src/infrastructure/persistence/synthetic-loop-database.ts',
  'src/domain/families/proofs.ts',
  'src/domain/families/slice.ts',
  'tests/oracle/family-proof.ts',
  'tests/oracle/slice-families.ts',
  'vite.slice.config.ts',
  'scripts/pwa-build.ts',
];
const hashes: Record<string, string> = {};
const cases: { name: string; outcome: string }[] = [];
const evidence: Record<string, unknown> = {
  channel,
  result: 'PENDING',
  scope: 'installed desktop synthetic developer loop only',
  actualDeviceAT:
    'UNAVAILABLE: no observed target device/assistive technology combination',
  actualDisconnectedRestart:
    'UNAVAILABLE: browser network emulation is not physical disconnection',
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
    resolve(evidenceDirectory, `${channel}-loop-evidence.json`),
    JSON.stringify(evidence),
  );
  for (const file of proofSources)
    hashes[file] = createHash('sha256')
      .update(await readFile(file))
      .digest('hex');
  const previousLabel = process.env.PWA_RELEASE_LABEL;
  try {
    for (const version of ['v1', 'v2', 'future'] as const) {
      process.env.PWA_RELEASE_LABEL = `phase3c-proof-${version}`;
      await build({
        configFile: 'vite.slice.config.ts',
        logLevel: 'error',
        build: { outDir: resolve(evidenceDirectory, `e2e-${version}`) },
        plugins:
          version === 'future'
            ? [
                {
                  name: 'synthetic-incompatible-learner-reader',
                  generateBundle(_options, bundle) {
                    const reader = bundle['learner-reader.json'];
                    if (!reader || reader.type !== 'asset')
                      throw new Error('Synthetic reader declaration missing');
                    reader.source = JSON.stringify({
                      schema: 'phase3c-learner-reader-v1',
                      layout: 3,
                      recordSchema: 'synthetic-future-v1',
                    });
                  },
                },
              ]
            : [],
      });
    }
  } finally {
    if (previousLabel === undefined) delete process.env.PWA_RELEASE_LABEL;
    else process.env.PWA_RELEASE_LABEL = previousLabel;
  }
  server = await startProofServer({
    distDirectory: resolve(evidenceDirectory, 'e2e-v1'),
    fixtureDirectory: resolve('tests/e2e/fixtures'),
    productionReleases: (['/', '/math-adventure/'] as const).flatMap(
      (prefix, index) =>
        ['v1', 'v2', 'future'].map((version) => ({
          name: `p${index}-${version}`,
          prefix,
          directory: resolve(evidenceDirectory, `e2e-${version}`),
        })),
    ),
  });
  browser = await chromium.launch({ channel, headless: true, timeout: 15_000 });
  evidence.browserVersion = browser.version();
  evidence.browserMechanism =
    'playwright-core installed channel; no browser download';
});

async function observedContext(): Promise<BrowserContext> {
  const observed = await browser.newContext({
    serviceWorkers: 'allow',
    acceptDownloads: false,
    viewport: { width: 960, height: 800 },
  });
  observed.on('page', (p) => p.on('pageerror', () => pageErrors++));
  observed.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== server.origin) externalAttempts++;
    if (
      url.search ||
      !['GET', 'HEAD'].includes(request.method()) ||
      request.postData() !== null
    )
      outboundLearnerRequests++;
  });
  // HTTP cache is disabled. Service-worker caching remains native, including
  // the offline reload below. Outbound unexpected requests are contained.
  await observed.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== server.origin)
      await route.abort('blockedbyclient');
    else await route.continue();
  });
  return observed;
}
beforeEach(async () => {
  server.setProductionRelease('/', 'p0-v1');
  server.setProductionRelease('/math-adventure/', 'p1-v1');
  context = await observedContext();
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
    (file) => finalHashes[file] === hashes[file],
  );
  evidence.artifacts = (
    await Promise.all(
      ['v1', 'v2', 'future'].map((version) =>
        inventory(resolve(evidenceDirectory, `e2e-${version}`)),
      ),
    )
  ).flat();
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
    pageErrors === 0
      ? 'PASS — NARROWER ENGINEERING EVIDENCE ONLY'
      : 'FAIL';
  await writeFile(
    resolve(evidenceDirectory, `${channel}-loop-evidence.json`),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
});

async function open(prefix: '/' | '/math-adventure/' = '/'): Promise<Page> {
  const p = await context.newPage();
  const response = await p.goto(`${server.origin}${prefix}`);
  expect(response?.status()).toBe(200);
  await p.waitForFunction(
    () =>
      !!window.phase3cProof &&
      window.phase3cProof.offline()?.shell === 'ready' &&
      !window.phase3cProof.offline()?.frozen,
  );
  return p;
}
async function settled(p: Page): Promise<void> {
  await p.waitForFunction(() => !window.phase3cProof.state().busy);
}
async function state(p: Page) {
  return p.evaluate(() => window.phase3cProof.state());
}
async function profile(p: Page, index = 0): Promise<void> {
  await p.locator(`[data-profile="${SYNTHETIC_PROFILE_IDS[index]}"]`).click();
  await p.waitForFunction(
    (profileId) =>
      window.phase3cProof.state().record?.profileId === profileId &&
      !window.phase3cProof.state().busy,
    SYNTHETIC_PROFILE_IDS[index],
  );
  await settled(p);
  expect((await state(p)).record?.profileId).toBe(SYNTHETIC_PROFILE_IDS[index]);
  await p.locator('[data-developer-controls] summary').click();
}
async function activity(p: Page, family: LoopFamilyId): Promise<void> {
  await p.locator(`[data-family="${family}"]`).click();
  await settled(p);
  await p
    .locator(`[data-task-family="${family}"] #slice-task-heading`)
    .waitFor();
}
async function presentation(p: Page): Promise<LoopPresentation> {
  const emitted = await p.evaluate(() => window.phase3cProof.presentation());
  if (!emitted || !('task' in emitted) || 'answerContract' in emitted)
    throw new Error('Public semantic task unavailable');
  return emitted;
}
type OracleAnswer = number | string | readonly string[];
function oracle(presented: LoopPresentation): OracleAnswer {
  const task = presented.task;
  if (task.kind === 'evaluateExpression') {
    const expression = task.expression.root;
    if (
      expression.kind !== 'add' ||
      expression.left.kind !== 'literal' ||
      expression.right.kind !== 'literal'
    )
      throw new Error('Unexpected bounded expression');
    return countCombinedTokens(
      Number(expression.left.value.numerator),
      Number(expression.right.value.numerator),
    );
  }
  if (task.kind === 'classifyGeometry') {
    const object = task.scene.objects.find(
      (object) => object.id === task.objectId,
    );
    if (!object || object.kind !== 'polygon')
      throw new Error('Polygon missing');
    return quadrilateralClasses(
      object.vertices.map((point) => ({
        x: Number(point.x.numerator),
        y: Number(point.y.numerator),
      })),
    ).map((name) => `geometry.${name}`);
  }
  if (task.kind === 'measureGeometry') {
    const object = task.scene.objects.find(
      (object) => object.id === task.objectId,
    );
    if (!object || object.kind !== 'segment')
      throw new Error('Segment missing');
    const length = countUnitIntervals(
      {
        x: Number(object.start.x.numerator),
        y: Number(object.start.y.numerator),
      },
      { x: Number(object.end.x.numerator), y: Number(object.end.y.numerator) },
    );
    if (length === undefined) throw new Error('Independent length unavailable');
    return length;
  }
  // This oracle has its own seed implementation and finite token/equation model.
  return oracleSliceCase(
    presented.familyId as SliceFamilyId,
    referenceSliceDimensions(
      presented.familyId as SliceFamilyId,
      presented.replay.seedHex,
    ),
  ).answer;
}
async function choose(p: Page, answer: OracleAnswer): Promise<void> {
  if (Array.isArray(answer)) {
    for (const checkbox of await p
      .locator('.slice-answer input[type=checkbox]')
      .all())
      await checkbox.setChecked(
        answer.includes((await checkbox.getAttribute('value')) ?? ''),
      );
  } else if (typeof answer === 'string')
    await p.locator(`.slice-answer input[value="${answer}"]`).check();
  else if (await p.locator('.slice-quantity-choice').count())
    await p.locator('.slice-quantity-choice').nth(Number(answer)).click();
  else await p.locator('#slice-response').selectOption(String(answer));
}
async function submit(p: Page, answer: OracleAnswer): Promise<void> {
  await choose(p, answer);
  await p.locator('.slice-answer button[type=submit]').click();
  await settled(p);
  await p.waitForFunction(
    () => document.querySelector('#slice-feedback')?.textContent !== '',
  );
}
function wrong(answer: OracleAnswer): OracleAnswer {
  if (Array.isArray(answer)) return ['geometry.square'];
  if (typeof answer === 'string')
    return answer === 'comparison.equal'
      ? 'comparison.less'
      : 'comparison.equal';
  return answer === 1 ? 2 : 1;
}
async function policy(p: Page): Promise<void> {
  await p.locator('[data-mode=policy]').click();
  await p.waitForFunction(
    () =>
      window.phase3cProof.state().record?.mode === 'synthetic-policy' &&
      !window.phase3cProof.state().busy,
  );
  await settled(p);
  expect((await state(p)).record?.mode).toBe('synthetic-policy');
}
async function shellReady(p: Page): Promise<void> {
  await p.waitForFunction(
    () =>
      window.phase3cProof.offline()?.shell === 'ready' &&
      !window.phase3cProof.offline()?.frozen,
  );
}
async function stage(
  p: Page,
  prefix: '/' | '/math-adventure/',
  release: 'v2' | 'future',
): Promise<void> {
  server.setProductionRelease(
    prefix,
    `${prefix === '/' ? 'p0' : 'p1'}-${release}`,
  );
  await p.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration(
      location.href,
    );
    if (!registration) throw new Error('Owned worker missing');
    await registration.update();
  });
  await p.waitForFunction(
    () => window.phase3cProof.offline()?.update === 'waiting',
  );
}
async function updateButton(p: Page) {
  const details = p.locator('.offline-controls details');
  if (!(await details.evaluate((element) => element.hasAttribute('open'))))
    await details.locator('summary').click();
  return details.locator('[data-offline-action=update]');
}

describe(`installed ${channel} synthetic playable loop`, () => {
  it('preserves an immediate first profile selection across initial worker controller acquisition', async () => {
    let beforeController = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      if (attempt) {
        await context.close();
        context = await observedContext();
      }
      const p = await context.newPage();
      await p.goto(`${server.origin}/`);
      await p.waitForFunction(
        () =>
          !!window.phase3cProof &&
          !!document.querySelector('[data-profile]') &&
          !window.phase3cProof.offline()?.frozen,
      );
      const selectedBeforeController = await p.evaluate(() => {
        const before = navigator.serviceWorker.controller === null;
        document.querySelector<HTMLButtonElement>('[data-profile]')?.click();
        return before;
      });
      if (selectedBeforeController) beforeController++;
      await p.waitForFunction(
        () =>
          window.phase3cProof.state().record?.profileId ===
            'SYNTHETIC-PLAYER-1' &&
          !window.phase3cProof.state().busy &&
          !window.phase3cProof.offline()?.frozen,
      );
      await shellReady(p);
      expect((await state(p)).saved).toBe(true);
      expect((await state(p)).error).toBeNull();
      expect((await state(p)).record?.completedCount).toBe(0);
      expect(await p.locator('#slice-task-heading').count()).toBe(1);
      expect(await p.locator('[data-recovery-error]').count()).toBe(0);
    }
    evidence.startup = {
      freshContexts: 8,
      beforeControllerSelections: beforeController,
      mechanism:
        'select as soon as initial UI thaws, without waiting for controller or shell readiness',
    };
  });

  it('keeps storage unopened until explicit fixed-profile selection', async () => {
    const p = await open();
    expect((await state(p)).record).toBeNull();
    expect(await p.locator('[data-profile]').count()).toBe(2);
    expect(
      await p.locator('input[type=text], input[type=file], textarea').count(),
    ).toBe(0);
    expect(
      await p.evaluate(async () =>
        (await indexedDB.databases()).some(
          (db) => db.name === 'math-adventure.synthetic.phase3c.loop-v1',
        ),
      ),
    ).toBe(false);
    await profile(p);
    expect((await state(p)).saved).toBe(true);
  });

  it('reaches every numeral/count quantity in sixteen deterministic examples for each fixed profile', async () => {
    const p = await open();
    const samples: {
      profile: number;
      family: string;
      examples: number;
      quantities: readonly number[];
    }[] = [];
    for (const index of [0, 1]) {
      await profile(p, index);
      for (const family of ['number.numeral', 'number.counting'] as const) {
        await activity(p, family);
        const quantities = new Set<number>();
        for (let example = 0; example < 16; example++) {
          const emitted = await presentation(p),
            expected = oracle(emitted);
          if (typeof expected !== 'number')
            throw new Error('Finite quantity oracle required');
          quantities.add(expected);
          if (family === 'number.numeral')
            expect(await p.locator('.slice-numeral').textContent()).toBe(
              String(expected),
            );
          else
            expect(
              await p.locator('.slice-task .slice-token-group button').count(),
            ).toBe(expected);
          if (example < 15) {
            await p.locator('[data-action=skip]').click();
            await settled(p);
            await p.waitForFunction(
              (seed) =>
                window.phase3cProof.presentation()?.replay.seedHex !== seed,
              emitted.replay.seedHex,
            );
          }
        }
        expect([...quantities].sort()).toEqual([0, 1, 2, 3, 4, 5]);
        expect((await state(p)).record?.events).toHaveLength(0);
        samples.push({
          profile: index + 1,
          family,
          examples: 16,
          quantities: [...quantities].sort(),
        });
      }
    }
    evidence.workflowVariation = {
      samples,
      evidenceScope:
        'finite synthetic generation/representation only; no mastery or educational-effectiveness claim',
    };
  });

  for (const family of families)
    it(`renders ${family}, rejects an independent wrong answer, and accepts the oracle`, async () => {
      const p = await open();
      await profile(p);
      await activity(p, family);
      const presented = await presentation(p),
        expected = oracle(presented);
      expect(await p.locator('.slice-task').getAttribute('lang')).toBe('el-GR');
      expect(
        await p
          .locator('.slice-answer fieldset legend, .slice-answer label')
          .count(),
      ).toBeGreaterThan(0);
      expect(await p.locator('#slice-feedback').getAttribute('role')).toBe(
        'status',
      );
      expect(await p.locator('#slice-feedback').textContent()).toBe('');
      if (presented.task.kind === 'countItems')
        expect(
          await p.locator('.slice-task .slice-token-group button').count(),
        ).toBe(expected);
      if (presented.task.kind === 'numeralRecognition') {
        expect(await p.locator('.slice-numeral').textContent()).toBe(
          String(expected),
        );
        for (let value = 0; value <= 5; value++)
          expect(
            await p
              .locator('.slice-quantity-choice')
              .nth(value)
              .locator('.slice-token')
              .count(),
          ).toBe(value);
      }
      if (presented.task.kind === 'compareQuantities') {
        expect(
          await p
            .locator('.slice-quantity-pair > div')
            .nth(0)
            .locator('.slice-token')
            .count(),
        ).toBe(presented.task.left.length);
        expect(
          await p
            .locator('.slice-quantity-pair > div')
            .nth(1)
            .locator('.slice-token')
            .count(),
        ).toBe(presented.task.right.length);
      }
      if (presented.task.kind === 'subtractItems')
        expect(
          await p
            .locator(
              '.slice-task .slice-token-group .slice-token:not(.removed)',
            )
            .count(),
        ).toBe(expected);
      if (presented.task.kind === 'measureGeometry')
        expect(await p.locator('.slice-measurement line').count()).toBe(
          expected,
        );
      if (presented.task.kind === 'classifyGeometry') {
        expect(await p.locator('.slice-scene').getAttribute('role')).toBe(
          'img',
        );
        expect(await p.locator('.slice-attributes p').count()).toBe(8);
      }
      await submit(p, wrong(expected));
      expect((await state(p)).record?.lastCompletion?.correct).toBe(false);
      expect(await p.locator('#slice-feedback').textContent()).toBe(
        formatMessage('el-GR', 'retry'),
      );
      expect((await state(p)).record?.events).toHaveLength(0);
      await p.locator('.slice-task > button').last().click();
      await submit(p, expected);
      const result = await state(p);
      expect(await p.locator('#slice-feedback').textContent()).toBe(
        formatMessage('el-GR', 'success'),
      );
      expect(result.record?.lastCompletion).toMatchObject({
        correct: true,
        evidence: 'manual',
      });
      expect(result.record?.completedCount).toBe(2);
      expect(result.record?.events).toHaveLength(0);
      expect(result.saved).toBe(true);
      expect(
        await p.locator('[data-save-state]').getAttribute('data-save-state'),
      ).toBe('saved');
    });

  it('keeps mathematical hint support distinct from accessible unit traversal', async () => {
    const p = await open();
    await profile(p);
    await policy(p);
    await activity(p, 'measurement.unit-length');
    const task = await presentation(p);
    await p.locator('.slice-measurement button').first().click();
    await submit(p, oracle(task));
    expect((await state(p)).record?.lastCompletion?.evidence).toBe(
      'independentSuccess',
    );
    const support = (await state(p)).record?.events.at(-1);
    expect(
      support?.kind === 'observation' && support.input.accessibilitySupports,
    ).toEqual(['alternateControls']);
    await p.locator('[data-action=next]').click();
    await activity(p, 'number.addition');
    await p.locator('.hint-button').click();
    expect(await p.locator('.hint-button').getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(await p.locator('#slice-hint').isVisible()).toBe(true);
    await submit(p, oracle(await presentation(p)));
    expect((await state(p)).record?.lastCompletion?.evidence).toBe(
      'supportedSuccess',
    );
    expect((await state(p)).record?.lastCompletion?.reasonCode).toBe(
      'mathematicalSupport',
    );
  });

  it('keeps all five catalog increments limitedEvidence in proposed-policy mode', async () => {
    const p = await open();
    await profile(p);
    await policy(p);
    for (const family of SLICE_FAMILY_IDS) {
      await activity(p, family);
      await submit(p, oracle(await presentation(p)));
      expect((await state(p)).record?.lastCompletion).toMatchObject({
        correct: true,
        evidence: 'limitedEvidence',
      });
      expect((await state(p)).record?.events).toHaveLength(0);
    }
    expect((await state(p)).record?.derived.concepts).toEqual({});
  });

  it('keeps exploration transient and clears its memory across profiles and reload', async () => {
    const p = await open();
    await profile(p);
    await policy(p);
    await p.locator('[data-mode=exploration]').check();
    const before = await state(p);
    await submit(p, oracle(await presentation(p)));
    expect((await state(p)).sessionOnlyCompletion?.evidence).toBe(
      'sessionOnly',
    );
    expect((await state(p)).explorationCount).toBe(1);
    expect((await state(p)).record).toEqual(before.record);
    await p.locator(`[data-profile="${SYNTHETIC_PROFILE_IDS[1]}"]`).click();
    await settled(p);
    expect((await state(p)).explorationCount).toBe(0);
    expect((await state(p)).record?.events).toHaveLength(0);
    await p.reload();
    await p.waitForFunction(
      () => !!window.phase3cProof && !window.phase3cProof.offline()?.frozen,
    );
    await profile(p);
    expect((await state(p)).explorationCount).toBe(0);
    expect((await state(p)).record).toEqual(before.record);
  });

  it('isolates evidence, adaptation, preferences and pending callbacks during profile switch', async () => {
    const p = await open();
    await profile(p);
    await policy(p);
    await submit(p, oracle(await presentation(p)));
    const first = (await state(p)).record;
    await p.locator(`[data-profile="${SYNTHETIC_PROFILE_IDS[1]}"]`).click();
    await settled(p);
    expect((await state(p)).record?.completedCount).toBe(0);
    expect((await state(p)).record?.events).toHaveLength(0);
    expect((await state(p)).record?.mode).toBe('manual');
    await p.evaluate(() => window.phase3cProof.holdWrites(true));
    await choose(p, oracle(await presentation(p)));
    await p.locator('.slice-answer button[type=submit]').click();
    await p.waitForFunction(() => window.phase3cProof.held() === 1);
    await p.locator(`[data-profile="${SYNTHETIC_PROFILE_IDS[0]}"]`).click();
    await p.evaluate(() => window.phase3cProof.holdWrites(false));
    await settled(p);
    expect((await state(p)).record).toEqual(first);
    expect((await state(p)).sessionOnlyCompletion).toBeNull();
  });

  it('persists completion after commit, reloads without advancing session, and starts explicitly', async () => {
    const p = await open();
    await profile(p);
    await p.evaluate(() => window.phase3cProof.holdWrites(true));
    await choose(p, oracle(await presentation(p)));
    await p.locator('.slice-answer button[type=submit]').click();
    await p.waitForFunction(() => window.phase3cProof.held() === 1);
    expect((await state(p)).saved).toBe(false);
    expect((await state(p)).record?.completedCount).toBe(0);
    expect(await p.locator('#slice-feedback').textContent()).toBe('');
    expect(
      await p.locator('[data-save-state]').getAttribute('data-save-state'),
    ).toBe('saving');
    await p.evaluate(() => window.phase3cProof.holdWrites(false));
    await settled(p);
    expect((await state(p)).record?.completedCount).toBe(1);
    const ordinal = (await state(p)).record?.sessionOrdinal;
    await p.reload();
    await p.waitForFunction(
      () => !!window.phase3cProof && !window.phase3cProof.offline()?.frozen,
    );
    await profile(p);
    expect((await state(p)).record?.completedCount).toBe(1);
    expect((await state(p)).record?.sessionOrdinal).toBe(ordinal);
    const taskOrdinal = (await state(p)).record?.taskOrdinal ?? 0;
    await p.locator('[data-action=skip]').click();
    await settled(p);
    expect((await state(p)).record?.taskOrdinal).toBe(taskOrdinal + 1);
    expect((await state(p)).record?.completedCount).toBe(1);
    await p.locator('[data-action=stop]').click();
    await settled(p);
    expect((await state(p)).record?.sessionActive).toBe(false);
    await p.locator('[data-action=resume]').click();
    await settled(p);
    expect((await state(p)).record?.sessionOrdinal).toBe((ordinal ?? 0) + 1);
  });

  it('keeps independent locale roles and truthful planned-locale fallback', async () => {
    const p = await open();
    await profile(p);
    let previousInstruction = 'el-GR';
    for (const locale of ['el-GR', 'en-GB', 'de-DE']) {
      await p.locator('[data-language-role=uiLocale]').selectOption(locale);
      await settled(p);
      expect(await p.locator('main').getAttribute('lang')).toBe(locale);
      expect(await p.locator('.slice-task').getAttribute('lang')).toBe(
        previousInstruction,
      );
      await p
        .locator('[data-language-role=instructionLocale]')
        .selectOption(locale);
      await settled(p);
      expect(await p.locator('.slice-task').getAttribute('lang')).toBe(locale);
      previousInstruction = locale;
    }
    await p
      .locator('[data-language-role=numberSpeechLocale]')
      .selectOption('en-GB');
    await settled(p);
    expect((await state(p)).record?.preferences).toEqual({
      uiLocale: 'de-DE',
      instructionLocale: 'de-DE',
      numberSpeechLocale: 'en-GB',
    });
    await p
      .locator('[data-language-role=instructionLocale]')
      .selectOption('fr-FR');
    await settled(p);
    expect((await state(p)).record?.preferences.instructionLocale).toBe(
      'fr-FR',
    );
    expect(await p.locator('.slice-task').getAttribute('lang')).toBe('el-GR');
    expect(await p.locator('.speech-controls').count()).toBe(0);
    const local = await p.evaluate(
      () =>
        speechSynthesis
          .getVoices()
          .filter(
            (voice) => voice.lang === 'el-GR' && voice.localService === true,
          ).length,
    );
    evidence.speech = {
      exactGreekLocalExposed: local,
      pronunciation: 'UNAVAILABLE',
      offlinePlayback: 'UNAVAILABLE',
    };
  });

  it('reconciles a durable pending completion on reload with exactly one explicit retry', async () => {
    const p = await open();
    await profile(p);
    await policy(p);
    await p.evaluate(() => window.phase3cProof.holdWrites(true));
    await choose(p, oracle(await presentation(p)));
    await p.locator('.slice-answer button[type=submit]').click();
    await p.waitForFunction(() => window.phase3cProof.held() === 1);
    // Release the staging transaction, then hold the separately atomic final
    // completion. This exercises a native durable checkpoint, not an IDB mock.
    await p.evaluate(() => {
      window.phase3cProof.holdWrites(false);
      window.phase3cProof.holdWrites(true);
    });
    await p.waitForFunction(
      () =>
        window.phase3cProof.held() === 1 &&
        window.phase3cProof.state().record?.pending !== null,
    );
    expect((await state(p)).record?.completedCount).toBe(0);
    expect((await state(p)).saved).toBe(false);
    await p.evaluate(() => {
      window.phase3cProof.fault('abort');
      window.phase3cProof.holdWrites(false);
    });
    await settled(p);
    expect((await state(p)).record?.pending).not.toBeNull();
    await p.reload();
    await p.waitForFunction(
      () => !!window.phase3cProof && !window.phase3cProof.offline()?.frozen,
    );
    await profile(p);
    expect((await state(p)).uncertain).toBe(true);
    expect((await state(p)).record?.pending).not.toBeNull();
    expect((await state(p)).record?.completedCount).toBe(0);
    await p.locator('[data-action=retry-save]').click();
    await settled(p);
    expect((await state(p)).record?.completedCount).toBe(1);
    expect(
      (await state(p)).record?.events.filter(
        (event) => event.kind === 'observation',
      ),
    ).toHaveLength(1);
    expect((await state(p)).record?.pending).toBeNull();
    expect(await p.locator('[data-action=retry-save]').isDisabled()).toBe(true);
    await p.locator('[data-action=reconcile]').click();
    await settled(p);
    expect((await state(p)).record?.completedCount).toBe(1);
  });

  it('keeps speech explicit and cancels changed contexts using only exposed exact local voices', async () => {
    await context.addInitScript(() => {
      const nativeSpeak = speechSynthesis.speak.bind(speechSynthesis),
        nativeCancel = speechSynthesis.cancel.bind(speechSynthesis);
      const counters = { speaks: 0, cancels: 0, eligible: true };
      Object.defineProperty(window, 'syntheticSpeechCounters', {
        value: counters,
      });
      speechSynthesis.speak = (utterance) => {
        counters.speaks++;
        counters.eligible &&=
          utterance.voice?.localService === true &&
          utterance.voice.lang === utterance.lang &&
          ['el-GR', 'en-GB', 'de-DE'].includes(utterance.lang);
        nativeSpeak(utterance);
      };
      speechSynthesis.cancel = () => {
        counters.cancels++;
        nativeCancel();
      };
    });
    const p = await open();
    await profile(p);
    const counters = () =>
      p.evaluate(() => ({
        ...(
          window as unknown as {
            syntheticSpeechCounters: {
              speaks: number;
              cancels: number;
              eligible: boolean;
            };
          }
        ).syntheticSpeechCounters,
      }));
    expect((await counters()).speaks).toBe(0);
    const exactLocalLocale = await p.evaluate(
      () =>
        ['el-GR', 'en-GB', 'de-DE'].find((locale) =>
          speechSynthesis
            .getVoices()
            .some(
              (voice) => voice.lang === locale && voice.localService === true,
            ),
        ) ?? null,
    );
    if (exactLocalLocale) {
      await p
        .locator('[data-language-role=instructionLocale]')
        .selectOption(exactLocalLocale);
      await settled(p);
      await p.locator('.speech-controls button').first().click();
      expect((await counters()).speaks).toBe(1);
      expect((await counters()).eligible).toBe(true);
      const cancellation = (await counters()).cancels;
      await p.locator('[data-action=skip]').click();
      await settled(p);
      expect((await counters()).cancels).toBeGreaterThan(cancellation);
      await p.locator('.speech-controls button').first().click();
      const secondCancellation = (await counters()).cancels;
      await p.locator(`[data-profile="${SYNTHETIC_PROFILE_IDS[1]}"]`).click();
      await settled(p);
      expect((await counters()).cancels).toBeGreaterThan(secondCancellation);
    } else expect(await p.locator('.speech-controls').count()).toBe(0);
    await submit(p, oracle(await presentation(p)));
    expect((await state(p)).record?.lastCompletion?.correct).toBe(true);
    evidence.speechReplay = {
      exactLocalLocale,
      explicitSpeakCount: (await counters()).speaks,
      eligibleOnly: (await counters()).eligible,
      actualPronunciation: 'UNAVAILABLE',
      actualOfflinePlayback: 'UNAVAILABLE',
    };
  });

  it('honours explicit unsaved selection even after a saved profile was opened', async () => {
    const p = await open();
    await profile(p);
    const before = (await state(p)).record;
    await p
      .locator('[data-profile]')
      .first()
      .locator('..')
      .locator('..')
      .locator('input[type=checkbox]')
      .uncheck();
    await p.locator(`[data-profile="${SYNTHETIC_PROFILE_IDS[0]}"]`).click();
    await settled(p);
    expect((await state(p)).saved).toBe(false);
    await submit(p, oracle(await presentation(p)));
    expect((await state(p)).saved).toBe(false);
    await p.reload();
    await p.waitForFunction(
      () => !!window.phase3cProof && !window.phase3cProof.offline()?.frozen,
    );
    await profile(p);
    expect((await state(p)).record).toEqual(before);
  });

  it('fences a native committed answer with withheld completion delivery across profile switch and update', async () => {
    await context.addInitScript(() => {
      type Handler = (this: IDBTransaction, event: Event) => void;
      const descriptor = Object.getOwnPropertyDescriptor(
        IDBTransaction.prototype,
        'oncomplete',
      ) as
        | {
            get?: (this: IDBTransaction) => Handler | null;
            set?: (this: IDBTransaction, handler: Handler | null) => void;
          }
        | undefined;
      const nativeGet = descriptor?.get,
        nativeSet = descriptor?.set;
      if (!nativeGet || !nativeSet)
        throw new Error('Native completion descriptor unavailable');
      const gate = {
        armed: false,
        completedWrites: 0,
        held: false,
        release: null as (() => void) | null,
      };
      Object.defineProperty(window, 'syntheticNativeCompletionGate', {
        value: gate,
      });
      Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
        configurable: true,
        enumerable: true,
        get(this: IDBTransaction) {
          return nativeGet.call(this);
        },
        set(this: IDBTransaction, handler: Handler | null) {
          nativeSet.call(
            this,
            handler === null
              ? null
              : function (event: Event) {
                  if (
                    gate.armed &&
                    this.mode === 'readwrite' &&
                    this.objectStoreNames.contains('receipts')
                  ) {
                    gate.completedWrites++;
                    if (gate.completedWrites === 2) {
                      gate.held = true;
                      gate.release = () => {
                        gate.held = false;
                        gate.release = null;
                        handler.call(this, event);
                      };
                      return;
                    }
                  }
                  handler.call(this, event);
                },
          );
        },
      });
    });
    const a = await open();
    await profile(a);
    await policy(a);
    await a.evaluate(() => {
      (
        window as unknown as {
          syntheticNativeCompletionGate: { armed: boolean };
        }
      ).syntheticNativeCompletionGate.armed = true;
    });
    await choose(a, oracle(await presentation(a)));
    await a.locator('.slice-answer button[type=submit]').click();
    await a.waitForFunction(
      () =>
        (
          window as unknown as {
            syntheticNativeCompletionGate: { held: boolean };
          }
        ).syntheticNativeCompletionGate.held,
    );
    expect((await state(a)).busy).toBe(true);
    expect((await state(a)).saved).toBe(false);
    expect(await a.locator('#slice-feedback').textContent()).toBe('');
    // Native final transaction is already complete. An independent browser
    // client reads the actual committed row while the original callback waits.
    const b = await open();
    await profile(b);
    expect((await state(b)).record?.completedCount).toBe(1);
    expect(
      (await state(b)).record?.events.filter(
        (event) => event.kind === 'observation',
      ),
    ).toHaveLength(1);
    await a.locator(`[data-profile="${SYNTHETIC_PROFILE_IDS[1]}"]`).click();
    await settled(a);
    const survivor = (await state(a)).record;
    expect(survivor?.completedCount).toBe(0);
    expect(survivor?.events).toHaveLength(0);
    const release = (await a.evaluate(() => window.phase3cProof.offline()))
      ?.releaseId;
    await stage(a, '/', 'v2');
    await (await updateButton(a)).click();
    await a.waitForFunction(
      () => window.phase3cProof.offline()?.update === 'blocked',
    );
    expect(
      (await a.evaluate(() => window.phase3cProof.offline()))?.releaseId,
    ).toBe(release);
    await a.evaluate(() => {
      (
        window as unknown as {
          syntheticNativeCompletionGate: { release: (() => void) | null };
        }
      ).syntheticNativeCompletionGate.release?.();
    });
    expect((await state(a)).record).toEqual(survivor);
    expect(await a.locator('#slice-feedback').textContent()).toBe('');
    await a.reload();
    await a.waitForFunction(
      () => !!window.phase3cProof && !window.phase3cProof.offline()?.frozen,
    );
    await profile(a);
    expect((await state(a)).record?.completedCount).toBe(1);
    expect(
      (await state(a)).record?.events.filter(
        (event) => event.kind === 'observation',
      ),
    ).toHaveLength(1);
    expect((await state(a)).saved).toBe(true);
    evidence.nativeCompletionLoss =
      'native final commit independently read before withheld completion delivery; profile switch and update fence; explicit reload restores one scoped observation';
  });

  it('reflows all eight families at 320px with deliberate 200% text and reduced motion', async () => {
    const p = await open();
    await profile(p);
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.locator('[data-language-role=uiLocale]').selectOption('de-DE');
    await settled(p);
    await p
      .locator('[data-language-role=instructionLocale]')
      .selectOption('en-GB');
    await settled(p);
    await p.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const samples: {
      family: string;
      width: number;
      height: number;
      overflow: number;
      minimumTarget: number;
    }[] = [];
    for (const viewport of [
      { width: 320, height: 800 },
      { width: 800, height: 320 },
    ]) {
      await p.setViewportSize(viewport);
      for (const family of families) {
        await activity(p, family);
        const metrics = await p.evaluate(() => {
          const buttons = Array.from(
            document.querySelectorAll<HTMLButtonElement>(
              '[data-profile], [data-family], .slice-task button, [data-action=skip], [data-action=stop]',
            ),
          ).filter((button) => button.getClientRects().length);
          return {
            overflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
            minimumTarget: Math.min(
              ...buttons.map((button) =>
                Math.min(
                  button.getBoundingClientRect().width,
                  button.getBoundingClientRect().height,
                ),
              ),
            ),
            motion: buttons.every(
              (button) =>
                getComputedStyle(button).animationName === 'none' &&
                getComputedStyle(button)
                  .transitionDuration.split(',')
                  .every((value) => Number.parseFloat(value) === 0),
            ),
            named: buttons.every((button) =>
              Boolean(
                button.getAttribute('aria-label') || button.textContent?.trim(),
              ),
            ),
          };
        });
        expect(metrics.overflow).toBeLessThanOrEqual(1);
        expect(metrics.minimumTarget).toBeGreaterThanOrEqual(44);
        expect(metrics.motion).toBe(true);
        expect(metrics.named).toBe(true);
        samples.push({
          family,
          ...viewport,
          overflow: metrics.overflow,
          minimumTarget: metrics.minimumTarget,
        });
        await p.locator('.hint-button').click();
        expect(await p.locator('#slice-hint').isVisible()).toBe(true);
      }
    }
    const colours = await p
      .locator('.slice-answer button[type=submit]')
      .evaluate((button) => {
        const style = getComputedStyle(button);
        return {
          foreground: style.color,
          background: style.backgroundColor,
          border: style.borderTopColor,
        };
      });
    const luminance = (colour: string): number => {
      const channels = colour
        .match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number);
      if (!channels || channels.length !== 3)
        throw new Error('Opaque computed colour required');
      return channels.reduce((sum, value, index) => {
        const normalized = value / 255;
        return (
          sum +
          (normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4) *
            ([0.2126, 0.7152, 0.0722][index] ?? 0)
        );
      }, 0);
    };
    const foreground = luminance(colours.foreground),
      background = luminance(colours.background);
    const contrast =
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    evidence.reflow = {
      mechanism:
        '320 CSS px and 800x320; root font-size 200% (deliberate text scaling, not native zoom)',
      samples,
      submitTextContrast: contrast,
      actualAT: 'UNAVAILABLE',
    };
  });

  it('selects, hints and answers through keyboard with visible focus and semantic outcome', async () => {
    const p = await open();
    await p.keyboard.press('Tab');
    expect(
      await p
        .locator('[data-profile]')
        .first()
        .evaluate((button) => button === document.activeElement),
    ).toBe(true);
    const outline = await p
      .locator('[data-profile]')
      .first()
      .evaluate((button) => {
        const style = getComputedStyle(button);
        return {
          width: Number.parseFloat(style.outlineWidth),
          style: style.outlineStyle,
        };
      });
    expect(outline.width).toBeGreaterThanOrEqual(3);
    expect(outline.style).not.toBe('none');
    await p.keyboard.press('Enter');
    await p.waitForFunction(
      () =>
        !!window.phase3cProof.state().record &&
        !window.phase3cProof.state().busy,
    );
    for (
      let step = 0;
      step < 24 &&
      !(await p
        .locator('.hint-button')
        .evaluate((button) => button === document.activeElement));
      step++
    )
      await p.keyboard.press('Tab');
    expect(
      await p
        .locator('.hint-button')
        .evaluate((button) => button === document.activeElement),
    ).toBe(true);
    await p.keyboard.press('Space');
    expect(await p.locator('#slice-hint').isVisible()).toBe(true);
    expect(
      await p
        .locator('.hint-button')
        .evaluate((button) => button === document.activeElement),
    ).toBe(true);
    await p.keyboard.press('Tab');
    expect(
      await p
        .locator('#slice-response')
        .evaluate((input) => input === document.activeElement),
    ).toBe(true);
    const expected = oracle(await presentation(p));
    if (typeof expected !== 'number')
      throw new Error('Initial bounded addition required');
    await p.keyboard.press('Home');
    for (let value = 0; value <= expected; value++)
      await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Tab');
    await p.keyboard.press('Enter');
    await settled(p);
    expect((await state(p)).record?.lastCompletion?.correct).toBe(true);
    expect(await p.locator('#slice-feedback').getAttribute('aria-live')).toBe(
      'polite',
    );
    expect(await p.locator('#slice-feedback').textContent()).not.toBe('');
    await p.locator('[data-action=stop]').focus();
    await p.keyboard.press('Enter');
    await settled(p);
    await p.waitForFunction(
      () => document.activeElement?.getAttribute('data-action') === 'resume',
    );
    await p.keyboard.press('Enter');
    await settled(p);
    await p.waitForFunction(
      () => document.activeElement?.id === 'slice-task-heading',
    );
    evidence.keyboard =
      'native Tab/Enter/Space/select arrows, focus outline, stop/resume focus and status semantics; no actual screen-reader delivery claim';
  });

  for (const fault of ['quota', 'abort'] as const)
    it(`keeps ${fault} failure unsaved and resumes only by explicit choice`, async () => {
      const p = await open();
      await profile(p);
      await policy(p);
      const before = (await state(p)).record;
      await p.evaluate((fault) => window.phase3cProof.fault(fault), fault);
      await submit(p, oracle(await presentation(p)));
      const failed = await state(p);
      expect(failed.saved).toBe(false);
      expect(failed.readOnly).toBe(true);
      expect(failed.error).toBe(
        fault === 'quota' ? 'quota_exceeded' : 'storage_unavailable',
      );
      expect(failed.record?.completedCount).toBe(before?.completedCount);
      expect(failed.record?.events).toEqual(before?.events);
      expect(
        await p.locator('[data-save-state]').getAttribute('data-save-state'),
      ).not.toBe('saved');
      await p.evaluate(() => window.phase3cProof.fault(undefined));
      await p.locator('[data-action=unsaved]').click();
      await activity(p, 'number.addition');
      await submit(p, oracle(await presentation(p)));
      expect((await state(p)).saved).toBe(false);
      await p.reload();
      await p.waitForFunction(
        () => !!window.phase3cProof && !window.phase3cProof.offline()?.frozen,
      );
      await profile(p);
      expect((await state(p)).record?.completedCount).toBe(
        before?.completedCount,
      );
      expect((await state(p)).record?.events).toEqual(before?.events);
    });

  it('rejects a stale tab and reconciles explicitly without duplicating observations', async () => {
    const a = await open();
    await profile(a);
    await policy(a);
    const b = await open();
    await profile(b);
    await submit(a, oracle(await presentation(a)));
    const committed = (await state(a)).record;
    await submit(b, oracle(await presentation(b)));
    expect((await state(b)).error).toBe('revision_conflict');
    expect((await state(b)).saved).toBe(false);
    await b.locator('[data-action=reconcile]').click();
    await settled(b);
    expect((await state(b)).record).toEqual(committed);
    expect(
      (await state(b)).record?.events.filter(
        (event) => event.kind === 'observation',
      ),
    ).toHaveLength(1);
  });

  it('fences a held answer on deletion and preserves the surviving profile', async () => {
    const a = await open();
    await profile(a, 1);
    const survivor = (await state(a)).record;
    await a.locator(`[data-profile="${SYNTHETIC_PROFILE_IDS[0]}"]`).click();
    await settled(a);
    const b = await open();
    await profile(b);
    await b.evaluate(() => window.phase3cProof.holdWrites(true));
    await choose(b, oracle(await presentation(b)));
    await b.locator('.slice-answer button[type=submit]').click();
    await b.waitForFunction(() => window.phase3cProof.held() === 1);
    await a.locator('[data-action=delete]').click();
    expect((await state(a)).record).not.toBeNull();
    await a.locator('[data-action=confirm-delete]').click();
    await settled(a);
    expect((await state(a)).record).toBeNull();
    await b.evaluate(() => window.phase3cProof.holdWrites(false));
    await settled(b);
    expect((await state(b)).error).toBe('epoch_conflict');
    expect((await state(b)).saved).toBe(false);
    await a.locator(`[data-profile="${SYNTHETIC_PROFILE_IDS[1]}"]`).click();
    await settled(a);
    expect((await state(a)).record).toEqual(survivor);
    expect((await state(a)).snapshot?.storageEpoch).toBe(1);
  });

  it('falls back visibly when IndexedDB is unavailable without claiming a save', async () => {
    await context.addInitScript(() =>
      Object.defineProperty(window, 'indexedDB', {
        get() {
          throw new DOMException('Synthetic denied', 'SecurityError');
        },
      }),
    );
    const p = await open();
    await p.locator('[data-profile]').first().click();
    await p.locator('[data-recovery-error=storage_unavailable]').waitFor();
    expect((await state(p)).record).toBeNull();
    await p
      .locator('[aria-labelledby=profiles-heading] input[type=checkbox]')
      .uncheck();
    await profile(p);
    expect((await state(p)).saved).toBe(false);
    await submit(p, oracle(await presentation(p)));
    expect((await state(p)).saved).toBe(false);
    expect(
      await p.locator('[data-save-state]').getAttribute('data-save-state'),
    ).toBe('unsaved');
  });

  it('refuses a future native database schema and leaves it untouched', async () => {
    const p = await open();
    await p.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(
          'math-adventure.synthetic.phase3c.loop-v1',
          9,
        );
        request.onsuccess = () => {
          request.result.close();
          resolve();
        };
        request.onerror = () =>
          reject(new Error('Synthetic future setup failed'));
      });
    });
    await p.locator('[data-profile]').first().click();
    await p.locator('[data-recovery-error=unsupported_schema]').waitFor();
    expect((await state(p)).record).toBeNull();
    expect((await state(p)).saved).toBe(false);
    expect(
      await p.evaluate(
        async () =>
          (await indexedDB.databases()).find(
            (db) => db.name === 'math-adventure.synthetic.phase3c.loop-v1',
          )?.version,
      ),
    ).toBe(9);
    await p
      .locator('[aria-labelledby=profiles-heading] input[type=checkbox]')
      .uncheck();
    await profile(p);
    expect(
      await p.locator('[data-save-state]').getAttribute('data-save-state'),
    ).toBe('unsaved');
  });

  it('handles an actually blocked native upgrade without erasing the old store', async () => {
    const p = await open();
    await p.evaluate(async () => {
      const request = indexedDB.open(
        'math-adventure.synthetic.phase3c.loop-v1',
        1,
      );
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          Object.defineProperty(window, 'syntheticHeldDatabase', {
            value: request.result,
          });
          resolve();
        };
        request.onerror = () =>
          reject(new Error('Synthetic blocked setup failed'));
      });
    });
    await p.locator('[data-profile]').first().click();
    await p.locator('[data-recovery-error=storage_unavailable]').waitFor();
    expect((await state(p)).record).toBeNull();
    expect((await state(p)).saved).toBe(false);
    expect(
      await p.evaluate(
        async () =>
          (await indexedDB.databases()).find(
            (db) => db.name === 'math-adventure.synthetic.phase3c.loop-v1',
          )?.version,
      ),
    ).toBe(1);
    await p.evaluate(() => {
      const held = (window as unknown as { syntheticHeldDatabase: IDBDatabase })
        .syntheticHeldDatabase;
      held.close();
    });
    expect((await state(p)).saved).toBe(false);
  });

  for (const prefix of ['/', '/math-adventure/'] as const) {
    it(`reloads cached ${prefix} shell offline with separately saved learner state`, async () => {
      const p = await open(prefix);
      await shellReady(p);
      await profile(p);
      await policy(p);
      await submit(p, oracle(await presentation(p)));
      const committed = (await state(p)).record;
      const requestCount = server.requestCount();
      await context.setOffline(true);
      const response = await p.reload();
      expect(response?.fromServiceWorker()).toBe(true);
      await p.waitForFunction(
        () => !!window.phase3cProof && !window.phase3cProof.offline()?.frozen,
      );
      await profile(p);
      expect((await state(p)).record).toEqual(committed);
      expect((await state(p)).saved).toBe(true);
      expect(
        (await p.evaluate(() => window.phase3cProof.offline()))?.shell,
      ).toBe('ready');
      expect(server.requestCount()).toBe(requestCount);
      await context.setOffline(false);
    });

    it(`blocks ${prefix} activation while another client holds a learner write, then recovers coherently`, async () => {
      const a = await open(prefix);
      await shellReady(a);
      await profile(a);
      const b = await open(prefix);
      await shellReady(b);
      await profile(b);
      await b.evaluate(() => window.phase3cProof.holdWrites(true));
      await choose(b, oracle(await presentation(b)));
      await b.locator('.slice-answer button[type=submit]').click();
      await b.waitForFunction(() => window.phase3cProof.held() === 1);
      const release = (await a.evaluate(() => window.phase3cProof.offline()))
        ?.releaseId;
      await stage(a, prefix, 'v2');
      expect(
        (await b.evaluate(() => window.phase3cProof.offline()))?.safeBoundary,
      ).toBe(false);
      const button = await updateButton(a);
      await button.click();
      await a.waitForFunction(
        () => window.phase3cProof.offline()?.update === 'blocked',
      );
      expect(
        (await a.evaluate(() => window.phase3cProof.offline()))?.releaseId,
      ).toBe(release);
      expect((await state(b)).record?.completedCount).toBe(0);
      await b.evaluate(() => window.phase3cProof.holdWrites(false));
      await settled(b);
      const committed = (await state(b)).record;
      // The other tab's state must be reconciled before it can acknowledge.
      await a.locator('[data-action=reconcile]').click();
      await settled(a);
      await a.waitForFunction(
        () => window.phase3cProof.offline()?.safeBoundary === true,
      );
      await button.click();
      await a.waitForFunction(
        () =>
          document
            .querySelector('meta[name=math-adventure-build]')
            ?.getAttribute('content') === 'phase3c-proof-v2',
      );
      await b.waitForFunction(
        () =>
          document
            .querySelector('meta[name=math-adventure-build]')
            ?.getAttribute('content') === 'phase3c-proof-v2',
      );
      await shellReady(a);
      await shellReady(b);
      await profile(a);
      await profile(b);
      expect((await state(a)).record).toEqual(committed);
      expect((await state(b)).record).toEqual(committed);
      expect((await state(a)).saved).toBe(true);
    });

    it(`blocks ${prefix} update with incompatible learner reader declaration`, async () => {
      const p = await open(prefix);
      await shellReady(p);
      await profile(p);
      const before = (await state(p)).record;
      const release = (await p.evaluate(() => window.phase3cProof.offline()))
        ?.releaseId;
      await stage(p, prefix, 'future');
      await (await updateButton(p)).click();
      await p.waitForFunction(
        () => window.phase3cProof.offline()?.update === 'blocked',
      );
      expect(
        (await p.evaluate(() => window.phase3cProof.offline()))?.releaseId,
      ).toBe(release);
      expect((await state(p)).record).toEqual(before);
      expect((await state(p)).frozen).toBe(false);
    });
  }
});
