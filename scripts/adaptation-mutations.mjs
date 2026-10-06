// Run serially after all source/test edits stop. No raw assertion diff is retained.
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
const directory = resolve('.cache/phase3b-mutations');
mkdirSync(directory, { recursive: true });
const reportPath = resolve(directory, 'assertions-temporary.json');
const evidencePath = resolve(directory, 'evidence.json');
const stateFile = 'src/domain/adaptation/state.ts';
const selectionFile = 'src/domain/adaptation/selection.ts';
const originals = new Map(
  [stateFile, selectionFile].map((file) => [file, readFileSync(file)]),
);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const mutations = [
  {
    id: 'solution-exposed-success-independent',
    file: stateFile,
    test: 'exhausts structured classification flags against a separate direct rule oracle',
    before:
      "  if (input.solutionExposed) return result('excluded', 'solutionExposed');",
    after: '  // MUTATION: exposed correct answers count independently.',
  },
  {
    id: 'related-concept-evidence-transfer',
    file: stateFile,
    test: 'records independent representation scope without transferring related/domain evidence',
    before: '    concepts = {\n      ...concepts,',
    after:
      "    concepts = {\n      ...concepts,\n      'counting.cardinality': summarize(before, [...before.observations, observation].slice(-policy.perConceptLimit), scope, retained.clockCertain, input.coarseDay),",
  },
  {
    id: 'pre-activation-support-recovery',
    file: stateFile,
    test: 'cannot clear newly activated support with old pre-activation independent revisits',
    before: 'item.ordinal > state.supportActivatedAfter && item.input.revisit',
    after: 'item.input.revisit',
  },
  {
    id: 'uncertain-delayed-retrieval-credit',
    file: stateFile,
    test: 'suspends rollback/uncertain date advancement and delayed retrieval until explicit resolution',
    before:
      "    if (!certain || !last.clockCertain)\n      return result('excluded', 'clockUncertain');",
    after: '    // MUTATION: uncertain dates qualify delayed retrieval.',
  },
  {
    id: 'strict-priority-starvation',
    file: selectionFile,
    test: 'offers the lower-priority ready concept within three offers even across one-offer sessions',
    before: '    (c) => (session.lastOffered[c.concept] ?? 0) === oldest,',
    after: '    () => true, // MUTATION: discard age before class priority.',
  },
  {
    id: 'number-lab-promotes-mastery',
    file: stateFile,
    test: 'keeps numberLab outside all mastery bytes even after elapsed/uncertain time',
    before: '  const input = syntheticObservationFromInput(raw);',
    after:
      "  const decoded = syntheticObservationFromInput(raw);\n  const input = decoded?.mode === 'numberLab' ? { ...decoded, mode: 'practice' } : decoded;",
  },
];
const evidence = {
  result: 'PENDING',
  sourceHashes: {},
  baseline: null,
  mutations: [],
  exactRestoration: false,
};
for (const file of [
  stateFile,
  selectionFile,
  'src/domain/adaptation/catalog.ts',
  'src/domain/adaptation/policy.ts',
  'src/domain/adaptation/types.ts',
  'tests/unit/adaptation-state.test.ts',
  'tests/unit/adaptation-selection.test.ts',
  'tests/property/adaptation-catalog.test.ts',
  'tests/property/adaptation-independent.test.ts',
  'tests/unit/adaptation-containment-review.test.ts',
  'scripts/adaptation-mutations.mjs',
])
  evidence.sourceHashes[file] = sha256(readFileSync(file));
const literal = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function test(pattern) {
  if (existsSync(reportPath)) unlinkSync(reportPath);
  let exitCode = 0;
  try {
    execFileSync(
      process.execPath,
      [
        resolve(dirname(require.resolve('vitest/package.json')), 'vitest.mjs'),
        'run',
        'tests/unit/adaptation-state.test.ts',
        'tests/unit/adaptation-selection.test.ts',
        '--testNamePattern',
        pattern,
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
    assert(
      existsSync(reportPath),
      'No report means assertion detection is unproven',
    );
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
function mutate(original, before, after) {
  const text = original.toString('utf8').replaceAll('\r\n', '\n');
  assert(
    text.includes(before),
    'Mutation anchor missing; review changed source',
  );
  assert.equal(
    text.indexOf(before),
    text.lastIndexOf(before),
    'Mutation anchor must be unique',
  );
  return text.replace(before, after);
}
try {
  const baseline = test(mutations.map((m) => literal(m.test)).join('|'));
  const assertions = baseline.assertions.filter(
    (a) => a.status !== 'pending' && a.status !== 'skipped',
  );
  assert.equal(baseline.exitCode, 0);
  assert.equal(assertions.length, 6);
  assert(assertions.every((a) => a.status === 'passed'));
  evidence.baseline = { result: 'PASS', assertions: assertions.length };
  for (const mutation of mutations) {
    const original = originals.get(mutation.file);
    assert(readFileSync(mutation.file).equals(original));
    try {
      writeFileSync(
        mutation.file,
        mutate(original, mutation.before, mutation.after),
      );
      const observed = test(literal(mutation.test));
      const relevant = observed.assertions.filter(
        (a) => a.title === mutation.test,
      );
      assert.equal(relevant.length, 1);
      assert.notEqual(observed.exitCode, 0);
      assert.equal(relevant[0].status, 'failed');
      assert(
        relevant[0].failureMessages.some((message) =>
          /AssertionError|expected .+ to /s.test(message),
        ),
        'Only assertion failure counts; runtime/type failure is insufficient',
      );
      evidence.mutations.push({
        id: mutation.id,
        test: mutation.test,
        result: 'DETECTED_BY_ASSERTION',
        source: mutation.file,
        originalSha256: sha256(original),
        mutantSha256: sha256(readFileSync(mutation.file)),
      });
      process.stdout.write(`DETECTED_BY_ASSERTION ${mutation.id}\n`);
    } finally {
      writeFileSync(mutation.file, original);
      assert(readFileSync(mutation.file).equals(original));
    }
  }
  evidence.result = 'PASS';
} catch (error) {
  evidence.result = 'FAIL';
  throw error;
} finally {
  for (const [file, bytes] of originals) writeFileSync(file, bytes);
  evidence.exactRestoration = [...originals].every(([file, bytes]) =>
    readFileSync(file).equals(bytes),
  );
  if (existsSync(reportPath)) unlinkSync(reportPath);
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  assert(evidence.exactRestoration);
}
process.stdout.write(
  'PASS six adaptation assertion mutations; exact bytes restored\n',
);
