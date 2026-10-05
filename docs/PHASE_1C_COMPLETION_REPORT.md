# Phase 1C completion report

Date: **2026-10-05, Europe/Athens**.

## Status

**PASS WITH OPEN DECISIONS — bounded checkpoint-5 application contracts and synthetic integrity.** Baseline, full final verification, fresh frozen installation, post-install verification, independent reviews, mutation sensitivity, audit and artifact/hygiene comparisons passed. There is no playable game or production persistence; real-adapter and release evidence remains deferred.

## Baseline and authorization

Starting HEAD: `7a7e874a8a629274c996446ea7465b5b458fd55a`, approved protected-main Phase 1B squash. Assigned Codex worktree began clean at detached HEAD, with local main ancestry resolving to that exact commit. No unrelated changes existed. AGENTS, required current foundation documents, all nine ADRs and Phase 1B completion evidence were read. Owner explicitly authorized Phase 1C and required an unstaged/uncommitted handoff with no remote mutation.

Pinned inventory: Node 24.21.0, npm 11.19.0, Corepack 0.36.0, pnpm 12.9.1. Repository-local Corepack/store settings were used. Initial frozen installation encountered the documented per-user pnpm operation-lock sandbox denial, then succeeded with scoped normal-user sandbox access; no administrator/global configuration change occurred. Baseline `corepack pnpm verify` passed **11 files / 100 tests**, formatting, typed lint, three compiler projects and the 16-module shell build. Baseline artifacts were recorded before substantive edits. The unchanged Git lock/manifest also anchors the before-state YAML and dependency graph comparison.

## Scope and architecture

Implemented seven source modules under `src/application/`:

- `core/result.ts`: stable application/concurrency/I/O results, distinct from domain errors.
- `core/integrity.ts`: validated revisions, global epochs and opaque caller-supplied IDs.
- `ports/repository.ts`: async generic atomic record, command, snapshot, codec and receipt contracts.
- `repository/validation.ts`: runtime wire readers, canonical fingerprints and defensive copies.
- `ports/speech.ts`: generic request/plan I/O seam and outcome/capability vocabulary.
- `ports/capabilities.ts`: storage and exact geometry/notation capability requirements/results.
- `ports/capability-validation.ts`: bounded runtime capability/outcome readers.

Application imports only application/domain; domain imports no application. A new ES2023-only compiler context has no DOM, Node/React ambient types or JSX. The canonical typecheck and typed lint include all four projects without weakening existing contexts. Positive/negative probes cover import/re-export/dynamic/import-type forms, UI/adapters/packages, platform/Node globals, clocks/randomness/timers/JSX and reverse domain imports. A bounded AST source graph checks cycles and inversion. These are engineering guardrails, not a malicious-code sandbox. No UI/composition/domain foundation implementation changed.

## Repository design and runtime integrity

Chosen design: **small generic atomic-record port plus a typed synthetic test learner record**. This proves future adapter integrity without freezing a full learner aggregate or accepting ADR-0006. A concrete learner repository would be more specific now but prematurely select education/privacy schema fields. No query language, event bus, schema library or generic repository framework was added.

T remains a typed codec specialization; it need not add a JSON index signature to existing domain DTO interfaces. Unknown inputs enter runtime readers only. The boundary checks Phase 1B canonical-data bounds, invokes an exact wire-preserving codec, requires canonical input/output identity, and returns detached data. The canonical input is captured before decode, detecting in-place changes. Codec failures are rebuilt from stable codes, omitting enriched payloads. No unchecked adapter cast establishes a snapshot. Proxies/hostile validator code are outside the decoded-data trust boundary.

Revisions/epochs are nonnegative safe integers with checked increments and typed overflow. Create requires an absent target and null expected revision, establishing revision 1. Update/delete require existence and exact revision; no upsert, merge or automatic reconciliation. Versioned command/record schema IDs are distinct from replay/app versions. Canonical equality text is a bounded fingerprint, without cryptographic claims. Malformed kinds, IDs, schema/version, revisions/epochs, extra fields, non-data/prototype/accessor/cyclic/oversized payloads are rejected without mutation.

Order: validate/detach → epoch → globally scoped operation receipt within epoch → existence/expected revision → overflow/result preflight → atomic commit. Same command/ID retry returns its original receipt after lost response or later writes, without an extra revision. Different commands under the same ID conflict, including cross-profile collisions. Failed operations are not receipted and may be reevaluated. Public receipts contain only bounded operation/record IDs, result kind, revision and epoch; canonical payload text stays internal. Errors expose codes without history/identifying diagnostics.

Delete advances its logical revision and global epoch, removes only its target and clears all old-epoch receipts in one commit. Its receipt is response-only; an old-epoch retry fails and requires reconciliation. Survivor data/revisions remain unchanged, old survivor sessions fail, and a fresh-epoch command continues. No tombstone/ID-reuse decision was introduced. Full clear is deferred until real adapter design; individual deletion fences are proven. Imports/backup, production receipt pruning and final retention limits remain deferred.

## Atomic synthetic adapter and evidence

`tests/fakes/synthetic-repository.ts` is test-only and never imported by the shell. It prepares detached next maps/results and publishes one state replacement without yielding. Failed commands leave payload, revision, epoch and receipts unchanged. Optional validated initial state supports overflow tests only. Synthetic success receipts remain until epoch rotation/test-instance end; that unbounded test lifetime is not D19 acceptance. The fake proves port semantics, not IndexedDB transactions, physical erasure, persistence, quota handling, crash recovery or cross-process durability.

Reusable `tests/conformance/repository.ts` accepts an isolated async factory, codec, payload factory, mandatory nested-payload mutation callback and optional initial test-state provisioning. It observes public reads/results only and permits either client to win an overlapping race. Tests cover explicit create/load/update, lost-response retries after intervening writes, operation reuse, local revisions, global deletion fences, stale resurrection, surviving profiles, errors/failure receipts, nested caller/output aliases and revision/epoch overflow. Future adapters must run this suite plus real transaction/abort/device tests.

The strict synthetic learner fixture stores assessment scopes from Phase 1B: independently correct arithmetic observations and supported geometry/measurement observations, with no roots/powers assessment. These are narrative observations, not computed mastery states or validated educational conclusions. There is no global math level or duplicated cross-domain credit. Number Lab root exposure is rejected by persistent types/compiler and runtime codec/repository readers, while a separate bounded one-slot session fixture clears on simulated profile switch; creating a fresh session starts empty. No promotion/conversion, clickstream, persistent exposure history, export or production retention schedule exists. Field tests reject realName/birthDate/email/siblingId/deviceId/IP/geolocation-shaped additions.

## Speech, platform and rendering contracts

Speech defines capabilities/speak/cancel with generic request/plan types, leaving locale and utterance semantics to Phase 1D. Missing/error/timeout speech is separate from mathematical/commit outcomes. Capability vocabulary includes unknown/loading/missing/ready-local/tested-offline/error, with current provider/surface scope; future locale/voice/provider binding and invalidation need a specialization and actual-device proof.

Storage availability is distinct from transaction/save truth, including an unsaved-session degradation state. Geometry/notation requirements reuse exact scenes/expression DTOs and request an accessible alternative. Responses express support only, without revised truth. Runtime readers reject unsupported/extra capability data. No Web Speech, voice enumeration, locale tags/manifests/messages, speech plan, feature detector, SVG/MathML/TeX/Canvas renderer or offline readiness implementation exists. D29/D30 remain proposed and Q16 open.

## Tests and mutation sensitivity

Final restored suite: **15 files / 190 tests** (168 unit-directory / 22 property-directory), including all **100 unchanged baseline tests** and **90 new tests**. New cases comprise 69 application architecture tests, 9 reusable conformance tests, 10 contract/privacy/capability tests and 2 model tests. The baseline, final and post-install aggregate gates each passed their applicable full suite.

The independent oracle imports no production/fake helpers: it uses arrays and fixed semantic tuples rather than Maps/canonical fingerprint helpers. Adapter-side readers are not used to decide model results. Every command compares public outcome/receipt, epoch and known records, then retained receipts are probed through exact retries. Fresh IDs after deletion avoid deciding production ID reuse.

- Fixed seed `20261005`: **1,000 sequences**, 20–40 generated actions each, **32,102 command/receipt probes** including bootstrap and final receipt retries. fast-check preserves shrink path on failure.
- Exhaustive: **729 length-three sequences** over nine primitives, **2,187 actions / 5,082 command/receipt probes**. Public reads are additional and excluded from probe counts.

An aggregate run exceeded Vitest's default 5-second timeout under simultaneous compiler/worker load after completing assertions. The two sequence tests now have explicit 15-second budgets; all case counts/assertions remain intact. No failure was waived or property count reduced.

Actual temporary test-adapter defects were applied sequentially and restored byte-for-byte in `finally` blocks; focused conformance exited **1** for every mutation:

| Mutation                             | Failures detected   | Exact relevant tests                                                      |
| ------------------------------------ | ------------------- | ------------------------------------------------------------------------- |
| Disable expected-revision comparison | 1 failed / 8 passed | overlapping clients cannot overwrite a loaded revision                    |
| Delete fails to advance global epoch | 2 failed / 7 passed | deletion fence/survivor; epoch overflow atomicity                         |
| Disable success receipt lookup       | 2 failed / 7 passed | original retries after lost response/later writes; global operation reuse |

Restored adapter SHA-256: `D2C2AFB55724D8908B5729022F25B2FC5F6781D809DF3F60F55E7C67F8FE6C50`. Ignored local evidence logs are retained under `.cache/`; none are proposed repository artifacts.

## Independent reviews and reconciliation

Read-only architecture/capability, concurrency/idempotency and privacy/QC specialists reviewed the implementation and oracle/conformance across ownership boundaries. The principal reconciled all findings:

| Finding                                                                      | Resolution                                                                                               |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| P2 changing/lossy/in-place codec can alter identity under unchanged revision | Capture canonical input before decode, enforce wire identity, detach validated output; regression probes |
| P2 enriched codec error can expose payload                                   | Rebuild code-only failure; enriched-error regression                                                     |
| P2 shallow-copy adapter could escape alias tests                             | Required nested mutation callback for original and loaded data                                           |
| QC async conformance assumed first submitted client wins                     | Require exactly one success and one conflict, compare winner payload                                     |
| P3 documentation overclaimed session clearing/omitted callback               | Distinguish simulated profile switch/fresh session; document callback                                    |

Independent rechecks confirmed closure, with no unresolved material Phase 1C privacy/concurrency/architecture finding. A specialist focused recheck passed 88 contract/conformance/application-boundary tests. Required future real-adapter, locale/device, education/accessibility and privacy obligations remain visible, without capability/compliance claims.

## Verification, artifacts and audit

`corepack pnpm verify` passed before edits, after restored implementation/documentation and after the fresh frozen install. Final and post-install runs passed format check, typed lint with zero warnings, all four strict compiler projects, all 190 tests and the 16-module production build. Only the assigned-worktree `node_modules` was moved to a checked ignored `.cache/phase1c-node-modules-backup` path; frozen installation recreated all 178 locally applicable packages. No sibling/global cache was moved/deleted and no lock setting was disabled. The same scoped normal-user access was used for pnpm's documented operation lock.

Lockfile **before/after identical** SHA-256: `B4CF9943692ED65897900827B19C23966C9661FA74FDD1C20F0300DC1512AAF0`. Existing Prettier YAML parser AST confirms **one document** in both approved Git baseline and final lock. Zero dependency additions/version changes; programmatic baseline manifest comparison preserves dependency/engine/package-manager/version fields. Package manifest changes only to include application typecheck. Runtime graph remains React 19.3.0 / ReactDOM 19.3.0 / scheduler 0.28.0. Toolchain pins, build approvals and notices are unchanged.

All four final production file names, sizes and SHA-256 hashes match the recorded baseline **byte-for-byte**. No application/test adapter entered the shell bundle:

| File                        | Bytes  | SHA-256                                                            |
| --------------------------- | ------ | ------------------------------------------------------------------ |
| `index.html`                | 533    | `A435F67069668F2B070C3F5962AD8BAFD8D349F79B3CCDA3E03F0F37AFD1BC2E` |
| `assets/index-s4hC8CKL.js`  | 219871 | `60B5A16AF226E58BC1300C8940F9AFB100C5D745F80FCA184C36E6EB5A0F4EE2` |
| `assets/index-y9p4V4R1.css` | 208    | `E8D5721BEC01B21C2AF391E71FB53622D6D48E777662278169696E58C1E8C9E0` |
| `THIRD_PARTY_NOTICES.txt`   | 1384   | `D79545965A59895FC431B6F519FE411BC32A26415C656B7D531DD7DFCD453AAB` |

`corepack pnpm audit --json` exited **0**: info/low/moderate/high/critical each **0**, 203 graph entries. This reports current known registry advisories, not complete supply-chain safety. No new dependency/supply-chain claim is introduced.

Workflow display name changed **Phase 1A quality → Math Adventure quality**. Static diff contains only that top-level title; matrix/job/check contexts `verify (ubuntu-24.04)` and `verify (windows-2025)`, read-only permissions, triggers, action pins and gate semantics are unchanged. Hosted confirmation awaits a future owner-authorized push; no workflow dispatch or GitHub settings change occurred.

## Documentation, open decisions and non-actions

New maintained [application ports](APPLICATION_PORTS.md), [ADR-0010](adr/ADR-0010.md) and this report accompany current-state AGENTS/README/architecture/data/plan/structure/testing/traceability/register/questions/development updates. D33 records bounded owner authorization; D34 records contract integrity. Historical reports and ADR-0001..0009 are preserved. Checkpoint 5 is complete for contract/synthetic scope only; checkpoints 6–7 remain unstarted.

Open: production learner schema and ID reuse, full clear/import/recovery, receipt lifetime/pruning, actual adapter transaction/crash/abort/quota behavior, retention/inactivity/privacy/legal decisions, education thresholds, native language review, actual voice/storage/AT/browser support, SVG/MathML selection, offline lifecycle, hosting/governance and desktop packaging. D06/D07, D18–D25, D29/D30 and Q03/Q12/Q16 remain open/proposed as before.

No IndexedDB/idb/browser persistence, real learner profiles/data, adaptation/mastery, puzzle family/generator/validator, localisation packs, speech provider, renderer, child UI, Number Lab UI, rewards, PWA/cache/worker/manifest, backend/accounts/telemetry, deployment or Phase 1D was implemented. No remote mutation, external resource, branch/PR/issue, stage, commit, push, merge, reset, rebase, tag or release occurred. No sibling worktree or normal checkout was inspected or changed.

## Hygiene and final Git state

Full tracked diff and new file content were reviewed by the principal and independent specialists. All **346 local Markdown file-link occurrences** resolve. Git whitespace checks and changed-file UTF-8/NUL/trailing-space, high-confidence private-path/credential and generated-artifact scans passed. Static workflow comparison permits only the title change; manifest/lock comparisons passed. Scans are bounded regression checks, not proof against every possible private datum. All synthetic state remains explicitly marked and manually reviewed.

HEAD remains `7a7e874a8a629274c996446ea7465b5b458fd55a`, detached. **45 files: 15 modified / 30 new**, all unstaged/uncommitted; `git diff --cached` is empty. Modified files are workflow title, formatter inclusion, AGENTS/README, ESLint/typecheck configuration and nine current-state docs (architecture/register/development/data/questions/plan/structure/testing/traceability). New files are seven application source modules plus README, application compiler/guard, seventeen test/fixture/oracle files and three documents. Ignored caches, dependencies, build output and the checked local dependency backup are excluded from the proposed changes.

Phase 1C stops at this handoff; later work requires another explicit owner request.
