// DEV/TEST only. A real TCP transport gate, never a fabricated shell response.
import { createServer, request as forwardRequest } from 'node:http';

const observationLimit = 4096;

export async function startProofProxy(allowedOrigins) {
  if (
    !Array.isArray(allowedOrigins) ||
    allowedOrigins.length < 1 ||
    allowedOrigins.length > 2
  )
    throw new Error('One or two explicit owned loopback origins are required');
  const allowed = new Set();
  for (const value of allowedOrigins) {
    const url = new URL(value);
    if (
      url.origin !== value ||
      url.protocol !== 'http:' ||
      url.hostname !== '127.0.0.1' ||
      !url.port ||
      url.username ||
      url.password
    )
      throw new Error('Only exact IPv4 loopback HTTP origins are allowed');
    allowed.add(value);
  }
  if (allowed.size !== allowedOrigins.length)
    throw new Error('Duplicate loopback origin');
  let offline = false;
  let dropped = 0;
  const observations = [];
  const outgoing = new Set();
  function observe(record) {
    if (observations.length === observationLimit) dropped += 1;
    else observations.push(record);
  }
  const server = createServer((request, response) => {
    let target;
    try {
      target = new URL(request.url);
    } catch {
      observe({
        method: request.method ?? 'UNKNOWN',
        path: '[invalid]',
        outcome: 'rejected',
      });
      request.socket.destroy();
      return;
    }
    const valid =
      allowed.has(target.origin) &&
      !target.username &&
      !target.password &&
      !target.hash &&
      ['GET', 'HEAD'].includes(request.method);
    const outcome = !valid ? 'rejected' : offline ? 'offline' : 'forwarded';
    observe({
      method: request.method ?? 'UNKNOWN',
      path: target.pathname,
      outcome,
    });
    if (outcome !== 'forwarded') {
      request.socket.destroy();
      return;
    }
    // Exact prevalidated IPv4 target avoids external names, CONNECT and DNS.
    const upstream = forwardRequest(
      {
        hostname: '127.0.0.1',
        port: target.port,
        method: request.method,
        path: `${target.pathname}${target.search}`,
        headers: { ...request.headers, host: target.host },
        agent: false,
      },
      (received) => {
        received.on('error', () => response.destroy());
        response.writeHead(received.statusCode ?? 502, received.headers);
        received.pipe(response);
      },
    );
    outgoing.add(upstream);
    upstream.on('close', () => outgoing.delete(upstream));
    upstream.on('error', () => response.destroy());
    request.on('aborted', () => upstream.destroy());
    response.on('close', () => upstream.destroy());
    request.pipe(upstream);
  });
  server.on('connect', (request, socket) => {
    let owned = false;
    try {
      const target = new URL(`http://${request.url}`);
      owned =
        allowed.has(target.origin) &&
        !target.username &&
        !target.password &&
        !target.hash;
    } catch {
      // No CONNECT is ever forwarded, including malformed authorities.
    }
    observe({
      method: 'CONNECT',
      path: owned ? '[owned-loopback-connect]' : '[forbidden-connect]',
      outcome: 'rejected',
    });
    socket.destroy();
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing owned proxy address');
  let closing;
  return {
    origin: `http://127.0.0.1:${address.port}`,
    async setOffline(value) {
      if (typeof value !== 'boolean')
        throw new Error('Explicit boolean transport state required');
      offline = value;
      if (offline) {
        await Promise.all(
          [...outgoing].map(
            (request) =>
              new Promise((resolve) => {
                request.once('close', resolve);
                request.destroy();
              }),
          ),
        );
      }
    },
    snapshot: () => observations.map((record) => ({ ...record })),
    droppedObservationCount: () => dropped,
    close() {
      closing ??= new Promise((resolve, reject) => {
        for (const request of outgoing) request.destroy();
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
      return closing;
    },
  };
}
