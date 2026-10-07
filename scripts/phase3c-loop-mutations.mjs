// DEV/TEST only. Run serially after every source/test edit and other build stops.
// The UI and manual profiling mutations use installed Chrome. Other mutations
// exercise the application integration/guard assertions below; they do not prove AT,
// physical disconnection or native transaction behavior on their own.
// Retain only source hashes, test names, counts and stable result codes.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
assert.equal(
  process.versions.node,
  readFileSync('.node-version', 'utf8').trim(),
  'Use the repository Node pin',
);
assert.equal(
  require('vitest/package.json').version,
  JSON.parse(readFileSync('package.json', 'utf8')).devDependencies.vitest,
  'Use the reviewed exact Vitest pin',
);
const directory = resolve('.cache/phase3c-loop-mutations');
mkdirSync(directory, { recursive: true });
const reportPath = resolve(directory, 'assertions-temporary.json');
const evidencePath = resolve(directory, 'evidence.json');
const browserEvidence = new Map(
  ['chrome', 'msedge'].map((channel) => {
    const file = resolve(
      `.cache/phase3c-browser/${channel}-loop-evidence.json`,
    );
    return [file, existsSync(file) ? readFileSync(file) : null];
  }),
);
const session = 'src/application/synthetic-loop/session.ts';
const answer = 'src/application/synthetic-loop/answer.ts';
const main = 'tests/browser/phase3c/main.tsx';
const unitFiles = [
  'tests/unit/synthetic-loop.test.ts',
  'tests/unit/phase3c-mutation-boundaries.test.ts',
];
const browserFile = 'tests/integration/phase3c-loop.test.ts';
const savedTest =
  'does not show saved success before both journal and terminal transactions complete';
const originals = new Map(
  [session, answer, main].map((file) => [file, readFileSync(file)]),
);
let activeMutation = null;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const literal = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mutations = [
  {
    id: 'ui-wrong-answer-shows-correct',
    file: main,
    browser: true,
    mechanism: 'installed-chrome-rendered-feedback',
    test: 'renders number.addition, rejects an independent wrong answer, and accepts the oracle',
    replacements: [
      {
        before:
          "    setFeedback(completion.correct ? 'correct' : 'retry');\n    setFinished(true);\n  }\n\n  async function retrySave()",
        after:
          "    setFeedback('correct'); // MUTATION: wrong answer gets success feedback.\n    setFinished(true);\n  }\n\n  async function retrySave()",
      },
    ],
  },
  {
    id: 'save-success-before-transaction-completion',
    file: session,
    mechanism: 'application-delayed-transaction-integration',
    test: savedTest,
    replacements: [
      {
        before: '      saved,\n      busy: inFlight > 0,',
        after: '      saved: saved || inFlight > 0,\n      busy: inFlight > 0,',
      },
    ],
  },
  {
    id: 'exact-retry-duplicates-logical-evidence',
    file: session,
    mechanism: 'application-retry-integration',
    test: 'exact retry returns one logical completion and changed retry refuses',
    replacements: [
      {
        before: [
          '      const token = fence;',
          '      inFlight += 1;',
          '      try {',
          '        return await execute(lastRetry.command, token);',
          '      } catch {',
          "        if (token !== fence) return applicationFailure('operation_conflict');",
          '        uncertain = true;',
          '        readOnly = true;',
          "        return failure('storage_unavailable');",
          '      } finally {',
          '        inFlight -= 1;',
          '      }',
        ].join('\n'),
        after:
          '      // MUTATION: resubmit one logical retry with a fresh operation.\n      return await submit(request, `${operation}-duplicate`);',
      },
    ],
  },
  {
    id: 'manual-mode-creates-profiling-evidence',
    file: session,
    browser: true,
    mechanism: 'installed-chrome-manual-persisted-evidence',
    test: 'renders number.addition, rejects an independent wrong answer, and accepts the oracle',
    replacements: [
      {
        before:
          '    const prepared = prepareSyntheticLoopAnswer(\n      record,',
        after:
          "    // MUTATION: silently promote manual play into proposed-policy profiling.\n    record = { ...record, mode: 'synthetic-policy' };\n    const prepared = prepareSyntheticLoopAnswer(\n      record,",
      },
    ],
  },
  {
    id: 'profile-switch-leaks-initial-profile-state',
    file: session,
    mechanism: 'application-unsaved-profile-integration',
    test: 'switching unsaved profiles resets identity, progress and exploratory memory',
    replacements: [
      {
        before: '    record = initialSyntheticLoop(profile);',
        after:
          '    record = initialSyntheticLoop(SYNTHETIC_PROFILE_IDS[0]); // MUTATION: wrong profile.',
      },
    ],
  },
  {
    id: 'exploration-promotes-persistent-mastery',
    file: answer,
    mechanism: 'application-exploration-integration',
    test: 'new families report limitedEvidence and exploratory exposure stays session-only',
    // Both changes are needed for an executable defect: the record codec also
    // rejects non-practice observations, so bypassing only the early return
    // would prove a codec rejection rather than persistent promotion.
    replacements: [
      {
        before: '    mode: row.playMode,',
        after:
          "    mode: 'practice', // MUTATION: disguise exploratory exposure.",
      },
      {
        before: "  if (row.playMode !== 'practice')",
        after:
          '  if (false) // MUTATION: allow exploration to enter persistence.',
      },
    ],
  },
  {
    id: 'unresolved-transaction-reports-update-ready',
    file: session,
    mechanism: 'application-delayed-transaction-readiness-guard',
    test: savedTest,
    replacements: [
      {
        before: [
          '    isUpdateReady: () =>',
          '      !inFlight &&',
          '      !uncertain &&',
          '      !record?.pending &&',
          '      !readOnly &&',
          '      !unsaved &&',
          '      snapshot !== null,',
        ].join('\n'),
        after:
          '    isUpdateReady: () => snapshot !== null, // MUTATION: unresolved writes count ready.',
      },
    ],
  },
  {
    id: 'inaccessible-representation-receives-evidence-credit',
    file: answer,
    mechanism: 'application-evidence-scope-integration',
    test: 'mathematical help changes classification while neutral accessibility support does not',
    replacements: [
      {
        before: '    accessible: row.accessible,',
        after: '    accessible: true, // MUTATION: inaccessible scope counts.',
      },
    ],
  },
];

const protectedFiles = [
  ...originals.keys(),
  ...unitFiles,
  browserFile,
  'tests/browser/phase3c/runtime.ts',
  'src/application/synthetic-loop/record.ts',
  'src/application/synthetic-loop/seed.ts',
  'src/application/synthetic-loop/index.ts',
  'src/application/synthetic-loop/types.ts',
  'src/application/family-proof.ts',
  'src/application/slice-family.ts',
  'src/domain/families/proof-evidence.ts',
  'src/domain/families/proofs.ts',
  'src/domain/families/slice.ts',
  'tests/oracle/family-proof.ts',
  'tests/oracle/slice-families.ts',
  'src/domain/adaptation/state.ts',
  'src/domain/adaptation/policy.ts',
  'src/infrastructure/persistence/adapter.ts',
  'src/infrastructure/persistence/synthetic-loop-database.ts',
  'src/infrastructure/offline/browserOffline.ts',
  'src/infrastructure/offline/shell-worker.ts',
  'src/ui/synthetic-loop/TaskView.tsx',
  'src/ui/offline/OfflineControls.tsx',
  'scripts/pwa-build.ts',
  'vite.config.ts',
  'vite.slice.config.ts',
  'scripts/phase3c-loop-mutations.mjs',
  '.node-version',
  'package.json',
  'pnpm-lock.yaml',
];
const evidence = {
  result: 'PENDING',
  scope:
    'synthetic-loop mutation sensitivity; application boundaries plus installed Chrome rendered feedback',
  channel: 'chrome',
  sourceHashes: Object.fromEntries(
    protectedFiles.map((file) => [file, sha256(readFileSync(file))]),
  ),
  baselines: [],
  mutations: [],
  exactRestoration: false,
  protectedSourcesStable: false,
  temporaryReportsRemoved: false,
  browserEvidenceRestored: false,
};

function stable(allowed) {
  for (const file of protectedFiles) {
    if (file !== allowed)
      assert.equal(
        sha256(readFileSync(file)),
        evidence.sourceHashes[file],
        'Source changed concurrently; stop and review the candidate',
      );
  }
}

function runTests(titles, browser = false) {
  if (existsSync(reportPath)) unlinkSync(reportPath);
  let exitCode = 0;
  try {
    // Child execution reuses the exact installed test pin and Node binary.
    // Child output/assertion payloads remain private and are never echoed.
    execFileSync(
      process.execPath,
      [
        resolve(dirname(require.resolve('vitest/package.json')), 'vitest.mjs'),
        'run',
        ...(browser
          ? ['--config', 'vite.slice.config.ts', browserFile]
          : unitFiles),
        '--testNamePattern',
        titles.map(literal).join('|'),
        '--reporter=json',
        '--outputFile',
        reportPath,
      ],
      {
        env: { ...process.env, PHASE3C_BROWSER: 'chrome' },
        stdio: 'pipe',
        timeout: browser ? 120_000 : 60_000,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
  } catch (error) {
    exitCode = Number.isInteger(error.status) ? error.status : -1;
  }
  try {
    assert(existsSync(reportPath), 'No assertion report; detection unproved');
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    return {
      exitCode,
      assertions: report.testResults
        .flatMap((suite) => suite.assertionResults)
        .filter((result) => titles.includes(result.title)),
    };
  } finally {
    if (existsSync(reportPath)) unlinkSync(reportPath);
  }
}

function mutate(original, replacements) {
  let source = original.toString('utf8').replaceAll('\r\n', '\n');
  for (const { before, after } of replacements) {
    assert(source.includes(before), 'Mutation anchor missing; review source');
    assert.equal(
      source.indexOf(before),
      source.lastIndexOf(before),
      'Mutation anchor must be unique',
    );
    source = source.replace(before, after);
  }
  return source;
}

function restoreMutation() {
  if (!activeMutation) return;
  const { file, bytes } = activeMutation;
  const original = originals.get(file);
  const current = readFileSync(file);
  // Preserve a concurrent edit rather than overwrite it with our snapshot.
  assert(
    current.equals(bytes) || current.equals(original),
    'Concurrent edit conflicts with restoration; preserve the changed source',
  );
  if (!current.equals(original)) writeFileSync(file, original);
  assert(readFileSync(file).equals(original));
  activeMutation = null;
}

try {
  const unitTitles = [
    ...new Set(
      mutations
        .filter((mutation) => mutation.browser !== true)
        .map((mutation) => mutation.test),
    ),
  ];
  const browserTitles = [
    ...new Set(
      mutations
        .filter((mutation) => mutation.browser === true)
        .map((mutation) => mutation.test),
    ),
  ];
  for (const [mechanism, titles, browser] of [
    ['application-assertions', unitTitles, false],
    ['installed-chrome-rendered-feedback', browserTitles, true],
  ]) {
    stable();
    const baseline = runTests(titles, browser);
    stable();
    assert.equal(baseline.exitCode, 0, 'Baseline must pass before mutation');
    assert.equal(baseline.assertions.length, titles.length);
    assert(baseline.assertions.every((result) => result.status === 'passed'));
    evidence.baselines.push({
      mechanism,
      result: 'PASS',
      assertions: baseline.assertions.length,
      tests: titles,
    });
  }
  for (const mutation of mutations) {
    stable();
    const original = originals.get(mutation.file);
    assert(readFileSync(mutation.file).equals(original));
    try {
      const bytes = Buffer.from(mutate(original, mutation.replacements));
      activeMutation = { file: mutation.file, bytes };
      writeFileSync(mutation.file, bytes);
      const observed = runTests([mutation.test], mutation.browser === true);
      stable(mutation.file);
      assert.equal(observed.assertions.length, 1);
      assert.notEqual(observed.exitCode, 0, 'Mutant must fail');
      const intended = observed.assertions[0];
      assert.equal(intended.status, 'failed');
      assert(
        intended.failureMessages.some((message) =>
          /AssertionError|expected .+ to /s.test(message),
        ),
        'Only intended assertion failure counts; compiler/runtime failure is insufficient',
      );
      evidence.mutations.push({
        id: mutation.id,
        test: mutation.test,
        result: 'DETECTED_BY_ASSERTION',
        mechanism: mutation.mechanism,
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
  // An assertion passing again after restoration is additional proof that the
  // failure was caused by the temporary mutation, not a persistent test defect.
  for (const [titles, browser] of [
    [unitTitles, false],
    [browserTitles, true],
  ]) {
    stable();
    const restored = runTests(titles, browser);
    assert.equal(restored.exitCode, 0, 'Restored candidate must pass');
    assert.equal(restored.assertions.length, titles.length);
    assert(restored.assertions.every((result) => result.status === 'passed'));
  }
  stable();
  evidence.result = 'PASS';
} catch (error) {
  evidence.result = 'FAIL';
  throw error;
} finally {
  try {
    restoreMutation();
  } catch {
    evidence.result = 'FAIL';
  }
  evidence.exactRestoration = [...originals].every(([file, bytes]) =>
    readFileSync(file).equals(bytes),
  );
  evidence.protectedSourcesStable = protectedFiles.every(
    (file) => sha256(readFileSync(file)) === evidence.sourceHashes[file],
  );
  if (existsSync(reportPath)) unlinkSync(reportPath);
  evidence.temporaryReportsRemoved = !existsSync(reportPath);
  // Filtered/mutant browser reports are not a final browser certification.
  // Preserve any previous full-suite report; root reruns the full suite after
  // restoration to bind final browser artifacts to the final candidate.
  for (const [file, bytes] of browserEvidence) {
    if (bytes !== null) writeFileSync(file, bytes);
    else if (existsSync(file)) unlinkSync(file);
  }
  evidence.browserEvidenceRestored = [...browserEvidence].every(
    ([file, bytes]) =>
      bytes === null ? !existsSync(file) : readFileSync(file).equals(bytes),
  );
  if (
    !evidence.exactRestoration ||
    !evidence.protectedSourcesStable ||
    !evidence.temporaryReportsRemoved ||
    !evidence.browserEvidenceRestored
  )
    evidence.result = 'FAIL';
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  assert(evidence.exactRestoration);
  assert(evidence.protectedSourcesStable);
  assert(evidence.temporaryReportsRemoved);
  assert(evidence.browserEvidenceRestored);
}
process.stdout.write(
  'PASS eight loop assertion mutations; exact source bytes restored\n',
);
