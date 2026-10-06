import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { connect } from 'node:net';
import { join, resolve } from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startProofServer } from '../../scripts/browser-proof/server.mjs';
import type { ProofServer } from '../../scripts/browser-proof/server.mjs';

function rawRequest(
  origin: string,
  path: string,
  method = 'GET',
  host?: string,
) {
  return new Promise<{ status: number; body: string }>(
    (resolveResponse, reject) => {
      const result = request(
        origin,
        { path, method, ...(host ? { headers: { Host: host } } : {}) },
        (response) => {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', (chunk: string) => {
            body += chunk;
          });
          response.on('end', () =>
            resolveResponse({ status: response.statusCode ?? 0, body }),
          );
        },
      );
      result.on('error', reject);
      result.end();
    },
  );
}

async function abortedResponse(server: ProofServer, path: string) {
  const url = new URL(server.origin);
  const initialCount = server.requestCount();
  const connection = connect({ host: url.hostname, port: Number(url.port) });
  await once(connection, 'connect');
  const closed = once(connection, 'close');
  try {
    connection.write(
      `GET ${path} HTTP/1.1\r\nHost: ${url.host}\r\nConnection: close\r\n\r\n`,
    );
    // Yield to the actual TCP request callback, then reset before the async file
    // read can finish. No completed-response observation is needed to see receipt.
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (server.requestCount() > initialCount) break;
      await setImmediate();
    }
    if (server.requestCount() !== initialCount + 1)
      throw new Error('The synthetic raw request never reached the server');
    connection.resetAndDestroy();
    await closed;
  } finally {
    connection.destroy();
  }
}

describe('DEV/TEST loopback browser proof server', () => {
  let testDirectory: string;
  let distDirectory: string;
  let fixtureDirectory: string;
  let server: ProofServer;

  beforeEach(async () => {
    const cache = resolve('.cache');
    await mkdir(cache, { recursive: true });
    testDirectory = await mkdtemp(join(cache, 'browser-proof-server-test-'));
    distDirectory = join(testDirectory, 'dist');
    fixtureDirectory = join(testDirectory, 'synthetic-fixtures');
    await mkdir(join(distDirectory, 'assets'), { recursive: true });
    await mkdir(fixtureDirectory);
    await writeFile(
      join(distDirectory, 'index.html'),
      '<p>Synthetic static shell</p>',
    );
    await writeFile(
      join(distDirectory, 'assets', 'app.js'),
      'export const synthetic = true;',
    );
    await writeFile(
      join(distDirectory, 'assets', 'app.css'),
      'body { color: navy; }',
    );
    await writeFile(
      join(distDirectory, 'THIRD_PARTY_NOTICES.txt'),
      'Synthetic notice',
    );
    await writeFile(
      join(fixtureDirectory, 'index.html'),
      '<p>Synthetic worker client</p>',
    );
    await writeFile(
      join(fixtureDirectory, 'sw-v1.js'),
      '/* synthetic worker v1 */',
    );
    await writeFile(
      join(fixtureDirectory, 'sw-v2.js'),
      '/* synthetic worker v2 */',
    );
    server = await startProofServer({ distDirectory, fixtureDirectory });
  });

  afterEach(async () => {
    await server.close();
    // This exact directory was created by this test under the repository cache.
    if (
      !testDirectory.startsWith(
        join(resolve('.cache'), 'browser-proof-server-test-'),
      )
    )
      throw new Error(
        'Refusing to remove a directory outside the owned test cache',
      );
    await rm(testDirectory, { recursive: true, force: true });
  });

  it('serves the production shell and assets at root and subpath with cache disabled', async () => {
    expect(server.origin).toMatch(/^http:\/\/127\.0\.0\.1:[1-9]\d*$/);
    for (const prefix of ['/', '/math-adventure/']) {
      const shell = await fetch(`${server.origin}${prefix}?lang=en`);
      expect(shell.status).toBe(200);
      expect(await shell.text()).toBe('<p>Synthetic static shell</p>');
      expect(shell.headers.get('cache-control')).toContain('no-store');
      expect(shell.headers.get('x-content-type-options')).toBe('nosniff');
      const javascript = await fetch(`${server.origin}${prefix}assets/app.js`);
      expect(javascript.headers.get('content-type')).toBe(
        'application/javascript; charset=utf-8',
      );
      expect(await javascript.text()).toBe('export const synthetic = true;');
      expect(
        (await fetch(`${server.origin}${prefix}assets/app.css`)).headers.get(
          'content-type',
        ),
      ).toBe('text/css; charset=utf-8');
      expect(
        await (
          await fetch(`${server.origin}${prefix}THIRD_PARTY_NOTICES.txt`)
        ).text(),
      ).toBe('Synthetic notice');
    }
  });

  it('keeps missing assets, directories and client routes as real 404 negative controls', async () => {
    for (const path of [
      '/assets/missing.js',
      '/math-adventure/assets/missing.js',
      '/assets/',
      '/family-proof',
      '/math-adventure/family-proof',
    ]) {
      const response = await fetch(`${server.origin}${path}`);
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Not found\n');
    }
  });

  it('supports HEAD without a body and rejects mutation methods', async () => {
    const head = await fetch(`${server.origin}/`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.headers.get('content-length')).toBe('29');
    expect(await head.text()).toBe('');
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
      const response = await fetch(`${server.origin}/`, { method });
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('GET, HEAD');
    }
    const missing = await fetch(`${server.origin}/missing.js`, {
      method: 'HEAD',
    });
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe('');
  });

  it.each([
    '/../private.txt',
    '/%2e%2e/private.txt',
    '/assets%2fapp.js',
    '/assets%5capp.js',
    '/%252e%252e/private.txt',
    '/assets//app.js',
    '/.git/config',
    '/%2eenv',
    '/assets/app.js:private',
    '/assets/app.js.',
    '/CON.txt',
    '/%00.txt',
    '/%ZZ',
    '/%C0%AFprivate.txt',
    '//example.invalid/private.txt',
    'http://example.invalid/private.txt',
    '/private.txt#fragment',
  ])(
    'rejects noncanonical/private request target %s before normalization',
    async (path) => {
      const response = await rawRequest(server.origin, path);
      expect(response.status).toBe(400);
      expect(response.body).toBe('Invalid proof request\n');
    },
  );

  it('rejects an unrelated host and unsafe unknown MIME types', async () => {
    expect(
      (await rawRequest(server.origin, '/', 'GET', 'example.invalid')).status,
    ).toBe(400);
    await writeFile(join(distDirectory, 'source.map'), 'synthetic source map');
    expect((await fetch(`${server.origin}/source.map`)).status).toBe(404);
  });

  it('rejects a directory symlink escaping the public root', async () => {
    const outside = join(testDirectory, 'private');
    await mkdir(outside);
    await writeFile(join(outside, 'private.txt'), 'synthetic private control');
    await symlink(outside, join(distDirectory, 'assets', 'escape'), 'junction');
    const response = await fetch(`${server.origin}/assets/escape/private.txt`);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain('synthetic private control');
  });

  it('serves changing worker bytes from one URL with fixture-only scopes at both prefixes', async () => {
    for (const prefix of [
      '/__browser-proof/',
      '/math-adventure/__browser-proof/',
    ]) {
      const client = await fetch(`${server.origin}${prefix}`);
      expect(await client.text()).toBe('<p>Synthetic worker client</p>');
      server.setFixtureVersion('v1');
      const first = await fetch(`${server.origin}${prefix}sw.js`);
      expect(first.headers.get('service-worker-allowed')).toBe(prefix);
      expect(first.headers.get('cache-control')).toContain('no-store');
      expect(await first.text()).toBe('/* synthetic worker v1 */');
      server.setFixtureVersion('v2');
      const second = await fetch(`${server.origin}${prefix}sw.js`);
      expect(await second.text()).toBe('/* synthetic worker v2 */');
      expect(second.headers.get('service-worker-allowed')).toBe(prefix);
    }
    expect(() => server.setFixtureVersion('../untrusted' as 'v1')).toThrow(
      'Only synthetic fixture versions',
    );
    expect((await fetch(`${server.origin}/sw.js`)).status).toBe(404);
    expect((await fetch(`${server.origin}/math-adventure/sw.js`)).status).toBe(
      404,
    );
  });

  it('observes only method/path/status and returns independent query-free snapshots', async () => {
    await (
      await fetch(`${server.origin}/?synthetic=discard-this-query`)
    ).text();
    await (
      await fetch(`${server.origin}/missing.js?synthetic=discard-this-query`)
    ).text();
    const snapshot = server.requestSnapshot();
    expect(snapshot).toEqual([
      { method: 'GET', path: '/', status: 200 },
      { method: 'GET', path: '/missing.js', status: 404 },
    ]);
    snapshot[0] = { method: 'INVALID', path: '/changed', status: 0 };
    snapshot.push({ method: 'INVALID', path: '/added', status: 0 });
    expect(server.requestSnapshot()).toHaveLength(2);
    expect(server.requestSnapshot()[0]).toEqual({
      method: 'GET',
      path: '/',
      status: 200,
    });
  });

  it('counts a received raw request even when an aborted response never finishes', async () => {
    await writeFile(
      join(distDirectory, 'aborted.txt'),
      Buffer.alloc(1024 * 1024, 'synthetic-test-only'),
    );
    await abortedResponse(server, '/aborted.txt');
    // Read a subsequent response to let the server process the aborted socket.
    await (await fetch(`${server.origin}/missing.js`)).text();
    expect(server.requestSnapshot()).toEqual([
      { method: 'GET', path: '/missing.js', status: 404 },
    ]);
    expect(server.requestCount()).toBe(2);
    expect(server.droppedObservationCount()).toBe(0);
  });

  it('bounds completed observations while explicitly counting arrivals and dropped records', async () => {
    const url = new URL(server.origin);
    const connection = connect({ host: url.hostname, port: Number(url.port) });
    const responses: string[] = [];
    connection.setEncoding('utf8');
    connection.on('data', (chunk: string) => responses.push(chunk));
    await once(connection, 'connect');
    const closed = once(connection, 'close');
    try {
      // One TCP connection keeps this bounded negative control inexpensive.
      const requests = Array.from(
        { length: 4097 },
        (_, index) =>
          `HEAD /missing HTTP/1.1\r\nHost: ${url.host}\r\n${index === 4096 ? 'Connection: close\r\n' : ''}\r\n`,
      ).join('');
      connection.write(requests);
      await closed;
      expect(
        responses.join('').match(/HTTP\/1\.1 404 Not Found/g),
      ).toHaveLength(4097);
      expect(server.requestCount()).toBe(4097);
      expect(server.requestSnapshot()).toHaveLength(4096);
      expect(server.droppedObservationCount()).toBe(1);
    } finally {
      connection.destroy();
    }
  });

  it('closes only its owned listener and permits an idempotent close', async () => {
    await server.close();
    await server.close();
    await expect(fetch(`${server.origin}/`)).rejects.toThrow();
  });

  it('switches complete prevalidated release directories independently per hosting prefix', async () => {
    await server.close();
    const nextDirectory = join(testDirectory, 'next-release');
    await mkdir(nextDirectory);
    await writeFile(join(nextDirectory, 'index.html'), 'Synthetic next shell');
    await writeFile(join(nextDirectory, 'release.json'), '{"release":"next"}');
    await writeFile(
      join(nextDirectory, 'manifest.webmanifest'),
      '{"scope":"./"}',
    );
    server = await startProofServer({
      distDirectory,
      fixtureDirectory,
      productionReleases: [
        { name: 'root-old', prefix: '/', directory: distDirectory },
        { name: 'root-next', prefix: '/', directory: nextDirectory },
        {
          name: 'subpath-old',
          prefix: '/math-adventure/',
          directory: distDirectory,
        },
      ],
    });
    server.setProductionRelease('/', 'root-next');
    expect(await (await fetch(`${server.origin}/`)).text()).toBe(
      'Synthetic next shell',
    );
    expect(await (await fetch(`${server.origin}/math-adventure/`)).text()).toBe(
      '<p>Synthetic static shell</p>',
    );
    expect(
      (await fetch(`${server.origin}/release.json`)).headers.get(
        'content-type',
      ),
    ).toBe('application/json; charset=utf-8');
    expect(
      (await fetch(`${server.origin}/manifest.webmanifest`)).headers.get(
        'content-type',
      ),
    ).toBe('application/manifest+json; charset=utf-8');
    expect(
      await (await fetch(`${server.origin}/__browser-proof/`)).text(),
    ).toBe('<p>Synthetic worker client</p>');
    expect(() => server.setProductionRelease('/', 'subpath-old')).toThrow(
      'Unknown production release',
    );
    expect(() => server.setProductionRelease('/', '../private')).toThrow(
      'Unknown production release',
    );
  });

  it('injects only an explicit exact canonical production asset failure and restores it', async () => {
    server.setFailedAsset('/assets/app.js');
    expect((await fetch(`${server.origin}/assets/app.js`)).status).toBe(404);
    expect(
      (await fetch(`${server.origin}/math-adventure/assets/app.js`)).status,
    ).toBe(200);
    expect((await fetch(`${server.origin}/__browser-proof/`)).status).toBe(200);
    server.setFailedAsset(null);
    expect((await fetch(`${server.origin}/assets/app.js`)).status).toBe(200);
    for (const path of [
      '/../private.txt',
      '/assets/app.js?query=1',
      '/__browser-proof/sw.js',
      '/math-adventure/__browser-proof/index.html',
    ])
      expect(() => server.setFailedAsset(path)).toThrow(
        'Only a canonical production asset',
      );
  });

  it('rejects malformed, duplicated and wrong-prefix release descriptors before serving', async () => {
    for (const productionReleases of [
      [{ name: '../private', prefix: '/' as const, directory: distDirectory }],
      [{ name: 'invalid', prefix: '/other/' as '/', directory: distDirectory }],
      [
        { name: 'same', prefix: '/' as const, directory: distDirectory },
        { name: 'same', prefix: '/' as const, directory: distDirectory },
      ],
    ])
      await expect(
        startProofServer({
          distDirectory,
          fixtureDirectory,
          productionReleases,
        }),
      ).rejects.toThrow('Invalid synthetic production release');
  });
});
import { once } from 'node:events';
