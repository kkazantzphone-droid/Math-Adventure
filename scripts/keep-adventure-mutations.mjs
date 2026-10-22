// Restored assertion mutations for backup/restore. Run serially on stable
// source with no other build, test or proof running; exact bytes are restored.
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
const channel = process.env.PHASE3C_BROWSER ?? 'chrome';
assert(['chrome', 'msedge'].includes(channel));
const directory = resolve('.cache/keep-adventure-mutations');
mkdirSync(directory, { recursive: true });
const reportPath = resolve(directory, 'assertions-temporary.json');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const backup = 'src/application/synthetic-loop/backup.ts';
const storage = 'src/infrastructure/persistence/synthetic-loop-backup.ts';
const outcome = 'src/ui/synthetic-loop/backup-outcome.ts';
const suites = {
  unit: [
    'run',
    'tests/unit/keep-adventure-backup.test.ts',
    'tests/unit/keep-adventure-ui.test.tsx',
  ],
  browser: [
    'run',
    '--config',
    'vite.slice.config.ts',
    'tests/integration/keep-adventure.test.ts',
  ],
};
/** Each defect is a plausible regression in a critical new path. */
const mutations = [
  {
    id: 'trust-file-without-checksum',
    file: backup,
    suite: 'unit',
    before: '  if (body === null || sha256Hex(body) !== checksum.value)',
    after: '  if (body === null)',
  },
  {
    id: 'export-unsettled-pending-answer',
    file: backup,
    suite: 'unit',
    before:
      '  const { derived, pending, lastCompletion, ...portable } = record;',
    after:
      '  const { derived, lastCompletion, ...portable } = record;\n  const pending = null;',
  },
  {
    id: 'accept-incompatible-provenance',
    file: backup,
    suite: 'unit',
    before: "    return fail('incompatible');\n  if (profiles.length === 0)",
    after: '    void 0;\n  if (profiles.length === 0)',
  },
  {
    id: 'preview-supported-answers-as-independent',
    file: backup,
    suite: 'unit',
    before:
      "    independent: count((item) => item.outcome === 'independentSuccess'),",
    after:
      "    independent: count(\n      (item) =>\n        item.outcome === 'independentSuccess' ||\n        item.outcome === 'supportedSuccess',\n    ),",
  },
  {
    id: 'restore-under-source-epoch-zero',
    file: backup,
    suite: 'unit',
    before: '        storageEpoch: epoch.value,\n        payload: record,',
    after: '        storageEpoch: 0,\n        payload: record,',
  },
  {
    id: 'accept-free-text-evidence-ids',
    file: backup,
    suite: 'unit',
    before:
      "    ].some((id) => typeof id !== 'string' || !APP_EVIDENCE_ID.test(id))",
    after: "    ].some((id) => typeof id !== 'string')",
  },
  {
    id: 'count-confirmations-as-not-counted',
    file: backup,
    suite: 'unit',
    before: "        item.reason !== 'independentConfirmation',",
    after: '        true,',
  },
  {
    id: 'claim-restored-from-commit-without-readback',
    file: outcome,
    suite: 'unit',
    before: "  if (readback === 'restored') return { kind: 'restored' };",
    after:
      "  if (readback === 'restored' || commit?.ok === true)\n    return { kind: 'restored' };",
  },
  {
    id: 'probe-creates-absent-database',
    file: storage,
    suite: 'browser',
    before:
      "      if (!absent) failure = 'unsupported_schema';\n      request.transaction?.abort();",
    after:
      "      if (!absent) {\n        failure = 'unsupported_schema';\n        request.transaction?.abort();\n      }",
  },
  {
    id: 'ignore-deletion-fence-epoch',
    file: storage,
    suite: 'browser',
    before: '        if (current !== epoch) {',
    after: '        if (current !== epoch && current < 0) {',
  },
  {
    id: 'overwrite-nonempty-destination',
    file: storage,
    suite: 'browser',
    before: '            if (recordCount.result !== 0) {',
    after: '            if (recordCount.result < 0) {',
  },
  {
    id: 'swallow-transaction-abort',
    file: storage,
    suite: 'browser',
    before:
      "                  if (fault === 'abort') fail('storage_unavailable');",
    after: "                  if (fault === 'abort') void 0;",
  },
  {
    id: 'readback-accepts-any-rows',
    file: storage,
    suite: 'browser',
    before: "          complete(exact ? 'restored' : 'different');",
    after:
      "          complete(exact || total.result > 0 ? 'restored' : 'different');",
  },
];
const originals = new Map(
  [...new Set(mutations.map((item) => item.file))].map((file) => [
    file,
    readFileSync(file),
  ]),
);
const evidence = {
  schema: 'math-adventure.keep-adventure-mutations-v1',
  marker: 'synthetic-only',
  result: 'PENDING',
  channel,
  binding:
    'Working-tree source hashes at run time; browser mutations rebuild the synthetic slice',
  baselineRevision: execFileSync(
    'git',
    ['-c', 'core.fsmonitor=false', 'rev-parse', 'HEAD'],
    { encoding: 'utf8' },
  ).trim(),
  sourceHashes: Object.fromEntries(
    [...originals.keys(), 'scripts/keep-adventure-mutations.mjs'].map(
      (file) => [file, hash(readFileSync(file))],
    ),
  ),
  baseline: {},
  mutations: [],
  restored: {},
  exactRestoration: false,
};

function run(suite) {
  if (existsSync(reportPath)) unlinkSync(reportPath);
  let exitCode = 0;
  try {
    execFileSync(
      process.execPath,
      [vitest, ...suites[suite], '--reporter=json', '--outputFile', reportPath],
      {
        stdio: 'pipe',
        timeout: 900_000,
        maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, PHASE3C_BROWSER: channel },
      },
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
  for (const suite of Object.keys(suites))
    evidence.baseline[suite] = passing(run(suite));
  for (const mutation of mutations) {
    assert(restore());
    const text = originals
      .get(mutation.file)
      .toString('utf8')
      .replaceAll('\r\n', '\n');
    assert.equal(
      text.split(mutation.before).length - 1,
      1,
      `${mutation.id} anchor must occur once`,
    );
    try {
      writeFileSync(
        mutation.file,
        text.replace(mutation.before, mutation.after),
      );
      const observed = run(mutation.suite);
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
        suite: mutation.suite,
        result: 'DETECTED_BY_ASSERTION',
        failingTests: failures.map((test) => test.title),
        mutantSha256: hash(readFileSync(mutation.file)),
      });
      process.stdout.write(`DETECTED_BY_ASSERTION ${mutation.id}\n`);
    } finally {
      assert(restore());
    }
  }
  for (const suite of Object.keys(suites))
    evidence.restored[suite] = passing(run(suite));
  evidence.result = 'PASS';
} finally {
  evidence.exactRestoration = restore();
  if (existsSync(reportPath)) unlinkSync(reportPath);
  mkdirSync('docs/evidence/keep-my-adventure', { recursive: true });
  writeFileSync(
    `docs/evidence/keep-my-adventure/mutations-${channel}.json`,
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  assert(evidence.exactRestoration);
}
process.stdout.write(
  `PASS ${mutations.length} restored mutations; exact original bytes restored\n`,
);
