import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertCleanObservations,
  beginEvidence,
  writeEvidence,
} from '../../scripts/browser-proof/evidence.mjs';
import type { Observations } from '../../scripts/browser-proof/evidence.mjs';

function clean(): Observations {
  return {
    failures: [],
    responses: [],
    consoleErrors: [],
    pageErrors: [],
    externalAttempts: [],
  };
}

describe('browser proof evidence integrity', () => {
  it('accepts clean observations', () => {
    expect(() => assertCleanObservations(clean())).not.toThrow();
  });
  it('accepts only the correlated missing-asset negative control', () => {
    const observations = clean();
    observations.responses.push({
      path: '/missing.js',
      status: 404,
      phase: 'missing-asset',
    });
    observations.consoleErrors.push({
      path: '/missing.js',
      phase: 'missing-asset',
      source: 'page',
      text: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
    });
    expect(() =>
      assertCleanObservations(observations, { missingPath: '/missing.js' }),
    ).not.toThrow();
    expect(() =>
      assertCleanObservations(observations, { missingPath: '/other.js' }),
    ).toThrow();
  });
  it('rejects an uncorrelated generic 404 console error', () => {
    const observations = clean();
    observations.consoleErrors.push({
      path: '/missing.js',
      phase: 'missing-asset',
      source: 'page',
      text: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
    });
    expect(() =>
      assertCleanObservations(observations, { missingPath: '/missing.js' }),
    ).toThrow();
  });
  it('rejects a broken production asset even alongside an expected 404', () => {
    const observations = clean();
    observations.responses.push(
      { path: '/missing.js', status: 404, phase: 'missing-asset' },
      { path: '/assets/app.css', status: 404, phase: 'online' },
    );
    expect(() =>
      assertCleanObservations(observations, { missingPath: '/missing.js' }),
    ).toThrow();
  });
  it('accepts only an exact-path, offline-phase, native network failure', () => {
    const observations = clean();
    observations.failures.push({
      path: '/index.html',
      error: 'net::ERR_INTERNET_DISCONNECTED',
      phase: 'offline',
    });
    observations.consoleErrors.push({
      path: '/index.html',
      source: 'page',
      phase: 'offline',
      text: 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED',
    });
    expect(() =>
      assertCleanObservations(observations, { offlinePaths: ['/index.html'] }),
    ).not.toThrow();
    observations.failures[0] = {
      path: '/index.html',
      error: 'net::ERR_INTERNET_DISCONNECTED',
      phase: 'online',
    };
    expect(() =>
      assertCleanObservations(observations, { offlinePaths: ['/index.html'] }),
    ).toThrow();
  });
  it('rejects unrelated or silently aborted requests', () => {
    for (const error of [
      'net::ERR_ABORTED',
      'net::ERR_CONNECTION_REFUSED',
      undefined,
    ]) {
      const observations = clean();
      observations.failures.push({
        path: '/index.html',
        phase: 'offline',
        error,
      });
      expect(() =>
        assertCleanObservations(observations, {
          offlinePaths: ['/index.html'],
        }),
      ).toThrow();
    }
  });
  it('rejects worker console errors that mimic expected page failures', () => {
    const observations = clean();
    observations.responses.push({
      path: '/missing.js',
      status: 404,
      phase: 'missing-asset',
    });
    observations.consoleErrors.push({
      path: '/missing.js',
      source: 'worker',
      phase: 'missing-asset',
      text: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
    });
    expect(() =>
      assertCleanObservations(observations, { missingPath: '/missing.js' }),
    ).toThrow();
  });
  it('rejects unexpected console, script and external-network errors', () => {
    const observations = clean();
    observations.consoleErrors.push({
      path: '/',
      source: 'page',
      phase: 'online',
      text: 'Unexpected application error',
    });
    expect(() => assertCleanObservations(observations)).toThrow();
    const script = clean();
    script.pageErrors.push('Unexpected exception');
    expect(() => assertCleanObservations(script)).toThrow();
    const network = clean();
    network.externalAttempts.push('https://example.invalid');
    expect(() => assertCleanObservations(network)).toThrow();
  });
  it('invalidates a prior PASS before the next run and retains failure', async () => {
    const directory = await mkdtemp(
      join(tmpdir(), 'synthetic-browser-proof-evidence-'),
    );
    try {
      await writeEvidence(directory, { result: 'PASS' });
      const running = await beginEvidence(directory);
      expect(running.result).toBe('RUNNING');
      expect(
        JSON.parse(
          await readFile(join(directory, 'last-report.json'), 'utf8'),
        ) as object,
      ).toMatchObject({ result: 'RUNNING', synthetic: true });
      await writeEvidence(directory, { ...running, result: 'FAIL' });
      expect(
        JSON.parse(
          await readFile(join(directory, 'last-report.json'), 'utf8'),
        ) as object,
      ).toMatchObject({ result: 'FAIL' });
    } finally {
      await rm(directory, { recursive: true });
    }
  });
});
