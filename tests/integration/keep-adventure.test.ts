// Real installed-browser backup/restore journeys over disposable synthetic
// origins and contexts only. No owner preview, daily profile or real file is used.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright-core';
import type { Browser, BrowserContext, Page } from 'playwright-core';
import { build } from 'vite';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { startProofServer } from '../../scripts/browser-proof/server.mjs';
import type { ProofServer } from '../../scripts/browser-proof/server.mjs';
import type { ChapterPresentation } from '../../src/application/growing-world';
import type { SyntheticLoopState } from '../../src/application/synthetic-loop';
import type { LoopPresentation } from '../../src/ui/synthetic-loop/TaskView';
import {
  countCombinedTokens,
  countUnitIntervals,
} from '../oracle/family-proof';

const channel = process.env.PHASE3C_BROWSER ?? 'chrome';
const directory = resolve('.cache/keep-adventure-browser', channel);
const database = 'math-adventure.synthetic.phase3c.loop-v1';
const locales = ['el-GR', 'en-GB', 'de-DE'] as const;
const expectedCases = 9;
// Optional prebuilt NODE_ENV=production slice; otherwise a test-renderer build.
const prebuilt = process.env.KEEP_ADVENTURE_SITE
  ? resolve(process.env.KEEP_ADVENTURE_SITE)
  : null;
const site = prebuilt ?? resolve(directory, 'site');
let siteArtifacts: Record<string, string> = {};
const sourceFiles = [
  'src/application/synthetic-loop/backup.ts',
  'src/application/synthetic-loop/digest.ts',
  'src/application/synthetic-loop/record.ts',
  'src/infrastructure/persistence/synthetic-loop-backup.ts',
  'src/infrastructure/persistence/synthetic-loop-database.ts',
  'src/presentation/localisation/backup-copy.ts',
  'src/ui/synthetic-loop/BackupRestore.tsx',
  'src/ui/synthetic-loop/backup-restore.css',
  'tests/browser/phase3c/main.tsx',
  'tests/browser/phase3c/runtime.ts',
  'vite.slice.config.ts',
  'tests/integration/keep-adventure.test.ts',
];
interface KeepProof {
  state(): SyntheticLoopState;
  presentation(): LoopPresentation | null;
  chapterTask(): ChapterPresentation | null;
  offline(): { shell: string; frozen: boolean } | null;
  fault(value: 'abort' | 'quota' | 'write' | undefined): void;
  holdWrites(value: boolean): void;
  held(): number;
  holdRestore(value: boolean): void;
  restoreHeld(): number;
  holdReadback(value: boolean): void;
  readbackHeld(): number;
  loseRestoreReport(value: boolean): void;
  restoring(): boolean;
}
interface RawRow {
  readonly recordId: string;
  readonly revision: number;
  readonly payload: Record<string, unknown>;
}
interface RawWorld {
  readonly exists: boolean;
  readonly control: Record<string, unknown> | null;
  readonly records: readonly RawRow[];
  readonly receipts: readonly string[];
}

let browser: Browser;
let initialHashes: Record<string, string>;
const servers: ProofServer[] = [];
const allowedOrigins = new Set<string>();
const contexts: BrowserContext[] = [];
const cases: { name: string; outcome: string }[] = [];
const observations: Record<string, unknown> = {};
let externalRequests = 0;
let pageErrors = 0;
let backupFile = '';

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

/** Each loopback origin is a separate disposable storage partition. */
async function server(): Promise<ProofServer> {
  const started = await startProofServer({
    distDirectory: site,
    fixtureDirectory: resolve('tests/e2e/fixtures'),
  });
  servers.push(started);
  allowedOrigins.add(started.origin);
  return started;
}

beforeAll(async () => {
  expect(['chrome', 'msedge']).toContain(channel);
  await rm(directory, { recursive: true, force: true });
  await mkdir(resolve(directory, 'files'), { recursive: true });
  await mkdir(resolve(directory, 'screens'), { recursive: true });
  initialHashes = await hashes();
  if (!prebuilt)
    await build({
      configFile: 'vite.slice.config.ts',
      logLevel: 'error',
      build: { outDir: site },
    });
  const files = await readdir(site, { recursive: true, withFileTypes: true });
  siteArtifacts = Object.fromEntries(
    await Promise.all(
      files
        .filter((entry) => entry.isFile())
        .map(async (entry): Promise<readonly [string, string]> => {
          const path = resolve(entry.parentPath, entry.name);
          return [
            relative(site, path).split(sep).join('/'),
            createHash('sha256')
              .update(await readFile(path))
              .digest('hex'),
          ];
        }),
    ),
  );
  browser = await chromium.launch({ channel, headless: true, timeout: 15_000 });
}, 120_000);

/** Fresh browser context: its own empty storage even for a reused origin. */
async function newContext(width = 1000, height = 850) {
  const context = await browser.newContext({
    serviceWorkers: 'allow',
    viewport: { width, height },
    reducedMotion: 'reduce',
    acceptDownloads: true,
  });
  contexts.push(context);
  context.on('page', (page) => page.on('pageerror', () => pageErrors++));
  context.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol !== 'blob:' && !allowedOrigins.has(url.origin))
      externalRequests++;
  });
  await context.route('**/*', async (route) =>
    allowedOrigins.has(new URL(route.request().url()).origin)
      ? route.continue()
      : route.abort('blockedbyclient'),
  );
  return context;
}

afterEach(async (task) => {
  cases.push({
    name: task.task.name,
    outcome: task.task.result?.state ?? 'unknown',
  });
  for (const context of contexts.splice(0)) await context.close();
});
afterAll(async () => {
  const sourceHashes = await hashes();
  await writeFile(
    resolve(directory, 'evidence.json'),
    `${JSON.stringify(
      {
        result:
          cases.length === expectedCases &&
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
        site: prebuilt ? 'prebuilt NODE_ENV=production slice' : 'test build',
        siteArtifacts,
        cases,
        observations,
        externalRequests,
        pageErrors,
        mechanism:
          'Installed browser via playwright-core; disposable loopback origins and fresh contexts; actual download and file chooser; raw IndexedDB rows compared by test-only code; injected abort/quota and CDP quota override labelled separately; browser-controlled offline mode; deliberate 32px root text',
        limits:
          'No physical device, OS-level disconnection, actual screen-reader delivery, native zoom, native-language review or real learner data',
      },
      null,
      2,
    )}\n`,
  );
  await browser?.close();
  await Promise.all(servers.map((item) => item.close()));
});

async function settled(page: Page) {
  await page.waitForFunction(() => {
    const value = window.phase3cProof as unknown as KeepProof | undefined;
    return (
      !!value &&
      !value.state().busy &&
      !value.restoring() &&
      !value.offline()?.frozen
    );
  });
}
async function shellReady(page: Page) {
  await page.waitForFunction(
    () =>
      (window.phase3cProof as unknown as KeepProof | undefined)?.offline()
        ?.shell === 'ready',
  );
}
async function open(page: Page, origin: string, prefix = '/') {
  expect((await page.goto(`${origin}${prefix}`))?.status()).toBe(200);
  await shellReady(page);
}
async function grownUps(page: Page) {
  if (!(await page.locator('[data-backup-restore]').count()))
    await page.locator('[data-action="presentation-view"]').click();
  await page.locator('[data-backup-restore]').waitFor();
}
async function childView(page: Page) {
  if (await page.locator('[data-backup-restore]').count())
    await page.locator('[data-action="presentation-view"]').click();
  await page.locator('[data-child-view]').waitFor();
}
async function deleteOpenBadge(page: Page) {
  const details = page.locator('[data-developer-controls]');
  if ((await details.getAttribute('open')) === null)
    await details.locator('summary').click();
  await page.locator('[data-action="delete"]').click();
  await page.locator('[data-action="confirm-delete"]').click();
  await settled(page);
}

/** Raw native rows, read by test-only code with no production decoder. */
async function rawWorld(page: Page): Promise<RawWorld> {
  return page.evaluate(async (name) => {
    const names = (await indexedDB.databases()).map((item) => item.name);
    if (!names.includes(name))
      return { exists: false, control: null, records: [], receipts: [] };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('raw open failed'));
    });
    const tx = db.transaction(['metadata', 'records', 'receipts'], 'readonly');
    const all = <T>(store: string) =>
      new Promise<T[]>((resolve) => {
        const request = tx.objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result as T[]);
      });
    const [control] = await all<Record<string, unknown>>('metadata');
    const records = await all<{
      recordId: string;
      revision: number;
      payload: Record<string, unknown>;
    }>('records');
    const receipts = (await all<{ operationId: string }>('receipts')).map(
      (item) => item.operationId,
    );
    db.close();
    return { exists: true, control: control ?? null, records, receipts };
  }, database);
}

/** Independent canonical spelling for comparisons and checksum. */
function canonical(input: unknown): string {
  if (Array.isArray(input)) return `[${input.map(canonical).join(',')}]`;
  if (input !== null && typeof input === 'object')
    return `{${Object.keys(input)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical((input as Record<string, unknown>)[key])}`,
      )
      .join(',')}}`;
  return JSON.stringify(input);
}
const sha = (text: string) =>
  createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
/** Intended portable meaning: every payload field except declared exclusions. */
function portable(payload: Record<string, unknown>): string {
  const copy = { ...payload };
  delete copy.derived;
  delete copy.pending;
  delete copy.lastCompletion;
  return canonical(copy);
}
const bySlot = (world: RawWorld) =>
  [...world.records].sort((a, b) => (a.recordId < b.recordId ? -1 : 1));

async function chapterTask(page: Page): Promise<ChapterPresentation> {
  await page.waitForFunction(
    () => (window.phase3cProof as unknown as KeepProof).chapterTask() !== null,
  );
  const task = await page.evaluate(() =>
    (window.phase3cProof as unknown as KeepProof).chapterTask(),
  );
  if (!task) throw new Error('Synthetic chapter missing');
  return task;
}
async function legacyTask(page: Page): Promise<LoopPresentation> {
  await page.waitForFunction(
    () => (window.phase3cProof as unknown as KeepProof).presentation() !== null,
  );
  const task = await page.evaluate(() =>
    (window.phase3cProof as unknown as KeepProof).presentation(),
  );
  if (!task) throw new Error('Synthetic legacy task missing');
  return task;
}
/** Independent integer relationships, using no production validator. */
function chapterAnswer(presentation: ChapterPresentation): number {
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
    case 'squareSide':
      for (let side = 1; side <= 6; side++)
        if (side * side === task.total) return side;
      throw new Error('Non-square');
  }
}
function legacyAnswer(presented: LoopPresentation): number {
  const task = presented.task;
  if (task.kind === 'evaluateExpression') {
    const root = task.expression.root;
    if (
      root.kind !== 'add' ||
      root.left.kind !== 'literal' ||
      root.right.kind !== 'literal'
    )
      throw new Error('Unexpected bounded expression');
    return countCombinedTokens(
      Number(root.left.value.numerator),
      Number(root.right.value.numerator),
    );
  }
  if (task.kind === 'measureGeometry') {
    const object = task.scene.objects.find((item) => item.id === task.objectId);
    if (!object || object.kind !== 'segment') throw new Error('No segment');
    const length = countUnitIntervals(
      {
        x: Number(object.start.x.numerator),
        y: Number(object.start.y.numerator),
      },
      { x: Number(object.end.x.numerator), y: Number(object.end.y.numerator) },
    );
    if (length === undefined) throw new Error('Not a unit segment');
    return length;
  }
  throw new Error(`Unsupported synthetic legacy task ${task.kind}`);
}
async function respond(page: Page, value: number) {
  const before = await page.evaluate(
    () =>
      (window.phase3cProof as unknown as KeepProof).state().record
        ?.completedCount ?? 0,
  );
  if (await page.locator('[data-answer-select]').count()) {
    await page.locator('[data-answer-select]').selectOption(String(value));
    await page.locator('[data-answer-submit]').click();
  } else await page.locator(`[data-child-answer="${value}"]`).click();
  await settled(page);
  await page.waitForFunction(
    (count) =>
      ((window.phase3cProof as unknown as KeepProof).state().record
        ?.completedCount ?? 0) > count,
    before,
  );
}
async function next(page: Page) {
  await page.locator('[data-action="next"]').click();
  await settled(page);
}
async function help(page: Page) {
  await page.locator('[data-child-help]').click();
  await settled(page);
}
async function discovery(page: Page, family: string, guided = true) {
  const board = async () => {
    if (
      !(await page.locator(`[data-discovery-family="${family}"]`).isVisible())
    )
      await page.locator('[data-action="discoveries"]').click();
  };
  await board();
  const pressed = await page
    .locator('[data-journey-mode]')
    .getAttribute('aria-pressed');
  if ((pressed === 'true') !== guided) {
    await page.locator('[data-journey-mode]').click();
    await settled(page);
    await board();
  }
  await page.locator(`[data-discovery-family="${family}"]`).click();
  await settled(page);
  await page.waitForFunction(
    (selected) =>
      (window.phase3cProof as unknown as KeepProof).state().record
        ?.selectedFamily === selected,
    family,
  );
}
/** Selection bootstraps storage before its session is busy: wait for the
 * selected badge's own settled state, not merely an idle session. */
async function badge(page: Page, index: 0 | 1) {
  await page.locator('[data-profile]').nth(index).click();
  await page.waitForFunction(
    (profile) => {
      const state = (window.phase3cProof as unknown as KeepProof).state();
      return (
        state.record?.profileId === profile &&
        !state.busy &&
        (state.saved || state.uncertain || state.error !== null)
      );
    },
    index === 0 ? 'SYNTHETIC-PLAYER-1' : 'SYNTHETIC-PLAYER-2',
  );
  await settled(page);
}

/** Two independent synthetic histories built through the real child surface. */
async function buildSourceWorld(page: Page, origin: string) {
  await open(page, origin);
  // Star: Greek, guided, legacy then growing world, helped/retried/worked
  // answers, two explicit sessions and an open saved worked-help context.
  await page.locator('[data-child-language="el-GR"]').click();
  await badge(page, 0);
  await discovery(page, 'number.addition');
  for (let index = 0; index < 4; index++) {
    if (index === 3) await help(page);
    await respond(page, legacyAnswer(await legacyTask(page)));
    await next(page);
  }
  await page.locator('[data-action="stop"]').click();
  await settled(page);
  await page.locator('[data-action="resume"]').click();
  await settled(page);
  await discovery(page, 'number.make-ten');
  await respond(page, chapterAnswer(await chapterTask(page)));
  await next(page);
  const retried = await chapterTask(page);
  await respond(page, chapterAnswer(retried) === 0 ? 1 : 0);
  await page.locator('[data-child-retry]').click();
  await respond(page, chapterAnswer(retried));
  await next(page);
  for (let tier = 0; tier < 3; tier++) await help(page);
  await respond(page, chapterAnswer(await chapterTask(page)));
  await next(page);
  await discovery(page, 'groups.equal');
  for (let tier = 0; tier < 3; tier++) await help(page);
  const openTask = await chapterTask(page);
  // Triangle: German, guided, original activities only, stopped session.
  await badge(page, 1);
  await page.locator('[data-child-language="de-DE"]').click();
  await settled(page);
  await discovery(page, 'measurement.unit-length');
  const first = await legacyTask(page);
  await respond(page, legacyAnswer(first) === 1 ? 2 : 1);
  await page.locator('[data-child-retry]').click();
  await respond(page, legacyAnswer(first));
  await next(page);
  for (let index = 0; index < 2; index++) {
    await respond(page, legacyAnswer(await legacyTask(page)));
    await next(page);
  }
  await discovery(page, 'number.counting');
  await page.locator('[data-action="stop"]').click();
  await settled(page);
  return { openTask };
}

async function makeBackup(page: Page, name: string) {
  await grownUps(page);
  await page.locator('[data-backup-action="prepare"]').click();
  await page.locator('[data-backup-state="ready"]').waitFor();
  const download = page.waitForEvent('download');
  await page.locator('[data-backup-save]').click();
  const saved = await download;
  expect(saved.suggestedFilename()).toBe(
    'math-adventure-synthetic-backup.json',
  );
  const path = resolve(directory, 'files', name);
  await saved.saveAs(path);
  await page.locator('[data-backup-state="requested"]').waitFor();
  return path;
}

async function waitRestore(page: Page) {
  await page.waitForFunction(() => {
    const status = document.querySelector<HTMLElement>('[data-restore-state]');
    const step = status?.dataset.restoreState ?? 'idle';
    return (
      !['reading', 'restoring', 'idle'].includes(step) &&
      !(
        step === 'preview' &&
        !document.querySelector('[data-restore-destination]')
      )
    );
  });
}
async function choose(page: Page, path: string) {
  await page.locator('[data-restore-file]').setInputFiles(path);
  await waitRestore(page);
}
async function act(page: Page, action: 'confirm' | 'recheck' | 'cancel') {
  await page.locator(`[data-restore-action="${action}"]`).click();
  await waitRestore(page);
}
const restoreState = (page: Page) =>
  page.locator('[data-restore-state]').getAttribute('data-restore-state');
const restoreReason = (page: Page) =>
  page.locator('[data-restore-state]').getAttribute('data-restore-reason');

describe('Keep my adventure — real served backup, restore and recovery', () => {
  it('exports a real file, restores it into a fresh subpath origin, reopens and continues with separate provenance', async () => {
    const [sourceOrigin, destinationOrigin] = [await server(), await server()];
    const page = await (await newContext()).newPage();
    const { openTask } = await buildSourceWorld(page, sourceOrigin.origin);
    const before = await rawWorld(page);
    const [starBefore, triangleBefore] = bySlot(before);
    if (!starBefore || !triangleBefore) throw new Error('source badges');
    expect(starBefore.payload.schema).toBe('growing-world-synthetic-loop-v2');
    expect(triangleBefore.payload.schema).toBe('phase3c-synthetic-loop-v1');
    expect(starBefore.payload.preferences).toEqual({
      uiLocale: 'el-GR',
      instructionLocale: 'el-GR',
      numberSpeechLocale: 'el-GR',
    });
    expect(triangleBefore.payload.preferences).toEqual({
      uiLocale: 'de-DE',
      instructionLocale: 'de-DE',
      numberSpeechLocale: 'de-DE',
    });
    const starDerived = starBefore.payload.derived as {
      concepts: Record<string, { attained: string }>;
    };
    // An existing accomplishment is present before backup.
    expect(
      Object.values(starDerived.concepts).some(
        (concept) => concept.attained !== 'Unseen',
      ),
    ).toBe(true);
    backupFile = await makeBackup(page, 'journey.json');
    const text = await readFile(backupFile, 'utf8');
    const file = JSON.parse(text) as Record<string, unknown>;
    // Independent canonical spelling, checksum and declared exclusions.
    expect(canonical(file)).toBe(text);
    const { checksum, ...body } = file;
    expect(checksum).toEqual({
      algorithm: 'sha-256',
      value: sha(canonical(body)),
    });
    const profiles = file.profiles as Record<string, unknown>[];
    expect(profiles.map(canonical)).toEqual([
      portable(starBefore.payload),
      portable(triangleBefore.payload),
    ]);
    for (const control of [
      'storageEpoch',
      'revision',
      '"pending"',
      'lastCompletion',
      '"derived"',
      'receipt',
      'recordId',
      'explorationCount',
      sourceOrigin.origin,
    ])
      expect(text).not.toContain(control);
    expect(await page.locator('[data-backup-state]').textContent()).not.toMatch(
      /safely|ασφαλώς|sicher gespeichert/i,
    );

    // Fresh disposable destination: another context, origin and subpath.
    const target = await (await newContext()).newPage();
    await open(target, destinationOrigin.origin, '/math-adventure/');
    await grownUps(target);
    expect((await rawWorld(target)).exists).toBe(false);
    await choose(target, backupFile);
    expect(await restoreState(target)).toBe('preview');
    await target.locator('[data-restore-destination="available"]').waitFor();
    // Preview shows validated contents and writes nothing.
    const preview = target.locator('[data-restore-preview]');
    expect(await preview.locator('[data-backup-profile]').count()).toBe(2);
    const count = (profile: string, key: string) =>
      preview
        .locator(
          `[data-backup-profile="${profile}"] [data-backup-count="${key}"]`,
        )
        .textContent();
    expect(await count('SYNTHETIC-PLAYER-1', 'worked')).toBe('1');
    expect(await count('SYNTHETIC-PLAYER-1', 'help')).toBe('2');
    expect(await count('SYNTHETIC-PLAYER-2', 'not-yet')).toBe('1');
    expect((await rawWorld(target)).exists).toBe(false);
    await act(target, 'cancel');
    expect(await restoreState(target)).toBe('cancelled');
    expect((await rawWorld(target)).exists).toBe(false);
    await choose(target, backupFile);
    await act(target, 'confirm');
    expect(await restoreState(target)).toBe('restored');
    const after = await rawWorld(target);
    const [starAfter, triangleAfter] = bySlot(after);
    if (!starAfter || !triangleAfter) throw new Error('restored badges');
    // Portable meaning and reconstructed derived state are exactly preserved.
    for (const [restored, original] of [
      [starAfter, starBefore],
      [triangleAfter, triangleBefore],
    ] as const) {
      expect(restored.recordId).toBe(original.recordId);
      expect(portable(restored.payload)).toBe(portable(original.payload));
      expect(canonical(restored.payload.derived)).toBe(
        canonical(original.payload.derived),
      );
      expect(restored.payload.pending).toBeNull();
      expect(restored.payload.lastCompletion).toBeNull();
      expect(restored.revision).toBe(1);
    }
    expect(starBefore.payload.lastCompletion).not.toBeNull();
    // Destination control metadata is its own: revisions and fresh receipts.
    expect(starBefore.revision).toBeGreaterThan(10);
    expect(after.control?.storageEpoch).toBe(0);
    expect(after.receipts).toHaveLength(2);
    expect(
      after.receipts.every(
        (id) =>
          id.startsWith('synthetic-restore-') && !before.receipts.includes(id),
      ),
    ).toBe(true);
    observations.journey = {
      sourceSchemas: [starBefore.payload.schema, triangleBefore.payload.schema],
      sourceRevisions: [starBefore.revision, triangleBefore.revision],
      destinationRevisions: [starAfter.revision, triangleAfter.revision],
      sourceReceipts: before.receipts.length,
      destinationReceipts: after.receipts.length,
      fileBytes: Buffer.byteLength(text),
      fileSha256: sha(text),
      destinationPath: '/math-adventure/',
    };

    // Reopen the restored destination and continue each badge separately.
    await target.reload();
    await shellReady(target);
    await childView(target);
    await badge(target, 0);
    expect(await target.evaluate(() => document.documentElement.lang)).toBe(
      'el-GR',
    );
    const continued = await chapterTask(target);
    expect(continued.replay).toEqual(openTask.replay);
    expect(
      await target
        .locator('[data-chapter-family]')
        .getAttribute('data-child-hint-tier'),
    ).toBe('3');
    await respond(target, chapterAnswer(continued));
    const starNow = bySlot(await rawWorld(target))[0];
    const events = starNow?.payload.chapterEvents as {
      mathematicalHintTier: number;
      solutionExposed: boolean;
      correct: boolean;
    }[];
    // The worked help saved before backup still qualifies the answer.
    expect(events.at(-1)).toMatchObject({
      correct: true,
      mathematicalHintTier: 3,
      solutionExposed: true,
    });
    expect(starNow?.revision).toBe(3);
    expect(starNow?.payload.completedCount).toBe(
      (starBefore.payload.completedCount as number) + 1,
    );
    await badge(target, 1);
    expect(await target.evaluate(() => document.documentElement.lang)).toBe(
      'de-DE',
    );
    await target.locator('[data-action="resume"]').click();
    await settled(target);
    await discovery(target, 'measurement.unit-length');
    await respond(target, legacyAnswer(await legacyTask(target)));
    const triangleNow = bySlot(await rawWorld(target))[1];
    if (!triangleNow) throw new Error('continued triangle');
    expect(triangleNow.payload.schema).toBe('phase3c-synthetic-loop-v1');
    expect(triangleNow.payload.sessionOrdinal).toBe(2);
    expect(triangleNow.payload.preferences).toEqual(
      triangleBefore.payload.preferences,
    );
    const oldEvents = triangleBefore.payload.events as unknown[];
    expect(
      (triangleNow.payload.events as unknown[]).slice(0, oldEvents.length),
    ).toEqual(oldEvents);
    expect('chapterSupport' in triangleNow.payload).toBe(false);
    // The source keeps its own separate state.
    expect(canonical(await rawWorld(page))).toBe(canonical(before));
  }, 300_000);

  it('refuses damaged, malformed, future, incompatible and oversized files without creating storage', async () => {
    expect(backupFile).not.toBe('');
    const text = await readFile(backupFile, 'utf8');
    const rewrite = (edit: (data: Record<string, unknown>) => void) => {
      const data = JSON.parse(text) as Record<string, unknown>;
      delete data.checksum;
      edit(data);
      return canonical({
        ...data,
        checksum: { algorithm: 'sha-256', value: sha(canonical(data)) },
      });
    };
    const variants: [string, string, string][] = [
      [
        'corrupted',
        text.replace('"mode":"synthetic-policy"', '"mode":"synthetic-policx"'),
        'damaged',
      ],
      ['truncated', text.slice(0, Math.floor(text.length * 0.6)), 'damaged'],
      [
        'malformed',
        '{"format":"math-adventure-synthetic-backup",',
        'not_backup',
      ],
      ['unrelated', 'Plain notes, not a backup.', 'not_backup'],
      ['future', rewrite((data) => (data.formatVersion = 2)), 'newer_version'],
      [
        'incompatible',
        rewrite((data) => {
          (data.compatibility as Record<string, unknown>).invitationPolicy =
            'growing-world-invitations-v2';
        }),
        'incompatible',
      ],
      [
        'extra-field',
        rewrite((data) => {
          const profiles = data.profiles as Record<string, unknown>[];
          (profiles[0] as Record<string, unknown>).exploration = [{ tiles: 3 }];
        }),
        'invalid_contents',
      ],
      ['deep', `${'['.repeat(5000)}${']'.repeat(5000)}`, 'not_backup'],
      ['oversized', ' '.repeat(1_048_577), 'too_large'],
    ];
    const origin = await server();
    const page = await (await newContext()).newPage();
    await open(page, origin.origin, '/math-adventure/');
    await grownUps(page);
    for (const [name, content, expected] of variants) {
      const path = resolve(directory, 'files', `${name}.json`);
      await writeFile(path, content);
      await choose(page, path);
      expect(
        await page
          .locator('[data-restore-state]')
          .getAttribute('data-restore-refusal'),
        name,
      ).toBe(expected);
      expect(await restoreState(page)).toBe('refused');
      expect(
        await page.locator('[data-restore-action="confirm"]').count(),
      ).toBe(0);
    }
    expect((await rawWorld(page)).exists).toBe(false);
    observations.refusals = variants.map(([name, , expected]) => ({
      name,
      expected,
    }));
  }, 120_000);

  it('repeated import and a nonempty destination are refused with existing data byte-identical', async () => {
    const origin = await server();
    const page = await (await newContext()).newPage();
    await open(page, origin.origin);
    await grownUps(page);
    await choose(page, backupFile);
    await act(page, 'confirm');
    expect(await restoreState(page)).toBe('restored');
    const restored = await rawWorld(page);
    // Choosing the same backup again is a preview of an occupied place.
    await choose(page, backupFile);
    await page.locator('[data-restore-destination="occupied"]').waitFor();
    expect(await page.locator('[data-restore-action="confirm"]').count()).toBe(
      0,
    );
    expect(canonical(await rawWorld(page))).toBe(canonical(restored));
    // A fresh context with one existing badge is refused unchanged too.
    const fresh = await (await newContext()).newPage();
    await open(fresh, origin.origin);
    await badge(fresh, 1);
    await grownUps(fresh);
    const one = await rawWorld(fresh);
    expect(one.records).toHaveLength(1);
    await choose(fresh, backupFile);
    await fresh.locator('[data-restore-destination="occupied"]').waitFor();
    expect(canonical(await rawWorld(fresh))).toBe(canonical(one));
    observations.repeated = { secondImport: 'occupied', oneBadge: 'occupied' };
  }, 120_000);

  it('rolls back injected abort/quota, a native request error and controlled native quota, then the same file restores', async () => {
    const origin = await server();
    const page = await (await newContext()).newPage();
    await open(page, origin.origin);
    await grownUps(page);
    // Unsaved play open in this window: a failed restore must keep it; only a
    // verified restore closes it. Saving off creates no storage.
    await page
      .locator(
        'section[aria-labelledby="profiles-heading"] input[type=checkbox]',
      )
      .uncheck();
    await page.locator('[data-profile="SYNTHETIC-PLAYER-1"]').click();
    await settled(page);
    const openBadge = () =>
      page.evaluate(() => {
        const state = (window.phase3cProof as unknown as KeepProof).state();
        return { profile: state.record?.profileId ?? null, saved: state.saved };
      });
    expect(await openBadge()).toEqual({
      profile: 'SYNTHETIC-PLAYER-1',
      saved: false,
    });
    expect((await rawWorld(page)).exists).toBe(false);
    await choose(page, backupFile);
    const reasons: Record<string, string | null> = {};
    // 'write' is a genuine engine-aborted transaction from a native
    // ConstraintError after the restore rows were queued.
    for (const fault of ['abort', 'quota', 'write'] as const) {
      await page.evaluate(
        (value) => (window.phase3cProof as unknown as KeepProof).fault(value),
        fault,
      );
      if ((await restoreState(page)) !== 'preview') await act(page, 'recheck');
      await page.locator('[data-restore-destination="available"]').waitFor();
      await act(page, 'confirm');
      expect(await restoreState(page)).toBe('not-restored');
      reasons[fault] = await restoreReason(page);
      expect(reasons[fault]).toBe(fault === 'quota' ? 'quota' : 'unavailable');
      const world = await rawWorld(page);
      expect(world.records).toHaveLength(0);
      expect(world.receipts).toHaveLength(0);
      expect(world.control?.storageEpoch).toBe(0);
      expect((await openBadge()).profile).toBe('SYNTHETIC-PLAYER-1');
    }
    await page.evaluate(() =>
      (window.phase3cProof as unknown as KeepProof).fault(undefined),
    );
    await act(page, 'recheck');
    await act(page, 'confirm');
    expect(await restoreState(page)).toBe('restored');
    expect((await rawWorld(page)).records).toHaveLength(2);
    expect((await openBadge()).profile).toBeNull();

    // Controlled engine quota condition, not natural exhaustion. Ephemeral
    // contexts ignore the override and Chrome caches an origin's quota after
    // its first read-write transaction, so a throwaway persistent profile is
    // bootstrapped, relaunched, and only then limited. Service workers are
    // blocked there so shell caching cannot consume the override first.
    const quotaOrigin = await server();
    const profile = resolve(directory, 'quota-profile');
    await rm(profile, { recursive: true, force: true });
    const launch = async () => {
      const persistent = await chromium.launchPersistentContext(profile, {
        channel,
        headless: true,
        serviceWorkers: 'block',
        viewport: { width: 1000, height: 850 },
      });
      persistent.on('page', (opened) =>
        opened.on('pageerror', () => pageErrors++),
      );
      await persistent.route('**/*', async (route) =>
        allowedOrigins.has(new URL(route.request().url()).origin)
          ? route.continue()
          : route.abort('blockedbyclient'),
      );
      const native = await persistent.newPage();
      expect((await native.goto(`${quotaOrigin.origin}/`))?.status()).toBe(200);
      await native.waitForFunction(() => !!window.phase3cProof);
      await grownUps(native);
      await choose(native, backupFile);
      return { persistent, native };
    };
    try {
      let { persistent, native } = await launch();
      // Bootstrap the empty owned database without learner rows.
      await native.evaluate(() =>
        (window.phase3cProof as unknown as KeepProof).fault('abort'),
      );
      await act(native, 'confirm');
      const empty = await rawWorld(native);
      expect(empty.exists).toBe(true);
      expect(empty.records).toHaveLength(0);
      await persistent.close();
      ({ persistent, native } = await launch());
      const cdp = await persistent.newCDPSession(native);
      await cdp.send('Storage.overrideQuotaForOrigin', {
        origin: quotaOrigin.origin,
        quotaSize: 1,
      });
      await act(native, 'confirm');
      expect(await restoreState(native)).toBe('not-restored');
      reasons.nativeQuota = await restoreReason(native);
      expect(reasons.nativeQuota).toBe('quota');
      expect(canonical(await rawWorld(native))).toBe(canonical(empty));
      await cdp.send('Storage.overrideQuotaForOrigin', {
        origin: quotaOrigin.origin,
      });
      await act(native, 'recheck');
      await act(native, 'confirm');
      expect(await restoreState(native)).toBe('restored');
      expect((await rawWorld(native)).records).toHaveLength(2);
      await persistent.close();
    } finally {
      await rm(profile, { recursive: true, force: true });
    }
    observations.failures = {
      reasons,
      nativeQuota:
        'CDP Storage.overrideQuotaForOrigin(1 byte) after relaunching a disposable persistent profile; service workers blocked',
    };
  }, 180_000);

  it('a create after preview, a deletion while confirmation waits and a stale writer cannot overwrite, merge or resurrect', async () => {
    const origin = await server();
    const context = await newContext();
    const restorer = await context.newPage();
    const other = await context.newPage();
    await open(restorer, origin.origin);
    await open(other, origin.origin);
    await grownUps(restorer);
    await choose(restorer, backupFile);
    await restorer.locator('[data-restore-destination="available"]').waitFor();
    // Another window creates a badge after the preview: restore refuses.
    await badge(other, 0);
    const created = await rawWorld(other);
    await act(restorer, 'confirm');
    expect(await restoreState(restorer)).toBe('not-restored');
    expect(await restoreReason(restorer)).toBe('occupied');
    expect(canonical(await rawWorld(other))).toBe(canonical(created));

    // Deletion during a held restore advances the fence: nothing restored.
    await grownUps(other);
    await deleteOpenBadge(other);
    expect((await rawWorld(other)).records).toHaveLength(0);
    await act(restorer, 'recheck');
    await restorer.locator('[data-restore-destination="available"]').waitFor();
    await restorer.evaluate(() =>
      (window.phase3cProof as unknown as KeepProof).holdRestore(true),
    );
    await restorer.locator('[data-restore-action="confirm"]').click();
    await restorer.waitForFunction(
      () => (window.phase3cProof as unknown as KeepProof).restoreHeld() === 1,
    );
    await childView(other);
    await badge(other, 1);
    await grownUps(other);
    await deleteOpenBadge(other);
    const fenced = await rawWorld(other);
    expect(fenced.records).toHaveLength(0);
    await restorer.evaluate(() =>
      (window.phase3cProof as unknown as KeepProof).holdRestore(false),
    );
    await waitRestore(restorer);
    expect(await restoreState(restorer)).toBe('not-restored');
    expect(await restoreReason(restorer)).toBe('changed');
    expect(canonical(await rawWorld(restorer))).toBe(canonical(fenced));

    // A stale writer from before a deletion cannot overwrite restored data.
    await childView(other);
    await badge(other, 0);
    await discovery(other, 'number.addition', false);
    const stale = await context.newPage();
    await open(stale, origin.origin);
    await grownUps(stale);
    await stale.locator('[data-profile="SYNTHETIC-PLAYER-1"]').click();
    await settled(stale);
    await deleteOpenBadge(stale);
    await act(restorer, 'recheck');
    await restorer.locator('[data-restore-destination="available"]').waitFor();
    await act(restorer, 'confirm');
    expect(await restoreState(restorer)).toBe('restored');
    const restored = await rawWorld(restorer);
    // `other` still holds its pre-deletion badge; its answer must not write.
    await other.locator('[data-child-answer]').first().click();
    await settled(other);
    expect(
      await other.evaluate(
        () => (window.phase3cProof as unknown as KeepProof).state().error,
      ),
    ).toBe('epoch_conflict');
    expect(canonical(await rawWorld(restorer))).toBe(canonical(restored));
    observations.concurrency = {
      createdAfterPreview: 'occupied',
      deletionDuringRestore: 'changed',
      staleWriter: 'epoch_conflict',
      restoredEpoch: restored.control?.storageEpoch,
    };
  }, 180_000);

  it('a lost commit report and a change between commit and readback are reported truthfully', async () => {
    const origin = await server();
    // A lost report: the readback finds the exact restore, so it is restored.
    const first = await (await newContext()).newPage();
    await open(first, origin.origin);
    await grownUps(first);
    await choose(first, backupFile);
    await first.evaluate(() =>
      (window.phase3cProof as unknown as KeepProof).loseRestoreReport(true),
    );
    await act(first, 'confirm');
    await first.evaluate(() =>
      (window.phase3cProof as unknown as KeepProof).loseRestoreReport(false),
    );
    expect(await restoreState(first)).toBe('restored');
    expect(bySlot(await rawWorld(first)).map((row) => row.revision)).toEqual([
      1, 1,
    ]);
    // A change after commit but before readback is never called nothing.
    const context = await newContext();
    const restorer = await context.newPage();
    const other = await context.newPage();
    await open(restorer, origin.origin);
    await open(other, origin.origin);
    await grownUps(restorer);
    await choose(restorer, backupFile);
    await restorer.evaluate(() =>
      (window.phase3cProof as unknown as KeepProof).holdReadback(true),
    );
    await restorer.locator('[data-restore-action="confirm"]').click();
    await restorer.waitForFunction(
      () => (window.phase3cProof as unknown as KeepProof).readbackHeld() === 1,
    );
    await badge(other, 0);
    await respond(other, chapterAnswer(await chapterTask(other)));
    await restorer.evaluate(() =>
      (window.phase3cProof as unknown as KeepProof).holdReadback(false),
    );
    await waitRestore(restorer);
    expect(await restoreState(restorer)).toBe('not-restored');
    expect(await restoreReason(restorer)).toBe('differs');
    const status = await restorer.locator('[data-restore-state]').textContent();
    expect(status).not.toMatch(/Nothing was restored|nichts wiederhergestellt/);
    expect(status).not.toMatch(/Δεν έγινε επαναφορά/);
    const world = bySlot(await rawWorld(restorer));
    // The restore did commit; only the other window's answer followed it.
    expect(world.map((row) => row.revision)).toEqual([3, 1]);
    observations.ambiguity = {
      lostReport: 'restored by exact readback',
      changedBeforeReadback: 'differs; restored rows present',
    };
  }, 180_000);

  it('excludes an answer still saving from the backup and never replays it in the restored copy', async () => {
    const [sourceOrigin, targetOrigin] = [await server(), await server()];
    const page = await (await newContext()).newPage();
    await open(page, sourceOrigin.origin);
    await badge(page, 0);
    await discovery(page, 'number.addition');
    await page.evaluate(() =>
      (window.phase3cProof as unknown as KeepProof).holdWrites(true),
    );
    const value = legacyAnswer(await legacyTask(page));
    await page.locator(`[data-child-answer="${value}"]`).click();
    await page.waitForFunction(
      () => (window.phase3cProof as unknown as KeepProof).held() === 1,
    );
    // Release staging, then fail the separately atomic final completion.
    await page.evaluate(() => {
      const keep = window.phase3cProof as unknown as KeepProof;
      keep.holdWrites(false);
      keep.holdWrites(true);
    });
    await page.waitForFunction(() => {
      const keep = window.phase3cProof as unknown as KeepProof;
      return keep.held() === 1 && keep.state().record?.pending !== null;
    });
    await page.evaluate(() => {
      const keep = window.phase3cProof as unknown as KeepProof;
      keep.fault('abort');
      keep.holdWrites(false);
    });
    await settled(page);
    await page.evaluate(() =>
      (window.phase3cProof as unknown as KeepProof).fault(undefined),
    );
    const source = await rawWorld(page);
    const sourceStar = source.records[0];
    expect(sourceStar?.payload.pending).not.toBeNull();
    const path = await makeBackup(page, 'pending.json');
    expect(
      await page
        .locator('[data-backup-pending-excluded]')
        .getAttribute('data-backup-pending-excluded'),
    ).toBe('1');
    const text = await readFile(path, 'utf8');
    expect(text).not.toContain('"pending"');
    const target = await (await newContext()).newPage();
    await open(target, targetOrigin.origin, '/math-adventure/');
    await grownUps(target);
    await choose(target, path);
    await act(target, 'confirm');
    expect(await restoreState(target)).toBe('restored');
    const restored = (await rawWorld(target)).records[0];
    expect(restored?.payload.pending).toBeNull();
    expect(restored?.payload.completedCount).toBe(
      sourceStar?.payload.completedCount,
    );
    expect(restored && portable(restored.payload)).toBe(
      sourceStar && portable(sourceStar.payload),
    );
    // The source keeps its own pending answer for its existing retry path.
    expect(canonical(await rawWorld(page))).toBe(canonical(source));
    observations.pending = { excluded: 1, restoredPending: null };
  }, 120_000);

  it('backs up and restores in browser-controlled offline mode after verified caching', async () => {
    const [sourceOrigin, targetOrigin] = [await server(), await server()];
    const context = await newContext();
    const page = await context.newPage();
    await open(page, sourceOrigin.origin, '/math-adventure/');
    await badge(page, 0);
    await discovery(page, 'number.addition');
    await respond(page, legacyAnswer(await legacyTask(page)));
    const target = await (await newContext()).newPage();
    await open(target, targetOrigin.origin);
    await context.setOffline(true);
    await target.context().setOffline(true);
    await page.reload();
    await shellReady(page);
    await target.reload();
    await shellReady(target);
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
    const path = await makeBackup(page, 'offline.json');
    await grownUps(target);
    await choose(target, path);
    await act(target, 'confirm');
    expect(await restoreState(target)).toBe('restored');
    await childView(target);
    await badge(target, 0);
    await respond(target, legacyAnswer(await legacyTask(target)));
    const continued = bySlot(await rawWorld(target))[0];
    expect(continued?.revision).toBe(3);
    expect(await target.evaluate(() => navigator.onLine)).toBe(false);
    observations.offline = {
      mechanism: 'BrowserContext.setOffline after verified cached shell',
      source: '/math-adventure/',
      destination: '/',
    };
  }, 120_000);

  it('adult controls are keyboard operable and reflow at 320px with doubled text in all three drafts', async () => {
    const results: Record<string, unknown>[] = [];
    for (const locale of locales) {
      const origin = await server();
      const page = await (await newContext(320, 850)).newPage();
      await open(page, origin.origin);
      await page.locator(`[data-child-language="${locale}"]`).click();
      await grownUps(page);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      const panel = page.locator('[data-backup-restore]');
      // Keyboard-only restore: file chooser, preview focus, confirm.
      const chooser = page.waitForEvent('filechooser');
      await page.locator('[data-restore-file]').focus();
      await page.keyboard.press('Space');
      await (await chooser).setFiles(backupFile);
      await waitRestore(page);
      expect(await page.evaluate(() => document.activeElement?.id)).toBe(
        'restore-preview-heading',
      );
      await page.screenshot({
        path: resolve(directory, 'screens', `${locale}-preview.png`),
        fullPage: true,
      });
      let reached = false;
      for (let step = 0; step < 40 && !reached; step++) {
        await page.keyboard.press('Tab');
        reached = await page.evaluate(
          () =>
            document.activeElement?.getAttribute('data-restore-action') ===
            'confirm',
        );
      }
      expect(reached).toBe(true);
      await page.keyboard.press('Enter');
      await waitRestore(page);
      expect(await restoreState(page)).toBe('restored');
      expect(
        await page.evaluate(() =>
          document.activeElement?.hasAttribute('data-restore-state'),
        ),
      ).toBe(true);
      // Keyboard-only backup: prepare, then the save link receives focus.
      await page.locator('[data-backup-action="prepare"]').focus();
      await page.keyboard.press('Enter');
      await page.locator('[data-backup-state="ready"]').waitFor();
      expect(
        await page.evaluate(() =>
          document.activeElement?.hasAttribute('data-backup-save'),
        ),
      ).toBe(true);
      const download = page.waitForEvent('download');
      await page.keyboard.press('Enter');
      await download;
      await page.locator('[data-backup-state="requested"]').waitFor();
      await page.screenshot({
        path: resolve(directory, 'screens', `${locale}-backup.png`),
        fullPage: true,
      });
      const layout = await panel.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const controls = [
          ...element.querySelectorAll<HTMLElement>(
            'button, a[href], input[type="file"]',
          ),
        ].map((control) => {
          const rect = control.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });
        const luminance = (rgb: string) => {
          const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? []).map(Number);
          const channel = (value = 0) => {
            const scaled = value / 255;
            return scaled <= 0.03928
              ? scaled / 12.92
              : ((scaled + 0.055) / 1.055) ** 2.4;
          };
          return (
            0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
          );
        };
        const ratio = (text: Element, background: Element) => {
          const a = luminance(getComputedStyle(text).color);
          const b = luminance(getComputedStyle(background).backgroundColor);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        };
        const link = element.querySelector('[data-backup-save]');
        const term = element.querySelector('dt');
        // Words wider than their own line must split; recorded, not hidden.
        let words = 0;
        const oversized = new Set<string>();
        for (const block of element.querySelectorAll<HTMLElement>(
          'h2, h3, h4, h5, p, li, dt, dd',
        )) {
          for (const word of (block.textContent ?? '').split(/\s+/)) {
            if (!word) continue;
            words += 1;
            const probe = document.createElement('span');
            probe.textContent = word;
            probe.style.whiteSpace = 'nowrap';
            block.append(probe);
            if (probe.getBoundingClientRect().width > block.clientWidth + 0.5)
              oversized.add(word);
            probe.remove();
          }
        }
        return {
          words,
          oversizedWords: [...oversized],
          overflow: element.scrollWidth - element.clientWidth,
          right: box.right,
          viewport: window.innerWidth,
          rootFont: getComputedStyle(document.documentElement).fontSize,
          smallestTarget: Math.min(
            ...controls.map((item) => Math.min(item.width, item.height)),
          ),
          contrast: {
            body: ratio(element, element),
            term: term ? ratio(term, element) : null,
            saveLink: link ? ratio(link, link) : null,
          },
        };
      });
      expect(layout.overflow).toBeLessThanOrEqual(0);
      expect(layout.right).toBeLessThanOrEqual(layout.viewport);
      expect(layout.rootFont).toBe('32px');
      expect(layout.smallestTarget).toBeGreaterThanOrEqual(44);
      for (const value of Object.values(layout.contrast))
        if (value !== null) expect(value).toBeGreaterThanOrEqual(4.5);
      expect(await page.evaluate(() => document.documentElement.lang)).toBe(
        locale,
      );
      results.push({ locale, ...layout });
    }
    observations.adultUi = results;
  }, 240_000);
});
