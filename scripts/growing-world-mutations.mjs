// Run serially only after source is stable. Every temporary edit is restored exactly.
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
const content = 'src/domain/growing-world/content.ts';
const explore = 'src/domain/growing-world/explore.ts';
const originals = new Map(
  [content, explore].map((path) => [path, readFileSync(path)]),
);
const directory = resolve('.cache/growing-world-mutations');
mkdirSync(directory, { recursive: true });
const reportPath = resolve(directory, 'assertions-temporary.json');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const mutations = [
  {
    id: 'make-ten-wrong-filler',
    file: content,
    before: '    answer = gap;',
    after: '    answer = gap + 1;',
  },
  {
    id: 'missing-part-adds-known',
    file: content,
    before: '    answer = total - known;',
    after: '    answer = total + known;',
  },
  {
    id: 'equal-groups-adds-instead-of-counting-cells',
    file: content,
    before:
      "      taskData = { kind: 'equalGroups', groups: a, each: b };\n      answer = a * b;",
    after:
      "      taskData = { kind: 'equalGroups', groups: a, each: b };\n      answer = a + b;",
  },
  {
    id: 'missing-group-returns-count-of-groups',
    file: content,
    before: '      answer = b;',
    after: '      answer = a;',
  },
  {
    id: 'array-area-counts-only-one-row',
    file: content,
    before: "        dimension: 'area',\n      };\n      answer = a * b;",
    after: "        dimension: 'area',\n      };\n      answer = b;",
  },
  {
    id: 'principal-square-side-negative-root',
    file: content,
    before: '    answer = side;',
    after: '    answer = -side;',
  },
  {
    id: 'area-unit-identity-ignored',
    file: content,
    before:
      "  if (quantity.unitId !== CHAPTER_AREA_UNIT || quantity.dimension !== 'area')",
    after: "  if (quantity.dimension !== 'area')",
  },
  {
    id: 'rotated-products-create-new-evidence',
    file: content,
    before:
      "  return `${task.kind === 'equalGroups' ? 'equal-groups' : 'array-area'}:${Math.min(a, b)}:${Math.max(a, b)}`;",
    after:
      "  return `${task.kind === 'equalGroups' ? 'equal-groups' : 'array-area'}:${a}:${b}`;",
  },
  {
    id: 'explore-move-unit-loses-part-total',
    file: explore,
    before: '      return success({ ...workspace, left: workspace.left + 1 });',
    after: '      return success({ ...workspace, left: workspace.left - 1 });',
  },
  {
    id: 'explore-principal-side-off-by-one',
    file: explore,
    before: '    principalRoot: isSquare ? workspace.rows : null,',
    after: '    principalRoot: isSquare ? workspace.rows + 1 : null,',
  },
  {
    id: 'explore-turn-changes-cell-cardinality',
    file: explore,
    before: '                  columns: workspace.rows,',
    after: '                  columns: workspace.columns,',
  },
];
const evidence = {
  schema: 'math-adventure.growing-world-math-review-v1',
  scope: 'synthetic finite content and pure Explore transitions',
  result: 'PENDING',
  reviewDate: '2026-10-18',
  independentAuthor:
    'Independent review agent; did not author production content or Explore modules',
  binding:
    'Working-tree source hashes; the parent/base revision is not a claim that uncommitted implementation is committed',
  baseRevision: execFileSync(
    'git',
    ['-c', 'core.fsmonitor=false', 'rev-parse', 'HEAD'],
    { encoding: 'utf8' },
  ).trim(),
  sourceHashes: {},
  oracle: {
    importsProductionCode: false,
    method:
      'Token cardinalities, finite equation search, equal-bucket sharing and logical grid-cell enumeration; separately authored BigInt PRNG reference supplies deterministic tuple witnesses',
    parameterRepresentationCases: {
      'number.make-ten': 52,
      'number.part-whole': 580,
      'groups.equal': 32,
      'groups.missing': 32,
      'measurement.array-area': 32,
      'powers.square-side': 12,
      total: 740,
    },
    semanticFingerprintCases: {
      'number.make-ten': 4,
      'number.part-whole': 145,
      'groups.equal': 10,
      'groups.missing': 16,
      'measurement.array-area': 10,
      'powers.square-side': 6,
      total: 191,
    },
    explore: {
      splitStates: 231,
      splitTransitions: 924,
      arrayStates: 25,
      arrayTransitions: 150,
    },
    limits: [
      'Parameter/representation and semantic-case coverage is exhaustive; the 128-bit seed space is not exhausted',
      'Two missing-part unknown positions and both concrete/relational representations are separate parameter cases, not independent mathematical evidence',
      'This review certifies bounded logical unit-square cardinality and principal positive square sides, not general polygon measurement, arbitrary roots or a curriculum',
      'No browser, actual offline/device, accessibility delivery, native-language, educational-effectiveness, retention or learner-outcome claims',
    ],
  },
  baselineTests: 0,
  mutations: [],
  restoredTests: 0,
  exactRestoration: false,
};
for (const file of [
  content,
  explore,
  'src/application/growing-world.ts',
  'tests/oracle/growing-world.ts',
  'tests/oracle/xoshiro-reference.ts',
  'tests/unit/domain/growing-world-independent.test.ts',
  'scripts/growing-world-mutations.mjs',
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
        'tests/unit/domain/growing-world-independent.test.ts',
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
    const original = originals.get(mutation.file);
    assert(original && readFileSync(mutation.file).equals(original));
    const normalized = original.toString('utf8').replaceAll('\r\n', '\n');
    assert.equal(
      normalized.split(mutation.before).length - 1,
      1,
      `Changed mutation anchor: ${mutation.id}`,
    );
    try {
      writeFileSync(
        mutation.file,
        normalized.replace(mutation.before, mutation.after),
      );
      const observed = runTests();
      const failures = observed.assertions.filter(
        (test) => test.status === 'failed',
      );
      assert.notEqual(observed.exitCode, 0);
      assert(
        failures.length > 0,
        'A build/tool failure cannot establish mutation sensitivity',
      );
      assert(
        failures.some((test) =>
          test.failureMessages.some((message) =>
            /AssertionError|expected .+ to /s.test(message),
          ),
        ),
        'A mathematical assertion must fail',
      );
      evidence.mutations.push({
        id: mutation.id,
        source: mutation.file,
        result: 'DETECTED_BY_MATHEMATICAL_ASSERTION',
        failingTests: failures.length,
        tests: failures.map((test) => test.title),
        mutantSha256: hash(readFileSync(mutation.file)),
      });
      process.stdout.write(
        `DETECTED_BY_MATHEMATICAL_ASSERTION ${mutation.id}: ${failures.length}\n`,
      );
    } finally {
      writeFileSync(mutation.file, original);
      assert(readFileSync(mutation.file).equals(original));
    }
  }
  evidence.restoredTests = requirePassing(runTests());
  evidence.result = 'PASS';
} catch (error) {
  evidence.result = 'FAIL';
  throw error;
} finally {
  for (const [file, original] of originals) writeFileSync(file, original);
  evidence.exactRestoration = [...originals].every(([file, original]) =>
    readFileSync(file).equals(original),
  );
  if (existsSync(reportPath)) unlinkSync(reportPath);
  mkdirSync('docs/evidence/growing-world', { recursive: true });
  writeFileSync(
    'docs/evidence/growing-world/math-review.json',
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  assert(evidence.exactRestoration);
}
process.stdout.write(
  'PASS eleven growing-world mathematical mutations; exact original bytes restored\n',
);
