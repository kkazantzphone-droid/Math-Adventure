# Application ports

Phase 1C completes the bounded checkpoint-5 contracts and synthetic conformance proof. It implements no production learner schema, persistence, gameplay, localisation, speech provider, renderer or platform detection. [ADR-0010](adr/ADR-0010.md) records command integrity; [the completion report](PHASE_1C_COMPLETION_REPORT.md) records measured evidence.

## Dependency direction

`src/application/core` owns application results and integrity scalars; `ports` owns asynchronous repository, speech and capability interfaces; `repository/validation` owns their bounded data boundary. Application imports only application/domain. Domain imports no application. UI and composition remain unchanged and import none of these modules. `tsconfig.application.json` uses ES2023, no DOM, ambient package types or JSX. Typed lint and compiler/import fixtures enforce this direction; a bounded source traversal checks cycles. These are engineering guardrails, not a malicious-code sandbox.

## Generic record contract

`AtomicRecordRepository<T>` has `getEpoch`, `load` and `execute`, returning `Promise<ApplicationResult<...>>`. A `RecordCodec<T>` supplies an exact versioned wire schema and runtime validator/rebuilder. T is a typed specialization, not an unvalidated unknown payload. T deliberately has no JSON index-signature constraint, allowing existing domain DTO interfaces; every input and codec output must satisfy Phase 1B canonical-data bounds at runtime. Decode must preserve canonical wire data, reject extra fields and unsupported schemas, and have no I/O, normalization, migration or hidden decision input. Boundary readers enforce canonical input/output equality and return detached data. Executable Proxies and hostile validator code are outside this decoded-data trust boundary.

This generic port plus a test-only learner record avoids prematurely accepting ADR-0006 or a complete database schema. A concrete learner aggregate would give more specific names now but lock in fields and behavior that lack educator/privacy review. The port is deliberately small: no query language, patch DSL, event bus, unit of work, schema migration or repository framework.

Commands use `atomic-command-v1`, a separate record-schema ID, operation ID, epoch, record ID, kind and expected revision. Create requires `expectedRevision: null` and establishes revision 1. Update replaces a validated bounded aggregate; delete has no payload. Update/delete require an existing record and exact expected revision. Revisions and epochs are nonnegative safe integers, validated explicitly and advanced without wraparound. They are not clocks or identities. Caller-supplied opaque IDs have bounded ASCII syntax; syntax alone cannot prove absence of encoded personal meaning.

## Atomic processing

1. Validate/detach the command and exact payload schema; obtain its bounded `canonical-json-v1` equality fingerprint.
2. Check the current global epoch before any deduplication.
3. Check the operation ID, globally scoped within the epoch. Identical successful retries return their original receipt, even after later writes; changed commands conflict.
4. For a new operation, check explicit create/existence and expected revision.
5. Preflight revision/epoch overflow and all result validation.
6. Commit payload, revision and success receipt atomically, advancing revision exactly once.

Failed operations leave records, revisions, epoch and receipts unchanged; failures are not receipted and may be reevaluated. Canonical command text is an equality fingerprint, not a cryptographic hash. It remains internal to synthetic receipts because it contains the payload. Public `atomic-receipt-v1` receipts contain only operation/record IDs, kind, resulting revision and epoch, with no timestamps, history or identifying diagnostics. Receipt lookup is proven through public retries rather than a diagnostic storage API.

Delete removes its target, advances its logical revision and the **global** epoch, and clears all old-epoch receipts in the same commit. Surviving records retain their own revisions/payloads but must reload the fresh epoch. A delete receipt is returned only as the command response; retry under its old epoch fails and requires reconciliation. No tombstone or hidden ID-reuse policy is introduced. Full clear, production ID reuse, production receipt retention and backup/import remain deferred. Imports must never restore old destination safety metadata.

## Synthetic adapter and future conformance

`tests/fakes/synthetic-repository.ts` validates optional test-only initial state for overflow probes and publishes one prepared state replacement without an async yield. It stores detached data and returns detached snapshots/receipts. Success receipts are retained for the test instance until epoch rotation: this is not a production retention choice. The fake proves observable port semantics, not IndexedDB transactions, multi-process durability, quotas, crash recovery or physical erasure.

`tests/conformance/repository.ts` accepts an isolated async factory, codec, payload factory, required nested-payload mutation callback and optional test-state provisioning. A future adapter must run this suite, then add real transaction/abort/device tests. Race assertions accept either client as the winner, requiring exactly one commit. The independent array/semantic-tuple model imports no production/fake logic. Tests cover global fences, local revisions, lost responses, collisions, error atomicity, deep detachment and overflow.

The test-only learner fixture stores scoped assessment observations, including stronger arithmetic and supported geometry/measurement observations, with no powers/roots assessment. Root exposure stays in a separate one-slot synthetic session fixture, clears on simulated profile switch (a fresh session fixture starts empty), and cannot enter persistent assessment types or runtime data. No mastered state, promotion, threshold, exposure history or production retention schedule exists.

## Capability seams

`SpeechPort<Request, Plan>` leaves request/plan semantics for Phase 1D, with capabilities, speak and cancel contracts only. Outcomes are completed/cancelled/unavailable/error/timeout. Capability vocabulary distinguishes unknown/loading/missing/ready-local/tested-offline/error; offline status applies only to a current provider/surface observation, not a device-wide promise. Future specializations must validate and scope locale/voice/provider facts without personal content or remote/default fallback.

Storage capability distinguishes unknown/available/unavailable/quota-limited and degraded unsaved-session-only. It is not proof of a durable save. Representation requirements refer to existing exact geometry scenes or expression DTOs plus representation ID and required accessible alternative. Capability responses describe support/degradation only and cannot return changed mathematical truth. Runtime readers validate capability facts/outcomes. No detection, markup, locale manifest, speech plan, renderer or browser API is present. D29/D30 and real-device accessibility/platform evidence remain open.
