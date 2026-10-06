// Fixed synthetic developer proof only; no daily browser profile or learner data.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';
import { chromium } from 'playwright-core';
import { build } from 'vite';

assert.equal(
  process.versions.node,
  (await readFile('.node-version', 'utf8')).trim(),
);
const channel = process.env.PHASE3_BROWSER ?? 'chrome';
assert(['chrome', 'msedge'].includes(channel));
const directory = resolve('.cache/phase3b-proof');
await mkdir(directory, { recursive: true });
await build({ configFile: 'vite.persistence.config.ts' });
const site = resolve('.cache/phase3-browser/site');
const server = createServer((request, response) => {
  const name =
    new URL(request.url ?? '/', 'http://127.0.0.1').pathname.slice(1) ||
    'index.html';
  const target = resolve(site, name);
  const within = relative(site, target);
  if (within.startsWith('..') || isAbsolute(within)) {
    response.writeHead(400).end();
    return;
  }
  void readFile(target)
    .then((bytes) => {
      response.setHeader(
        'Content-Type',
        extname(name) === '.js' ? 'text/javascript' : 'text/html',
      );
      response.end(bytes);
    })
    .catch(() => response.writeHead(404).end());
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
let browser;
try {
  const address = server.address();
  assert(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ channel, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  let opens = 0;
  let nonlocalRequests = 0;
  await page.exposeFunction('countSyntheticOpen', () => {
    opens += 1;
  });
  await page.addInitScript(() => {
    const original = globalThis.indexedDB.open.bind(globalThis.indexedDB);
    globalThis.indexedDB.open = (...args) => {
      void globalThis.countSyntheticOpen();
      return original(...args);
    };
  });
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== origin) nonlocalRequests += 1;
  });
  await page.goto(origin);
  const summary = await page.evaluate(() =>
    globalThis.phase3.adaptationProof(),
  );
  assert.deepEqual(summary, {
    synthetic: true,
    policyVersion: 'phase3b-synthetic-policy-v1',
    status: 'experimental',
    educatorReview: 'required',
    concepts: 3,
    meaningfulCases: [21, 12, 8],
    secureWitnesses: 3,
    observations: 30,
    exposureNeutral: true,
    rotationOffers: 3,
  });
  assert.equal(opens, 0);
  assert.equal(nonlocalRequests, 0);
  const sources = {};
  for (const file of [
    'src/domain/adaptation/state.ts',
    'src/domain/adaptation/catalog.ts',
    'src/domain/adaptation/selection.ts',
    'src/domain/adaptation/policy.ts',
    'src/domain/adaptation/types.ts',
    'tests/browser/phase3/adaptation-proof.ts',
    'tests/browser/phase3/harness.ts',
    'scripts/adaptation-proof.mjs',
  ])
    sources[file] = createHash('sha256')
      .update(await readFile(file))
      .digest('hex');
  const evidence = {
    result: 'PASS',
    channel,
    browserVersion: browser.version(),
    summary,
    indexedDbOpens: opens,
    nonlocalRequests,
    sourceHashes: sources,
  };
  await writeFile(
    resolve(directory, `${channel}.json`),
    JSON.stringify(evidence, null, 2) + '\n',
  );
  process.stdout.write(
    `PASS fixed synthetic adaptation proof (${channel}); no storage opens or nonlocal requests\n`,
  );
} finally {
  await browser?.close();
  await new Promise((done, reject) =>
    server.close((error) => (error ? reject(error) : done())),
  );
}
