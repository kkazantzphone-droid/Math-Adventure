// Restored assertion mutations for varied play. Run serially on stable source
// with no other build, test or proof running; exact bytes are restored.
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
const vitest = resolve(
  dirname(require.resolve('vitest/package.json')),
  'vitest.mjs',
);
const directory = resolve('.cache/varied-play-mutations');
mkdirSync(directory, { recursive: true });
const reportPath = resolve(directory, 'assertions-temporary.json');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const seed = 'src/application/synthetic-loop/seed.ts';
const backup = 'src/application/synthetic-loop/backup.ts';
const pictures = 'src/ui/synthetic-loop/child-pictures.ts';
const view = 'src/ui/synthetic-loop/ChildTaskView.tsx';
const suite = [
  'run',
  'tests/unit/synthetic-loop-seed.test.ts',
  'tests/unit/keep-adventure-backup.test.ts',
  'tests/unit/child-localisation.test.tsx',
];
/** Each defect is a plausible regression in a critical new path. */
const mutations = [
  {
    id: 'reuse-v1-correlated-seeds',
    file: seed,
    before:
      "  if (index === undefined || index + 1 >= 16)\n    return applicationFailure('invalid_command');",
    after:
      "  if (index === undefined || index + 1 >= 16)\n    return applicationFailure('invalid_command');\n  if (index >= 0) return syntheticLoopTaskSeedV1(profile, family, ordinal);",
  },
  {
    id: 'one-lane-constant-for-every-word',
    file: seed,
    before: 'mix32(key + Math.imul(lane, 0x9e3779b9))',
    after: 'mix32(key + Math.imul(lane > 0 ? 1 : 0, 0x9e3779b9))',
  },
  {
    id: 'badges-share-one-seed-space',
    file: seed,
    before: '(profile === SYNTHETIC_PROFILE_IDS[0] ? 0 : 1 << 24)',
    after: '(profile === SYNTHETIC_PROFILE_IDS[0] ? 0 : 0)',
  },
  {
    id: 'accept-any-seed-provenance',
    file: backup,
    // Every other compatibility field is still checked; only the seed name is
    // ignored, so an unknown seed selection would be reinterpreted.
    before: '  const compatibility = canonicalText(data.compatibility);',
    after:
      '  const compatibility = canonicalText({\n    ...(dataRecord(data.compatibility, 64) ?? {}),\n    taskSeeds: SYNTHETIC_LOOP_SEED_VERSION,\n  });',
  },
  {
    id: 'export-old-seed-provenance',
    file: backup,
    before: '  taskSeeds: SYNTHETIC_LOOP_SEED_VERSION,\n});',
    after: "  taskSeeds: 'phase3c-session-seeds-v1',\n});",
  },
  {
    id: 'always-draw-dots',
    file: pictures,
    before: "  return CHILD_PICTURES[word % CHILD_PICTURES.length] ?? 'dot';",
    after: "  return CHILD_PICTURES[word % 1] ?? 'dot';",
  },
  {
    id: 'name-every-picture-a-dot',
    file: view,
    before: '    dotLabel: instruction[picture],',
    after: '    dotLabel: instruction.dot,',
  },
];
const originals = new Map(
  [...new Set(mutations.map((item) => item.file))].map((file) => [
    file,
    readFileSync(file),
  ]),
);
const evidence = {
  schema: 'math-adventure.varied-play-mutations-v1',
  marker: 'synthetic-only',
  result: 'PENDING',
  binding: 'Working-tree source hashes at run time; unit suites only',
  baselineRevision: execFileSync(
    'git',
    ['-c', 'core.fsmonitor=false', 'rev-parse', 'HEAD'],
    { encoding: 'utf8' },
  ).trim(),
  sourceHashes: Object.fromEntries(
    [...originals.keys(), 'scripts/varied-play-mutations.mjs'].map((file) => [
      file,
      hash(readFileSync(file)),
    ]),
  ),
  baseline: 0,
  mutations: [],
  restored: 0,
  exactRestoration: false,
};

function run() {
  if (existsSync(reportPath)) unlinkSync(reportPath);
  let exitCode = 0;
  try {
    execFileSync(
      process.execPath,
      [vitest, ...suite, '--reporter=json', '--outputFile', reportPath],
      { stdio: 'pipe', timeout: 900_000, maxBuffer: 16 * 1024 * 1024 },
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
      ).testResults.flatMap((item) => item.assertionResults),
    };
  } finally {
    if (existsSync(reportPath)) unlinkSync(reportPath);
  }
}
function passing(result) {
  assert.equal(result.exitCode, 0);
  assert(
    result.assertions.length > 0 &&
      result.assertions.every((test) => test.status === 'passed'),
  );
  return result.assertions.length;
}
function restore() {
  for (const [file, bytes] of originals) writeFileSync(file, bytes);
  return [...originals].every(([file, bytes]) =>
    readFileSync(file).equals(bytes),
  );
}

try {
  evidence.baseline = passing(run());
  for (const mutation of mutations) {
    assert(restore());
    let text = originals
      .get(mutation.file)
      .toString('utf8')
      .replaceAll('\r\n', '\n');
    assert.equal(
      text.split(mutation.before).length - 1,
      1,
      `${mutation.id} anchor must occur once`,
    );
    text = text.replace(mutation.before, mutation.after);
    try {
      writeFileSync(mutation.file, text);
      const observed = run();
      const failures = observed.assertions.filter(
        (test) => test.status === 'failed',
      );
      assert.notEqual(observed.exitCode, 0, `${mutation.id} survived`);
      assert(failures.length > 0, `${mutation.id} survived`);
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
        file: mutation.file,
        result: 'DETECTED_BY_ASSERTION',
        failingTests: failures.map((test) => test.title),
        mutantSha256: hash(readFileSync(mutation.file)),
      });
      process.stdout.write(`DETECTED_BY_ASSERTION ${mutation.id}\n`);
    } finally {
      assert(restore());
    }
  }
  evidence.restored = passing(run());
  evidence.result = 'PASS';
} finally {
  evidence.exactRestoration = restore();
  if (existsSync(reportPath)) unlinkSync(reportPath);
  mkdirSync('docs/evidence/varied-play', { recursive: true });
  writeFileSync(
    'docs/evidence/varied-play/mutations.json',
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  assert(evidence.exactRestoration);
}
process.stdout.write(
  `PASS ${mutations.length} restored mutations; exact original bytes restored\n`,
);
