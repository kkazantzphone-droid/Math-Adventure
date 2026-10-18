// Installed-browser comparison of immutable synthetic production builds.
/* global window, document, navigator, innerWidth, innerHeight, getComputedStyle, scrollTo, requestAnimationFrame, setTimeout */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { build } from 'vite';
import { startProofServer } from './browser-proof/server.mjs';

assert.equal(process.env.NODE_ENV, 'production');
const baselineOnly = process.env.BASELINE_ONLY === '1';
const comparisonDiagnostic = process.env.COMPARISON_DIAGNOSTIC === '1';
const directory = resolve('.cache/clear-answers-production');
const baselineSite = resolve('.cache/clear-answers-baseline/site');
const candidateSite = resolve(directory, 'site');
const baselineRef = 'f74b60550fec4cbd2ff592a878759993b834ff5b';
const locales = ['el-GR', 'en-GB', 'de-DE'];
const families = [
  'groups.equal',
  'measurement.array-area',
  'number.part-whole',
];
const conditions = [
  { width: 320, height: 850, font: 16 },
  { width: 320, height: 850, font: 32 },
  { width: 375, height: 850, font: 16 },
  { width: 375, height: 850, font: 32 },
  { width: 850, height: 375, font: 16 },
];
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (...args) =>
  execFileSync('git', ['-c', 'core.fsmonitor=false', ...args], {
    encoding: 'utf8',
  }).trim();

async function filesBelow(directory, base = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.name !== '.cache')
      .map(async (entry) => {
        const file = resolve(directory, entry.name);
        return entry.isDirectory()
          ? filesBelow(file, base)
          : [
              [
                relative(base, file).replaceAll('\\', '/'),
                digest(await readFile(file)),
              ],
            ];
      }),
  );
  return nested.flat();
}
async function artifacts(site) {
  return Object.fromEntries(
    (await filesBelow(site)).sort(([a], [b]) => a.localeCompare(b)),
  );
}
async function sources() {
  const paths = new Set([
    ...git(
      'ls-files',
      'src',
      'tests/browser',
      'scripts',
      'package.json',
      'tsconfig*.json',
      'vite*.ts',
      'eslint.config.*',
      'prettier.config.*',
      '.node-version',
      'pnpm-lock.yaml',
    )
      .split('\n')
      .filter(Boolean),
    ...(await filesBelow(resolve('src'))).map(([path]) => `src/${path}`),
    ...(await filesBelow(resolve('tests/browser'))).map(
      ([path]) => `tests/browser/${path}`,
    ),
    ...(await filesBelow(resolve('scripts'))).map(
      ([path]) => `scripts/${path}`,
    ),
    'scripts/clear-answers-burden-review.mjs',
  ]);
  return Object.fromEntries(
    await Promise.all(
      [...paths]
        .sort()
        .map(async (path) => [path, digest(await readFile(path))]),
    ),
  );
}
async function settled(page) {
  await page.waitForFunction(
    () =>
      window.phase3cProof &&
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
async function focusIs(page, selector) {
  assert.equal(
    await page
      .locator(selector)
      .evaluate((node) => node === document.activeElement),
    true,
    `Expected focus: ${selector}`,
  );
}
async function openTask(
  browser,
  server,
  locale,
  family,
  maximalPicture = false,
  runCase = {},
) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 850 },
    reducedMotion: 'reduce',
    acceptDownloads: false,
  });
  const failures = [];
  context.on('request', (request) => {
    if (new URL(request.url()).origin !== server.origin)
      failures.push('external-request');
  });
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === server.origin
      ? route.continue()
      : route.abort('blockedbyclient'),
  );
  const page = await context.newPage();
  page.on('pageerror', () => failures.push('page-error'));
  const requestFailures = [];
  page.on('requestfailed', (request) =>
    requestFailures.push({
      path: new URL(request.url()).pathname,
      error: request.failure()?.errorText ?? 'unknown',
    }),
  );
  try {
    assert.equal((await page.goto(server.origin))?.status(), 200);
    await page.waitForFunction(
      () => window.phase3cProof?.offline()?.shell === 'ready',
    );
  } catch (error) {
    const status = await page
      .evaluate(async () => {
        const container = navigator.serviceWorker;
        const registrations = await Promise.race([
          container.getRegistrations().then((items) =>
            items.map((item) => ({
              active: item.active?.state ?? null,
              waiting: item.waiting?.state ?? null,
              installing: item.installing?.state ?? null,
              scriptPath: item.active
                ? new URL(item.active.scriptURL).pathname
                : null,
            })),
          ),
          new Promise((done) =>
            setTimeout(() => done('registration-status-timeout'), 1000),
          ),
        ]);
        return {
          proofPresent: !!window.phase3cProof,
          offline: window.phase3cProof?.offline() ?? null,
          documentReadyState: document.readyState,
          controller: container.controller?.state ?? null,
          registrations,
        };
      })
      .catch(() => ({ diagnosticUnavailable: true }));
    await writeFile(
      resolve(directory, 'startup-failure.json'),
      `${JSON.stringify({ result: 'FAIL — required real shell ready was not observed; no startup retry or timeout relaxation', runCase, locale, family, errorKind: error.name, status, requestFailures, pageFailures: failures, observedRequests: server.requestSnapshot().slice(-32), droppedRequestObservations: server.droppedObservationCount(), sourceHashesAtStart: initialSources, artifactHashesAtStart: sites.map(({ name, hashes }) => ({ name, hashes })) }, null, 2)}\n`,
    );
    await context.close();
    throw new Error(
      `Required shell startup failed: ${JSON.stringify(runCase)}; retained startup-failure.json`,
      { cause: error },
    );
  }
  await page.locator(`[data-child-language="${locale}"]`).click();
  await page.locator('[data-profile]').first().click();
  await settled(page);
  await page.locator('[data-action="discoveries"]').click();
  await page.locator('[data-journey-mode]').click();
  await settled(page);
  if (!(await page.locator(`[data-discovery-family="${family}"]`).isVisible()))
    await page.locator('[data-action="discoveries"]').click();
  await page.locator(`[data-discovery-family="${family}"]`).click();
  await settled(page);
  await page.locator(`[data-chapter-family="${family}"]`).waitFor();
  let task = await page.evaluate(() => window.phase3cProof.chapterTask());
  const maximal = (task) =>
    task.task.representation === 'concrete' &&
    (task.task.kind === 'missingPart'
      ? task.task.total === 20
      : answer(task.task) === 25);
  let selections = 1;
  while (maximalPicture && !maximal(task) && selections < 256) {
    // Explicit reselection advances only synthetic task metadata, never evidence.
    await page.locator('[data-action="discoveries"]').click();
    await page.locator(`[data-discovery-family="${family}"]`).click();
    await settled(page);
    task = await page.evaluate(() => window.phase3cProof.chapterTask());
    selections++;
  }
  if (maximalPicture)
    assert.ok(
      maximal(task),
      'Maximal concrete picture was not reached by bounded explicit selection',
    );
  const profile = await page.evaluate(() => {
    const record = window.phase3cProof.state().record;
    return {
      id: record.profileId,
      mode: record.mode,
      ordinal: record.taskOrdinal,
    };
  });
  assert.equal(profile.mode, 'synthetic-policy');
  const noAssessment = await page.evaluate(() => {
    const record = window.phase3cProof.state().record;
    return (
      record.completedCount === 0 &&
      record.events.length === 0 &&
      record.chapterEvents.length === 0
    );
  });
  assert.equal(noAssessment, true, 'Explicit task reselection must not assess');
  return { context, page, task, profile, selections, failures };
}
function answer(task) {
  switch (task.kind) {
    case 'equalGroups':
      return task.groups * task.each;
    case 'arrayArea':
      return task.rows * task.columns;
    case 'missingPart':
      return task.total - task.known;
    default:
      throw new Error('Unexpected comparison family');
  }
}
async function measure(page, condition) {
  await page.setViewportSize({
    width: condition.width,
    height: condition.height,
  });
  await page.evaluate((font) => {
    document.documentElement.style.fontSize = `${font}px`;
  }, condition.font);
  const snapshot = async () =>
    page.evaluate(() => {
      const chapter = document.querySelector('[data-chapter-family]');
      const entry =
        chapter.querySelector('[data-answer-entry]') ??
        chapter.querySelector('.world-answer-cards');
      const shown = (node) => {
        if (!node || !node.getClientRects().length || !node.checkVisibility())
          return false;
        const style = getComputedStyle(node);
        if (style.visibility === 'hidden' || style.visibility === 'collapse')
          return false;
        for (
          let parent = node.parentElement;
          parent;
          parent = parent.parentElement
        ) {
          if (parent.tagName === 'DETAILS' && !parent.open) {
            const summary = parent.querySelector(':scope > summary');
            if (!summary?.contains(node)) return false;
          }
        }
        return true;
      };
      const visibility = (node) => {
        if (!shown(node)) return null;
        const rect = node.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height,
          fullyVisible: rect.top >= 0 && rect.bottom <= innerHeight,
          intersectsViewport: rect.bottom > 0 && rect.top < innerHeight,
        };
      };
      const controls = [
        ...chapter.querySelectorAll('button, select, summary'),
      ].filter(shown);
      const targets = controls.map((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          kind: node.tagName.toLowerCase(),
          width: rect.width,
          height: rect.height,
          font: Number.parseFloat(style.fontSize),
          clipped: node.scrollWidth > node.clientWidth + 1,
          horizontalOverflow: rect.left < 0 || rect.right > innerWidth + 1,
        };
      });
      const submit = chapter.querySelector('[data-answer-submit]');
      const direct = [
        ...chapter.querySelectorAll('[data-child-answer]'),
      ].filter(shown);
      const selected = chapter.querySelector('[data-answer-select]');
      let selectedTextFits = null;
      if (selected) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const style = getComputedStyle(selected);
        context.font = style.font;
        const required =
          context.measureText(selected.selectedOptions[0].textContent).width +
          Number.parseFloat(style.paddingLeft) +
          Number.parseFloat(style.paddingRight) +
          24;
        selectedTextFits = {
          requiredWidth: required,
          availableWidth: selected.clientWidth,
          fits: required <= selected.clientWidth + 1,
        };
      }
      return {
        viewport: { width: innerWidth, height: innerHeight },
        rootFont: getComputedStyle(document.documentElement).fontSize,
        pageHeight: document.documentElement.scrollHeight,
        pageWidth: document.documentElement.scrollWidth,
        chapterHeight: chapter.getBoundingClientRect().height,
        answerRegionHeight: entry.getBoundingClientRect().height,
        response: visibility(selected),
        help: visibility(chapter.querySelector('[data-child-help]')),
        explicitSubmission: visibility(submit),
        directSubmissionCount: direct.length,
        directSubmissionsFullyVisible: direct.filter(
          (node) => visibility(node).fullyVisible,
        ).length,
        firstDirectSubmission: visibility(direct[0]),
        lastDirectSubmission: visibility(direct.at(-1)),
        selectedTextFits,
        targets,
        smallTargets: targets.filter(
          (target) => target.width < 44 || target.height < 44,
        ),
        clippedTargets: targets.filter(
          (target) => target.clipped || target.horizontalOverflow,
        ),
      };
    });
  await page.locator('#slice-task-heading').evaluate((node) =>
    scrollTo({
      top: node.getBoundingClientRect().top + window.scrollY - 16,
      behavior: 'instant',
    }),
  );
  await settled(page);
  const taskAligned = await snapshot();
  await page
    .locator('[data-answer-entry], .chapter-task .world-answer-cards')
    .first()
    .evaluate((node) =>
      scrollTo({
        top: Math.max(
          0,
          node.getBoundingClientRect().top + window.scrollY - 96,
        ),
        behavior: 'instant',
      }),
    );
  await settled(page);
  const answerAligned = await snapshot();
  for (const item of [taskAligned, answerAligned]) {
    assert.ok(
      item.pageWidth <= condition.width,
      JSON.stringify({ condition, item }),
    );
    assert.equal(
      item.smallTargets.length,
      0,
      JSON.stringify({ condition, item }),
    );
    assert.equal(
      item.clippedTargets.length,
      0,
      JSON.stringify({ condition, item }),
    );
    assert.ok(
      item.targets.every((target) => target.font >= condition.font),
      JSON.stringify({ condition, item }),
    );
    if (item.selectedTextFits)
      assert.equal(
        item.selectedTextFits.fits,
        true,
        JSON.stringify({ condition, item }),
      );
    if (item.response)
      assert.equal(
        item.directSubmissionCount,
        0,
        'Closed direct-answer details must not count as painted controls',
      );
  }
  return { condition, taskAligned, answerAligned };
}
async function submissionState(page) {
  return page.evaluate(() => {
    const record = window.phase3cProof.state().record;
    const completion = record.lastCompletion;
    return {
      correct: completion?.correct ?? null,
      evidence: completion?.evidence ?? null,
      reasonCode: completion?.reasonCode ?? null,
      completedCount: record.completedCount,
      taskOrdinal: record.taskOrdinal,
      mode: record.mode,
      chapterEvents: record.chapterEvents ?? [],
      events: record.events,
      derived: record.derived,
      support: record.chapterSupport ?? [],
    };
  });
}
function summarize(state) {
  const { chapterEvents, events, derived, support, ...safe } = state;
  const evidence = chapterEvents.map(({ id, ...fields }) => {
    // main.tsx creates operation UUIDs; answer.ts copies them to observation.id.
    // Fresh disposable contexts must differ in that opaque identity only.
    assert.match(
      id,
      /^SYNTHETIC-synthetic-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    return fields;
  });
  assert.equal(
    new Set(chapterEvents.map((event) => event.id)).size,
    chapterEvents.length,
  );
  return {
    ...safe,
    chapterEventCount: chapterEvents.length,
    legacyEventCount: events.length,
    chapterEvidenceHash: digest(JSON.stringify(evidence)),
    chapterOpaqueIdsValidAndUnique: true,
    legacyEventsHash: digest(JSON.stringify(events)),
    derivedHash: digest(JSON.stringify(derived)),
    supportHash: digest(JSON.stringify(support)),
  };
}
function compareChapterEvidence(before, after) {
  assert.equal(before.length, after.length);
  const differences = [];
  for (let index = 0; index < before.length; index++) {
    const { id: beforeId, ...beforeFields } = before[index];
    const { id: afterId, ...afterFields } = after[index];
    assert.deepEqual(
      beforeFields,
      afterFields,
      'Every non-identity observation field must match exactly',
    );
    if (beforeId !== afterId) differences.push(`chapterEvents[${index}].id`);
  }
  return differences;
}
async function submit(page, route, value) {
  if (route === 'select') {
    const before = await submissionState(page);
    await page.locator('[data-answer-select]').selectOption(String(value));
    assert.deepEqual(
      await submissionState(page),
      before,
      'Selecting alone must not submit or change evidence',
    );
    await activate(page, '[data-answer-submit]');
  } else {
    const details = page.locator('[data-direct-answers]');
    if (await details.count())
      await activate(page, '[data-direct-answers] summary');
    await activate(page, `[data-child-answer="${value}"]`);
  }
  await page.waitForFunction(
    () => !!window.phase3cProof.state().record?.lastCompletion,
  );
  await settled(page);
}
async function keyboardRecovery(opened, candidate) {
  const { page, task } = opened;
  await page.setViewportSize({ width: 320, height: 850 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  await activate(page, '[data-child-help]');
  await focusIs(page, '[data-child-help]');
  const before = await submissionState(page);
  if (candidate) {
    await page.keyboard.press('Tab');
    await focusIs(page, '[data-answer-select]');
    await page.keyboard.press('End');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('[data-answer-select]').inputValue(), '0');
    assert.deepEqual(await submissionState(page), before);
    await page.keyboard.press('Tab');
    await focusIs(page, '[data-answer-submit]');
    await page.keyboard.press('Enter');
    await settled(page);
  } else await activate(page, '[data-child-answer="0"]');
  await focusIs(page, '[data-child-retry]');
  assert.equal((await submissionState(page)).correct, false);
  assert.ok((await page.locator('#slice-feedback').textContent()).trim());
  await activate(page, '[data-child-retry]');
  await focusIs(page, '#slice-task-heading');
  await submit(page, 'direct', answer(task.task));
  if (candidate)
    assert.equal(
      await page.locator('[data-answer-select]').inputValue(),
      String(answer(task.task)),
      'Retained direct answer must also update the current response after retry',
    );
  await focusIs(page, '[data-action="next"]');
  const result = summarize(await submissionState(page));
  assert.equal(result.correct, true);
  return {
    focus:
      'help retained → answer → wrong feedback/retry → task heading → success/Next',
    selectionAloneUnassessed: candidate ? true : null,
    mixedRouteResponseConsistentAfterRetry: candidate ? true : null,
    result,
  };
}

await mkdir(directory, { recursive: true });
const initialSources = await sources();
const baselineArtifacts = await artifacts(baselineSite);
assert.equal(
  baselineArtifacts['assets/index-DFeDmSRI.js'],
  'e56c71cb72a8d4127c78d2d3767e526b04dbe83e218fc1de9984043f105610ef',
);
const baselineSourceObjects = git(
  'ls-tree',
  '-r',
  baselineRef,
  '--',
  'src',
  'tests/browser',
  'scripts',
  'vite.slice.config.ts',
  'package.json',
  'pnpm-lock.yaml',
  '.node-version',
);
const sites = [
  { name: 'baseline', directory: baselineSite, hashes: baselineArtifacts },
];
if (!baselineOnly) {
  await build({
    configFile: 'vite.slice.config.ts',
    logLevel: 'error',
    mode: 'production',
    build: { outDir: candidateSite },
  });
  sites.push({
    name: 'candidate',
    directory: candidateSite,
    hashes: await artifacts(candidateSite),
  });
  await writeFile(
    resolve(directory, 'candidate-binding.json'),
    `${JSON.stringify({ result: 'INPUT BINDING ONLY — browser review pending', sourceHashes: initialSources, artifactHashes: sites[1].hashes }, null, 2)}\n`,
  );
}
const servers = [];
const results = [];
const exhaustive = [];
async function retainPending(stage) {
  await writeFile(
    resolve(directory, 'pending-burden-observations.json'),
    `${JSON.stringify({ result: 'PENDING — actual observations only; final aggregation/stability gates incomplete', stage, sourceHashesAtStart: initialSources, artifactHashesAtStart: sites.map(({ name, hashes }) => ({ name, hashes })), results, exhaustive }, null, 2)}\n`,
  );
}
try {
  for (const site of sites)
    servers.push({
      ...site,
      server: await startProofServer({
        distDirectory: site.directory,
        fixtureDirectory: resolve('tests/e2e/fixtures'),
      }),
    });
  for (const channel of comparisonDiagnostic
    ? ['chrome']
    : ['chrome', 'msedge']) {
    const browser = await chromium.launch({
      channel,
      headless: true,
      timeout: 15000,
    });
    try {
      for (const site of servers) {
        const cases = [];
        for (const locale of locales)
          for (const family of families) {
            const opened = await openTask(
              browser,
              site.server,
              locale,
              family,
              true,
              { site: site.name, channel, phase: 'layout' },
            );
            try {
              const measurements = [];
              for (const condition of conditions) {
                measurements.push(await measure(opened.page, condition));
                if (
                  channel === 'chrome' &&
                  condition.width === 375 &&
                  condition.font === 32
                )
                  await opened.page.screenshot({
                    path: resolve(
                      directory,
                      `${site.name}-${locale}-${family}-answer.png`,
                    ),
                  });
              }
              const keyboard = await keyboardRecovery(
                opened,
                site.name === 'candidate',
              );
              assert.deepEqual(opened.failures, []);
              cases.push({
                locale,
                family,
                profile: opened.profile,
                explicitUnscoredSelections: opened.selections,
                replay: opened.task.replay,
                instanceId: opened.task.instanceId,
                task: opened.task.task,
                measurements,
                keyboard,
              });
            } finally {
              await opened.context.close();
            }
          }
        results.push({
          site: site.name,
          channel,
          browserVersion: browser.version(),
          cases,
        });
        await retainPending({ site: site.name, channel, phase: 'layout' });
        console.log(
          `${site.name} ${channel}: ${cases.length} comparable task/keyboard cases; ${cases.length * conditions.length} layout conditions`,
        );
      }
      if (!baselineOnly && !comparisonDiagnostic && channel === 'chrome') {
        for (const family of families) {
          const maximum = family === 'number.part-whole' ? 20 : 25;
          for (let response = 0; response <= maximum; response++) {
            const routes = [];
            const observations = [];
            for (const [site, route] of [
              [servers[0], 'direct'],
              [servers[1], 'select'],
              [servers[1], 'direct'],
            ]) {
              const opened = await openTask(
                browser,
                site.server,
                'en-GB',
                family,
                false,
                {
                  site: site.name,
                  channel,
                  phase: 'exhaustive',
                  route,
                  response,
                },
              );
              try {
                const actualValues =
                  route === 'select'
                    ? await opened.page
                        .locator('[data-answer-select] option')
                        .evaluateAll((nodes) =>
                          nodes
                            .filter((node) => node.value !== '')
                            .map((node) => Number(node.value)),
                        )
                    : await opened.page
                        .locator('[data-child-answer]')
                        .evaluateAll((nodes) =>
                          nodes.map((node) =>
                            Number(node.getAttribute('data-child-answer')),
                          ),
                        );
                assert.deepEqual(
                  actualValues,
                  Array.from({ length: maximum + 1 }, (_, index) => index),
                );
                await submit(opened.page, route, response);
                const rawState = await submissionState(opened.page);
                observations.push(rawState.chapterEvents);
                const state = summarize(rawState);
                assert.equal(
                  state.correct,
                  response === answer(opened.task.task),
                );
                assert.deepEqual(opened.failures, []);
                routes.push({
                  site: site.name,
                  route,
                  replay: opened.task.replay,
                  state,
                });
              } finally {
                await opened.context.close();
              }
            }
            assert.deepEqual(routes[0].replay, routes[1].replay);
            assert.deepEqual(routes[0].replay, routes[2].replay);
            const opaqueIdentityDifferences = [
              compareChapterEvidence(observations[0], observations[1]),
              compareChapterEvidence(observations[0], observations[2]),
            ];
            assert.deepEqual(routes[0].state, routes[1].state);
            assert.deepEqual(routes[0].state, routes[2].state);
            exhaustive.push({
              family,
              response,
              opaqueIdentityDifferences,
              routes,
            });
            await retainPending({ family, response, phase: 'exhaustive' });
          }
          console.log(
            `${family}: all ${maximum + 1} permitted responses match baseline-direct/candidate-select/candidate-direct verdicts and evidence`,
          );
        }
      }
    } finally {
      await browser.close();
    }
  }
  await writeFile(
    resolve(directory, 'pending-burden-observations.json'),
    `${JSON.stringify({ result: 'PENDING — observations retained before aggregation/stability gates', sourceHashesAtStart: initialSources, artifactHashesAtStart: sites.map(({ name, hashes }) => ({ name, hashes })), results, exhaustive }, null, 2)}\n`,
  );
  const comparisons = [];
  if (!baselineOnly)
    for (const channel of comparisonDiagnostic
      ? ['chrome']
      : ['chrome', 'msedge']) {
      const before = results.find(
        (item) => item.channel === channel && item.site === 'baseline',
      );
      const after = results.find(
        (item) => item.channel === channel && item.site === 'candidate',
      );
      for (let index = 0; index < before.cases.length; index++) {
        const oldCase = before.cases[index];
        const newCase = after.cases[index];
        assert.deepEqual(oldCase.profile, newCase.profile);
        assert.deepEqual(oldCase.replay, newCase.replay);
        assert.deepEqual(oldCase.task, newCase.task);
        assert.deepEqual(oldCase.keyboard.result, newCase.keyboard.result);
        for (let condition = 0; condition < conditions.length; condition++) {
          const oldMeasure = oldCase.measurements[condition].answerAligned;
          const newMeasure = newCase.measurements[condition].answerAligned;
          assert.ok(
            newMeasure.answerRegionHeight < oldMeasure.answerRegionHeight,
            JSON.stringify({
              channel,
              family: oldCase.family,
              condition,
              oldMeasure,
              newMeasure,
            }),
          );
          if (
            !comparisonDiagnostic &&
            conditions[condition].width === 320 &&
            conditions[condition].font === 32
          )
            assert.ok(
              newMeasure.pageHeight < oldMeasure.pageHeight,
              JSON.stringify({
                channel,
                locale: oldCase.locale,
                family: oldCase.family,
                condition: conditions[condition],
                before: oldMeasure.pageHeight,
                after: newMeasure.pageHeight,
              }),
            );
          comparisons.push({
            channel,
            locale: oldCase.locale,
            family: oldCase.family,
            replay: oldCase.replay,
            condition: conditions[condition],
            beforeAnswerHeight: oldMeasure.answerRegionHeight,
            afterAnswerHeight: newMeasure.answerRegionHeight,
            answerReductionPercent:
              100 *
              (1 -
                newMeasure.answerRegionHeight / oldMeasure.answerRegionHeight),
            beforePageHeight: oldMeasure.pageHeight,
            afterPageHeight: newMeasure.pageHeight,
            wholePageDelta: newMeasure.pageHeight - oldMeasure.pageHeight,
            responseFullyVisible: newMeasure.response.fullyVisible,
            submissionFullyVisible: newMeasure.explicitSubmission.fullyVisible,
            helpFullyVisible: newMeasure.help.fullyVisible,
          });
        }
      }
    }
  if (!baselineOnly)
    assert.deepEqual(
      await sources(),
      initialSources,
      'Source changed during review; rerun against a stable candidate',
    );
  for (const site of sites)
    assert.deepEqual(
      await artifacts(site.directory),
      site.hashes,
      'Immutable served build changed',
    );
  const receipt = {
    result: comparisonDiagnostic
      ? 'OBSERVATIONS ONLY — whole-page extent diagnosis; no full acceptance'
      : baselineOnly
        ? 'PASS — actual baseline reproduction only; candidate comparison not run'
        : 'PASS — bounded actual production answer-interaction comparison',
    renderer:
      'NODE_ENV=production; Vite production; installed Chrome and Edge through existing playwright-core and startProofServer; disposable fixed synthetic contexts',
    baseline: {
      commit: baselineRef,
      sourceObjectAlgorithm: 'Git blob object IDs from ls-tree',
      sourceObjects: baselineSourceObjects.split('\n'),
      artifactHashes: baselineArtifacts,
    },
    sourceHashes: baselineOnly ? null : initialSources,
    sourcesStable: baselineOnly ? null : true,
    candidateArtifactHashes:
      sites.find((site) => site.name === 'candidate')?.hashes ?? null,
    results,
    comparisons,
    exhaustive,
    exhaustiveScope: comparisonDiagnostic
      ? 'Not run in diagnostic mode.'
      : 'All 73 numeric responses (including every wrong answer), baseline direct/candidate select/candidate retained direct, fresh guided synthetic badge context for each route/response, en-GB. Locale-neutral domain verdict and evidence compared; each other locale receives real select/keyboard/layout coverage.',
    identityComparison:
      'Only chapter observation.id (SYNTHETIC- plus main.tsx crypto.randomUUID operation identity) is excluded from semantic hashes. Valid UUID shape and per-record uniqueness are asserted; each other observation field is compared exactly before recording the specific differing identity paths. Completion operation identity is not an evidence claim; correct/evidence/reason and all state counts remain compared.',
    methodology: {
      acceptance:
        'All paired answer regions must shrink; every 320 px wide / 32 px text worst-case full page must shrink. Every full-page delta and actual response/help/submission visibility is retained, including small increases at other conditions.',
      correction:
        'An initial blanket whole-document shrink assertion failed on five default-text conditions with 23–48 px increases despite smaller answer regions. Diagnostic observations showed the tradeoff; the task permits vertical scrolling and does not require universal document shrink. Independent review supported the bounded correction. No clipping, target-size, evidence or recovery assertion was relaxed.',
      paintedControls:
        'checkVisibility plus closed-details ancestry excludes hidden retained direct controls even when Chromium supplies layout rectangles. Collapsed native-entry cases assert zero painted direct submissions.',
    },
    limits: [
      'CSS root font 16px/32px is deliberate text enlargement, not native zoom.',
      'Native-select option popups use browser/OS controls; no real AT delivery, native-language review, physical disconnection, owner/child UX acceptance or educational effectiveness inferred.',
      'Only disposable synthetic contexts; owner saved review databases remain untouched.',
      'Answer alignment leaves 96 CSS pixels before the answer region to observe neighbouring help; task alignment leaves 16 before the heading. Visibility is reported, not inferred from DOM presence.',
    ],
  };
  await writeFile(
    resolve(
      directory,
      comparisonDiagnostic
        ? 'diagnostic-burden-review.json'
        : baselineOnly
          ? 'baseline-burden-review.json'
          : 'burden-review.json',
    ),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
} finally {
  await Promise.all(servers.map((site) => site.server.close()));
}
