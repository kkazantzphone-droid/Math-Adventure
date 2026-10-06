// DEV/TEST only. Run serially with a frozen source tree and no other test/build.
// Child assertion reports exist only temporarily; retained evidence has no rows,
// fingerprints, command payloads, native messages, or browser profile paths.
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
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(
  process.versions.node,
  readFileSync('.node-version', 'utf8').trim(),
);
assert.equal(
  require('vitest/package.json').version,
  packageJson.devDependencies.vitest,
  'Use the reviewed exact Vitest pin',
);
const channel = process.env.PHASE3_BROWSER ?? 'chrome';
assert(
  ['chrome', 'msedge'].includes(channel),
  'Use an actual required browser',
);
const directory = resolve('.cache/phase3-mutations');
mkdirSync(directory, { recursive: true });
const reportPath = resolve(directory, 'assertions-temporary.json');
const evidencePath = resolve(directory, `${channel}-evidence.json`);
const browserEvidencePath = resolve(
  `.cache/phase3-browser/${channel}-evidence.json`,
);
const browserEvidence = existsSync(browserEvidencePath)
  ? readFileSync(browserEvidencePath)
  : undefined;
const adapterPath = 'src/infrastructure/persistence/adapter.ts';
const maintenancePath = 'src/infrastructure/persistence/maintenance.ts';
const originals = new Map(
  [adapterPath, maintenancePath].map((file) => [file, readFileSync(file)]),
);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceHashes = {};
for (const file of [
  adapterPath,
  maintenancePath,
  'src/infrastructure/persistence/layout.ts',
  'tests/integration/phase3-persistence.test.ts',
  'tests/browser/phase3/harness.ts',
  'tests/conformance/repository.ts',
])
  sourceHashes[file] = sha256(readFileSync(file));

function replaceExactly(source, before, after) {
  const normalized = source.toString('utf8').replaceAll('\r\n', '\n');
  const first = normalized.indexOf(before);
  assert(first >= 0, 'Mutation source anchor missing; review the candidate');
  assert.equal(
    first,
    normalized.lastIndexOf(before),
    'Mutation source anchor must be unique',
  );
  return normalized.replace(before, after);
}

const deletionTest =
  'delete fences all old sessions, preserves survivor and forbids stale resurrection/dedup';
const mutations = [
  {
    id: 'stale-revision-accepted',
    file: adapterPath,
    test: 'two overlapping clients cannot overwrite a loaded revision',
    before:
      "                  if (\n                    command.kind !== 'create' &&\n                    current?.revision !== command.expectedRevision\n                  ) {\n                    reject('revision_conflict');\n                    return;\n                  }",
    after: '                  // MUTATION: accept a stale expected revision.',
  },
  {
    id: 'stale-epoch-accepted',
    file: adapterPath,
    test: deletionTest,
    before:
      "          if (command.storageEpoch !== control.storageEpoch) {\n            reject('epoch_conflict');\n            return;\n          }",
    after: '          // MUTATION: accept an obsolete storage epoch.',
  },
  {
    id: 'success-before-transaction-completion',
    file: adapterPath,
    test: 'competing creates and native abort/failure never publish partial state or early saved success',
    before: '            pending = result;',
    after:
      '            pending = result;\n            resolve(result); // MUTATION: request preparation claims saved before commit.',
  },
  {
    id: 'delete-fence-not-rotated',
    file: adapterPath,
    test: deletionTest,
    before:
      "                  const nextEpoch =\n                    command.kind === 'delete'\n                      ? advanceEpoch(control.storageEpoch)\n                      : applicationSuccess(control.storageEpoch);",
    after:
      '                  const nextEpoch = applicationSuccess(control.storageEpoch); // MUTATION: retain obsolete fence.',
  },
  {
    id: 'exact-retry-receipt-ignored',
    file: adapterPath,
    test: 'returns original create/update receipts after lost responses and later writes',
    before: '              if (priorRequest.result !== undefined) {',
    after:
      '              if (false && priorRequest.result !== undefined) { // MUTATION: bypass exact success receipt.',
  },
  {
    id: 'migration-silently-resets-incompatible-rows',
    file: maintenancePath,
    test: 'refuses incompatible migration input without resetting source data',
    before:
      '    const checked = storedRecordFromData(\n      cursor.value,\n      cursor.key,\n      codec,\n      version,\n    );\n    if (!checked.ok) {\n      fail(checked.error.code);\n      return;\n    }',
    after:
      "    const checked = storedRecordFromData(\n      cursor.value,\n      cursor.key,\n      codec,\n      version,\n    );\n    if (!checked.ok) {\n      // MUTATION: destroy incompatible input and migrate an empty aggregate.\n      transaction.objectStore('records').clear();\n      transaction.objectStore('receipts').clear();\n      done([]);\n      return;\n    }",
  },
];
const evidence = {
  result: 'PENDING',
  channel,
  sourceHashes,
  baseline: undefined,
  mutations: [],
  exactRestoration: false,
};
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));

function test(pattern) {
  if (existsSync(reportPath)) unlinkSync(reportPath);
  let exitCode = 0;
  try {
    // The canonical outer command is corepack pnpm persistence:mutations. This
    // direct child uses the exact installed test pin, avoiding nested Corepack
    // coordination locks during the exclusively serialized mutation sequence.
    execFileSync(
      process.execPath,
      [
        resolve(dirname(require.resolve('vitest/package.json')), 'vitest.mjs'),
        'run',
        '--config',
        'vite.persistence.config.ts',
        '--testNamePattern',
        pattern,
        '--reporter=json',
        '--outputFile',
        reportPath,
      ],
      {
        env: { ...process.env, PHASE3_BROWSER: channel },
        stdio: 'pipe',
        timeout: 120_000,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
  } catch (error) {
    exitCode = Number.isInteger(error.status) ? error.status : -1;
  }
  try {
    assert(
      existsSync(reportPath),
      'Test report unavailable; detection unproven',
    );
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const assertions = report.testResults.flatMap(
      (suite) => suite.assertionResults,
    );
    return { exitCode, assertions };
  } finally {
    // Vitest assertion diffs may contain fixed synthetic row payloads. Never
    // retain those raw reports or echo child output as mutation evidence.
    if (existsSync(reportPath)) unlinkSync(reportPath);
  }
}

function literalPattern(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

try {
  console.log(
    'Persistence mutation baseline: selected real-browser assertions',
  );
  const baseline = test(
    [...new Set(mutations.map((mutation) => mutation.test))]
      .map(literalPattern)
      .join('|'),
  );
  const baselineObserved = baseline.assertions.filter(
    (item) => item.status !== 'pending' && item.status !== 'skipped',
  );
  assert.equal(baseline.exitCode, 0, 'Unmutated baseline must pass');
  assert.equal(
    baselineObserved.length,
    5,
    'All five distinct baseline tests required',
  );
  assert(baselineObserved.every((item) => item.status === 'passed'));
  evidence.baseline = { result: 'PASS', assertions: baselineObserved.length };
  for (const mutation of mutations) {
    const original = originals.get(mutation.file);
    assert(original, 'Mutation may modify only declared source');
    assert.equal(sha256(readFileSync(mutation.file)), sha256(original));
    console.log(`Persistence assertion mutation: ${mutation.id}`);
    try {
      writeFileSync(
        mutation.file,
        replaceExactly(original, mutation.before, mutation.after),
      );
      const observed = test(literalPattern(mutation.test));
      const relevant = observed.assertions.filter(
        (item) => item.title === mutation.test,
      );
      assert.equal(
        relevant.length,
        1,
        'Exactly one intended assertion test required',
      );
      assert.notEqual(observed.exitCode, 0, 'Injected defect must fail');
      assert.equal(relevant[0].status, 'failed', 'Intended test must fail');
      assert(
        relevant[0].failureMessages.some((message) =>
          /AssertionError|expected .+ to /s.test(message),
        ),
        'Assertion must detect the mutation; compilation/runtime errors do not count',
      );
      evidence.mutations.push({
        id: mutation.id,
        test: mutation.test,
        result: 'DETECTED_BY_ASSERTION',
        source: mutation.file,
        originalSha256: sha256(original),
        mutantSha256: sha256(readFileSync(mutation.file)),
      });
    } finally {
      writeFileSync(mutation.file, original);
      assert.equal(sha256(readFileSync(mutation.file)), sha256(original));
    }
  }
  evidence.result = 'PASS';
} catch (error) {
  evidence.result = 'FAIL';
  throw error;
} finally {
  // Buffer restoration preserves BOM/newline bytes as well as source content.
  for (const [file, original] of originals) writeFileSync(file, original);
  evidence.exactRestoration = [...originals].every(([file, original]) =>
    readFileSync(file).equals(original),
  );
  if (browserEvidence) writeFileSync(browserEvidencePath, browserEvidence);
  else if (existsSync(browserEvidencePath)) unlinkSync(browserEvidencePath);
  if (existsSync(reportPath)) unlinkSync(reportPath);
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  assert(evidence.exactRestoration, 'Exact source byte restoration required');
}
console.log(
  'Persistence mutations: six assertion detections; exact source restored',
);
