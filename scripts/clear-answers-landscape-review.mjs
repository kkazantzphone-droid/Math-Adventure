// Focused short-landscape/large-text proof over the immutable production build.
/* global window, document, innerWidth, innerHeight, getComputedStyle, requestAnimationFrame */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { startProofServer } from './browser-proof/server.mjs';

assert.equal(process.env.NODE_ENV, 'production');
assert.equal(
  process.versions.node,
  (await readFile('.node-version', 'utf8')).trim(),
);
const site = resolve('.cache/clear-answers-production/site');
const ui = JSON.parse(
  await readFile(
    '.cache/growing-world-production-review/automated-review.json',
    'utf8',
  ),
);
const ownSource = 'scripts/clear-answers-landscape-review.mjs';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function artifacts(directory, base = directory) {
  const values = await Promise.all(
    (await readdir(directory, { withFileTypes: true })).map(async (entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory()
        ? Object.entries(await artifacts(path, base))
        : [
            [
              relative(base, path).replaceAll('\\', '/'),
              digest(await readFile(path)),
            ],
          ];
    }),
  );
  return Object.fromEntries(
    values.flat().sort(([a], [b]) => a.localeCompare(b)),
  );
}
async function sourceHashes() {
  return Object.fromEntries(
    await Promise.all(
      [...new Set([...Object.keys(ui.sourceHashes), ownSource])]
        .sort()
        .map(async (path) => [path, digest(await readFile(path))]),
    ),
  );
}
const initialSources = await sourceHashes();
for (const [path, hash] of Object.entries(ui.sourceHashes))
  assert.equal(
    initialSources[path],
    hash,
    `Current source differs from final UI: ${path}`,
  );
const initialArtifacts = await artifacts(site);
assert.deepEqual(
  initialArtifacts,
  ui.artifactHashes,
  'Use the same immutable production candidate as final UI',
);
const server = await startProofServer({
  distDirectory: site,
  fixtureDirectory: resolve('tests/e2e/fixtures'),
});
const receipt = {
  schema: 'math-adventure.clear-answers-landscape-text-review-v1',
  marker: 'synthetic-only',
  date: '2026-10-18',
  result: 'PENDING',
  renderer:
    'Existing installed Chrome/Edge and proof server; NODE_ENV=production; immutable existing production site; no build or fixture injection',
  condition: { width: 850, height: 375, rootFontPixels: 32 },
  sourceHashes: initialSources,
  artifactHashes: initialArtifacts,
  sourcesStable: false,
  artifactsStable: false,
  externalRequests: 0,
  pageErrors: 0,
  cases: [],
  limits: [
    'Deliberate CSS text enlargement, not native zoom.',
    'Vertical scrolling is allowed. Focused controls must fit the viewport; the whole task/help/response need not fit simultaneously.',
    'No native-select popup/actual assistive-technology delivery, physical disconnection, native-language, educational-effectiveness or owner UX acceptance claim.',
  ],
};
let stage = 'startup';
let currentCase = null;
async function settled(page) {
  await page.waitForFunction(
    () =>
      !window.phase3cProof.state().busy &&
      !window.phase3cProof.offline()?.frozen,
  );
  await page.evaluate(
    () =>
      new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      ),
  );
}
async function activate(page, selector) {
  await page.locator(selector).focus();
  await page.keyboard.press('Enter');
  await settled(page);
}
async function focus(page, selector) {
  const box = await page.locator(selector).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      focused: node === document.activeElement,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    };
  });
  assert.equal(box.focused, true, `Expected focus: ${selector}`);
  assert.ok(
    box.left >= 0 &&
      box.right <= box.viewportWidth + 1 &&
      box.top >= 0 &&
      box.bottom <= box.viewportHeight + 1,
    `Focused target must fit the viewport: ${selector}`,
  );
  return { selector, ...box };
}
async function layout(page) {
  const measured = await page.evaluate(() => {
    const chapter = document.querySelector('[data-chapter-family]');
    const painted = (node) => {
      if (!node.checkVisibility()) return false;
      const closed = node.closest('details:not([open])');
      const summary = closed?.querySelector(':scope > summary');
      return !closed || node === summary || summary?.contains(node);
    };
    const controls = [
      ...chapter.querySelectorAll('button, select, summary'),
    ].filter(painted);
    const targets = controls.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        element: node.tagName.toLowerCase(),
        width: rect.width,
        height: rect.height,
        font: Number.parseFloat(getComputedStyle(node).fontSize),
        clipped:
          node.scrollWidth > node.clientWidth + 1 ||
          node.scrollHeight > node.clientHeight + 1,
        horizontalOverflow: rect.left < 0 || rect.right > innerWidth + 1,
      };
    });
    return {
      pageHeight: document.documentElement.scrollHeight,
      pageWidth: document.documentElement.scrollWidth,
      answerRegionHeight: chapter
        .querySelector('[data-answer-entry]')
        .getBoundingClientRect().height,
      targets,
      paintedDirectAnswers: [
        ...chapter.querySelectorAll('[data-child-answer]'),
      ].filter(painted).length,
    };
  });
  assert.ok(measured.pageWidth <= 850);
  for (const target of measured.targets) {
    assert.ok(
      target.width >= 44 && target.height >= 44 && target.font >= 32,
      'Readable child target dimensions/font',
    );
    assert.equal(target.clipped, false, 'No clipped control');
    assert.equal(target.horizontalOverflow, false, 'No horizontal overflow');
  }
  return measured;
}
const publicTask = (page) =>
  page.evaluate(() => window.phase3cProof.chapterTask());
const snapshot = (page) =>
  page.evaluate(() => window.phase3cProof.state().snapshot);
const solution = (task) =>
  task.kind === 'equalGroups'
    ? task.groups * task.each
    : task.kind === 'arrayArea'
      ? task.rows * task.columns
      : task.total - task.known;
try {
  for (const channel of ['chrome', 'msedge']) {
    const browser = await chromium.launch({
      channel,
      headless: true,
      timeout: 15000,
    });
    try {
      for (const locale of ['el-GR', 'en-GB', 'de-DE'])
        for (const family of [
          'groups.equal',
          'measurement.array-area',
          'number.part-whole',
        ]) {
          currentCase = { channel, locale, family };
          const context = await browser.newContext({
            viewport: { width: 850, height: 375 },
            reducedMotion: 'reduce',
            acceptDownloads: false,
          });
          context.on('request', (request) => {
            if (new URL(request.url()).origin !== server.origin)
              receipt.externalRequests++;
          });
          await context.route('**/*', (route) =>
            new URL(route.request().url()).origin === server.origin
              ? route.continue()
              : route.abort('blockedbyclient'),
          );
          const page = await context.newPage();
          page.on('pageerror', () => receipt.pageErrors++);
          try {
            stage = 'real cached-shell startup';
            assert.equal((await page.goto(server.origin))?.status(), 200);
            await page.waitForFunction(
              () => window.phase3cProof?.offline()?.shell === 'ready',
            );
            await page.locator(`[data-child-language="${locale}"]`).click();
            await page.locator('[data-profile]').first().click();
            await page.waitForFunction(
              () =>
                !!window.phase3cProof.state().record &&
                !window.phase3cProof.state().busy,
            );
            await page.locator('[data-action="discoveries"]').click();
            await activate(page, '[data-journey-mode]');
            await page.locator(`[data-discovery-family="${family}"]`).click();
            await settled(page);
            let presentation = await publicTask(page);
            let choices = 1;
            const maximal = (task) =>
              task.representation === 'concrete' &&
              (task.kind === 'missingPart'
                ? task.total === 20
                : solution(task) === 25);
            while (!maximal(presentation.task) && choices < 256) {
              await page.locator('[data-action="discoveries"]').click();
              await page.locator(`[data-discovery-family="${family}"]`).click();
              await settled(page);
              presentation = await publicTask(page);
              choices++;
            }
            assert.ok(
              maximal(presentation.task),
              'Maximal concrete task reached through explicit activity choice',
            );
            const before = await snapshot(page);
            assert.equal(before.payload.completedCount, 0);
            assert.equal(before.payload.events.length, 0);
            assert.equal(before.payload.chapterEvents.length, 0);
            await page.evaluate(() => {
              document.documentElement.style.fontSize = '32px';
            });
            stage = 'large-text layout and native disclosure';
            const collapsed = await layout(page);
            assert.equal(collapsed.paintedDirectAnswers, 0);
            await activate(page, '[data-direct-answers] summary');
            const summaryFocus = await focus(
              page,
              '[data-direct-answers] summary',
            );
            const expanded = await layout(page);
            assert.equal(
              expanded.paintedDirectAnswers,
              family === 'number.part-whole' ? 21 : 26,
            );
            await page.keyboard.press('Tab');
            const directFocus = await focus(page, '[data-child-answer="0"]');
            await activate(page, '[data-direct-answers] summary');
            assert.deepEqual(
              await snapshot(page),
              before,
              'Disclosure and focus do not assess',
            );
            stage = 'native keyboard wrong response and retry';
            await page.locator('[data-answer-select]').focus();
            await page.keyboard.press('Home');
            await page.keyboard.press('ArrowDown');
            assert.equal(
              await page.locator('[data-answer-select]').inputValue(),
              '0',
            );
            assert.deepEqual(
              await snapshot(page),
              before,
              'Choosing a response does not assess',
            );
            const responseFocus = await focus(page, '[data-answer-select]');
            await page.keyboard.press('Tab');
            const submitFocus = await focus(page, '[data-answer-submit]');
            await page.keyboard.press('Enter');
            await page.waitForFunction(
              () =>
                window.phase3cProof.state().record?.lastCompletion?.correct ===
                false,
            );
            await settled(page);
            const retryFocus = await focus(page, '[data-child-retry]');
            assert.ok(
              (await page.locator('#slice-feedback').textContent()).trim(),
            );
            await activate(page, '[data-child-retry]');
            const headingFocus = await focus(page, '#slice-task-heading');
            stage = 'native keyboard correct response and continuation';
            const beforeCorrect = await snapshot(page);
            await page.locator('[data-answer-select]').focus();
            await page.keyboard.press('Home');
            for (let index = 0; index <= solution(presentation.task); index++)
              await page.keyboard.press('ArrowDown');
            assert.equal(
              await page.locator('[data-answer-select]').inputValue(),
              String(solution(presentation.task)),
            );
            assert.deepEqual(await snapshot(page), beforeCorrect);
            await page.keyboard.press('Tab');
            await page.keyboard.press('Enter');
            await page.waitForFunction(
              () =>
                window.phase3cProof.state().record?.lastCompletion?.correct ===
                true,
            );
            await settled(page);
            const nextFocus = await focus(page, '[data-action="next"]');
            const after = await snapshot(page);
            assert.equal(after.payload.chapterEvents.length, 2);
            assert.equal(
              after.payload.chapterEvents.at(-1).meaningfulAttempts,
              2,
            );
            const completed = await layout(page);
            receipt.cases.push({
              ...currentCase,
              browserVersion: browser.version(),
              replay: presentation.replay,
              task: presentation.task,
              explicitChoicesToReachMaximalTask: choices,
              zeroAssessmentsBeforeLayout: true,
              collapsed,
              expanded,
              completed,
              focus: [
                summaryFocus,
                directFocus,
                responseFocus,
                submitFocus,
                retryFocus,
                headingFocus,
                nextFocus,
              ],
              selectionAloneUnassessed: true,
              retryAttemptContextPreserved: true,
            });
          } finally {
            await context.close();
          }
        }
      process.stdout.write(
        `${channel}: nine short-landscape large-text cases passed\n`,
      );
    } finally {
      await browser.close();
    }
  }
  assert.equal(receipt.cases.length, 18);
  assert.equal(receipt.externalRequests, 0);
  assert.equal(receipt.pageErrors, 0);
  assert.deepEqual(await sourceHashes(), initialSources);
  assert.deepEqual(await artifacts(site), initialArtifacts);
  receipt.sourcesStable = true;
  receipt.artifactsStable = true;
  receipt.result =
    'PASS — focused production short-landscape large-text keyboard/reflow';
} catch (error) {
  receipt.result = 'FAIL — required landscape observation not completed';
  receipt.failure = { stage, currentCase, errorKind: error.name };
  throw error;
} finally {
  await server.close();
  await writeFile(
    'docs/evidence/clear-answers/landscape-text-review.json',
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
}
