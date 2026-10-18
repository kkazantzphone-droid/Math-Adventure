// Independent installed-browser production review. Synthetic contexts only.
/* global window, document, innerWidth, innerHeight, getComputedStyle, scrollTo, requestAnimationFrame */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { chromium } from 'playwright-core';
import { build } from 'vite';
import { startProofServer } from './browser-proof/server.mjs';

assert.equal(process.env.NODE_ENV, 'production');
const directory = resolve('.cache/growing-world-production-review');
const site = resolve(directory, 'site');
const families = [
  'number.make-ten',
  'number.part-whole',
  'groups.equal',
  'groups.missing',
  'measurement.array-area',
  'powers.square-side',
];
const locales = ['el-GR', 'en-GB', 'de-DE'];
const sources = [
  'scripts/growing-world-ui-review.mjs',
  'src/domain/growing-world/content.ts',
  'src/domain/growing-world/explore.ts',
  'src/domain/growing-world/journey.ts',
  'src/domain/growing-world/support.ts',
  'src/application/growing-world.ts',
  'src/application/synthetic-loop/record.ts',
  'src/application/synthetic-loop/session.ts',
  'src/application/synthetic-loop/answer.ts',
  'src/application/synthetic-loop/seed.ts',
  'src/application/synthetic-loop/types.ts',
  'src/application/synthetic-loop/index.ts',
  'src/ui/synthetic-loop/ChapterTaskView.tsx',
  'src/ui/synthetic-loop/ChapterAnswerEntry.tsx',
  'src/ui/synthetic-loop/chapter-answers.ts',
  'src/ui/synthetic-loop/chapter-answer-entry.css',
  'src/ui/synthetic-loop/ExploreWorld.tsx',
  'src/ui/synthetic-loop/GrowthJourney.tsx',
  'src/ui/synthetic-loop/growth-journey.css',
  'src/ui/synthetic-loop/ChildPrimitives.tsx',
  'src/ui/synthetic-loop/ChildTaskView.tsx',
  'src/ui/synthetic-loop/child-answers.ts',
  'src/ui/synthetic-loop/child-layout.ts',
  'src/ui/synthetic-loop/child-task.css',
  'src/ui/synthetic-loop/LanguageControls.tsx',
  'src/ui/synthetic-loop/slice.css',
  'src/ui/synthetic-loop/growing-world.css',
  'src/ui/styles.css',
  'src/presentation/localisation/answer-entry-copy.ts',
  'src/presentation/localisation/growing-world-copy.ts',
  'src/presentation/localisation/child-copy.ts',
  'src/presentation/localisation/language-controls-copy.ts',
  'src/presentation/speech/plans.ts',
  'tests/browser/phase3c/main.tsx',
  'tests/browser/phase3c/ChildShell.tsx',
  'tests/browser/phase3c/runtime.ts',
  'tests/browser/phase3c/shell.css',
  'vite.slice.config.ts',
];
const digest = (value) => createHash('sha256').update(value).digest('hex');
async function sourceHashes() {
  return Object.fromEntries(
    await Promise.all(
      sources.map(async (path) => [path, digest(await readFile(path))]),
    ),
  );
}
async function buildHashes(path = site) {
  const entries = await readdir(path, { withFileTypes: true });
  const pairs = await Promise.all(
    entries.map(async (entry) => {
      const file = resolve(path, entry.name);
      return entry.isDirectory()
        ? Object.entries(await buildHashes(file))
        : [
            [
              relative(site, file).replaceAll('\\', '/'),
              digest(await readFile(file)),
            ],
          ];
    }),
  );
  return Object.fromEntries(pairs.flat());
}
async function settled(page) {
  await page.waitForFunction(
    () =>
      !!window.phase3cProof &&
      !window.phase3cProof.state().busy &&
      !window.phase3cProof.offline()?.frozen,
  );
}
async function choose(page, family) {
  if (!(await page.locator(`[data-discovery-family="${family}"]`).isVisible()))
    await page.locator('[data-action="discoveries"]').click();
  await page.locator(`[data-discovery-family="${family}"]`).click();
  await settled(page);
  await page.locator(`[data-chapter-family="${family}"]`).waitFor();
}
async function keyboardClick(page, selector) {
  if (
    selector.startsWith('[data-child-answer=') &&
    (await page.locator('[data-direct-answers]').count())
  ) {
    if (
      !(
        (await page.locator('[data-direct-answers]').getAttribute('open')) !==
        null
      )
    )
      await page.locator('[data-direct-answers] summary').click();
  }
  await page.locator(selector).focus();
  await page.keyboard.press('Enter');
  await settled(page);
}
function solution(presentation) {
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
    default:
      throw new Error('Unknown task');
  }
}
async function layout(page, scope = '.growing-world') {
  const result = await page.evaluate((scope) => {
    const selectors = ['button', 'select', 'summary']
      .map((element) => `${scope} ${element}`)
      .join(', ');
    const controls = [...document.querySelectorAll(selectors)].filter(
      (item) => item.getClientRects().length,
    );
    const boxes = controls.map((item) => {
      const rect = item.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        element: item.tagName.toLowerCase(),
        name:
          item.tagName === 'SELECT'
            ? item.options[item.selectedIndex]?.textContent.trim()
            : item.textContent.trim(),
        clipped:
          item.scrollWidth > item.clientWidth + 1 ||
          item.scrollHeight > item.clientHeight + 1,
      };
    });
    const picture = document.querySelector('[data-world-task-picture]');
    const numeralErrors = [
      ...document.querySelectorAll('.world-answer-cards .child-answer-number'),
    ]
      .filter((node) => node.getClientRects().length)
      .flatMap((node) => {
        const card = node.closest('button');
        const style = getComputedStyle(card);
        const available =
          card.clientWidth -
          Number.parseFloat(style.paddingLeft) -
          Number.parseFloat(style.paddingRight);
        const range = document.createRange();
        range.selectNodeContents(node);
        const textWidth = range.getBoundingClientRect().width;
        const lines = range.getClientRects().length;
        return lines !== 1 || textWidth > available + 1
          ? [{ value: node.textContent, lines, textWidth, available }]
          : [];
      });
    return {
      viewport: innerWidth,
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
      scrollWidth: document.documentElement.scrollWidth,
      targets: boxes.length,
      minTargetWidth: Math.min(...boxes.map((item) => item.width)),
      minTargetHeight: Math.min(...boxes.map((item) => item.height)),
      smallTargets: boxes.filter((item) => item.width < 44 || item.height < 44),
      clippedControls: boxes.filter((item) => item.clipped),
      numeralErrors,
      answerCount: document.querySelectorAll('[data-child-answer]').length,
      answerGridHeight:
        document.querySelector('.world-answer-cards')?.getBoundingClientRect()
          .height ?? null,
      pictureHeight: picture?.getBoundingClientRect().height ?? null,
      squareTileErrors: [...document.querySelectorAll('.world-tile')].filter(
        (item) => {
          const rect = item.getBoundingClientRect();
          return Math.abs(rect.width - rect.height) > 1;
        },
      ).length,
    };
  }, scope);
  assert.ok(result.scrollWidth <= result.viewport, JSON.stringify(result));
  assert.equal(result.smallTargets.length, 0, JSON.stringify(result));
  assert.equal(result.clippedControls.length, 0, JSON.stringify(result));
  assert.equal(result.numeralErrors.length, 0, JSON.stringify(result));
  assert.equal(result.squareTileErrors, 0, JSON.stringify(result));
  return result;
}
async function focusIs(page, selector) {
  assert.ok(
    await page
      .locator(selector)
      .evaluate((item) => item === document.activeElement),
    `Focus ${selector}`,
  );
}
async function contiguousGrids(page) {
  const grids = await page
    .locator(
      '.chapter-task .world-array-picture .world-tiles, .chapter-task .world-unit-rows .world-tiles',
    )
    .evaluateAll((items) =>
      items
        .filter((node) => node.getClientRects().length)
        .map((node) => ({
          rowGap: getComputedStyle(node).rowGap,
          columnGap: getComputedStyle(node).columnGap,
        })),
    );
  for (const grid of grids)
    assert.ok(
      grid.rowGap === '0px' && grid.columnGap === '0px',
      JSON.stringify(grid),
    );
  return grids;
}
async function tabAnswers(page) {
  const direct = page.locator('[data-direct-answers]');
  if (await direct.count()) {
    if ((await direct.getAttribute('open')) === null)
      await direct.locator('summary').click();
    await direct.locator('summary').focus();
  } else await page.locator('[data-child-help]').focus();
  const count = await page.locator('[data-child-answer]').count();
  for (let index = 0; index < count; index++) {
    await page.keyboard.press('Tab');
    await focusIs(page, `[data-child-answer="${index}"]`);
  }
  return count;
}
async function contrast(page) {
  const observations = await page.evaluate(() => {
    const rgb = (value) =>
      value
        .match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number) ?? [255, 255, 255];
    const luminance = (value) =>
      rgb(value)
        .map((part) => {
          const ratio = part / 255;
          return ratio <= 0.04045
            ? ratio / 12.92
            : ((ratio + 0.055) / 1.055) ** 2.4;
        })
        .reduce(
          (sum, part, index) => sum + part * [0.2126, 0.7152, 0.0722][index],
          0,
        );
    const ratio = (a, b) => {
      const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    const background = (node) => {
      for (let current = node; current; current = current.parentElement) {
        const value = getComputedStyle(current).backgroundColor;
        if (value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent')
          return value;
      }
      return 'rgb(255, 255, 255)';
    };
    const selectors = [
      '[data-chapter-family] h2',
      '[data-world-task-picture] p',
      '[data-child-help]',
      '[data-child-answer]',
      '[data-answer-select]',
      '[data-answer-submit]',
      '[data-direct-answers] summary',
      '[data-world-unassessed]',
      '[data-world-relationship]',
      '[data-world-action="symbols"]',
      '[data-growing-journey] p',
      '[data-journey-mode]',
      '[data-journey-manual]',
      '[data-invitation-family]',
      '[data-adult-experience] p',
    ];
    const samples = selectors.flatMap((selector) => {
      const node = document.querySelector(selector);
      if (!node || node.disabled || !node.getClientRects().length) return [];
      const colour = getComputedStyle(node).color;
      const surface = background(node);
      return [
        {
          selector,
          colour,
          background: surface,
          ratio: ratio(colour, surface),
        },
      ];
    });
    const tile = [...document.querySelectorAll('.world-tile')].find(
      (node) => node.getClientRects().length,
    );
    if (tile)
      samples.push({
        selector: 'essential tile border/background',
        colour: getComputedStyle(tile).borderTopColor,
        background: tile.closest('.world-array-picture, .world-unit-rows')
          ? getComputedStyle(tile).backgroundColor
          : background(tile.parentElement.parentElement),
        ratio: ratio(
          getComputedStyle(tile).borderTopColor,
          tile.closest('.world-array-picture, .world-unit-rows')
            ? getComputedStyle(tile).backgroundColor
            : background(tile.parentElement.parentElement),
        ),
      });
    return samples;
  });
  for (const observation of observations)
    assert.ok(
      observation.ratio >=
        (observation.selector.startsWith('essential') ? 3 : 4.5),
      JSON.stringify(observation),
    );
  return observations;
}
async function screenshot(page, name, selector) {
  const path = resolve(directory, `${name}.png`);
  await page.locator(selector).screenshot({ path });
}
await mkdir(directory, { recursive: true });
const initialHashes = await sourceHashes();
await build({
  configFile: 'vite.slice.config.ts',
  logLevel: 'error',
  mode: 'production',
  build: { outDir: site },
});
const artifacts = await buildHashes();
const server = await startProofServer({
  distDirectory: site,
  fixtureDirectory: resolve('tests/e2e/fixtures'),
});
const results = [];
let errors = 0;
let externalRequests = 0;
try {
  for (const channel of ['chrome', 'msedge']) {
    const browser = await chromium.launch({
      channel,
      headless: true,
      timeout: 15000,
    });
    const channelCases = [];
    try {
      for (const locale of locales) {
        const context = await browser.newContext({
          viewport: { width: 375, height: 850 },
          reducedMotion: 'reduce',
          acceptDownloads: false,
        });
        context.on('request', (request) => {
          if (new URL(request.url()).origin !== server.origin)
            externalRequests++;
        });
        await context.route('**/*', (route) =>
          new URL(route.request().url()).origin === server.origin
            ? route.continue()
            : route.abort('blockedbyclient'),
        );
        const page = await context.newPage();
        page.on('pageerror', () => errors++);
        try {
          assert.equal((await page.goto(server.origin))?.status(), 200);
          await page.waitForFunction(
            () => window.phase3cProof?.offline()?.shell === 'ready',
          );
          await page.locator(`[data-child-language="${locale}"]`).click();
          await page.locator('[data-profile]').first().click();
          await settled(page);
          await page.locator('#slice-task-heading').waitFor();
          await page.evaluate(
            () =>
              new Promise((done) =>
                requestAnimationFrame(() => requestAnimationFrame(done)),
              ),
          );
          if (channel === 'chrome')
            await page.screenshot({
              path: resolve(
                directory,
                `${channel}-${locale}-badge-landing.png`,
              ),
            });
          await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
          if (channel === 'chrome')
            await page.screenshot({
              path: resolve(
                directory,
                `${channel}-${locale}-initial-viewport.png`,
              ),
            });
          await keyboardClick(page, '[data-action="discoveries"]');
          await keyboardClick(page, '[data-journey-mode]');
          await focusIs(page, '[data-journey-mode]');
          assert.equal(
            await page
              .locator('[data-journey-mode]')
              .getAttribute('aria-pressed'),
            'true',
          );
          await keyboardClick(page, '[data-journey-manual]');
          await focusIs(page, '[data-journey-manual]');
          assert.equal(
            await page
              .locator('[data-journey-manual]')
              .getAttribute('aria-pressed'),
            'true',
          );
          await keyboardClick(page, '[data-journey-mode]');
          await keyboardClick(page, '[data-action="discoveries"]');
          for (const family of families) {
            await choose(page, family);
            await page.evaluate(() => {
              document.documentElement.style.fontSize = '32px';
            });
            const presentation = await page.evaluate(() =>
              window.phase3cProof.chapterTask(),
            );
            const assessmentBeforeHelp = await page.evaluate(() => {
              const record = window.phase3cProof.state().record;
              return {
                completedCount: record.completedCount,
                legacyEvents: record.events.length,
                chapterEvents: record.chapterEvents?.length ?? 0,
              };
            });
            const caseName = `${channel}-${locale}-${family}`;
            const text200 = await layout(page);
            const contrastSamples = await contrast(page);
            const keyboardAnswerCount = await tabAnswers(page);
            if (channel === 'chrome')
              await screenshot(
                page,
                `${caseName}-text200`,
                '[data-world-task-picture]',
              );
            await page.setViewportSize({ width: 320, height: 850 });
            const narrow = await layout(page);
            await page.evaluate(() => {
              document.documentElement.style.fontSize = '';
            });
            const default320 = await layout(page);
            if (
              channel === 'chrome' &&
              locale === 'en-GB' &&
              family === 'measurement.array-area'
            )
              await screenshot(
                page,
                `${caseName}-default320`,
                '[data-chapter-family]',
              );
            await page.evaluate(() => {
              document.documentElement.style.fontSize = '32px';
            });
            if (channel === 'chrome' && locale === 'de-DE')
              await screenshot(
                page,
                `${caseName}-320`,
                '[data-chapter-family]',
              );
            await keyboardClick(page, '[data-child-help]');
            await focusIs(page, '[data-child-help]');
            const helpFocus = await page
              .locator('[data-child-help]')
              .evaluate((node) => {
                const style = getComputedStyle(node);
                const box = node.getBoundingClientRect();
                return {
                  outlineWidth: style.outlineWidth,
                  outlineStyle: style.outlineStyle,
                  outlineColour: style.outlineColor,
                  visible: box.bottom > 0 && box.top < innerHeight,
                  fullyVisible: box.top >= 0 && box.bottom <= innerHeight,
                  top: box.top,
                  bottom: box.bottom,
                };
              });
            assert.ok(
              Number.parseFloat(helpFocus.outlineWidth) >= 2 &&
                helpFocus.outlineStyle !== 'none' &&
                helpFocus.visible,
              JSON.stringify({ caseName, helpFocus }),
            );
            assert.equal(
              await page
                .locator('[data-chapter-family]')
                .getAttribute('data-child-hint-tier'),
              '1',
            );
            await keyboardClick(page, '[data-child-help]');
            await focusIs(page, '[data-child-help]');
            const help2Grids = await contiguousGrids(page);
            if (family === 'groups.missing') {
              await keyboardClick(page, '[data-world-share]');
              await focusIs(page, '[data-world-share]');
            }
            await keyboardClick(page, '[data-child-help]');
            await focusIs(page, '[data-child-help]');
            assert.ok(await page.locator('[data-world-worked]').isVisible());
            const savedHelp = await page.evaluate(() => {
              const record = window.phase3cProof.state().record;
              return {
                assessment: {
                  completedCount: record.completedCount,
                  legacyEvents: record.events.length,
                  chapterEvents: record.chapterEvents?.length ?? 0,
                },
                support: record.chapterSupport,
              };
            });
            assert.deepEqual(savedHelp.assessment, assessmentBeforeHelp);
            assert.ok(
              savedHelp.support.some(
                (entry) => entry.familyId === family && entry.maxHintTier === 3,
              ),
            );
            assert.deepEqual(
              await page.evaluate(() => window.phase3cProof.chapterTask()),
              presentation,
            );
            const helpLayout = await layout(page);
            if (channel === 'chrome' && locale === 'en-GB')
              await screenshot(
                page,
                `${caseName}-worked`,
                '[data-world-task-picture]',
              );
            await keyboardClick(page, '[data-child-help]');
            assert.equal(
              await page
                .locator('[data-chapter-family]')
                .getAttribute('data-child-hint-tier'),
              '3',
            );
            const correct = solution(presentation);
            await keyboardClick(
              page,
              `[data-child-answer="${correct === 0 ? 1 : 0}"]`,
            );
            await page.waitForFunction(
              () => !!window.phase3cProof.state().record?.lastCompletion,
            );
            await focusIs(page, '[data-child-retry]');
            assert.ok(
              (await page.locator('#slice-feedback').textContent()).trim(),
            );
            assert.equal(
              await page.locator('#slice-feedback[role="status"]').count(),
              1,
            );
            await keyboardClick(page, '[data-child-retry]');
            await focusIs(page, '#slice-task-heading');
            await keyboardClick(page, `[data-child-answer="${correct}"]`);
            await focusIs(page, '[data-action="next"]');
            const completion = await page.evaluate(
              () => window.phase3cProof.state().record?.lastCompletion,
            );
            assert.equal(completion?.correct, true);
            await page.evaluate(() => {
              document.documentElement.style.fontSize = '';
            });
            await page.setViewportSize({ width: 1280, height: 900 });
            const desktop = await layout(page);
            if (channel === 'chrome' && locale === 'en-GB')
              await screenshot(
                page,
                `${caseName}-desktop`,
                '[data-chapter-family]',
              );
            await page.setViewportSize({ width: 850, height: 375 });
            const landscape = await layout(page);
            let alternate = null;
            for (let attempt = 0; attempt < 10; attempt++) {
              await keyboardClick(page, '[data-action="next"]');
              const next = await page.evaluate(() =>
                window.phase3cProof.chapterTask(),
              );
              if (
                next.task.representation !== presentation.task.representation
              ) {
                alternate = next.task.representation;
                await page.setViewportSize({ width: 375, height: 850 });
                await page.evaluate(() => {
                  document.documentElement.style.fontSize = '32px';
                });
                await layout(page);
                if (channel === 'chrome')
                  await screenshot(
                    page,
                    `${caseName}-alternate`,
                    '[data-world-task-picture]',
                  );
                await keyboardClick(page, '[data-child-help]');
                await keyboardClick(page, '[data-child-help]');
                await contiguousGrids(page);
                if (channel === 'chrome' && locale === 'en-GB')
                  await screenshot(
                    page,
                    `${caseName}-alternate-help2`,
                    '[data-world-task-picture]',
                  );
              }
              await keyboardClick(
                page,
                `[data-child-answer="${solution(next)}"]`,
              );
              if (alternate) break;
            }
            assert.ok(
              alternate,
              `Second representation unavailable: ${caseName}`,
            );
            const connections = await page
              .locator('[data-world-connection]')
              .evaluateAll((items) =>
                items.map((item) => item.getAttribute('data-world-connection')),
              );
            assert.deepEqual(connections, presentation.task.connections);
            await keyboardClick(
              page,
              `[data-world-connection="${connections[0]}"]`,
            );
            assert.equal(
              await page
                .locator('[data-chapter-family]')
                .getAttribute('data-chapter-family'),
              connections[0],
            );
            await page.setViewportSize({ width: 375, height: 850 });
            channelCases.push({
              locale,
              family,
              representations: [presentation.task.representation, alternate],
              text200,
              narrow,
              default320,
              helpLayout,
              desktop,
              landscape,
              contrastSamples,
              keyboardAnswerCount,
              helpFocus,
              help2Grids,
              durableHelpBeforeAssessment: true,
              connections,
              states: [
                'initial',
                'help1',
                'help2',
                'help3-worked',
                'replay',
                'wrong',
                'retry',
                'success',
                'connected-practice',
              ],
              keyboardFocus: 'PASS',
            });
          }
          await keyboardClick(page, '[data-child-nav="explore"]');
          await page.waitForFunction(() =>
            document.activeElement?.matches('[data-explore-world] h2'),
          );
          const before = await page.evaluate(
            () => window.phase3cProof.state().record,
          );
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '32px';
          });
          await page.setViewportSize({ width: 320, height: 850 });
          const parts = await layout(page);
          const partsContrast = await contrast(page);
          const relationship = await page
            .locator('[data-world-relationship]')
            .textContent();
          for (const action of ['moveLeft', 'moveRight', 'add', 'remove']) {
            await keyboardClick(page, `[data-world-action="${action}"]`);
            await focusIs(page, `[data-world-action="${action}"]`);
          }
          await keyboardClick(page, '[data-world-action="undo"]');
          await keyboardClick(page, '[data-world-action="reset"]');
          assert.equal(
            await page.locator('[data-world-relationship]').textContent(),
            relationship,
          );
          await keyboardClick(page, '[data-world-action="symbols"]');
          assert.ok(await page.locator('[data-world-symbols]').isVisible());
          if (channel === 'chrome')
            await screenshot(
              page,
              `${channel}-${locale}-explore-parts-320`,
              '[data-explore-world]',
            );
          if (channel === 'chrome')
            await screenshot(
              page,
              `${channel}-${locale}-explore-parts-picture`,
              '[data-world-parts] .world-part-pictures',
            );
          await keyboardClick(page, '[data-world-workshop="arrays"]');
          for (const action of [
            'addRow',
            'removeRow',
            'addColumn',
            'removeColumn',
            'turn',
            'square',
          ]) {
            await keyboardClick(page, `[data-world-action="${action}"]`);
          }
          await keyboardClick(page, '[data-world-action="oneSide"]');
          const arrays = await layout(page);
          const arraysContrast = await contrast(page);
          assert.equal(await page.locator('.world-top-bracket').count(), 1);
          assert.ok(
            (await page.locator('[data-world-symbols]').textContent()).includes(
              '√',
            ),
          );
          assert.deepEqual(
            await page.evaluate(() => window.phase3cProof.state().record),
            before,
          );
          if (channel === 'chrome')
            await screenshot(
              page,
              `${channel}-${locale}-explore-arrays-320`,
              '[data-explore-world]',
            );
          if (channel === 'chrome') {
            await screenshot(
              page,
              `${channel}-${locale}-explore-array-picture`,
              '[data-world-arrays] .world-array-picture',
            );
            await screenshot(
              page,
              `${channel}-${locale}-explore-array-symbols`,
              '[data-world-symbols]',
            );
          }
          await keyboardClick(page, '[data-world-action="undo"]');
          await keyboardClick(page, '[data-world-action="reset"]');
          await keyboardClick(page, '[data-world-practice]');
          assert.equal(
            await page
              .locator('[data-chapter-family]')
              .getAttribute('data-chapter-family'),
            'groups.equal',
          );
          channelCases.push({
            locale,
            scope: 'Explore',
            parts,
            arrays,
            partsContrast,
            arraysContrast,
            recordUnchanged: true,
            keyboardActions:
              'both workshops/all mathematical actions/undo/reset/symbols/side/separate practice',
          });
          await keyboardClick(page, '[data-action="presentation-view"]');
          assert.equal(
            await page.locator('[data-adult-experience]').count(),
            1,
          );
          await focusIs(page, '#adult-experience-heading');
          const adultLayout = await layout(page, '[data-adult-experience]');
          const adultContrast = await contrast(page);
          if (channel === 'chrome')
            await screenshot(
              page,
              `${channel}-${locale}-adult-explanation-320`,
              '[data-adult-experience]',
            );
          await keyboardClick(page, '[data-action="presentation-view"]');
          assert.equal(
            await page.locator('[data-adult-experience]').count(),
            0,
          );
          channelCases.push({
            locale,
            scope: 'Adult explanation',
            adultLayout,
            adultContrast,
            absentFromChildView: true,
          });
        } finally {
          await context.close();
        }
      }
      results.push({
        channel,
        browserVersion: browser.version(),
        cases: channelCases,
      });
      console.log(`${channel}: ${channelCases.length} production cases passed`);
    } finally {
      await browser.close();
    }
  }
  assert.equal(errors, 0);
  assert.equal(externalRequests, 0);
  assert.deepEqual(await sourceHashes(), initialHashes);
  const receipt = {
    result:
      'PASS — bounded automated production rendering; visual observations recorded separately',
    renderer:
      'NODE_ENV=production; Vite mode production; separate installed Chrome/Edge through playwright-core; owned loopback server; disposable synthetic contexts',
    sourceHashes: initialHashes,
    artifactHashes: artifacts,
    sourcesStable: true,
    results,
    pageErrors: errors,
    externalRequests,
    mechanism:
      '375 CSS px with deliberate 32px root font (200% default text), 320 CSS px at both default 16px and 32px text, 1280x900 desktop and 850x375 landscape at default text; reduced-motion request',
    limits: [
      'No native zoom, actual AT delivery, physical offline restart, native-language review, owner/child UX acceptance or educational effectiveness inferred.',
      'Screenshots remain synthetic under ignored .cache; no retained media in repository.',
    ],
  };
  await writeFile(
    resolve(directory, 'automated-review.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
} finally {
  await server.close();
}
