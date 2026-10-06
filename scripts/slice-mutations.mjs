// Domain-preparation mutations only. Run serially with all source edits stopped.
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
const source = 'src/domain/families/slice.ts';
const original = readFileSync(source);
const normalized = original.toString('utf8').replaceAll('\r\n', '\n');
const directory = resolve('.cache/phase3c-mutations');
mkdirSync(directory, { recursive: true });
const reportPath = resolve(directory, 'assertions-temporary.json');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const valueAnchor =
  "    answer = { kind: 'exactValue', expected: exact(first.value) };";
const mutations = [
  {
    id: 'numeral-wrong-quantity',
    before: valueAnchor,
    after: valueAnchor.replace('exact(first.value)', 'exact(first.value + 1)'),
    occurrence: 0,
  },
  {
    id: 'count-off-by-one',
    before: valueAnchor,
    after: valueAnchor.replace('exact(first.value)', 'exact(first.value + 1)'),
    occurrence: 1,
  },
  {
    id: 'comparison-inverted',
    before: '      first.value < second.value',
    after: '      first.value > second.value',
  },
  {
    id: 'subtraction-adds-removed',
    before: '      expected: exact(first.value - removed.value),',
    after: '      expected: exact(first.value + removed.value),',
  },
  {
    id: 'missing-left-uses-right',
    before: "        unknownPosition === 'left'\n          ? first.value",
    after: "        unknownPosition === 'left'\n          ? second.value",
  },
  {
    id: 'forged-instance-accepted',
    before: '  return rebuilt.ok && canonical.value === rebuilt.value',
    after: '  return rebuilt.ok',
  },
];
const evidence = {
  scope: 'standalone-domain-preparation-only',
  result: 'PENDING',
  sourceHashes: {},
  baselineAssertions: 0,
  mutations: [],
  exactRestoration: false,
};
for (const file of [
  source,
  'src/application/slice-family.ts',
  'tests/oracle/slice-families.ts',
  'tests/unit/domain/slice-families.test.ts',
  'scripts/slice-mutations.mjs',
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
        'tests/unit/domain/slice-families.test.ts',
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

function altered(mutation) {
  const occurrences = normalized.split(mutation.before).length - 1;
  assert.equal(
    occurrences,
    mutation.occurrence === undefined ? 1 : 2,
    'Source changed; review mutation anchor',
  );
  let index = normalized.indexOf(mutation.before);
  if (mutation.occurrence === 1)
    index = normalized.indexOf(mutation.before, index + mutation.before.length);
  return (
    normalized.slice(0, index) +
    mutation.after +
    normalized.slice(index + mutation.before.length)
  );
}

try {
  const baseline = runTests();
  assert.equal(baseline.exitCode, 0);
  assert(
    baseline.assertions.length > 0 &&
      baseline.assertions.every((a) => a.status === 'passed'),
  );
  evidence.baselineAssertions = baseline.assertions.length;
  for (const mutation of mutations) {
    assert(readFileSync(source).equals(original));
    try {
      writeFileSync(source, altered(mutation));
      const observed = runTests();
      const failures = observed.assertions.filter((a) => a.status === 'failed');
      assert.notEqual(observed.exitCode, 0);
      assert(failures.length > 0);
      assert(
        failures.some((a) =>
          a.failureMessages.some((message) =>
            /AssertionError|expected .+ to /s.test(message),
          ),
        ),
        'Only mathematical/assertion failure counts',
      );
      // Keep names/counts/hashes only; no raw assertion data is retained.
      evidence.mutations.push({
        id: mutation.id,
        result: 'DETECTED_BY_ASSERTION',
        failingAssertions: failures.length,
        tests: failures.map((a) => a.title),
        mutantSha256: hash(readFileSync(source)),
      });
      process.stdout.write(
        `DETECTED_BY_ASSERTION ${mutation.id}: ${failures.length}\n`,
      );
    } finally {
      writeFileSync(source, original);
      assert(readFileSync(source).equals(original));
    }
  }
  evidence.result = 'PASS';
} catch (error) {
  evidence.result = 'FAIL';
  throw error;
} finally {
  writeFileSync(source, original);
  evidence.exactRestoration = readFileSync(source).equals(original);
  if (existsSync(reportPath)) unlinkSync(reportPath);
  writeFileSync(
    resolve(directory, 'evidence.json'),
    JSON.stringify(evidence, null, 2) + '\n',
  );
  assert(evidence.exactRestoration);
}
process.stdout.write(
  'PASS six domain mutations; exact original bytes restored\n',
);
