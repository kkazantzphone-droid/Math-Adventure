# Phase 1E proof environment — developer tooling

Date: 2026-10-06. Owner scope: enable real browser evidence only. Production
Phase 1E remains unimplemented; ADR-0007 remains proposed. No production worker,
manifest, install UI, caching policy, learner storage or deployment is introduced.
The candidate starts at governance revision `74498618534faa40813cd984f99fdc9ea02d5736`
on `codex/phase-1e-proof-environment`. Governance PR #6 is its parent; publication
requires the task's current-main/parent condition to permit it.

## Selection and alternatives

| Option                                          | Observed fit                                                                                                                                                    | Decision                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Playwright Chromium library                     | Isolated contexts, native engine offline control, separate pages, worker events and ordinary page APIs for registration/controller/CacheStorage                 | Select exact `playwright-core@1.63.0`, development only, with a small Node assertion driver |
| Existing repository-local CDP                   | No checked-in CDP client/harness exists. Direct CDP can supply targets, network and worker observation, but adds transport/session/experimental-domain handling | Do not build a second client; do not attach to a real user's browser/profile                |
| Existing Vitest/SSR and extension browser tools | Unit/markup checks and online navigation are useful, but the recorded extension surface lacks offline/worker lifecycle control                                  | Retain those checks; they cannot supply this proof                                          |

The library supplies browser automation without adding the Playwright test runner
or a runtime dependency. The proof command is explicit after the existing project
gate. A missing/incompatible browser fails; no command silently skips evidence or
downloads a browser during a proof run. Official [browser API](https://playwright.dev/docs/api/class-browsercontext),
[worker guide](https://playwright.dev/docs/service-workers) and
[CDP attachment limits](https://playwright.dev/docs/api/class-browsertype) were
reviewed on 2026-10-06. Direct CDP capability was checked against its
[official protocol schema](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json);
that establishes feasibility rather than a project implementation.

## Package, browser and supply-chain review

The exact [registry record](https://registry.npmjs.org/playwright-core/1.63.0) and
[official tarball](https://registry.npmjs.org/playwright-core/-/playwright-core-1.63.0.tgz)
were inspected independently on 2026-10-06. The archive is 3,123,044 compressed
bytes, 13,453,369 unpacked bytes, 114 entries; SHA-512 matched registry integrity.
License is Apache-2.0, Node requirement `>=20`. Actual package.json has no
lifecycle scripts, registry dependencies or optional dependencies. pnpm's strict
build-script approval and all existing tool pins remain unchanged.

The package contains bundled third-party code despite having no registry
dependency edges. LICENSE, NOTICE, ThirdPartyNotices.txt and bundled license
sidecars remain intact; observed sidecars include MIT/ISC/BSD terms. Registry
audit does not necessarily enumerate these inlined components. Global Chrome/
Edge reinstall helpers in the archive are not lifecycle hooks and are not used.
The runtime React/ReactDOM graph and its production notices remain unchanged.
The lockfile adds only the exact development importer/package/snapshot.

The actual proof reused the existing supported `chrome` channel, headless with
Chromium sandbox enabled and fresh synthetic contexts. Observed browser version:
**154.0.8037.58**. Existing executable is
`C:\Program Files\Google\Chrome\Application\chrome.exe`, Authenticode **Valid**,
publisher Google LLC, SHA-256
`96512CF816B5C7D6D82B53AEB314F6C95CD971C0288202852BA56CBAEC8A842A`.
This verifies the executable observation, not the history of the entire installed
browser. No binary was downloaded, installed or updated; no daily-user profile
was read or attached. Playwright owns a temporary synthetic launch profile and
removes it during normal close; contexts and their fixture storage are disposed.
Evidence/download/trace paths and the optional browser cache are ignored locally.
No video, screenshot, speech, learner input or storage export is captured.

The package's [versioned browser manifest](https://raw.githubusercontent.com/microsoft/playwright/v1.63.0/packages/playwright-core/browsers.json)
specifies full Chromium revision **1243**, version **153.0.8010.12**. Supported
branded-channel reuse follows [official browser documentation](https://playwright.dev/docs/browsers),
accessed 2026-10-06; the successful actual run supplies bounded compatibility
evidence for this installed Chrome version. Other engines/devices remain untested.

## Commands and evidence handling

Use the pinned Node/Corepack/pnpm and process-local cache settings from
[development](DEVELOPMENT.md). Run sequentially; concurrent builds in the same
checkout are unsupported. Then:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm verify
corepack pnpm browser:proof
```

`browser:proof` owns its production build, starts its own ephemeral `127.0.0.1`
server, launches an isolated headless browser and closes only its owned resources.
The default channel is `chrome`; `BROWSER_PROOF_CHANNEL` accepts only `chrome`,
`msedge` or `chromium`. Missing supported browsers fail instead of being installed.
The existing full `verify` checks source/unit/build contracts; a hosted `verify`
success alone does not certify real browser lifecycle behavior.

Optional pinned Chromium acquisition, if supported-channel reuse is unavailable,
is separate from the proof. In PowerShell set
`$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/browser-proof/browsers'`.
Inspect before downloading:

```sh
corepack pnpm exec playwright-core install --dry-run chromium --no-shell --no-remove
corepack pnpm exec playwright-core install chromium --no-shell --no-remove
```

Then set `$env:BROWSER_PROOF_CHANNEL = 'chromium'` and run the proof. Do not run
global `install chrome`, `install msedge`, `install-deps` or administrator commands.
The driver fixes its optional Chromium cache to that repository-local directory.
These optional acquisition commands were not needed or exercised here; any later
download must record its actual source/version/size. The versioned registry source
derives the Windows full-browser candidate URL as
`https://cdn.playwright.dev/builds/cft/153.0.8010.12/win64/chrome-win64.zip`; no archive
at that URL was downloaded by this task.

`.cache/browser-proof/last-report.json` is a synthetic, ignored structured report.
It starts as RUNNING before channel/package/build/launch checks, becomes FAIL on a
caught setup/assertion/cleanup failure, and becomes PASS only after successful
checks and owned cleanup. Always require a successful current command exit; a
historical report or aborted process is not current-candidate certification.
Reports normalize origins/client IDs into fixed prefix/count assertions and retain
actual engine version/artifact hashes; they contain no learner records or media.

## Actual capabilities and negative controls

The real engine proved both `/` and `/math-adventure/` using the actual four-file
production build, served with no-store headers and no SPA missing-asset fallback.
The same-origin routing guard continues actual requests, disables ordinary HTTP
cache and rejects application cross-origin attempts; it does not fabricate
offline responses. Service-worker traffic uses native worker/page/server evidence,
not an assumption that request interception covers every worker request.

| Check                                | Actual observation                                                                                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Online application                   | Rendered developer proof, 200 navigation, no worker/controller                                                                                                    |
| Two application tabs                 | Distinct Page objects and independent document globals                                                                                                            |
| Offline application negative control | Native context offline, uncached same-origin fetch failure, two reloads fail with `net::ERR_INTERNET_DISCONNECTED`; received server count does not increase       |
| Independent online context           | Continues to load while the other context is offline                                                                                                              |
| Recovery                             | Return online and reload the application successfully                                                                                                             |
| Missing asset negative control       | Browser and server both report an intentional exact asset 404                                                                                                     |
| Worker fixture                       | Installing, active/activated, waiting/installed and page controllers observed through native APIs                                                                 |
| Two controlled clients               | Two distinct native service-worker client IDs, before/after recovery                                                                                              |
| Fixture offline                      | Reload and a new offline document return 200 from the worker cache with version header v1                                                                         |
| Controlled update                    | v2 remains waiting while both controllers answer v1; explicit test activation changes each controller once; both reload from v2                                   |
| Cache/storage                        | Actual CacheStorage names/keys/version headers inspected for fixture HTML only                                                                                    |
| Console/network                      | Page and worker console errors, page exceptions, error responses and failed requests observed and rejected unless exact declared page negative controls correlate |

The fixture is under `tests/e2e/fixtures/`, served only under the two
`__browser-proof/` prefixes. It caches two exact synthetic HTML routes and uses
fixture-only cache names/scopes. No fixture enters `src/`, `public/` or `dist/`.
The error observer also narrowly allows the browser's optional `/favicon.ico`
404 request; it does not allow unrelated missing assets.
Its explicit activation message is an observation mechanism, not the project's
future all-tab readiness, release compatibility, data-safety or update policy.
Worker state/controller interpretation follows the
[Service Workers specification](https://w3c.github.io/ServiceWorker/), accessed
2026-10-06.

## Review findings, repairs and verification

Initial actual execution exposed asynchronous polling returning before the desired
worker state. The repaired poll retains a native registration and synchronously
checks its state; assertions now observe the installing and waiting barriers.
Controller status is queried directly, not inferred from registration.active.

Independent adversarial review identified four false-positive risks, all repaired:
generic 404/offline console filtering; unobserved worker console; a ledger that
counted only completed responses; and a failed rerun leaving an old PASS report.
Exact path/phase/correlated error checks, worker listeners, immediate receipt counts
with explicit ledger truncation, and pre-build RUNNING/FAIL handling address them.
Twenty-seven focused server tests include an aborted raw request and the bounded
4,096-record ledger. Nine evidence regressions reject unexpected responses/failures,
worker errors, uncorrelated errors and stale PASS state.

Two actual-browser mutations were detected by assertions, exit 1: disable the
offline toggle; inject a fixture worker console error. Both source files were
restored byte-for-byte. Invalid-channel setup also failed by assertion and retained
FAIL evidence. Original mutation-point hashes are
`c254b2d22b333daff2a3e7c1c0b16c478f131f2fd0becb236d00c23d2c879ffe` (E2E harness)
and `525c623c8981e659d623b4516be6845607303886ebc13dd81d62f7f10d344072` (v1 fixture).

Audit on 2026-10-06 reports zero advisories: 204 graph entries (3 runtime,
201 development; 27 optional included). New lock SHA-256:
`62BDFC25B5442D746E019E83B4BBDCCBCE77E83C5EBC09C73AF482647C162964`.
Complete local `corepack pnpm verify` and a new isolated snapshot's frozen install
plus `verify` passed **612 tests/30 files**, including the 36 focused regressions
and sixteen governance fixture checks. Both builds transformed 54 modules. All
four production artifacts are byte-identical to the certified Phase 2/governance
baseline: HTML 518 bytes, CSS 20,515 bytes, JS 307,303 bytes, notices 1,384 bytes.
The new lockfile remained identical after fresh installation.

The fresh snapshot also passed actual `corepack pnpm browser:proof` after its
completed verification. Root/fresh normalized reports are exactly equal, including
the observed engine version, artifact hashes and both prefix assertion sets.
A mistaken concurrent build/proof attempt failed with a missing-artifact error;
its non-PASS evidence was retained, and the sequential rerun passed.

The independent reviewer rechecked all four repairs, 36 regressions, mutation
logs/restored hashes and package/scope integrity, then ran the real browser proof
separately with exit 0 at both prefixes. No material finding remains. An initial
default-sandbox attempt stalled with RUNNING evidence and was stopped by its
verified owned Node PID; no browser child existed. Successful actual execution
used scoped tool permission, without administrator access, browser installation or
machine changes. The driver now configures a 15-second launch timeout; that
configuration is not relabelled as a successful timeout of the earlier attempt.

Candidate hygiene reviews 19 files and 66 local links with no unresolved target,
whitespace/secret-pattern/media finding. Source/public/accepted ADRs, Node/pnpm/
Corepack baseline, runtime dependencies, install policy and hosted workflow remain
unchanged. Caches, tarball, reports, profiles and build output are uncommitted.

Historical local outcome: **PHASE 1E PROOF ENVIRONMENT READY**, preserved at
`c9e3094e642c6963ac8a11ec0052c3c9aec3719a`. Governance
[PR #6](https://github.com/kkazantzphone-droid/Math-Adventure/pull/6) was then open,
so publication stayed **STACKED / DEPENDENT**. No hosted result was claimed.

## Resumed publication after owner merge

The owner authorized resumption and publication on 2026-10-06 after merging PR #6.
GitHub confirms its protected-main merge revision
`d0d2828d022e1c17013b1abb544d8f8e36f6f166`. Its tree is exactly equal to the
preserved governance parent `74498618534faa40813cd984f99fdc9ea02d5736`.
Normal feature-branch merge `2313dfbab3f0b4222f0d221cd51b298704d9a7be`
retains the original candidate history and includes current main as an ancestor.
Three history-related conflicts were resolved to the previously reviewed files;
the entire resulting tree is byte-identical to `c9e3094`.

At that reconciliation revision, pinned frozen installation, complete
`corepack pnpm verify` (**612 tests/30 files**), `corepack pnpm audit --json`
(**zero advisories/204 entries**) and actual `corepack pnpm browser:proof` all
passed again. Both paths demonstrated native offline failure/recovery, distinct
clients and installing/active/waiting/controller/update/cache observations.
The browser remained Chrome 154.0.8037.58; all four product artifacts remained
byte-identical to the recorded baseline. No source, dependency or fixture repair
was needed after reconciliation.

Independent publication review also identified stale current-status wording in
the register/roadmap. Those descriptions now distinguish removed DEV/TEST control
limitations from outstanding production lifecycle gates; historical phase reports
and accepted ADRs stay frozen. The complete documentation candidate requires its
own final full/fresh gates and current-head hosted Ubuntu/Windows checks before
owner-merge readiness. Exact final revision, commands/results and hosted run are
recorded in the publication PR; a prior head's success does not certify a later
head. Protected-main merge remains human. Production Phase 1E is not started.

## Evidence limits and production gate

This removes the recorded browser-control environment blocker only after the
complete real-browser proof passes. It does not complete Phase 1E or implement its
product matrix. Native Chromium offline emulation is not physical disconnection,
installed-PWA behavior, a browser/process cold restart, offline speech, actual
device/assistive-technology certification or support for every browser. A new
offline document is labelled precisely. Prefixes use separate fresh contexts;
simultaneous cross-prefix coexistence remains untested. Future production work
still needs its own explicit authorization, complete offline/update/data-safety
implementation and product evidence. No runtime, public host or product-policy
choice follows from this developer-tooling proof.
