// DEV/TEST evidence checks. Recorded references do not replace command success.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function writeEvidence(directory, report) {
  await mkdir(directory, { recursive: true });
  await writeFile(
    resolve(directory, 'last-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

export async function beginEvidence(directory) {
  const report = {
    schema: 'math-adventure-browser-proof-v1',
    synthetic: true,
    scope: 'test environment capability, not production Phase 1E',
    result: 'RUNNING',
  };
  await writeEvidence(directory, report);
  return report;
}

export function assertCleanObservations(
  observations,
  { missingPath, offlinePaths = [] } = {},
) {
  assert.deepEqual(
    observations.pageErrors,
    [],
    'Unexpected browser script error',
  );
  assert.deepEqual(
    observations.externalAttempts,
    [],
    'Application attempted external traffic',
  );
  const expected404 = (path, phase) =>
    path === '/favicon.ico' ||
    (path === missingPath && phase === 'missing-asset');
  const expectedOffline = (path, phase) =>
    phase === 'offline' && offlinePaths.includes(path);
  assert(
    observations.responses.every(
      (item) =>
        item.status < 400 ||
        (item.status === 404 && expected404(item.path, item.phase)),
    ),
    'Unexpected browser error response',
  );
  assert(
    observations.failures.every(
      (item) =>
        item.error === 'net::ERR_INTERNET_DISCONNECTED' &&
        expectedOffline(item.path, item.phase),
    ),
    'Unexpected browser request failure',
  );
  assert(
    observations.consoleErrors.every((item) => {
      if (item.source !== 'page') return false;
      if (
        /^Failed to load resource: net::ERR_INTERNET_DISCONNECTED$/.test(
          item.text,
        )
      ) {
        return (
          expectedOffline(item.path, item.phase) &&
          observations.failures.some(
            (failure) =>
              failure.path === item.path &&
              failure.phase === item.phase &&
              failure.error === 'net::ERR_INTERNET_DISCONNECTED',
          )
        );
      }
      if (
        /^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/.test(
          item.text,
        )
      ) {
        return (
          expected404(item.path, item.phase) &&
          observations.responses.some(
            (response) =>
              response.path === item.path &&
              response.phase === item.phase &&
              response.status === 404,
          )
        );
      }
      return false;
    }),
    'Unexpected browser console error',
  );
}
