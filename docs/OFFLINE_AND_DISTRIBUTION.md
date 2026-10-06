# Offline operation and distribution

D49 [Phase 3C integration](PHASE_3C_COMPLETION_REPORT.md) adds an optional
learner-data lifecycle port to the existing shell controller. Only the separate
synthetic runtime injects persistence: it fences/drains commands/selections,
checks every fixed profile's pending state and epoch/row/receipt compatibility,
and checks the target worker's verified cached learner-reader declaration before
readiness. Initial controller acquisition and recovery revalidate compatible
storage; unknown/future layouts preserve recovery or explicit unsaved play. Any
pending/unresolved work or unsaved client blocks activation. Shell schema `1`
does not certify learner schema, and cached readiness remains distinct from saved
progress. Root/subpath learner update/offline cases pass within the 36-case
installed Chrome and Edge suites; inherited Phase 3A stopped-listener/offline
proof also passes seven cases in each. The unchanged Phase 1E shell proof passes
at root/subpath in both installed products under scoped tool permission, with
Chromium sandbox retained and no flag/machine/security changes. Exact source/
artifact bindings and the complete integrated scan are recorded separately.
The current test-only worker scheduling repair leaves these native runtime/build
input subsets unchanged. Initial isolated verification remains bounded to its
earlier source set; the new clean scheduled candidate passes frozen install/full
verification with matching 38-source/pin/normal-artifact bytes.
Mandatory actual disconnected restart is still unavailable: native offline
emulation and stopped-listener restart cannot prove OS/device disconnection.

Merged D44 checkpoint 7 implements the production shell/cache/update
strategy described in [design](PHASE_1E_OFFLINE_DESIGN.md), with required evidence
recorded in [completion](PHASE_1E_COMPLETION_REPORT.md). [ADR-0007](adr/ADR-0007.md)
accepts this bounded shell after independent root/subpath and fresh native gates. Public hosting,
installed-device support, learner storage/migration and offline speech remain
uncertified. [Phase 1 closure](PHASE_1_COMPLETION_REPORT.md) records the exact
merged dependency sequence at `93db59893b076925b1fdb5fadfa5abb9dfb274ac`.
Earlier research sources were accessed 2026-10-04.

## Distribution and host evaluation

Plan web -> installable PWA -> verified cached offline play -> future Windows package -> later macOS/Linux where practical. HTTPS static delivery is sufficient for the accepted client-side design; parents do not administer a server. Initial download, optional uncached packs and update checks require connectivity.

GitHub Pages serves static files ([official overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)); its [documented limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) and provider policies need review at deployment time. It is a viable prototype candidate, **not an accepted production host**.

| Host concern | GitHub Pages evaluation | Portable requirement |
| --- | --- | --- |
| Paths | Project sites use a repository path; root/custom domains differ | One configured base for assets, manifest start_url/scope, routes and worker |
| Headers | Confirm cache/security header controls; do not assume arbitrary header configuration | Test MIME, HTTPS, CSP/header policy and stable worker refresh |
| Privacy | Host receives request metadata; inspect log retention and terms | No learner values in requests; approved host/privacy notice |
| Update/availability | Static deployment needs consistent version assets; provider outages possible | Retain immutable assets, complete release manifest and recovery artifact |
| Rollback | Reverting a deploy does not reverse learner schema | Compatibility-aware rollback or forward fix |
| Migration | A custom domain changes origin/storage | Parent-controlled export/import bridge, no automatic sync |
| Lock-in | No runtime host API required | Deploy portable static output; no hard-coded hostname |

A host with configurable headers and release-atomic deployment may better satisfy production requirements; compare operating burden, privacy terms, retention, cost and availability before choosing. No host resources are created in Phase 0. Do not route gameplay through host APIs.

Manifest/worker/base path must share a reviewed configuration. Place a stable sw.js at the intended app-root scope; avoid unnecessarily broad scope on shared origins. Use hash/local screen navigation initially if history fallback is unavailable. Never rely on a GitHub Pages 404 hack without a specific review. A path is not a security boundary within an origin.

## Readiness and caching contract

Installation is distinct from offline readiness: [Edge documentation](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/) allows installation without a service worker. Readiness requires a controlling compatible worker, a validated complete essential-resource manifest and successful local data access. Essential cache includes shell, domain code, chosen UI/instruction packs, independently selected spoken-number/context-plan resources, required visual assets and licensed essential prerecorded audio if included. Optional languages/assets have their own ready state. Mixed el-GR UI/instructions with de-DE numbers must pass offline tests. Voice playback availability is a separate capability from plan-asset readiness. All assets are self-hosted; no remote fonts/CDN scripts/analytics.

Selected bounded shell implementation: browser-standard worker with a small
pinned-Vite build hook, no new dependency. The [comparison](PHASE_1E_OFFLINE_DESIGN.md)
explains why plugin/injectManifest assistance does not replace the required custom
all-client and recovery policy. Build-generated hashes are declarations; native
independent cache inspection is required evidence.

Use release-namespaced app caches, content-hashed immutable assets, explicit locale/content manifests, stable worker URL and bounded cache inventories. Precache essential assets as a complete staged release; failed installation preserves old usable release. Cache navigation shell for offline and validate resource/version relationships. Do not store profile data in Cache API or cache learner-dependent URLs.

The [service-worker lifecycle](https://web.dev/articles/service-worker-lifecycle) explains waiting workers, scope and mixed-page risk from skipWaiting. Never delete all origin caches: path-based applications may share them. Do not assume an integrity hash signed/served by a compromised origin authenticates that origin.

For normal cached play, application commands make no gameplay-dependent network request. A browser may independently check updates and vendors may have their own background traffic; this is not a universal zero-device-network promise. Explicitly local speech is required by V1 policy; its disconnected functionality is a separate readiness dimension. Missing voice does not falsify mathematical offline readiness, but must be visible to parents.

## Current shell lifecycle and future learner migration

The implemented shell has no learner writes or migrations. An explicit Home
request runs bounded native prepare/freeze/commit rounds; unknown, missing or
unready clients block. A superseded waiting worker cancels while reversible.
Authorized pages recover once into the exact compatible complete release. Old
caches remain until every current in-scope document confirms its new shell marker;
retirement affects only canonical prior IDs recorded before that release install.
Only release/schema metadata persists, with no client IDs or personal values.

The following fuller protocol remains a future learner-data design; it is not
implemented or accepted as a migration policy by checkpoint 7.

1. Online discovery stages a complete immutable release, with schema read/write range and content/generator compatibility metadata.
2. New worker waits; current session continues on its pinned release. Notify locally “update ready” without pressure.
3. At a parent-approved/explicit safe boundary, finish/cancel task, commit state and stop writes. Coordinate **all controlled tabs**; if a tab refuses or cannot be safely quiesced, keep waiting.
4. Confirm recovery resources and migration checkpoint availability. After every controlled client acknowledges quiescence, send an explicit approved activation message to the waiting worker, allowing skipWaiting only at this safe boundary; await activation/controllerchange acknowledgement before coordinated reload into the pinned new release. Alternatively close all controlled clients and reopen after normal activation. Plain refresh does not guarantee activation. Perform guarded IndexedDB migration only from the selected compatible shell. No unconditional skipWaiting/clients.claim during an active session.
5. Verify schema and essential-cache readiness before showing saved/ready status. Abort/failure preserves prior compatible use or read-only recovery. Cleanup only app-owned obsolete caches after no clients use them.

Keep at most two release cache sets (current plus prior compatible recovery) subject to quota; stage may require transient third-set space. If space is inadequate, defer update/offer explicit cleanup and backup guidance rather than destroy current resources/data. Retain recovery only while schema compatibility permits it. Old shell/new schema is unsafe even if old assets remain; rollback must obey declared ranges. Details/tests in [data model](LEARNER_DATA_MODEL.md).

An online newer security version can warn on reconnect, but an indefinitely offline client cannot be forcibly updated. No kill switch or remote telemetry is assumed. Uncached locale switch offers online download or an already-ready pack. Connection loss mid-cache never marks partial assets ready.

## Data durability and platform matrix

[WHATWG storage](https://storage.spec.whatwg.org/) specifies best-effort/persistent modes; persistence and estimates are not backup guarantees. [WebKit policy](https://webkit.org/blog/14403/updates-to-storage-policy/) documents quota/eviction behavior, including standalone apps. Avoid fixed quota promises or blanket seven-day deletion claims. User clearing, storage pressure, private-mode restrictions and device failure remain possible. Request persist() through parent controls with accurate explanation and offer future local backup.

The matrix below is **research-backed candidate support**, not tested certification. IndexedDB/service workers require feature/error detection and real offline-restart tests in every target.

| Platform | Install path to validate | Offline/storage | Speech/voices | Status/limitations |
| --- | --- | --- | --- | --- |
| Windows 11 + Edge | Browser install UI | IndexedDB + SW candidate; denial/eviction tests | Explicit local exposed voice; OS packages available separately | Primary validation target; installed != ready |
| Windows 11 + Chrome | Browser install UI | Same candidate standards; browser-profile isolation | Browser voice enumeration/device test | Primary target; no Edge parity assumption |
| Android + Chrome | Install/Add to Home Screen; package/shortcut varies | SW/IDB candidate; pressure/private-mode tests | TTS engine and downloaded data vary | Primary target; test offline reboot and touch |
| iPadOS + Safari tab | Web browser; [Add to Home Screen/Open as Web App](https://support.apple.com/en-ie/guide/ipad/ipad8f1f7a29/ipados) | Feature/eviction checks; Safari tab tested separately | Browser-exposed voices/gesture behavior need tests | Primary target, minimum OS version unset |
| iPadOS standalone PWA | Home Screen launch | Treat data availability/standalone transitions as separate tests | Same device does not prove same playback lifecycle | No parity promise |
| macOS + Safari/Chrome | Browser or [Safari Add to Dock](https://support.apple.com/en-us/104996) where supported | Web apps may have separate browser data/settings | Local voice tests per surface | Secondary/future, not V1 certification yet |

[Chromium installation guidance](https://web.dev/learn/pwa/installation/) is evidence for install paths, not universal OS parity. Actual OS/browser minimum versions and feature baselines are a Phase 1 capability-checkpoint decision and must be pinned before public support claims.

Tauri packages frontend assets into platform WebViews ([reference](https://v2.tauri.app/reference/webview-versions/)); it needs signing, least-privilege capabilities, updater verification, native persistence/export migration and fresh speech/accessibility testing. End users still require no Rust/Node/Python, but installers may need a WebView runtime provision. No immediate desktop setup is justified.
