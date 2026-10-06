# Phase 3 persistence and recovery design

Date: **2026-10-06, Europe/Athens**. Status: **readiness proposal; no adapter or
database implemented**. Reviewed baseline is protected main
`93db59893b076925b1fdb5fadfa5abb9dfb274ac`. The owner requests architecture and
synthetic review tooling, and explicitly excludes starting Phase 3 implementation.

This design implements the future obligations of [ADR-0003](adr/ADR-0003.md)
without weakening [ADR-0010](adr/ADR-0010.md), [application ports](APPLICATION_PORTS.md)
or immutable [replay](adr/ADR-0009.md). The [Phase 1C report](PHASE_1C_COMPLETION_REPORT.md)
proves port semantics using memory only. The [Phase 1E report](PHASE_1E_COMPLETION_REPORT.md)
proves the shell/cache lifecycle only. Neither proves IndexedDB, migration,
physical erasure or learner-data durability. Numeric retention, production learner
fields and adaptation remain proposals in the [data model](LEARNER_DATA_MODEL.md).

## Smallest adapter and scope

Choose **raw browser IndexedDB with no new dependency** for the initial 3A
implementation proposal. A small platform module implements
`AtomicRecordRepository<T>` and takes an exact `RecordCodec<T>`; application and
domain continue importing no DOM or platform code. Keep bootstrap, migration,
full clear and capability reporting outside the existing three-method port.
Do not add a query DSL, ORM, cloud service, lease-based correctness or localStorage
fallback. The existing test fake remains test-only.

The first implementation goal must be explicitly authorized and synthetic-only:
separate developer composition, visibly synthetic codecs/IDs, isolated database
namespace, no normal child-screen entry point, no arbitrary profile input or real
data import. That goal can build a production-quality adapter without enabling
real-child persistence. Policy-dependent fields and retention strategies must be
explicit injected test inputs; they cannot become live defaults by accident.

Proposed eventual database name is `math-adventure.local`, stable across releases
and without profile/device information. Synthetic browser proof instead uses
`math-adventure.synthetic.phase3.<isolated-test-token>` in an ephemeral browser
context, never a daily browser profile. These are planned names; this readiness
task opens neither. An app path is not an origin security boundary, so database
ownership must be exact and deployment origins remain a separate human gate.

Start the eventual database at integer version **1**. There is no existing
production learner schema to migrate. Future versions strictly increase and each
published transition has a fixed migration ID and validated supported source.
Database layout, learner codec, command/receipt, export, application release,
content, semantic, generator and canonicalization versions remain separate.
Do not bump database version for every asset release, reinterpret old generator
IDs or infer schema compatibility from a matching application version.

## Stores, keys and payloads

Use four stores in the first layout. No secondary indexes are necessary for
single-profile load/replace, globally scoped operation lookup or full epoch
rotation. No auto-increment keys or hidden browser-generated profile identity.

| Store              | Key and exact proposed value                                                                                        | Ownership and use                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `metadata`         | fixed key `control`; schema version, safe-integer `storageEpoch`, fixed compatibility range, recovery phase/plan ID | One global fence and write gate; no device, tab, session ID, fingerprint or timestamps                       |
| `records`          | `recordId`; `{ recordId, revision, recordSchema, payload }`                                                         | One detached, exact codec aggregate per profile; never an upsert on answer submission                        |
| `receipts`         | `operationId`; `{ operationId, recordId, storageEpoch, fingerprint, receipt }`                                      | IDs global within current epoch; immutable successful create/update receipt and exact canonical command text |
| `migrationStaging` | fixed key `checkpoint`; bounded validated learner rows, source/target layout and migration ID                       | At most one internal recovery checkpoint, never an alternative history or shadow live database               |

Validate key/value agreement as well as exact field sets. Metadata schema version
must equal the opened database version. Missing/corrupt control state, unexpected
stores/indexes, unrecognized codec or incompatible version closes the write path.
Never repair by inventing a new epoch over existing unknown data.

Physically placing bounded observations and preferences inside a profile aggregate
is the smallest transaction design; these remain logically separate groups:

| Logical group in future typed aggregate | Necessary proposed fields / boundary                                                                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile                                 | Opaque fresh local ID matches record key; neutral label; optional nickname only after its reviewed plain-text bound; coarse creation day if necessary                                     |
| Preferences                             | Separate exact UI/instruction/number-speech locale roles, explicit optional speech and accessibility controls; no voice enumeration/fingerprint persisted                                 |
| Observations                            | Assessment scope, replay identity, classified outcome/support exposure, coarse supplied day and policy/content versions; no raw answer, precise duration, speech utterance or clickstream |
| Concept/representation state            | Independent scoped summary and reason/support/revisit metadata produced by pure application/domain policy; no single global level or sibling comparison                                   |
| Progression                             | Optional personal discoveries and reward deduplication only when separately authorized; no required store or new mechanic in 3A                                                           |

The table is a codec design boundary, **not an accepted production DTO**. 3A initially
uses the existing `synthetic-learner-v1` codec and visibly synthetic records.
3B/3C may propose a minimal versioned aggregate after simulation/review. Store an
entire validated aggregate and its revision/receipt in one transaction so an
observation cannot commit without its corresponding state/recommendation.
ExploratoryExposure and Number Lab session state never enter any persistent
aggregate, checkpoint or export. No age, birth date, email, sibling linkage,
diagnosis, exact response time or learner-dependent URL is introduced.

Use the actual Phase 1B/1C bounds: ID syntax/length from
`src/application/core/integrity.ts` (bounded ASCII, at most 96 characters),
nonnegative safe-integer revisions/epochs with checked overflow, and
`canonical-json-v1` depth 32, nodes 10,000, individual text 4,096 and serialized
output 262,144 UTF-16 code units. Exact nonintegers use the existing bounded DTOs;
no raw BigInt, Date, Blob, floating tolerance or arbitrary structured-clone type.
The record codec must reject extras and preserve canonical wire equality.
An internal fingerprint is the separately validated canonical command text, up
to the output bound; do not pass that long string through a generic 4,096-character
payload-string validator or expose it through public receipts/logs.

## Command transaction and read consistency

Validate and detach the entire command synchronously when `execute` is called,
before any async wait lets the caller mutate it. Produce the bounded canonical
fingerprint using the existing readers. Open one `readwrite` transaction over
`metadata`, `receipts` and `records`; deletion also includes `migrationStaging`.
Every writer touches `metadata`, intentionally serializing writes across profiles
to protect the global fence. This is acceptable for the bounded first slice.

Inside that transaction, in this exact order:

1. Validate control/write compatibility, then compare command epoch with the
   current stored epoch. Return `epoch_conflict` before any receipt lookup.
2. Read operation ID globally. Validate stored receipt, key/epoch/record linkage
   and fingerprint. Same command returns its original detached receipt; different
   command returns `operation_conflict`. Do not compare expected revision first.
3. Read/validate target. Create requires absence and null expected revision;
   update/delete require existence and exact expected revision. No implicit create.
4. Preflight checked revision increment, deletion epoch increment, payload and
   public receipt. Any rejection aborts without allocating a receipt.
5. Create/update writes complete aggregate, next revision and immutable receipt
   atomically. Delete removes target, removes checkpoint, increments global epoch
   and clears all receipts atomically; its advanced-epoch receipt is response-only.
6. Resolve success **only on transaction completion**, never request success.
   An abort or quota error rejects the whole change. Do not swallow request errors
   and accidentally commit a partially prepared mutation.

Queue dependent IndexedDB requests from request event callbacks while the
transaction is active. Do not wait for fetch, timers, speech, worker coordination,
UI confirmation or another task inside a transaction. Validation and pure planning
are prepared before it or completed synchronously inside request callbacks. A
business-conflict abort retains the intended stable application code; unexpected
native errors expose only `storage_unavailable`, and quota failure exposes
`quota_exceeded`. Do not surface exception messages or record contents.

`load` reads control and the target in **one readonly transaction** so payload,
revision and returned current epoch are a consistent snapshot. Validate through
`snapshotFromData`; never trust structured clone alone. `getEpoch` validates its
control read. Returned snapshots/receipts remain detached. BroadcastChannel,
Web Locks and UI coordination may announce changes but do not replace transaction
checks or become required for integrity.

## Receipts, deletion and full clear

Keep every successful receipt in its current epoch. The port contains no retry
expiry or receipt-release signal; the proposed 100/profile/session-end pruning
cannot be silently implemented while exact same-epoch retries remain valid.
Synthetic development may use a declared finite capacity: at capacity, preserve
old receipts, allow exact retries and reads, and refuse new create/update mutations
with `storage_unavailable` plus a separate nonpersonal capacity status. Delete and
full clear remain available through their checked normal transactions because
they remove receipts rather than consume new receipt capacity; native quota,
overflow or abort can still fail them without partial deletion. Capacity is a
developer resource bound, not a production retention policy. Do not rotate epochs
merely to reclaim receipts. Production pruning requires a reviewed explicit
retirement protocol/version or a separately accepted policy-compatible design.

Delete removes the profile aggregate and **all checkpoint material**, even when
it also contains survivor copies. It clears every old-epoch receipt as already
required; survivor aggregates/revisions remain unchanged. Other tabs clear their
profile/exploration memory and reload the fresh epoch. Pending old-epoch commands
fail even when their original success receipt once existed. Retry a destructive
call by reconciliation, not blind resubmission. New normal profiles get a fresh
opaque ID from composition; ordinary writes cannot recreate missing records.
The generic port itself does not prohibit deliberate fresh-epoch explicit create
with an old ID, so do not claim tombstones or permanent ID-reuse enforcement.
If deletion is requested during prepared migration, cancel the coordinator and
confirm the unchanged compatible source before returning its control to ready;
then delete/fence/remove checkpoint atomically. A late upgrade must abort. Never
automatically restore a checkpoint to satisfy deletion. After a committed but
unverified target, ordinary commands remain blocked until compatibility and
validation are resolved; the UI must expose this recovery limit instead of
claiming that a deferred deletion has completed.

Full local clear is a separate explicit parent/developer maintenance operation.
First quiesce all known app clients and stop accepting new interactions; if a
client cannot acknowledge, report incomplete and retry without cleanup. In one
transaction validate/advance the live epoch, clear records/receipts/checkpoint and
retain only schema/compatibility/control needed to reject stale commands. Overflow
or abort leaves prior state intact. This transaction is the deletion boundary;
then wipe each client's memory and requested, exactly owned shell caches through
the established lifecycle. Cache API cleanup and IndexedDB are not one atomic
transaction: report database deletion and cache-cleanup completion separately,
and retry exact-owned cleanup without recreating learner data. No other database
or same-origin application's caches may be touched.

Do not use `deleteDatabase` for ordinary clear or blocked upgrade. Complete browser
site-data removal loses the fence; no numeric epoch can remember a database that
the browser erased. Close/forced-close/versionchange permanently revokes existing
adapter handles. An unexpected missing database at reopen must abort bootstrap,
discard pending commands and require an explicit new session/bootstrap before
creating stores. First-run creation also needs explicit bootstrap authority.
Fresh caller IDs reduce accidental identity reuse; they are not a proof against
hostile scripts, external browser clearing or same-origin compromise. Never
automatically reopen a stale writer into a reset database.

## Deterministic migration and bounded recovery

Initial version 0 -> 1 is empty bootstrap, not migration of historical learners.
The supplied [synthetic fixtures](../tests/fixtures/phase-3-readiness/README.md)
invent layouts solely to rehearse a future transition. No schema predating Phase 3
is asserted to have shipped.

For each later supported forward transition:

1. Select one compatible complete shell and explicit safe boundary using the
   [offline lifecycle](OFFLINE_AND_DISTRIBUTION.md). All controlled clients finish
   or cancel work and quiesce. Unknown/unready clients keep the update waiting.
2. On the source connection, one transaction validates live data, creates at most
   one necessary checkpoint and marks control `prepared` with fixed plan/source/
   target identity. Writers must reject prepared state. Count and serialized-size
   bounds are checked incrementally; do not copy unbounded histories into memory.
3. If the required checkpoint does not fit or cannot commit, stop before upgrade;
   old state remains usable. A synthetic proof budget is at most 10 records and
   4 MiB total UTF-8 learner rows, with each row respecting canonical bounds. These
   are declared test work limits, not accepted profile/import/retention policies.
4. Close source connections and request the exact higher version. On
   `versionchange`, immediately stop new writes/close the handle; existing in-flight
   transactions settle through their completion/abort handlers. Do not inject a
   last-minute save or force a child-session refresh. On `blocked`, explain close/
   retry, retain old data and cancel/abort any late upgrade after the coordinator
   has cancelled. No delete/reset workaround.
5. The native upgrade transaction applies the fixed pure transform, validates all
   target rows and store/index inventory, and changes control to
   `upgradedPendingValidation`. No hidden clock, random input, network or generator
   rerun. Reject unsupported source, corrupt input, future layout or missing required
   checkpoint; abort restores the source layout/version.
6. Reopen/read the committed target and independently validate it against the
   checkpoint and migration plan. Only then atomically mark `ready` and remove the
   checkpoint. Do not acknowledge ready/saved before this check. Crash before that
   final transaction re-enters read-only recovery at next startup.

A compatible structural migration preserves live revisions, epoch, record-codec
wire identities and original receipts/fingerprints. The rehearsal adds a stored
record-schema field without changing payload/command semantics. A future migration
that changes learner DTO meaning needs explicit codec/version compatibility and
retry review; it cannot rewrite fingerprints or keep an old semantic ID. Unknown
old codecs are preserved or rejected, never normalized by the ordinary decoder.

Checkpoint content excludes operation receipts, source epoch and active-session
IDs. It is a bounded recovery view, not an authoritative destination control
snapshot. Never overwrite the live destination epoch with a checkpoint/import
value. Rollback after a committed incompatible schema cannot downgrade database
version: use compatible assets or a forward repair. An aborted source upgrade may
cancel its prepared state in a checked source transaction after confirming the
source is unchanged; otherwise keep read-only recovery. No silent empty reset.

Read-only recovery may display validated safe state and stop/help controls; unknown
or corrupt content is not rendered as a trusted learner result. A future confirmed
restore must use current destination fencing, fresh local identities/commands and
applicable expiry rules; automatic checkpoint resurrection is excluded. The
proposed seven-day maximum is **not accepted**. Synthetic checkpoints are removed
after validated success or explicit deletion and remaining failed fixtures are
disposed at test end. Real-use checkpoint expiry/grace requires owner/privacy
decision; a closed PWA cannot promise timed physical deletion.

## Denial, quota and incompatible data

Storage availability is capability status, separate from a particular save. Denied
open, disabled API, abnormal close, transaction abort or I/O error enters unsaved
session/recovery with stable code-only reporting. Real quota failure leaves prior
data/epoch/receipts untouched; keep an unsaved answer in bounded session memory
only, visibly unsaved, until retry or stop. If the response was lost after commit,
retry the exact operation under the current epoch; do not create a new operation
before reconciling. Full/blocked/corrupt state never triggers automatic destructive
cleanup, and best-effort storage estimates do not authorize a write.

Open with an explicit supported version. A higher database version or future
control/codec yields `unsupported_schema` and no writes. An older shell may offer
read-only recovery only for a declared compatible reader range; otherwise present
a generic update/help state without interpreting unknown rows. Never open without
a version and assume the newest layout is writable. Missing metadata/unsupported
future database is not first run. Persistent-storage requests remain explicit
parent controls with reviewed explanation, not a substitute for backup or a
development prerequisite.

## Future local export/import compatibility

Export/import is deferred, with no import/export UI, file creation or real data
use in this task. Reserve a separately versioned bounded envelope identifying
learner schema/model, content/generator/replay and canonicalization versions.
Export only necessary validated learner data; exclude safety epochs, receipts,
fingerprints, active sessions, Number Lab memory and recovery staging. Optional
nickname inclusion needs a preview. Checksums detect corruption, not authenticity.

Future import stages bounded data, rejects unknown/future versions and unsafe/
extra fields, validates/migrates purely, previews identity/conflicts and awaits
explicit parent confirmation. Default is fresh remapped local IDs, not sibling
merge. Commit against the **current destination** fence and recheck it in the
transaction; a concurrent delete/clear cancels the staged import. No source
control metadata is restored and no expired evidence is revived. The existing
5 MiB/depth-20/10-profile/500-observation proposal remains subject to review; it
does not overrule the stricter canonical bounds of any individual record/command.

## Actual-adapter conformance matrix

Every row is a **required future observation**, not a readiness-task result.
Run the existing reusable public-port suite unchanged, its independent array/
semantic oracle and overflow provisioning, then add the native cases below.
Use only visibly synthetic profiles and ephemeral browser contexts. Record exact
browser/device/build versions, each source/target revision, observable transaction
outcome and restart conditions. A mocked exception is fault-handler evidence;
it cannot certify native quota, crash, eviction or two-tab behavior.

| Case                      | Required assertion / evidence                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create/update/load        | Explicit create revision 1; replace increments once; two-profile payload/revision isolation; close/reopen returns exact data                                                                |
| Missing/existing target   | Missing update/delete and existing create fail unchanged; failures leave no receipt and corrected operation can be reevaluated                                                              |
| Stale revision            | Two independent same-origin tabs/connections submit same revision; exactly one native commit and one `revision_conflict`; either may win                                                    |
| Stale epoch               | Delete/clear wins first; old target and survivor commands fail `epoch_conflict` before receipt/revision; no stale create/upsert                                                             |
| Duplicate operation       | Lost-response exact retry before/after later writes/reopen returns original receipt; changed payload/kind/profile conflicts globally                                                        |
| Deep detachment           | Caller command/nested payload and returned nested snapshot/receipt mutation cannot change stored state                                                                                      |
| Delete race               | Submit and delete overlap through independent connections; serial outcomes match oracle; delete atomically fences survivors and clears checkpoint/receipts                                  |
| Delayed callback          | Pending validated command paused before transaction; deletion commits; resumed command cannot resurrect missing profile                                                                     |
| Overflow                  | Maximum revision/epoch fixtures abort destructive change without consuming operation ID; ordinary update at maximum epoch still follows port contract                                       |
| Abort                     | Explicit native transaction abort after queued record/receipt requests leaves all stores unchanged on reopen; error is code-only                                                            |
| Commit response loss      | Native commit occurs, response delivery is withheld; next exact retry observes original receipt without reapplying                                                                          |
| Denied/read-only          | Actual permitted browser storage-denial condition and API fault path separately labelled; no saved claim or fallback durable store                                                          |
| Quota                     | Native quota exhaustion in a controlled disposable context when obtainable; record/receipt/control remain unchanged; injected fault only supplements                                        |
| Receipt lifecycle         | No same-epoch pruning; exact retry at declared synthetic capacity works, new create/update refuses unchanged; delete/full clear still run their checked transaction and clear the old epoch |
| Full clear                | Two-tab quiescence/unacknowledged-tab refusal, atomic epoch advance, all learner/checkpoint rows removed, fresh bootstrap explicit; separately verify exact cache ownership                 |
| Browser clearing/eviction | Abnormal close/missing database revokes old handles; no automatic bootstrap/replay. Actual eviction evidence separate from simulated absence                                                |
| Blocked upgrade           | Real old connection refuses close; native `blocked` observed; no deletion; explicit cancel prevents late migration; close/retry succeeds                                                    |
| Versionchange             | Real other tab requests upgrade; new writes stop immediately, in-flight result is reconciled, handle closes permanently                                                                     |
| Migration success         | Fixed source fixture -> exact target; payload/replay/revisions/epoch/receipts preserved; checkpoint removed only after reopen validation                                                    |
| Migration failure         | Corrupt input/quota before checkpoint/abort during upgrade preserve usable old state or validated read-only recovery; never silently reset                                                  |
| Interrupted migration     | Process/browser restart at prepared, committed-unverified and verified-before-cleanup boundaries follows deterministic recovery state                                                       |
| Future/unknown schema     | Explicit lower-version open and future control/codec fixtures refuse writes; unknown content not treated as empty database                                                                  |
| Shell/data update         | All-client freeze plus compatible selected shell/schema, offline reopen and compatible rollback/forward-fix; Phase 1E shell tests alone insufficient                                        |
| Restore/import race       | Future staged restore sees intervening deletion and aborts; cannot import source epoch/receipts or revive session-only/expired evidence                                                     |
| Privacy                   | No payload/fingerprint/database dump in logs, URLs, caches, screenshots, Git or network; artifact review beyond ignore rules                                                                |

At minimum certify actual Windows Chrome and Edge separately for 3A; later 3C
requires at least one observed target assistive-technology combination and actual
disconnected restart evidence. Android Chrome and iPadOS Safari tab/standalone
are planned target-support gates before claiming those surfaces, not prerequisites
for the minimum synthetic stage exit; unobserved surfaces remain unsupported.
Unsupported/unavailable native quota, eviction or device checks remain explicit
evidence gaps; synthetic injection cannot close them. Readiness certification
covers the design and bounded fixtures, not those implementation/support claims.

## Browser facts and evidence limits

Primary references accessed **2026-10-06**:

- [IndexedDB transaction lifecycle/scheduling](https://w3c.github.io/IndexedDB/#transaction-lifecycle):
  request callbacks have active transaction windows; overlapping readwrite scopes
  are ordered; request success precedes transaction completion.
- [IndexedDB upgrades/opening](https://w3c.github.io/IndexedDB/#opening-a-database-connection):
  lower requested versions fail; open connections can block upgrades; aborted
  upgrade changes roll back. Versionchange/close handling is therefore required.
- [WHATWG storage persistence](https://storage.spec.whatwg.org/#persistence):
  storage can be best-effort or persistent; persistence is not a backup.

The IndexedDB 3.0 source is an editor's draft, not a claim of universal browser
implementation. The chosen store layout, transaction scope and recovery protocol
are architectural proposals derived from the accepted project contracts. Native
tests, actual device durability, privacy/legal/retention decisions and real-child
authorization remain separate. No Class C policy choice is necessary to begin a
separately authorized synthetic-only 3A implementation; this document grants no
such implementation authorization itself.
