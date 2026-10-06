# Phase 3A — synthetic local data foundation

Date: **2026-10-06, Europe/Athens**. Authorized base:
`c82f4ca9ed27e35f6ccdad46cc56de2fc40c04ff`, observed on `origin/main` after
fetch. Branch: `codex/phase-3a-local-data`. Implementation is preserved at
`9d7babaabd42d5a977f302b8685a9ab1cd4a7679` (foundation `5116fd2` plus final
review repairs), followed by the checkout-path-independent containment test at
`e80190862868beec9aed0226619dca19b662d30b`. Browser/mutation source hashes identify
their exact bytes. Local outcome: **PASS for the authorized synthetic-only 3A
scope**, within the evidence limits below. This report makes no real-child-readiness
claim. Exact-head hosted checks remain a separate publication gate.

The owner's separate `/goal` authorizes only Stage 3A in the
[plan](PHASE_3_IMPLEMENTATION_PLAN.md) and
[persistence design](PHASE_3_PERSISTENCE_DESIGN.md), under
[ADR-0010](adr/ADR-0010.md). Protected-main merge, release, deployment, real
learner use and accepted policy changes remain human-only. Phase 3B adaptation
and normal child save/restart are excluded. Historical reports/ADRs are preserved.

## Implementation and containment

Raw browser IndexedDB implements the existing three-method
`AtomicRecordRepository<T>` without changing its contract or adding dependencies.
The application/domain code, generator/replay IDs, normal composition and UI are
unchanged. `adapter.ts` owns native transactions, `layout.ts` exact storage
boundaries, `maintenance.ts` explicit bootstrap/migration/recovery/full clear,
and `envelope.ts` future synthetic envelope validation only.

`vite.persistence.config.ts` builds a separate developer entry under
`tests/browser/phase3/`; the normal Vite entry never imports it. The entry requires
an explicit compile-time developer capability and a loopback HTTP origin with an
explicit port. Missing capability exposes no repository interface and visibly
permits UNSAVED memory use only. It has no input, nickname, free-text or file
controls. Commands/provisioning use a fixed allowlist of visibly synthetic profile
IDs and payload variants; corruption helpers select finite named fixtures.
Query parameters cannot grant the capability. The proof creates fresh disposable
browser profiles, never opens daily profiles, and serves the normal-child runtime
probe on a different origin. The transitive import test and native open counter
prove that ordinary composition imports neither persistence nor adaptation and
opens no IndexedDB database. The developer path has no automatic write queue.

## Exact layout and transaction boundary

The database namespace is `math-adventure.synthetic.phase3.<test-token>`. Four
stores have no indexes or auto-increment keys:

| Store              | Key/value                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `metadata`         | Out-of-line singleton `control`: schema version, safe-integer epoch, compatible reader range, recovery phase and fixed/null plan ID |
| `records`          | `recordId` key path; exact detached aggregate and local revision                                                                    |
| `receipts`         | Global `operationId` key path; record ID, epoch, canonical command fingerprint and exact success receipt                            |
| `migrationStaging` | Out-of-line singleton `checkpoint`; bounded synthetic learner rows and fixed migration identity/source/target versions              |

Versions 1 and 2 are explicitly **invented synthetic rehearsal layouts**, never
shipped historical learner schemas. Version 1 matches the readiness fixture's
`{recordId, revision, payload}`; version 2 adds `recordSchema` without changing
`synthetic-learner-v1` payload/command meaning. This is the one documented
refinement of the design table's initial `recordSchema` field: it lets the exact
existing independent source/target fixtures drive a genuine native transition.
Schema versions are independent from application/export/content/generator IDs.

Every execute detaches and validates synchronously before returning a Promise.
Every writer covers all four stores, adding staging-state validation to the
design's ordinary three-store scope. Native callbacks perform control/inventory
validation → epoch check → exact globally scoped receipt lookup → target
existence/expected revision → overflow preflight → record/revision/receipt commit.
No timer/network/UI await occurs inside a transaction. Success is returned only
from `transaction.oncomplete`; request success cannot mean saved. Native errors
expose stable codes only. Readonly control/target transactions return consistent,
validated detached snapshots. Close/versionchange permanently revokes handles.

The declared synthetic receipt capacity defaults to 1,000 in the conformance
harness; a capacity-1 fixture exercises refusal. Receipts are never pruned in an
epoch. Exact retry precedes capacity/revision checks, new create/update can return
`storage_unavailable`, and delete/full clear remain available. No epoch rotation
is used for capacity reclamation. Production retirement remains a reviewable
future protocol/policy.

Delete removes only the target aggregate, advances the global epoch, clears all
old receipts and staging atomically, and preserves survivor revisions/payloads.
The advanced-epoch delete receipt is response-only. It rejects stale target and
survivor sessions before deduplication and never upserts. A generic explicit
fresh-epoch create can reuse an ID; no permanent tombstone promise is made.

Full clear requires explicit known-client quiescence. One native transaction
advances the live fence and erases records, receipts, staging and extra metadata,
retaining only fresh validated control. Memory and exact-owned cache cleanup
follow separately; failed cleanup reports `pending` after database deletion.
False/failed quiescence acknowledgment prevents cleanup; discovering all clients
and clearing their memory remains the lifecycle coordinator's responsibility.
The harness clears its own prepared payload command after database completion.
Browser/OS backups and external
files cannot be erased by this API; other applications' stores/caches are untouched.

## Migration and recovery

The fixed `synthetic-layout-1-to-2` transition prepares one validated checkpoint,
marks source `prepared`, closes the source and uses a native versionchange
transaction. Checkpoints include IDs, record-local revisions, schema and necessary
payloads, but exclude source epoch, receipts and session IDs. Limits are 10 rows
and 4 MiB UTF-8 learner rows, plus individual canonical/codec bounds. These are
synthetic resource limits, not accepted retention/import policies.

The upgrade preserves live epoch/revisions/payloads and original receipt bytes,
then commits `upgradedPendingValidation`. A separate reopened validation compares
live IDs, revisions and payloads with the checkpoint before atomically setting
ready/removing it. Prepared restart explicitly resumes or cancels only after
unchanged-source validation. Unverified target restart remains read-only until
finalization. Cancellation tracks checkpoint, upgrade and finalization transactions
and closes late targets. Native blocked upgrades require the holder to close;
there is no database-delete/reset workaround. Future/lower-version opens refuse
writes; missing database reopen aborts empty bootstrap and requires explicit new
bootstrap authority. No automatic restore or downgrade occurs.

Native abort after queued writes and native request ConstraintError test rollback.
Injected quota/checkpoint/upgrade/interruption/cancellation/response-loss seams
exercise bounded failure paths; they are not naturally occurring disk exhaustion,
power loss or eviction evidence. The real browser restart tests close the process
gracefully and reuse only its fresh synthetic profile.

## Envelope contract

The future contract reserves exact format/schema/learner/model/content/generator/
replay/canonicalization fields and necessary rows only. It cannot represent source
epochs, receipts, fingerprints, revisions, sessions, Number Lab exposure or staging.
It returns detached staging data and performs no file, network or store operation.
Synthetic bounds are 10 rows, depth 20, 4 MiB UTF-8 and bounded traversal; each row
also retains canonical-json-v1 and synthetic-codec bounds. Fifteen tests include
two seeded 1,000-case properties, dangerous keys, accessors/executables, future
versions, remote/code fields, malformed exact spelling, depth/count/size and faulty
codecs. There is no import/export UI, arbitrary file acceptance or live restore.

## Independent review and repairs

Fresh specialists reviewed transactions/concurrency, migration/recovery,
privacy/security, browser/device evidence and test/mutation quality. Review found
and repaired: unchecked extra metadata/orphan ready checkpoints on active handles;
missing checkpoint revision comparison; finalization after coordinator cancellation;
migration certifying extra metadata that reopen rejected; full-clear metadata
retention; Windows absolute path escape in the test server; insufficient synthetic
provisioning restrictions; same-origin child proof; transport-masked alias tests;
incomplete native evidence; and a retained prepared harness command after full
clear. A fresh checkout also caught an absolute-path containment assertion matching
`phase3` in the checkout directory; it now examines repository-relative paths.
Retained native/pure regressions exercise the
material repairs. Implementers are not the sole certifiers. Specialist reviews
remain engineering reviews, not professional privacy/education/device certification.

Six meaningful temporary mutations require clean baseline assertions and
assertion failures: stale revision accepted, stale epoch accepted, saved before
completion, deletion fence unchanged, retry receipt ignored, and incompatible
migration silently resetting rows. The runner restores exact source Buffers and
their SHA-256 values in `finally`, removes raw temporary assertion diffs and retains
only sanitized defect/test/hash results. All six were detected in native Chrome;
final evidence hashes are recorded by the runner.

## Native conformance matrix

Both final native suites passed **35 tests / zero failures**, followed by **seven
supplemental checks** per channel on Windows NT 10.0.26200.0. Chrome
**154.0.8037.58** and Edge **154.0.4258.53** were launched using distinct installed
product channels. The unchanged reusable nine-test conformance suite runs against
the real adapter in each channel. An independent array/semantic-tuple oracle also
compares 50 sequences (seed `20261006`) and 600 native commands per channel, with
state checks after every command.

The supplemental proof binds its shell assets to the main proof's SHA-256
inventory. It freezes two known clients, observes the native compatible migration,
interrupts after live validation before checkpoint cleanup, gracefully closes the
browser process and stops the loopback listener. A new browser process reopens the
same disposable profile through the test-only cached worker; navigation is served
by that worker and an uncached fetch fails. Data/checkpoint recovery, incompatible
old-reader refusal and separate database/cache cleanup are observed. This is a
synthetic shell rehearsal, not normal child PWA integration or OS network isolation.

Retained sanitized evidence: [Chrome](evidence/phase3a/chrome-native.json),
[Edge](evidence/phase3a/msedge-native.json),
[Chrome supplemental](evidence/phase3a/chrome-offline.json),
[Edge supplemental](evidence/phase3a/msedge-offline.json) and
[six mutations](evidence/phase3a/chrome-mutations.json). These contain counts,
bounded capability observations and hashes, never database rows or profile files.

| Design matrix row         | Evidence / limit                                                                                                                                                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create/update/load        | Native explicit create/revision, replace, isolation, close/reopen; unchanged reusable suite                                                                                                                                                        |
| Missing/existing target   | Native failures unchanged; corrected failed operation reevaluates                                                                                                                                                                                  |
| Stale revision            | Independent native clients: one commit/one conflict; generated oracle                                                                                                                                                                              |
| Stale epoch               | Native delete/fullclear fences before receipt/revision; stale create rejected                                                                                                                                                                      |
| Duplicate operation       | Simultaneous exact requests, retry after later writes/reopen, changed kind/payload/profile conflicts                                                                                                                                               |
| Deep detachment           | Same-browser-realm input/nested mutation, receipt/load mutation and reload; transport suite alone is insufficient                                                                                                                                  |
| Delete race               | Native overlapping independent-client update/delete matches legal serialized outcomes                                                                                                                                                              |
| Delayed callback          | Explicit prepared/detached command resumed after native deletion rejects epoch                                                                                                                                                                     |
| Overflow                  | Reusable native maximum revision/epoch provisioning; no receipt consumed                                                                                                                                                                           |
| Abort                     | Native transaction abort after requests and native ConstraintError preserve prior stores                                                                                                                                                           |
| Commit response loss      | Receipt withheld after native completion; exact retry returns original without replay; delivery-loss scheduling is injected                                                                                                                        |
| Denied/read-only          | Genuine opaque-origin denial, capability-off build, prepared/unverified readonly recovery; no saved claim                                                                                                                                          |
| Quota                     | Injected quota rollback observed. Native quota refusal **BLOCKED — EVIDENCE UNAVAILABLE**: each channel's bounded engine-override attempt completed 256 fixed commands without a native quota error; natural device exhaustion is unverified       |
| Receipt lifecycle         | Native capacity-1 exact retry/refusal/delete/fullclear; no pruning                                                                                                                                                                                 |
| Full clear                | Native two-client freeze/acknowledgment, refusal, epoch/data removal/reopen; owned cache removed/unrelated cache survives; injected cleanup failure reports pending                                                                                |
| Browser clearing/eviction | Genuine CDP browser-engine site-data clearing revokes handle and refuses reopen bootstrap; natural eviction **BLOCKED — EVIDENCE UNAVAILABLE**                                                                                                     |
| Blocked upgrade           | Native nonclosing holder, blocked notification, explicit cancellation, close/retry; no delete workaround                                                                                                                                           |
| Versionchange             | Ordinary adapter revocation and in-flight settlement during native migration                                                                                                                                                                       |
| Migration success         | Fixed independent readiness source/target, exact revisions/epoch/payload/receipts; checkpoint pruned after validation                                                                                                                              |
| Migration failure         | Native abort/request error plus injected required-checkpoint/upgrade failure; incompatible rows refuse unchanged, never reset                                                                                                                      |
| Interrupted migration     | Graceful process restart at prepared/committed-unverified; finalization cancellation before cleanup retains checkpoint; crash/power-loss unverified                                                                                                |
| Future/unknown schema     | Future DB/control, incompatible payload, lower-version opener, missing DB and revoked handle refusal                                                                                                                                               |
| Shell/data update         | Both supplemental suites observe compatible synthetic shell migration, stopped-listener cached-shell restart, interrupted cleanup recovery and incompatible reader rollback refusal; production child composition remains excluded                 |
| Restore/import race       | **BLOCKED — EVIDENCE UNAVAILABLE** for a live restore: the authorized deliverable is envelope validation only and excludes import UI/real files/live restore. Current-destination fencing remains mandatory before a future restore implementation |
| Privacy                   | Fixed synthetic allowlists, separate origins/build, no payload logs/URLs/network/caches, source/artifact review and resolved-path disposal of every final synthetic browser profile                                                                |

Storage estimates/persisted status are native advisory observations. No persistent
storage request is made. No guaranteed persistence, encryption, immunity from
eviction, crash durability, physical erasure or universal device-support claim
follows. Android/iPadOS/assistive technologies/real learners remain untested.

## Gates and publication

Full canonical verification and the isolated fresh frozen-install/verification
both passed on `e80190862868beec9aed0226619dca19b662d30b`: **792 tests in 41 files**,
16 synthetic evaluation fixtures, formatting, zero-warning lint, all four strict
TypeScript projects and production build. The isolated checkout downloaded and
installed its own 179 packages; it did not copy `node_modules`. Its name deliberately
retains `phase3`, exercising the repaired containment assertion. The final complete
documentation candidate is rerun through both gates before feature publication.

The audit on 2026-10-06 reported **No known vulnerabilities found**. No
runtime/development dependency, install policy, exact tool pin or lockfile changed.
The lockfile SHA-256 is
`62bdfc25b5442d746e019e83b4bbdccbce77e83c5ebc09c73af482647c162964`.
Complete source/config/test/documentation/evidence diff review, Git whitespace,
278 local links, 28 retained source-hash checks and privacy/secret review passed.
Only sanitized summaries are retained; disposable native profiles were removed.

The production inventory contains eight artifacts. Main JS/CSS bytes and hash
filenames match the initial protected-main build; no adapter/harness identifier is
present in the output. Notices remain copied. The retained
[inventory](evidence/phase3a/candidate-inventory.json) records every size/hash.

| Artifact                    |   Bytes |
| --------------------------- | ------: |
| `index.html`                |     795 |
| `manifest.webmanifest`      |     440 |
| `release.json`              |   1,300 |
| `sw.js`                     |  22,518 |
| `THIRD_PARTY_NOTICES.txt`   |   1,384 |
| `assets/index-Cqw6cjjL.css` |  21,440 |
| `assets/index-ZAEB6tsz.js`  | 319,586 |
| `icons/math-adventure.svg`  |     431 |

Canonical commands:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm verify
corepack pnpm persistence:proof
corepack pnpm persistence:offline-proof
corepack pnpm persistence:mutations
corepack pnpm audit
```

Set `PHASE3_BROWSER=chrome` or `msedge` for separately recorded native channels.
The proof owns its builds, ephemeral loopback listeners and disposable profiles.
Evidence under `.cache/` is sanitized and ignored; raw databases/profiles/screenshots
are never published. Current runtime/development dependencies and lockfile are
unchanged. Production output remains the ordinary shell, with no persistence code.
Feature publication is conditional on full/fresh gates, clean scoped diff and
observed required hosted checks for its exact head; no merge/tag/deploy is performed.
