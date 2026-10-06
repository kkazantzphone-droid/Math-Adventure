// DEV/TEST only. Production output never imports this loopback proof server.
import { Buffer } from 'node:buffer';
import { readFile, realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

const fixturePrefixes = [
  '/__browser-proof/',
  '/math-adventure/__browser-proof/',
];
const observationLimit = 4096;
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function withinDirectory(directory, file) {
  const suffix = relative(directory, file);
  return (
    suffix !== '..' && !suffix.startsWith(`..${sep}`) && !isAbsolute(suffix)
  );
}

async function servingDirectory(directory, description) {
  if (typeof directory !== 'string' || directory.length === 0)
    throw new Error(`A ${description} directory is required`);
  const canonical = await realpath(resolve(directory));
  if (!(await stat(canonical)).isDirectory())
    throw new Error(`The ${description} path must be a directory`);
  return canonical;
}

// Inspect the origin-form target before URL normalization could erase traversal.
function requestPath(target) {
  if (
    typeof target !== 'string' ||
    target.length > 2048 ||
    !target.startsWith('/') ||
    target.startsWith('//') ||
    target.includes('#')
  )
    return null;
  const encoded = target.split('?')[0];
  if (!encoded || /%2f|%5c/i.test(encoded)) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    return null;
  }
  // Disallow double encoding, Windows alternate streams/aliases and private files.
  if (
    /[\\%:]/.test(decoded) ||
    [...decoded].some((character) => {
      const code = character.codePointAt(0);
      return code < 0x20 || code === 0x7f;
    })
  )
    return null;
  const segments = decoded.split('/').slice(1);
  if (
    segments.some(
      (segment, index) =>
        (segment === '' && index !== segments.length - 1) ||
        segment.startsWith('.') ||
        /[. ]$/.test(segment) ||
        /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment),
    )
  )
    return null;
  return decoded;
}

function route(path, distDirectory, fixtureDirectory, version) {
  const fixturePrefix = fixturePrefixes.find((prefix) =>
    path.startsWith(prefix),
  );
  if (fixturePrefix) {
    const suffix = path.slice(fixturePrefix.length);
    return {
      directory: fixtureDirectory,
      file:
        suffix === ''
          ? 'index.html'
          : suffix === 'sw.js'
            ? `sw-${version}.js`
            : suffix,
      workerScope: suffix === 'sw.js' ? fixturePrefix : undefined,
    };
  }
  return {
    directory: distDirectory,
    file:
      path === '/' || path === '/math-adventure/'
        ? 'index.html'
        : path.startsWith('/math-adventure/')
          ? path.slice('/math-adventure/'.length)
          : path.slice(1),
    workerScope: undefined,
  };
}

/**
 * Starts an owned, ephemeral IPv4 loopback server for synthetic browser proof.
 * Fixture sw.js keeps one URL while its bytes switch between sw-v1.js/sw-v2.js.
 * Request observations contain only method, decoded path and status; no queries.
 * The cumulative receipt count includes aborted responses. The completed ledger
 * retains its first 4096 records and reports any dropped observations explicitly.
 */
export async function startProofServer({ distDirectory, fixtureDirectory }) {
  const distRoot = await servingDirectory(distDirectory, 'production build');
  const fixtureRoot = await servingDirectory(fixtureDirectory, 'test fixture');
  const observations = [];
  let receivedRequestCount = 0;
  let droppedObservations = 0;
  let fixtureVersion = 'v1';
  let origin;
  const server = createServer((request, response) => {
    receivedRequestCount += 1;
    const method = request.method ?? 'UNKNOWN';
    const path = requestPath(request.url);
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.on('finish', () => {
      if (observations.length === observationLimit) {
        droppedObservations += 1;
        return;
      }
      observations.push({
        method,
        path: path ?? '[invalid-path]',
        status: response.statusCode,
      });
    });

    function send(status, body, headers = {}) {
      response.writeHead(status, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        ...headers,
      });
      response.end(method === 'HEAD' ? undefined : body);
    }

    if (!path || request.headers.host !== new URL(origin).host) {
      send(400, 'Invalid proof request\n');
      return;
    }
    if (method !== 'GET' && method !== 'HEAD') {
      request.resume();
      send(405, 'Method not allowed\n', { Allow: 'GET, HEAD' });
      return;
    }

    const selected = route(path, distRoot, fixtureRoot, fixtureVersion);
    const contentType = mimeTypes.get(extname(selected.file).toLowerCase());
    if (!contentType) {
      send(404, 'Not found\n');
      return;
    }

    void (async () => {
      try {
        const file = await realpath(resolve(selected.directory, selected.file));
        if (
          !withinDirectory(selected.directory, file) ||
          !(await stat(file)).isFile()
        ) {
          send(404, 'Not found\n');
          return;
        }
        const content = await readFile(file);
        const headers = {
          'Content-Type': contentType,
          'Content-Length': content.byteLength,
          ...(selected.workerScope
            ? { 'Service-Worker-Allowed': selected.workerScope }
            : {}),
        };
        response.writeHead(200, headers);
        response.end(method === 'HEAD' ? undefined : content);
      } catch {
        // Keep filesystem paths/error details outside the browser evidence.
        send(404, 'Not found\n');
      }
    })();
  });

  await new Promise((resolveListening, reject) => {
    const failed = (error) => {
      server.off('listening', listening);
      reject(error);
    };
    const listening = () => {
      server.off('error', failed);
      resolveListening();
    };
    server.once('error', failed);
    server.once('listening', listening);
    server.listen(0, '127.0.0.1');
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('The proof server has no loopback address');
  }
  origin = `http://127.0.0.1:${address.port}`;
  let closing;
  return {
    origin,
    requestCount: () => receivedRequestCount,
    droppedObservationCount: () => droppedObservations,
    requestSnapshot: () => observations.map((record) => ({ ...record })),
    setFixtureVersion(version) {
      if (version !== 'v1' && version !== 'v2')
        throw new Error(
          'Only synthetic fixture versions v1 and v2 are supported',
        );
      fixtureVersion = version;
    },
    close() {
      closing ??= new Promise((resolveClosed, reject) => {
        server.close((error) => (error ? reject(error) : resolveClosed()));
        server.closeAllConnections();
      });
      return closing;
    },
  };
}
