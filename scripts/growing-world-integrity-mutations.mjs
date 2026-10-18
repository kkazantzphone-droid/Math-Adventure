// DEV/TEST only. Run serially after policy/application source is frozen.
// Retains only paths, hashes, test titles and stable assertion outcomes.
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
);
assert.equal(
  require('vitest/package.json').version,
  JSON.parse(readFileSync('package.json', 'utf8')).devDependencies.vitest,
);
const directory = resolve('.cache/growing-world-integrity-mutations');
mkdirSync(directory, { recursive: true });
const reportPath = resolve(directory, 'assertions-temporary.json');
const evidencePath = resolve(
  'docs/evidence/growing-world/integrity-mutations.json',
);
mkdirSync(dirname(evidencePath), { recursive: true });
const journey = 'src/domain/growing-world/journey.ts';
const record = 'src/application/synthetic-loop/record.ts';
const journeyTest = 'tests/unit/growing-world-journey.test.ts';
const integrityTest = 'tests/unit/growing-world-integrity-review.test.ts';
const candidateTest = 'tests/unit/growing-world-candidate-review.test.ts';
const supportTest = 'tests/unit/growing-world-support-review.test.ts';
const answer = 'src/application/synthetic-loop/answer.ts';
const session = 'src/application/synthetic-loop/session.ts';
const protectedFiles = [
  journey,
  record,
  answer,
  session,
  'src/domain/growing-world/support.ts',
  journeyTest,
  integrityTest,
  candidateTest,
  supportTest,
];
const originals = new Map(
  protectedFiles.map((file) => [file, readFileSync(file)]),
);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const mutations = [
  {
    id: 'saved-help-tier-ignored-on-answer',
    file: answer,
    testFile: supportTest,
    test: 'refuses prepared chapter or legacy pending payloads that understate saved help',
    before: '? chapterSupportTier(record.chapterSupport, replay.value)',
    after: '? 0',
  },
  {
    id: 'legacy-pending-support-scope-confusion',
    file: record,
    testFile: supportTest,
    test: 'refuses prepared chapter or legacy pending payloads that understate saved help',
    before: 'entry.familyId === familyId &&',
    after: 'entry.familyId === record.selectedFamily &&',
  },
  {
    id: 'new-session-retains-old-support-context',
    file: session,
    testFile: supportTest,
    test: 'clears support only at an explicit new session while preserving historical observations',
    before: 'chapterSupport: [],',
    after: 'chapterSupport: current.chapterSupport,',
  },
  {
    id: 'finite-scope-confirmation-starvation',
    file: journey,
    testFile: candidateTest,
    test: 'recovers after all four relationships first succeed in one session and representation',
    before: "return make('excluded', 'independentConfirmation');",
    after: "return make('excluded', 'repeatedRelationship');",
  },
  {
    id: 'hint-counts-independent',
    file: journey,
    testFile: journeyTest,
    test: 'keeps help/retry/exposed/incorrect experiences separate from independent evidence',
    before: 'input.mathematicalHintTier > 0 || input.meaningfulAttempts > 1',
    after: 'input.mathematicalHintTier > 3 || input.meaningfulAttempts > 1',
  },
  {
    id: 'repeat-counts-independent',
    file: journey,
    testFile: journeyTest,
    test: 'repetition cannot inflate distinct cases and confirmations are bounded',
    before: "return make('excluded', 'repeatedRelationship');",
    after: "return make('independentSuccess', 'independent');",
  },
  {
    id: 'chapter-pending-without-observation',
    file: record,
    testFile: integrityTest,
    test: 'rejects absent/null chapter evidence in synthetic-policy chapter pending payloads',
    before: '!chapterPending) ||',
    after: 'false) ||',
  },
  {
    id: 'cross-journal-pending-id-reuse',
    file: record,
    testFile: integrityTest,
    test: 'rejects a historical pending ID already used by a chapter observation',
    before:
      '(event) => event.id === `SYNTHETIC-${record.pending?.operationId}`',
    after: '() => false',
  },
];
let active = null;
function stable(except) {
  for (const [file, bytes] of originals)
    if (file !== except)
      assert(readFileSync(file).equals(bytes), `Concurrent edit: ${file}`);
}
function restore() {
  if (!active) return;
  const { file, bytes } = active;
  const original = originals.get(file);
  const current = readFileSync(file);
  assert(
    current.equals(bytes) || current.equals(original),
    `Concurrent mutation conflict: ${file}`,
  );
  if (!current.equals(original)) writeFileSync(file, original);
  assert(
    readFileSync(file).equals(original),
    `Exact restoration failed: ${file}`,
  );
  active = null;
}
function run(file, title) {
  if (existsSync(reportPath)) unlinkSync(reportPath);
  let exitCode = 0;
  try {
    execFileSync(
      process.execPath,
      [
        resolve(dirname(require.resolve('vitest/package.json')), 'vitest.mjs'),
        'run',
        file,
        '--testNamePattern',
        title,
        '--reporter=json',
        '--outputFile',
        reportPath,
      ],
      { stdio: 'pipe', timeout: 60_000, maxBuffer: 8 * 1024 * 1024 },
    );
  } catch (error) {
    exitCode = Number.isInteger(error.status) ? error.status : -1;
  }
  try {
    assert(existsSync(reportPath), 'No assertion report; detection unproved');
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const matches = report.testResults
      .flatMap((suite) => suite.assertionResults)
      .filter((item) => item.title === title);
    assert.equal(matches.length, 1);
    return { exitCode, assertion: matches[0] };
  } finally {
    if (existsSync(reportPath)) unlinkSync(reportPath);
  }
}
const evidence = {
  schema: 'growing-world-integrity-mutations-v1',
  marker: 'synthetic-only',
  mechanism: 'focused-vitest-assertions',
  node: process.versions.node,
  sources: protectedFiles.map((path) => ({
    path,
    sha256: sha256(originals.get(path)),
  })),
  baselines: [],
  mutations: [],
  restored: [],
  limits: [
    'No native transaction, browser, educational or real-learner certification.',
  ],
};
try {
  for (const mutation of mutations) {
    stable();
    const baseline = run(mutation.testFile, mutation.test);
    assert.equal(baseline.exitCode, 0, 'Baseline must pass');
    assert.equal(baseline.assertion.status, 'passed');
    evidence.baselines.push({ test: mutation.test, result: 'PASS' });
    const original = originals.get(mutation.file);
    const text = original.toString('utf8').replaceAll('\r\n', '\n');
    assert(
      text.includes(mutation.before),
      `Missing mutation anchor: ${mutation.id}`,
    );
    assert.equal(
      text.indexOf(mutation.before),
      text.lastIndexOf(mutation.before),
      'Mutation anchor must be unique',
    );
    const bytes = Buffer.from(text.replace(mutation.before, mutation.after));
    active = { file: mutation.file, bytes };
    try {
      writeFileSync(mutation.file, bytes);
      const observed = run(mutation.testFile, mutation.test);
      stable(mutation.file);
      assert.notEqual(observed.exitCode, 0, 'Mutant must fail');
      assert.equal(observed.assertion.status, 'failed');
      assert(
        observed.assertion.failureMessages.some((message) =>
          /AssertionError|expected .+ to /s.test(message),
        ),
        'Only an intended assertion failure counts',
      );
      evidence.mutations.push({
        id: mutation.id,
        source: mutation.file,
        originalSha256: sha256(original),
        mutantSha256: sha256(bytes),
        test: mutation.test,
        result: 'DETECTED_BY_ASSERTION',
      });
      process.stdout.write(`DETECTED_BY_ASSERTION ${mutation.id}\n`);
    } finally {
      restore();
    }
    const restored = run(mutation.testFile, mutation.test);
    assert.equal(restored.exitCode, 0);
    assert.equal(restored.assertion.status, 'passed');
    stable();
    evidence.restored.push({ test: mutation.test, result: 'PASS' });
  }
  evidence.result = 'PASS';
} finally {
  restore();
  stable();
  evidence.exactBufferRestoration = true;
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}
process.stdout.write(
  `PASS ${mutations.length} assertion mutations; exact Buffer restoration\n`,
);
