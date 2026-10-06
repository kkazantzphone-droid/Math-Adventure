# Phase 1E production shell and update design

Owner scope: checkpoint 7 production PWA/offline closure, 2026-10-06. Entry is
protected main `ab734e108abd22c056b0ebfb2e8081960b0ae468`, including certified
family proof, autonomy governance and the merged real-browser proof environment.
Entry frozen install, full verify (612 tests/30 files) and native-browser proof
passed again. This document explains the implementation; certification results
belong in the [completion report](PHASE_1E_COMPLETION_REPORT.md).

## Smallest justified tooling

| Option                                                      | Assessment                                                                                                                                                                                      | Decision                          |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Browser-standard worker with a small pinned-Vite build hook | Explicit asset hashes, atomic install, waiting/all-tab/recovery policy remain visible in small internal modules; portable relative URLs; no new package                                         | Selected                          |
| vite-plugin-pwa / Workbox injectManifest                    | Assists worker compilation and precache generation, but custom acknowledgement, compatibility and recovery policy still need their own code and real proof; adds package/transitive maintenance | Not needed for this bounded shell |
| Generated automatic lifecycle policy                        | Simpler configuration does not supply the required all-tab safe boundary or recovery proof                                                                                                      | Not selected                      |

Vite supports local build plugins and output hooks; injectManifest supports a
custom worker rather than proving its policy. Primary sources reviewed
2026-10-06: [Vite plugin API](https://vite.dev/guide/api-plugin.html),
[injectManifest guide](https://vite-pwa-org.netlify.app/guide/inject-manifest) and
[Service Workers specification](https://w3c.github.io/ServiceWorker/).
No dependency, global installation, host or deployment change follows.

## Coherent release declaration

The build inventories every static shell file, including the bundled draft
el-GR/en-GB/de-DE resources, manifest, project-owned icon and retained notices.
The icon is original repository-authored SVG with no external references or
third-party asset. The portable manifest uses relative identity/start/scope/icon
URLs; an installed-device claim needs its own evidence.

`shellId` hashes the pre-marker static inventory. A matching HTML meta marker
lets a recovered document identify its loaded shell without deriving truth from
its new controller. Full resource bytes/hashes are then declared. `releaseId`
also covers bundled worker code, so changed worker behavior cannot reuse an old
release identity. `sw.js` and `release.json` are control-plane artifacts outside
the essential shell list; neither is a runtime application dependency.

Protocol/schema version 1 and compatibility range 1–1 describe this shell
protocol only. They are separate from generator/content/replay/application
versions and introduce no learner schema, migration or persistence.

Cache-handle acquisition and paired retirement use the same native Web Lock,
named only by scope/schema/release. The lock covers existence plus `open()`;
retirement cannot interleave and recreate a missing namespace. Hash/network
work is outside the short lock. A queued lock request aborts after 1.5 seconds;
missing coordination fails closed and preserves caches. There is no persistent
coordination record or new package. The
[Web Locks specification](https://www.w3.org/TR/web-locks/), accessed 2026-10-06,
exposes this capability to WorkerNavigator and coordinates agents in the same
storage bucket. An arbitrary same-origin actor remains outside a path security
boundary. This capability is part of the bounded observed Chromium surface.

The worker derives its scope from its native registration. Cache names contain
only the encoded scope, shell schema and release identity. Stored requests are
the exact query-free declared same-origin resource URLs. Navigation queries
select the already-declared index resource; they are not stored as cache keys.
Cross-origin, undeclared, non-GET and runtime requests never enter the shell cache.
One separate metadata cache per release stores only protocol/schema/release IDs
and at most 64 canonical prior release IDs captured before installation. Its
single exact `release.json` key and bounded 8 KiB body are validated before
readiness or retirement. No client IDs, attempt tokens, queries or preferences
are stored. Older release recovery cannot retire a newer waiting release.

## Installation, activation and recovery

Each required response must be 200, unredirected, exact-origin/exact-URL, with
the declared byte count and SHA-256. A failed install rejects native installation
and deletes only its new incomplete set. Existing release sets are not overwritten.
Readiness rechecks the complete cache; a missing/corrupt member returns a bounded
503 instead of silently mixing it with a newer network release.

Install never requests `skipWaiting`. First normal activation claims matching
documents without a forced reload. A staged update remains waiting while the
current release serves its coherent shell. The deliberate adult/developer update
control is available only at Home; other screens and the family-proof path are
unready. It explains that all ready tabs reload and transient selections restart.
Speech availability and learner saving remain separate from shell readiness.

An explicit request enumerates native in-scope window clients (maximum 16),
requires prepare/freeze/activation acknowledgements within a five-second bound,
and re-enumerates membership between rounds and before irreversible activation.
Frozen pages cannot start another interaction. Missing, unready or newly observed
clients cancel the attempt. Native waiting-worker state is checked between every
round and immediately before irreversible activation; replacement cancels a
superseded attempt. The page can release a frozen superseded attempt only when
that native worker is redundant and is not its current controller. Only after all
checks does the waiting worker request
activation. A queued irreversible activation must not subsequently cancel/unfreeze
its acknowledged pages. Pending asynchronous prepare checks reserve their token
before awaiting status; matching cancellation invalidates that reservation, so a
late status result cannot recreate an abandoned attempt or send readiness.
Each authorized controller change causes one recovery
reload; a new document's shell marker is checked before readiness is shown.

Old caches survive native activation. Cleanup requires every current in-scope
document to report the new shell marker. An absent recovery acknowledgement retains
old resources. Cleanup targets only the prior IDs recorded by this release within
that exact scope/schema prefix. The native worker must still be activated, with
no installing or waiting candidate; that condition is rechecked within the
retirement lock. This conservatively protects identical releases reinstalled
after a compatible A/B/A rollback. A redundant old worker cannot retire resources
using its former in-memory active flag. Missing or malformed ownership fails closed. This protocol
stores no tab/profile/learner data and uses no storage-based coordination hack.

## Bounded claims and review obligations

Native client membership is not an atomic browser transaction. Conservative
discovery includes uncontrolled same-origin windows within the registration scope;
an unrelated or unresponsive client blocks activation/cleanup. Startup gating
prevents a late old-shell document from beginning a task during a known update.
Root and subpath proof use separate fresh contexts; simultaneous overlapping
applications on one origin are not certified.

Browser update checks are distinct from application resource dependencies. Native
offline controls, actual cache responses, request inventories and deliberate
missing-resource controls must be observed; a label, mock or stopped dev server is
insufficient. This installed Chromium's automatic worker-script checks can bypass
page/worker offline emulation. The proof also gates an owned IPv4-loopback HTTP
transport proxy, which closes upstream connections and denies traffic while
offline; it never fabricates cached responses. Native browser offline mode,
worker response provenance, independently hashed bodies, zero new origin receipts,
an uncached failure and a separate online context remain required together.
Blocked browser control-plane attempts are recorded separately. This is browser
offline emulation plus a loopback transport gate. Full device/browser cold restart,
installed PWA, physical network
disconnection, assistive technology and offline speech remain separately scoped
observations. No learner persistence, adaptation, backend, telemetry, Phase 3,
release or deployment is authorized by this checkpoint.

Required independent reviews cover lifecycle/security, native browser proof,
privacy/cache scope, accessibility/update UX and mutation integrity. At least three
meaningful assertion mutations must be detected and restored exactly before final
full/fresh/native/audit and current-head hosted gates. ADR-0007 is not accepted
merely because these modules exist.
