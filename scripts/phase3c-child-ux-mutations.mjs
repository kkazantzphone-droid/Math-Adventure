// DEV/TEST only. Run serially after native/browser review has stopped and the
// owner task's candidate sources are frozen. No browser install or AT claim.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const require = createRequire(import.meta.url);
const workspace = resolve('.');
assert.equal(
  process.versions.node,
  readFileSync('.node-version', 'utf8').trim(),
);
assert.equal(
  require('vitest/package.json').version,
  JSON.parse(readFileSync('package.json', 'utf8')).devDependencies.vitest,
  'Use the reviewed exact test pin',
);
const directory = resolve('.cache/phase3c-child-review');
mkdirSync(directory, { recursive: true });
const reportPath = resolve(directory, 'mutation-assertions-temporary.json');
const evidencePath = resolve(directory, 'mutations.json');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const literal = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Include candidate untracked source files as well as the preserved Git tree.
// Documentation can be reconciled independently; every non-document candidate
// input (including pins/config/assets/tests/this runner) must remain unchanged.
const protectedFiles = [
  ...new Set(
    execFileSync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
      .split('\0')
      .filter(
        (file) => file && !file.startsWith('docs/') && !file.endsWith('.md'),
      ),
  ),
].sort();
const sourceHashes = Object.fromEntries(
  protectedFiles.map((file) => [file, sha256(readFileSync(file))]),
);
const targets = [
  'src/ui/synthetic-loop/child-answers.ts',
  'src/ui/synthetic-loop/ChildTaskView.tsx',
  'tests/browser/phase3c/main.tsx',
  'src/ui/synthetic-loop/child-task.css',
];
for (const file of targets) assert(protectedFiles.includes(file));
const originals = new Map(targets.map((file) => [file, readFileSync(file)]));

function filesUnder(root) {
  if (!existsSync(root)) return [];
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(path));
    else if (entry.isFile()) files.push(path);
    else assert.fail('Unexpected link/special file in owned proof artifacts');
  }
  return files.sort();
}

const nativeReportRoots = [
  '.cache/browser-proof',
  '.cache/phase3-browser',
  '.cache/phase3b-proof',
  '.cache/phase3c-browser',
  '.cache/phase3c-child-browser',
  '.cache/phase3c-child-review',
].map((path) => resolve(path));
const artifactRoot = resolve('.cache/phase3c-child-browser/child-site');
const nativeReports = new Map(
  nativeReportRoots
    .flatMap((root) => filesUnder(root))
    .filter(
      (file) =>
        file.endsWith('.json') &&
        file !== reportPath &&
        file !== evidencePath &&
        !file.startsWith(`${artifactRoot}${sep}`),
    )
    .map((file) => [file, readFileSync(file)]),
);
const browserReport = resolve(
  '.cache/phase3c-child-browser/chrome-child-ux-evidence.json',
);
assert(
  nativeReports.has(browserReport),
  'Preserve the completed full Chrome report before filtered mutations',
);
assert(
  nativeReports.has(
    resolve('.cache/phase3c-child-browser/msedge-child-ux-evidence.json'),
  ),
  'Preserve the completed full Edge report before filtered mutations',
);
for (const channel of ['chrome', 'msedge']) {
  const report = JSON.parse(
    nativeReports
      .get(
        resolve(
          `.cache/phase3c-child-browser/${channel}-child-ux-evidence.json`,
        ),
      )
      .toString('utf8'),
  );
  assert(
    report.result.startsWith('PASS') &&
      report.sourcesStable === true &&
      report.cases.length === 18 &&
      report.cases.every((item) => item.outcome === 'pass'),
    'Both native child suites must have completed PASS before filtered mutation tests',
  );
}
const artifactBytes = new Map(
  filesUnder(artifactRoot).map((file) => [file, readFileSync(file)]),
);
assert(artifactBytes.size > 0, 'Full native child build must already exist');

const mutations = [
  {
    id: 'square-card-omits-inclusive-rectangle',
    file: targets[0],
    test: 'validates exactly one static shape card for each bounded rotated/sheared task',
    mechanism: 'independent-bigint-public-coordinate-card-oracle',
    before:
      "        'geometry.parallelogram',\n        'geometry.rectangle',\n        'geometry.square',",
    after: "        'geometry.parallelogram',\n        'geometry.square',",
  },
  {
    id: 'length-card-uses-wrong-required-unit',
    file: targets[0],
    test: 'maps every measureGeometry number card to its exact structured answer and bounds',
    mechanism: 'exact-structured-quantity-unit-identity-assertion',
    before: "  const unit = identifier('unit', LENGTH_UNIT_ID);",
    after: "  const unit = identifier('unit', 'unit.wrong-step');",
  },
  {
    id: 'child-shape-match-receives-full-classification-credit',
    file: targets[2],
    browser: true,
    test: 'never credits child shape matching as full quadrilateral classification evidence',
    mechanism: 'installed-chrome-child-submission-evidence-assertion',
    before:
      "        accessible: !(childSubmission && task.task.kind === 'classifyGeometry'),",
    after:
      '        accessible: true, // MUTATION: promote narrowed child shape matching.',
  },
  {
    id: 'unknown-missing-part-leaks-computed-answer',
    file: targets[1],
    test: 'never resolves the unknown missing part or completed equation in any help stage',
    mechanism: 'rendered-static-markup-unknown-part-no-leak-assertion',
    before:
      '<span className="child-blank" data-unknown-part={part}>\n                          ?\n                        </span>',
    after: [
      '<span className="child-blank" data-unknown-part={part}>',
      "                          {task.unknownPosition === 'total'",
      "                            ? Number(task.left?.numerator ?? '0') + Number(task.right?.numerator ?? '0')",
      "                            : Number(task.total?.numerator ?? '0') - Number((task.left ?? task.right)?.numerator ?? '0')}",
      '                        </span>',
    ].join('\n'),
  },
  {
    id: 'interactive-help-dots-lose-required-graphic-contrast',
    file: targets[3],
    browser: true,
    test: 'number.addition uses immediate direct cards, independent truth and progressive visual help',
    mechanism: 'installed-chrome-computed-help-dot-graphic-contrast-assertion',
    assertionMessage: 'interactive help dot contrast',
    before:
      '.child-task button.child-token {\n  background: #173057;\n  color: #b6f4dc;\n}',
    after:
      '.child-task button.child-token {\n  background: #e5edff;\n  color: #b6f4dc;\n}',
  },
];

const evidence = {
  schema: 'phase3c-child-mutations-v1',
  result: 'PENDING',
  scope:
    'Five executable child presentation defects; exact card/unit/unknown-part assertions and installed Chrome child evidence and computed graphic contrast guards',
  channel: 'chrome',
  sourceHashes,
  protectedSourceCount: protectedFiles.length,
  protectedNativeReportCount: nativeReports.size,
  protectedNativeArtifactCount: artifactBytes.size,
  baselines: [],
  mutations: [],
  restoredBaselines: [],
  exactRestoration: false,
  protectedSourcesStable: false,
  nativeReportsRestored: false,
  nativeArtifactsRestored: false,
  temporaryReportsRemoved: false,
  limits: [
    'No actual assistive-technology delivery, physical disconnect, child comprehension or owner UX confirmation claim',
  ],
};
let activeMutation = null;

function stableSources(allowed) {
  for (const file of protectedFiles) {
    if (file !== allowed)
      assert.equal(
        sha256(readFileSync(file)),
        sourceHashes[file],
        `Concurrent source change; preserve and review ${file}`,
      );
  }
}

function restoreMutation() {
  if (!activeMutation) return;
  const { file, bytes } = activeMutation;
  const original = originals.get(file);
  const current = readFileSync(file);
  assert(
    current.equals(bytes) || current.equals(original),
    'Concurrent target edit conflicts with restoration; preserve the changed source',
  );
  if (!current.equals(original)) writeFileSync(file, original);
  assert(readFileSync(file).equals(original));
  activeMutation = null;
}

function assertOwnedArtifact(file) {
  const path = resolve(file);
  const child = relative(artifactRoot, path);
  assert(
    child &&
      !isAbsolute(child) &&
      child !== '..' &&
      !child.startsWith(`..${sep}`),
    'Artifact restoration must stay inside its explicit owned build directory',
  );
}

function restoreNativeOutputs() {
  // Filtered/mutant reports are never substituted for full native certification.
  for (const [file, bytes] of nativeReports) {
    if (file !== browserReport)
      assert(
        readFileSync(file).equals(bytes),
        `Concurrent native report change; preserve and review ${relative(workspace, file)}`,
      );
    else writeFileSync(file, bytes);
  }
  for (const file of filesUnder(artifactRoot)) {
    assertOwnedArtifact(file);
    if (!artifactBytes.has(file)) unlinkSync(file);
  }
  for (const [file, bytes] of artifactBytes) {
    assertOwnedArtifact(file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  }
}

function runTests(titles, browser = false) {
  if (existsSync(reportPath)) unlinkSync(reportPath);
  let exitCode = 0;
  try {
    execFileSync(
      process.execPath,
      [
        resolve(dirname(require.resolve('vitest/package.json')), 'vitest.mjs'),
        'run',
        ...(browser
          ? [
              '--config',
              'vite.slice.config.ts',
              'tests/integration/phase3c-child-ux.test.ts',
            ]
          : [
              'tests/unit/child-ux-contract.test.ts',
              'tests/unit/child-ux-evidence.test.ts',
            ]),
        '--testNamePattern',
        titles.map(literal).join('|'),
        '--reporter=json',
        '--outputFile',
        reportPath,
      ],
      {
        env: { ...process.env, PHASE3C_BROWSER: 'chrome' },
        stdio: 'pipe',
        timeout: browser ? 180_000 : 60_000,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
  } catch (error) {
    exitCode = Number.isInteger(error.status) ? error.status : -1;
  }
  try {
    assert(
      existsSync(reportPath),
      'No assertion report; detection is unproved',
    );
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    return {
      exitCode,
      assertions: report.testResults
        .flatMap((suite) => suite.assertionResults)
        .filter((result) => titles.includes(result.title)),
    };
  } finally {
    if (existsSync(reportPath)) unlinkSync(reportPath);
    if (browser) restoreNativeOutputs();
  }
}

function mutate(original, mutation) {
  const text = original.toString('utf8').replaceAll('\r\n', '\n');
  assert.equal(
    text.split(mutation.before).length - 1,
    1,
    'Mutation anchor must exist exactly once on the frozen candidate',
  );
  return Buffer.from(text.replace(mutation.before, mutation.after));
}

const unitTitles = mutations
  .filter((mutation) => !mutation.browser)
  .map((mutation) => mutation.test);
const browserTitles = mutations
  .filter((mutation) => mutation.browser)
  .map((mutation) => mutation.test);

function baseline(titles, browser, restored) {
  stableSources();
  const observed = runTests(titles, browser);
  stableSources();
  assert.equal(observed.exitCode, 0, 'Baseline/restored candidate must pass');
  assert.equal(observed.assertions.length, titles.length);
  assert(observed.assertions.every((result) => result.status === 'passed'));
  (restored ? evidence.restoredBaselines : evidence.baselines).push({
    mechanism: browser
      ? 'installed-chrome-child-evidence-guard'
      : 'independent-child-contract-and-SSR',
    result: 'PASS',
    assertions: observed.assertions.length,
    tests: titles,
  });
}

try {
  // Validate all anchors before any source is changed.
  for (const mutation of mutations)
    mutate(originals.get(mutation.file), mutation);
  baseline(unitTitles, false, false);
  baseline(browserTitles, true, false);
  for (const mutation of mutations) {
    stableSources();
    const original = originals.get(mutation.file);
    assert(readFileSync(mutation.file).equals(original));
    try {
      const bytes = mutate(original, mutation);
      activeMutation = { file: mutation.file, bytes };
      writeFileSync(mutation.file, bytes);
      const observed = runTests([mutation.test], mutation.browser === true);
      stableSources(mutation.file);
      assert.equal(observed.assertions.length, 1);
      assert.notEqual(observed.exitCode, 0, 'Executable mutant must fail');
      const intended = observed.assertions[0];
      assert.equal(intended.status, 'failed');
      assert(
        intended.failureMessages.some((message) =>
          /AssertionError|expected .+ to /s.test(message),
        ),
        'Compiler/runtime/timeout failures do not prove intended assertion sensitivity',
      );
      if (mutation.assertionMessage)
        assert(
          intended.failureMessages.some((message) =>
            message.includes(mutation.assertionMessage),
          ),
          'A visual mutant must fail its actual computed graphic contrast assertion',
        );
      evidence.mutations.push({
        id: mutation.id,
        result: 'DETECTED_BY_ASSERTION',
        mechanism: mutation.mechanism,
        test: mutation.test,
        source: mutation.file,
        originalSha256: sha256(original),
        mutantSha256: sha256(readFileSync(mutation.file)),
        failingAssertions: 1,
      });
      process.stdout.write(`DETECTED_BY_ASSERTION ${mutation.id}\n`);
    } finally {
      restoreMutation();
    }
  }
  baseline(unitTitles, false, true);
  baseline(browserTitles, true, true);
  stableSources();
  evidence.result = 'PASS';
} catch (error) {
  evidence.result = 'FAIL';
  throw error;
} finally {
  try {
    restoreMutation();
    restoreNativeOutputs();
  } catch {
    evidence.result = 'FAIL';
  }
  evidence.exactRestoration = [...originals].every(([file, bytes]) =>
    readFileSync(file).equals(bytes),
  );
  evidence.protectedSourcesStable = protectedFiles.every(
    (file) => sha256(readFileSync(file)) === sourceHashes[file],
  );
  evidence.nativeReportsRestored = [...nativeReports].every(([file, bytes]) =>
    readFileSync(file).equals(bytes),
  );
  evidence.nativeArtifactsRestored =
    filesUnder(artifactRoot).length === artifactBytes.size &&
    [...artifactBytes].every(
      ([file, bytes]) => existsSync(file) && readFileSync(file).equals(bytes),
    );
  if (existsSync(reportPath)) unlinkSync(reportPath);
  evidence.temporaryReportsRemoved = !existsSync(reportPath);
  if (
    !evidence.exactRestoration ||
    !evidence.protectedSourcesStable ||
    !evidence.nativeReportsRestored ||
    !evidence.nativeArtifactsRestored ||
    !evidence.temporaryReportsRemoved
  )
    evidence.result = 'FAIL';
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  assert.equal(evidence.result, 'PASS');
}
process.stdout.write(
  'PASS five child-UX assertion mutations; exact source, reports and native build restored\n',
);
