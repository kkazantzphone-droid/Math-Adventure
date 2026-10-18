// Existing Vitest assertion-mutation procedure; run serially on stable source.
import assert from 'node:assert/strict';
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
const helper = 'src/ui/synthetic-loop/chapter-answers.ts';
const original = readFileSync(helper);
const directory = resolve('.cache/clear-answers-mutations');
mkdirSync(directory, { recursive: true });
const reportPath = resolve(directory, 'assertions-temporary.json');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const mutations = [
  {
    id: 'drop-permitted-response-twenty-five',
    before: '        : 25;',
    after: '        : 24;',
  },
  {
    id: 'submit-a-different-whole-number',
    before: '    numerator: String(value),',
    after: '    numerator: String(value + 1),',
  },
  {
    id: 'misclassify-square-unit-area-as-length',
    before: "          dimension: 'area',",
    after: "          dimension: 'length',",
  },
];
const evidence = {
  schema: 'math-adventure.clear-answers-integrity-review-v1',
  marker: 'synthetic-only',
  reviewDate: '2026-10-18',
  result: 'PENDING',
  independentAuthor:
    'Independent integrity reviewer; did not author answer-entry product changes',
  binding:
    'Working-tree hashes, not a claim that uncommitted source is committed',
  baselineRevision: execFileSync(
    'git',
    ['-c', 'core.fsmonitor=false', 'rev-parse', 'HEAD'],
    { encoding: 'utf8' },
  ).trim(),
  sourceHashes: {},
  oracle: {
    importsProductionTruth: false,
    method:
      'Existing separate cardinality/equation/grid-cell oracle; fixed historical UI ranges; independently constructed old direct-answer DTOs',
    finiteParameterRepresentationTuples: 740,
    allPermittedResponseTuples: 14_852,
    applicationResponseHelpAttemptContexts: 1_224,
    localesWithCompleteOptionsAndDirectCards: ['el-GR', 'en-GB', 'de-DE'],
  },
  baselineTests: 0,
  mutations: [],
  restoredTests: 0,
  exactRestoration: false,
  findings: [
    {
      id: 'submitted-direct-answer-visible-selection',
      result: 'REPAIRED_SOURCE_REVIEW',
      detail:
        'Shared choose now updates the visible response before submitting a direct card, avoiding a previously selected compact value being misrepresented',
      browserReverification: 'Required separately on the production candidate',
    },
  ],
  limits: [
    'Complete finite parameter/representation and response coverage, not all 128-bit seeds',
    'Mathematical and wire/evidence compatibility only; no new assessed skill or policy is certified by browser-free tests',
    'Rendered keyboard/focus/native-select behavior, actual assistive technology, physical offline, language quality and owner UX acceptance require their separate evidence',
  ],
};
for (const file of [
  helper,
  'src/ui/synthetic-loop/ChapterAnswerEntry.tsx',
  'src/ui/synthetic-loop/ChapterTaskView.tsx',
  'src/presentation/localisation/answer-entry-copy.ts',
  'tests/browser/phase3c/main.tsx',
  'tests/unit/clear-answers-integrity-review.test.ts',
  'tests/oracle/growing-world.ts',
  'src/application/synthetic-loop/answer.ts',
  'src/application/growing-world.ts',
  'src/domain/growing-world/content.ts',
  'src/domain/growing-world/support.ts',
  'scripts/clear-answers-mutations.mjs',
])
  evidence.sourceHashes[file] = hash(readFileSync(file));

function runTests() {
  if (existsSync(reportPath)) unlinkSync(reportPath);
  let exitCode = 0;
  try {
    execFileSync(
      process.execPath,
      [
        resolve(dirname(require.resolve('vitest/package.json')), 'vitest.mjs'),
        'run',
        'tests/unit/clear-answers-integrity-review.test.ts',
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
    return {
      exitCode,
      assertions: JSON.parse(
        readFileSync(reportPath, 'utf8'),
      ).testResults.flatMap((suite) => suite.assertionResults),
    };
  } finally {
    if (existsSync(reportPath)) unlinkSync(reportPath);
  }
}

function requirePassing(result) {
  assert.equal(result.exitCode, 0);
  assert(
    result.assertions.length > 0 &&
      result.assertions.every((test) => test.status === 'passed'),
  );
  return result.assertions.length;
}

try {
  evidence.baselineTests = requirePassing(runTests());
  for (const mutation of mutations) {
    assert(readFileSync(helper).equals(original));
    const text = original.toString('utf8').replaceAll('\r\n', '\n');
    assert.equal(text.split(mutation.before).length - 1, 1);
    try {
      writeFileSync(helper, text.replace(mutation.before, mutation.after));
      const observed = runTests();
      const failures = observed.assertions.filter(
        (test) => test.status === 'failed',
      );
      assert.notEqual(observed.exitCode, 0);
      assert(failures.length > 0);
      assert(
        failures.some((test) =>
          test.failureMessages.some((message) =>
            /AssertionError|expected .+ to /s.test(message),
          ),
        ),
        'A compile/tool failure cannot establish sensitivity',
      );
      evidence.mutations.push({
        id: mutation.id,
        result: 'DETECTED_BY_ASSERTION',
        failingTests: failures.length,
        tests: failures.map((test) => test.title),
        mutantSha256: hash(readFileSync(helper)),
      });
      process.stdout.write(`DETECTED_BY_ASSERTION ${mutation.id}\n`);
    } finally {
      writeFileSync(helper, original);
      assert(readFileSync(helper).equals(original));
    }
  }
  evidence.restoredTests = requirePassing(runTests());
  evidence.result = 'PASS';
} finally {
  writeFileSync(helper, original);
  evidence.exactRestoration = readFileSync(helper).equals(original);
  if (existsSync(reportPath)) unlinkSync(reportPath);
  mkdirSync('docs/evidence/clear-answers', { recursive: true });
  writeFileSync(
    'docs/evidence/clear-answers/integrity-review.json',
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  assert(evidence.exactRestoration);
}
process.stdout.write(
  'PASS three response mutations; exact original helper bytes restored\n',
);
