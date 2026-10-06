import { createServer, request } from 'node:http';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startProofProxy } from '../../scripts/browser-proof/proxy.mjs';
import type { ProofProxy } from '../../scripts/browser-proof/proxy.mjs';

function throughProxy(origin: string, path: string, method = 'GET') {
  return new Promise<{
    status: number;
    body: string;
    marker: string | undefined;
  }>((resolve, reject) => {
    const sent = request(origin, { path, method }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        body += chunk;
      });
      response.on('end', () =>
        resolve({
          status: response.statusCode ?? 0,
          body,
          marker: response.headers['x-synthetic-proof'] as string | undefined,
        }),
      );
      response.on('error', reject);
    });
    sent.on('error', reject);
    sent.end();
  });
}

describe('owned browser-proof TCP transport gate', () => {
  let upstream: Server;
  let upstreamOrigin: string;
  let proxy: ProofProxy;
  let receipts: number;
  let receivedHeld: (() => void) | undefined;
  beforeEach(async () => {
    receipts = 0;
    upstream = createServer((request, response) => {
      receipts += 1;
      if (request.url === '/held') {
        receivedHeld?.();
        return;
      }
      response.writeHead(201, {
        'Content-Type': 'text/plain',
        'X-Synthetic-Proof': 'actual-upstream',
      });
      response.end(`Synthetic upstream: ${request.url}`);
    });
    await new Promise<void>((resolve) =>
      upstream.listen(0, '127.0.0.1', resolve),
    );
    const address = upstream.address();
    if (!address || typeof address === 'string')
      throw new Error('Missing owned upstream');
    upstreamOrigin = `http://127.0.0.1:${address.port}`;
    proxy = await startProofProxy([upstreamOrigin]);
  });
  afterEach(async () => {
    await proxy.close();
    await new Promise<void>((resolve, reject) => {
      upstream.close((error) => (error ? reject(error) : resolve()));
      upstream.closeAllConnections();
    });
  });

  it('forwards actual owned-origin bytes and headers without fabricating a response', async () => {
    expect(
      await throughProxy(
        proxy.origin,
        `${upstreamOrigin}/synthetic.txt?discard=query`,
      ),
    ).toEqual({
      status: 201,
      body: 'Synthetic upstream: /synthetic.txt?discard=query',
      marker: 'actual-upstream',
    });
    expect(receipts).toBe(1);
    expect(proxy.snapshot()).toEqual([
      { method: 'GET', path: '/synthetic.txt', outcome: 'forwarded' },
    ]);
    const copied = proxy.snapshot();
    copied[0] = { method: 'INVALID', path: '/changed', outcome: 'offline' };
    expect(proxy.snapshot()[0]?.method).toBe('GET');
    expect(proxy.droppedObservationCount()).toBe(0);
  });

  it('rejects real TCP traffic while offline and permits actual recovery afterward', async () => {
    await proxy.setOffline(true);
    await expect(
      throughProxy(proxy.origin, `${upstreamOrigin}/synthetic.txt`),
    ).rejects.toMatchObject({ code: 'ECONNRESET' });
    expect(receipts).toBe(0);
    expect(proxy.snapshot()).toEqual([
      { method: 'GET', path: '/synthetic.txt', outcome: 'offline' },
    ]);
    await proxy.setOffline(false);
    expect(
      (await throughProxy(proxy.origin, `${upstreamOrigin}/synthetic.txt`))
        .status,
    ).toBe(201);
    expect(receipts).toBe(1);
  });

  it('closes an in-flight upstream connection before the offline boundary resolves', async () => {
    const arrived = new Promise<void>((resolve) => {
      receivedHeld = resolve;
    });
    const pending = throughProxy(proxy.origin, `${upstreamOrigin}/held`);
    const failure = expect(pending).rejects.toMatchObject({
      code: 'ECONNRESET',
    });
    await arrived;
    await proxy.setOffline(true);
    await failure;
    await expect(
      throughProxy(proxy.origin, `${upstreamOrigin}/next.txt`),
    ).rejects.toMatchObject({ code: 'ECONNRESET' });
    expect(receipts).toBe(1);
  });

  it('rejects external names, unregistered loopback ports and relative targets before forwarding', async () => {
    for (const target of [
      'http://example.invalid/private.txt',
      'http://127.0.0.1:1/private.txt',
      '/relative.txt',
      `${upstreamOrigin.replace('http://', 'http://user:password@')}/private.txt`,
    ])
      await expect(throughProxy(proxy.origin, target)).rejects.toMatchObject({
        code: 'ECONNRESET',
      });
    expect(receipts).toBe(0);
    expect(
      proxy.snapshot().every((record) => record.outcome === 'rejected'),
    ).toBe(true);
  });

  it('forbids CONNECT and mutation methods without making an outbound request', async () => {
    await expect(
      throughProxy(proxy.origin, 'example.invalid:443', 'CONNECT'),
    ).rejects.toMatchObject({ code: 'ECONNRESET' });
    await expect(
      throughProxy(proxy.origin, new URL(upstreamOrigin).host, 'CONNECT'),
    ).rejects.toMatchObject({ code: 'ECONNRESET' });
    await expect(
      throughProxy(proxy.origin, `${upstreamOrigin}/synthetic.txt`, 'POST'),
    ).rejects.toMatchObject({ code: 'ECONNRESET' });
    expect(receipts).toBe(0);
    expect(proxy.snapshot()).toEqual([
      { method: 'CONNECT', path: '[forbidden-connect]', outcome: 'rejected' },
      {
        method: 'CONNECT',
        path: '[owned-loopback-connect]',
        outcome: 'rejected',
      },
      { method: 'POST', path: '/synthetic.txt', outcome: 'rejected' },
    ]);
  });

  it('validates the bounded exact origin list and explicit boolean state', async () => {
    for (const origins of [
      [],
      [upstreamOrigin, upstreamOrigin],
      ['https://127.0.0.1:443'],
      ['http://localhost:8080'],
      ['http://127.0.0.1'],
      [`${upstreamOrigin}/path`],
      [upstreamOrigin, upstreamOrigin, upstreamOrigin],
    ])
      await expect(startProofProxy(origins)).rejects.toThrow();
    await expect(proxy.setOffline('yes' as unknown as boolean)).rejects.toThrow(
      'Explicit boolean',
    );
  });

  it('closes its owned listener idempotently', async () => {
    await proxy.close();
    await proxy.close();
    await expect(
      throughProxy(proxy.origin, `${upstreamOrigin}/synthetic.txt`),
    ).rejects.toMatchObject({ code: 'ECONNREFUSED' });
  });
});
