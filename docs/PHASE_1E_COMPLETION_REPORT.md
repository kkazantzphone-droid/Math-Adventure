# Phase 1E production PWA / offline lifecycle completion report

Date: **2026-10-06, Europe/Athens**. D44 authorizes Phase 1 checkpoint 7: a
coherent production shell, offline loading and explicit safe update lifecycle.
Base is owner-merged protected main
`ab734e108abd22c056b0ebfb2e8081960b0ae468`; feature branch is
`codex/phase-1e-production`. The former completion/readiness document is preserved
byte-for-byte in [historical readiness](PHASE_1E_READINESS_REPORT.md), SHA-256
`e8dda6b52c77818039c423184d6754013451bcb302c2e603709b64cae01b1693`.
Historical Phase 1V/1D/2 and governance reports remain unchanged.

**LOCAL ENGINEERING PASS — bounded checkpoint 7 complete.** Full/fresh/native
verification, four restored assertion mutations and all five specialist reviews
pass. Publication readiness additionally requires exact-head hosted success.
[ADR-0007](adr/ADR-0007.md) accepts only this shell lifecycle under the owner's D44
conditional authority, after genuine independent root/subpath and fresh proof.

## Implementation and scope

The [design](PHASE_1E_OFFLINE_DESIGN.md) compares a small browser-standard worker
with injectManifest/Workbox. The custom worker plus existing pinned-Vite hook was
selected because project-owned all-client policy is required in either case and
this bounded shell needs no extra dependency. Manifest and original SVG icon are
local, portable relative assets. Six essential resources form one hashed release;
`sw.js` and `release.json` are separate control-plane artifacts. Bundled draft
el-GR/en-GB/de-DE resources remain coherent.

Every install verifies exact URL/origin, 200 status, declared bytes and SHA-256.
Partial installation rejects native readiness and removes only its incomplete new
set; existing releases survive. Unknown, query-bearing and cross-origin runtime
resources never enter caches. Navigation queries select the declared index key.
Bounded ownership metadata and names contain scope/schema/release identities only,
including canonical prior release IDs; no client IDs, tokens, preferences or
learner information are persisted.

Updates wait for the explicit adult/developer Home control. All native in-scope
window clients must prepare, freeze and acknowledge activation (at most 16 clients,
five-second transaction bound). Activities/family proof are unready. Missing,
unready or newly discovered clients block activation. Frozen surfaces cannot start
another interaction. Only a committed matching controller causes one reload;
new-document shell markers establish coherent recovery before cache retirement.

Native release-specific Web Locks coordinate noncreating cache-handle acquisition
with paired retirement. Cleanup also requires an activated worker with no staged
candidate, checked again within the lock. This protects newer candidates and
identical release IDs during A/B/A/B reinstalls. Missing coordination retains
resources. Shell schema compatibility 1–1 is separate from learner migration policy.

Domain truth, families/replay, application/record contracts and accepted ADRs
0009–0012 are byte-unchanged. No IndexedDB/learner persistence, history, mastery,
adaptation, rewards, account, backend, telemetry, deployment or Phase 3 is added.
Shell readiness, optional speech and unsaved transient selections are distinct.

## Entry and final gates

Protected main was fetched/inspected again. Entry frozen install, full
`corepack pnpm verify` (**612 tests / 30 files**) and merged native browser proof
passed before implementation. Final verification results are reconciled below.

| Gate                                                      | Observed result                                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Final canonical `corepack pnpm verify`                    | PASS, 720 tests / 36 files                                                                                       |
| Isolated fresh `corepack pnpm install --frozen-lockfile`  | PASS; unchanged lock, original pinned cache/toolchain                                                            |
| Final fresh full verify                                   | PASS, 720 tests / 36 files; byte-identical candidate snapshot after frozen install                               |
| Canonical native production proof                         | PASS root/subpath; independent final canonical rerun also PASS                                                   |
| Fresh native production proof                             | PASS root/subpath; A/B/C artifact and release declarations exactly match independent root proof                  |
| `corepack pnpm audit --json`                              | Zero advisories, 204 graph entries: 3 runtime, 201 dev, 27 optional                                              |
| Full diff, text/local links, lock/artifact/privacy review | PASS; 54 candidate files, 68 Markdown documents, 364 touched-document local links, one lock document, no finding |
| Exact-head PR Ubuntu/Windows checks                       | Not yet published; neither local PASS nor an older head substitutes                                              |

Node **24.21.0**, npm **11.19.0**, Corepack **0.36.0** and pnpm **12.9.1** remain
unchanged. No dependency, global installation, administrator configuration,
workflow/pin change or new package license/install script is introduced. The
single-document lock SHA-256 is
`62bdfc25b5442d746e019e83b4bbdccbce77e83c5ebc09c73af482647c162964`.
Existing notices remain; the new SVG has original repository-authored vector
content and no external references.

## Actual browser proof

Installed branded **Chrome 154.0.8037.58**, headless with native sandbox enabled,
uses new synthetic contexts, no daily profile and no downloaded browser. The
canonical harness builds genuine A/B/C releases with independently inventoried
disk hashes. Each hosting path passes the following actual observations:

| Requirement                          | Actual observation                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| First install/control/coherent cache | Six exact essential resources and validated metadata; native active controller                                                              |
| Offline reload and new document      | 12 delivered offline resource bodies per path independently checked for bytes/hash/declaration and native worker provenance                 |
| Waiting/two-client safe update       | Real unready, withheld-ACK and newly discovered client each block activation; no forced mid-task reload                                     |
| Explicit all-ready update            | Both real clients recover with the new document shell marker                                                                                |
| Delayed cleanup                      | Withheld recovery preserves prior caches; release permits correct paired retirement                                                         |
| Immutable-ID reuse                   | Real A/B/A/B install cycle preserves each staged candidate and retires only safe prior resources                                            |
| Failed essential C                   | Genuine required-resource HTTP 404 makes candidate redundant; B remains ready and three surviving-B offline bodies are independently hashed |
| Cross-origin exclusion               | Real foreign-origin request absent from exact CacheStorage inventories                                                                      |

Positive offline proof requires native browser offline mode plus an owned
IPv4-loopback HTTP transport gate, zero additional proof-origin request receipts,
an uncached request failure and a separate working online context. Chrome's
automatic worker-script checks were observed bypassing page/worker offline
emulation; the gate closes upstream connections and denies transport without
fabricating cached responses. Denied CONNECT attempts
are recorded separately and never forwarded. This does not claim zero device-wide
traffic. No proxy/server/fixture/browser package enters production artifacts.

The original workerless negative control and synthetic native-observability
fixture remain required and pass. Stopped servers, labels and mocks alone are not
counted as product offline evidence. Full device/browser cold restart, installed
PWA UI, physical disconnection, other browsers/devices, simultaneous overlapping
applications, AT delivery, WCAG conformance, official translations and offline
speech are unclaimed. Storage denial/eviction, same-origin compromise and host
headers/retention remain future support/deployment concerns.

## Material findings and repairs

Findings were reproduced and repaired within scope; intended assertions were
retained. Final independent rechecks are distinguished from earlier observations.

| Finding                                                                           | Repair / regression                                                                                                                                  |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Old active worker could retire a newer waiting release                            | Persist exact prior ownership; never delete a newer unowned release                                                                                  |
| Superseded worker could continue an ineffective update                            | Check native installed state between rounds/before activation; cancel; client unlock only on proven non-controller redundancy                        |
| Overlong response allocated a whole body before rejection                         | Bounded streamed verification and cancellation of both response branches                                                                             |
| Cache presence did not prove delivered offline bytes                              | Independent actual-response byte/hash/membership oracle, retaining provenance and network assertions                                                 |
| Existence/open race could recreate a retired namespace, including in the observer | Noncreating name polling and native release-specific handle/retirement Web Locks                                                                     |
| A/B/A reuse could race cleanup                                                    | Activated/no-staged guard before and within retirement lock; genuine A/B/A/B native regression                                                       |
| Passive late status overwrote blocked cancellation                                | Keep blocked state for the same native worker; explicit retry remains available                                                                      |
| CANCEL during awaited PREPARE status recreated an abandoned attempt               | Reserve the token before await; matching cancellation invalidates it and prevents late READY; pre-fix assertion expected blocked, received preparing |
| Frozen secondary-tab explanation hidden inside details                            | Single exposed status outside details; bounded scrollable recovery banner                                                                            |
| Banner obscured focusable adult summary                                           | Details inert while frozen; status stays keyboard reachable                                                                                          |
| Home overflow at 768px enlarged root text                                         | One responsive auto-fit grid adjustment; accepted geometry/content unchanged                                                                         |
| Old cleanup fixture used noncanonical namespace                                   | Canonical prior-release fixture with meaningful retirement and unrelated-cache assertions                                                            |

Blocked-status and pending-PREPARE regressions failed by assertion before repair;
the final client suite passes **19 tests**. No gate was waived or selector timeout
enlarged to hide a failure. Earlier failed native logs are preserved locally.

## Five independent reviews and mutations

Fresh specialists cover lifecycle/security, browser/E2E proof, privacy/cache,
accessibility/update UX and test/mutation integrity. Lifecycle/security source
recheck at worker
`4cf086ce871b33c40acd99735271051e625d91a0ca8c04473d640c1f45827679`
and client
`bf132bf6b8094df7065d5b8425c1890e8c138160e19f206bb589a1286d9c2249`
passes **98 focused tests / 5 files**, plus independently derived delayed-cancel,
fresh-token retry and stale-cancel/committed-freeze cases. Final privacy source
recheck passes: coordination/reservations remain memory-only, no learner-storage
or telemetry API, inspected ignored diagnostics/captures visibly synthetic.
Independent browser/E2E final canonical rerun passes every required observation
and 75 focused tests / 3 files. Privacy/cache final review independently recomputes
all eight artifacts, pre-marker shell identity and worker-inclusive release
identity, and closes exact native ownership/cross-origin/cache observations.
No material finding remains in either bounded specialty.

Rendered accessibility review passes **139 samples plus six longer recovery
banner checks**, draft el/en/de, 320px, portrait/landscape and deliberate 200% root
text, with separately verified computed 200% text. All **992 observed controls**
exceed 44px, minimum **65.31 × 44.78px**. Panel text, button text, focus and border
contrast: **11.66:1, 10.22:1, 10.17:1, 4.64:1**. Native keyboard update/cancellation,
focus restoration, inert controls, single exposed status and sixteen tiles/one
top `4` indicator pass; long Greek/German recovery text remains keyboard-scrollable.
The earlier sweep at shell
`e99ab11326a428d1de120a0801ef9da3666f20f0f5c9c05e6e65b494243bb649`
is preserved. The independent reviewer repeated all 139 + 6 observations on the
final shell below, including repaired cancellation/retry focus, actual exposed
frozen status and coherent two-tab recovery. Source and A/B/C artifact hashes
remain identical before/after. Native zoom/screen-reader delivery are not inferred.

Initial independent mutations (automatic install skipWaiting, unready client
accepted, failed essential accepted) each fail intended assertions and restore
exact bytes at worker
`ac1548ecf200da8bb7ac9df70e3dab33585542d1aed7acc8c5795249986f946c`.
Final-byte reruns add a fourth staged-candidate retirement-guard mutation. Every
case exits 1 with an intended semantic assertion: skipWaiting expected 0/received
1; unready expected blocked/received activating; failed install expected rejection/
received resolution; staged predecessor expected retained/received deleted.
Exact original bytes are restored after each case at final worker hash
`4cf086ce871b33c40acd99735271051e625d91a0ca8c04473d640c1f45827679`;
client bytes remain unchanged. Restored worker/client/build suites pass
**85 tests / 3 files**. The test specialist independently closes actual-body
oracles, immutable-ID reinstall and pending-PREPARE regression integrity.

## Artifact and publication record

Final build inventory has **eight files / six essentials**, identical in root and
fresh A/B/C proofs. Production-source inventory SHA-256 (sorted repository paths
and each file hash for src/public/index/build/package/lock):
`ea15994b09480ff116107fd12a20da340d243a2f851c5d747887396bbc448f40`.
Release: `sha256-e21f0a110dcf1a5497aeb91c690e98f0c588e6c43c77eb906ca883a0d7d7f07a`.
Shell: `b7d252e757d12ed482b9753c317a06e48476adeb513a05a670fcf4fe5a266b5a`.
Full diff/new-file review passes UTF-8/whitespace, local links, one lock document,
baseline pins/workflow, network references and privacy/secrets. No real
learner material, credential, export or database enters Git or PR evidence.
Ignored synthetic screenshots/logs remain local.

| Artifact                  |  Bytes | SHA-256                                                            |
| ------------------------- | -----: | ------------------------------------------------------------------ |
| THIRD_PARTY_NOTICES.txt   |   1384 | `d79545965a59895fc431b6f519fe411bc32a26415c656b7d531dd7dfcd453aab` |
| assets/index-Cqw6cjjL.css |  21440 | `0727e557389437b5e8347bbc13e789678fb843546f6bd11d83d5018dbd535584` |
| assets/index-ZAEB6tsz.js  | 319586 | `d2a867ef64ffc8159dffc081c288e3c49e887bbc2f26c6bb6767631b16e211c5` |
| icons/math-adventure.svg  |    431 | `a3149c53ce3dd32ac89cce807b2c756b3e6bfe86ae13e941a437e8196f804da6` |
| index.html                |    795 | `81cc14d4f07655c226e8e8ef1eb281b4a10e36f4a0c69ad6c351d197c2ba5a66` |
| manifest.webmanifest      |    440 | `4f45a4ff805e952157734f81f8501eba54f4f2e5d0c8c0ef041c19f0657d034c` |
| release.json              |   1300 | `f307bf94db750a1fc70ef4d2f5791ed3cd0679e0b7a046106ad9bf708fed618e` |
| sw.js                     |  22518 | `f42ab8b59c24803c0ccc360608c4f6c67a8694d202dd3d5d03b7f4d111205458` |

Local raw evidence is ignored and synthetic: `phase1e-final-root-verify.txt`,
`phase1e-latest-fresh-verify.txt`, `phase1e-final-fresh-browser.txt`,
`independent-final-production-report.json`, `phase1e-final-evidence-comparison.json`,
`independent-accessibility-final-summary.json`, `independent-client-cancel-review.json`,
`phase1e-mutation-review-final.json` and `phase1e-hygiene.json` under
`.cache/browser-proof/`. Failed/repaired earlier logs remain separately preserved.

Publication requires PR-specific success for the exact current feature head in
`verify (ubuntu-24.04)` and `verify (windows-2025)`. The reviewable PR supplies the
head and hosted run; this document cannot contain its own final commit hash.
Protected-main merge remains human-only. No tag, release, deployment or next phase
is authorized by completion.
