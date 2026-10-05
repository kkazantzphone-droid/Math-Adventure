# Phase 1B completion report

Date: **2026-10-05, Europe/Athens**.

## Status

**PASS — bounded deterministic domain foundation.** Required local gates, independent oracle/vector tests, actual production mutation checks, fresh frozen installation, audit and artifact comparisons passed. Later product/release decisions remain open. This is not a playable game and does not establish educational effectiveness, accessibility conformance, platform support, speech or offline operation.

## Baseline and authority

Starting and final HEAD: `2990a3057848fc76bbd9da77a28e55d27821a0bb`, the approved Phase 1A squash baseline. The assigned Codex worktree began clean at detached HEAD; local `main`, `origin/main` and `origin/HEAD` resolved to that commit. No reset, branch, commit or history mutation occurred. The owner's request supplies successful Phase 1A hosted Linux/Windows checks as approved-baseline evidence; this run did not independently inspect or rerun those hosted jobs.

AGENTS, the pasted Phase 1B request, all required architecture/educational/data/localisation/testing/planning documents and all eight historical ADRs were reviewed by the principal and read-only specification reviewer. Phase 1B explicitly authorizes checkpoint 4 and bounded semantic-contract foundations from checkpoint 5. ADR-0006/0007 remain proposed. Checkpoint 5 as a whole remains incomplete; Phase 1C is unstarted.

The shell initially exposed bundled Node 24.19.0 without npm/Corepack. The installed baseline was selected process-locally and independently verified: Node **24.21.0**, npm **11.19.0**, Corepack **0.36.0**, Corepack-selected pnpm **12.9.1**. No installed tool, machine PATH, global package or administrator setting changed. The documented pnpm native per-user coordination lock required scoped sandbox access; package/store/cache/state output stayed in the assigned worktree. No sibling worktree or normal checkout was inspected or modified.

Before implementation, frozen installation and canonical verification passed: **4 test files / 31 tests**. All four emitted shell files and the lockfile were hashed before edits.

## Implemented scope and modules

| Module                   | Foundation                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/core`        | Small deterministic result/error values, bounded lowercase language-neutral branded IDs, plain own-data guards                    |
| `src/domain/math`        | Safe signed/natural integers, bounded nominal exact rationals/decimals, explicit DTOs, integer powers and principal perfect roots |
| `src/domain/random`      | Pure xoshiro128** transition, seed mapping and bounded unbiased draw                                                              |
| `src/domain/replay`      | Canonical JSON, strict canonical-text parser, replay descriptors and exact support check                                          |
| `src/domain/concepts`    | Twelve-domain taxonomy and bounded multi-membership graph validation                                                              |
| `src/domain/expressions` | Versioned bounded semantic AST, no evaluator                                                                                      |
| `src/domain/geometry`    | Exact logical points, segments and ordered polygon scenes, structural validation only                                             |
| `src/domain/measurement` | Exact quantity/unit/dimension DTO, no catalogue or conversions                                                                    |
| `src/domain/puzzles`     | Tasks, extensible structured answers, semantic hints, evidence scopes and static future-family interface                          |

There are **18 new production domain files**, with no new runtime/development dependency. The UI imports none of them. No actual family, generator, answer validator, learner state, adaptation, persistence or application port exists.

## Exact value model

Safe-number operations validate inputs and use exact BigInt intermediates before safe conversion. Rational values normalize sign, gcd and zero; exact ordering uses cross-products. Decimal coefficient/scale values remove trailing zero factors, preserve exact equality/order and convert through rational values; nonterminating decimals return unsupported. Requested fraction/decimal form remains separate from value.

Internal rational/decimal values are immutable nominal objects with private frozen parts. External data enters checked unknown-input factories or DTO readers; type assertions are not validation. Integer/rational/decimal DTOs use `integer-v1`, `rational-v1` and `decimal-v1` and canonical decimal strings. Readers reject extra fields, malformed numeric strings, noncanonical values and unsupported versions. JSON never serializes internal BigInt directly. Canonical JSON/parse/DTO rebuild round-trips are tested.

Bounds: 256 bits per integer/component, 78 decimal digits before parsing, scale 64, exponent 256 and 128 root-search interval halvings. Rational intermediates are bounded to 513 bits; decimal intermediate growth follows bounded coefficient/scale input. Power products preflight through exact division. A nonzero base to exponent zero returns one; `0^0` is unsupported. Principal perfect roots use exact binary search, with nonperfect/negative inputs unsupported; `sqrt(16)` differs from solving `x^2 = 16`. See [value model](DOMAIN_VALUE_MODEL.md).

## Determinism and replay

**Algorithm:** original authors' xoshiro128** 1.1, finalized as **`xoshiro128ss-v1`**. Seed format is exactly 32 hex characters: consecutive eight-character slices map to unsigned s0–s3. Accept either input case, emit lowercase and reject all-zero state. No seed generation, clocks, platform randomness or global mutable RNG exists.

The ordered reference transition, rotations 7/11 and uint32 overflow semantics are independently checked. Bounded choice uses rejection below `floor(2^32 / bound) * bound`, exclusive bounds 1..2^32 and 1..128 draw caps. Failure returns consumed state/draw count. The accepted-residue mapping is unbiased; no statistical/cryptographic claim follows.

Canonicalization `canonical-json-v1` sorts object keys by UTF-16 code units, preserves arrays and uses JSON string escaping; numbers are safe integers and negative zero emits zero. Data-only validation rejects unsupported types, prototypes, accessors, cycles and sparse/custom arrays. Depth 32, 10,000 value nodes, 4,096 code units per key/string and 262,144 output code units bound work. Key lengths/minimum size are checked before sorting. Canonical parsing requires exact text equality, rejecting native-JSON rounding/underflow, duplicate keys and alternate spellings. Executable Proxies are outside the decoded-data trust boundary.

`replay-v1` includes independent family/generator/content IDs, RNG ID/seed, semantic version `semantic-v1`, canonicalization version and bounded object spec. Extra identity fields are rejected; specs must remain mathematical/synthetic and will need family-specific schemas later. Exact family/generator/content support is checked separately; an empty future registry reports unsupported. No retired descriptor regenerates under replacement behavior. Algorithm/schema/behavior IDs are immutable. See [replay rules](DETERMINISTIC_REPLAY.md) and [ADR-0009](adr/ADR-0009.md).

## Concepts and semantic contracts

Canonical domains: `number_sense`, `arithmetic`, `patterns_sequences`, `multiplication_division`, `geometry_spatial`, `measurement`, `powers_roots`, `fractions`, `decimals_percentages`, `algebra`, `logic`, `probability_combinatorics`. One concept may have several memberships; there is no learner record or global level.

Graph limits are 256 concepts/1,024 edges. Validation rejects duplicate IDs/memberships, malformed domains/IDs, dangling references, duplicate/conflicting edge kinds/pairs, self-gating and necessary-prerequisite cycles. Necessary understanding and recommended teaching paths have explicit rationale/probe metadata. Only necessary edges enter iterative Kahn cycle rejection; related, representationOf, inverseOf and recommended paths may cycle. The clearly synthetic arrays/area, square/powers, powers/roots and fractions/area fixture is architecture evidence, not a curriculum.

`puzzle-instance-v1` validates semantic tasks, answer contracts, hint plan, local instance identity, replay and explicit concept/representation scopes. Task forms include expression evaluation intent, equation data, inclusive geometry classification and measurement intent. Answers support exact values, classifications, quantities, coordinates, expressions, alternatives, ordered sequences and unordered collections with set/multiset semantics. No finite-pattern schema exists; a later one must constrain its rule explicitly.

Hints are representation/focus/constraint/structural/worked-example semantics, never translated prose. A future family validator receives the full instance and its answer policies; metadata dimensions are typed bounds/categories. No registry, downloaded plugin or implementation exists. Structural alternative/collection parsing permits repeated atoms; later families must implement semantic uniqueness and multiplicity deliberately.

Geometry limits are 128 scene objects/64 vertices per polygon; exact rational coordinates and stable ordered IDs are detached from pixels. No classifier, topology/simplicity proof, distance/area algorithm, SVG, Canvas or interaction exists. Exact quantities declare length/area/angle/time/mass/volume; measurement answer compatibility keeps perimeter/length distinct from area. Reviewed unit-to-dimension catalogue and approximate tolerance/rounding algorithms remain future work. AST limits are 16 levels/127 nodes; literals/arithmetic/powers/principal roots/unknowns are semantic data without execution/CAS.

## Number Lab separation

Assessment scopes require practice/diagnostic mode and literal `eligibleForMastery: true`. `exploratoryExposure` requires exploration/numberLab mode, false eligibility and session-only retention. Runtime tests reject mixed/promotion-like envelopes and compiler probes reject assigning exposure to assessment. There is no conversion, accumulated evidence, exposure memory/history, storage or learner model. Eligibility denotes a future candidate scope, not demonstrated mastery.

## Tests and independent evidence

Final suite: **11 files / 100 tests**, comprising **80 unit tests** and **20 property-directory tests**. All original 31 Phase 1A tests remain unchanged and pass. The property-directory count includes an exhaustive graph test and the original harness mutation/replay test; it is not a count of generated properties.

There are **17 domain property assertions × 1,000 cases = 17,000 generated domain cases**, plus the retained 1,000-case Phase 1A harness. Math/replay seeds use `20261005`; graph properties use `20261007`. Failure seed/shrink path remains visible. Categories include rational reduction/equivalence/arithmetic/DTOs, decimal/rational consistency, safe boundaries, power/root relations, canonical key ordering, replay round-trips, seed/state transitions, bounded draws/consumed states and graph invariants.

| Exhaustive check          | Cases / independent approach                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Safe integer operations   | 1,681 input pairs in [-20,20]², three operations each: 5,043 exact BigInt comparisons                                             |
| Powers                    | 188 supported base/exponent pairs, independent repeated multiplication; excluded `0^0` separately tested                          |
| Roots                     | 4,097 radicands 0..4,096, independent odd-number square accumulation                                                              |
| Graphs                    | All 512 directed three-node adjacency matrices including self edges, Warshall transitive closure versus production Kahn traversal |
| Rejection mapping analogy | 32 bounds × 256 synthetic eight-bit words = 8,192 word/bound checks of equal accepted residue counts                              |

The mathematical exhaustive set has **5,966 input cases / 9,328 operation checks**. Counts do not substitute for proof or family review.

The test-only oracle modules import no production math/RNG helper. Rational fixtures use hand values, cross-products and trial divisors rather than production gcd; powers/roots use distinct algorithms. RNG uses a separately written BigInt model with arithmetic rotations/modulo and simultaneous transition equations. [Golden provenance](../tests/fixtures/golden/README.md) records **three seeds × 16 outputs = 48 output/state transitions**, **nine bounded-choice vectors**, **eight invalid seeds** and the manual `[1,2,3,4]` first-step result 11520/state `[7,0,1026,12288]`. Source accessed 2026-10-05: [Blackman/Vigna reference](https://prng.di.unimi.it/xoshiro128starstar.c). Its public-domain dedication/unrestricted permission was reviewed; no third-party source dump or runtime package was added.

Actual temporary production mutations each made relevant tests exit **1**, then original files were restored:

| Mutation                        | Observed result                 |
| ------------------------------- | ------------------------------- |
| Principal root returns root + 1 | 2 failed / 23 passed unit tests |
| RNG output rotation 7 → 6       | 2 failed / 3 passed unit tests  |
| Canonical key order reversed    | 2 failed / 4 passed unit tests  |

Final gates ran against restored production code. Ordinary golden/oracle tests remain unchanged for later Windows/Linux hosted CI; only local Windows execution is verified here.

## Verification, installation and audit

Format, typed lint with zero warnings, all three strict TypeScript projects, unit/property/all tests and production build passed. Canonical **`corepack pnpm verify`** passed before edits, after implementation and after the fresh frozen install. Focused unit/property commands also passed; after adding the final bounded-draw property the complete gate reports the 100-test totals above.

For fresh installation, only the assigned-worktree `node_modules` was moved to a checked ignored local backup. Frozen installation recreated 178 locally applicable packages with the existing lock/store, then the complete gate passed. No sibling/global cache was deleted. Dependency versions, package manifest, pins, build approvals, workspace configuration and CI file are unchanged. Prettier now includes the new Phase 1B maintained documents/ADR; historical documents retain their original formatting policy.

Audit executed successfully via `corepack pnpm audit --json`: **info 0, low 0, moderate 0, high 0, critical 0**, 203 resolved graph entries. This reports known registry advisories on this date, not complete supply-chain safety. Runtime graph remains React/ReactDOM/scheduler; notices remain unchanged.

Lockfile SHA-256 before/after: `B4CF9943692ED65897900827B19C23966C9661FA74FDD1C20F0300DC1512AAF0`. Parsed YAML document count remains **one**. No dependency drift occurred.

Production build remains **16 transformed modules**, with all four emitted files byte-identical to the pre-edit baseline:

| File                        | Bytes  | SHA-256                                                            |
| --------------------------- | ------ | ------------------------------------------------------------------ |
| `index.html`                | 533    | `A435F67069668F2B070C3F5962AD8BAFD8D349F79B3CCDA3E03F0F37AFD1BC2E` |
| `assets/index-s4hC8CKL.js`  | 219871 | `60B5A16AF226E58BC1300C8940F9AFB100C5D745F80FCA184C36E6EB5A0F4EE2` |
| `assets/index-y9p4V4R1.css` | 208    | `E8D5721BEC01B21C2AF391E71FB53622D6D48E777662278169696E58C1E8C9E0` |
| `THIRD_PARTY_NOTICES.txt`   | 1384   | `D79545965A59895FC431B6F519FE411BC32A26415C656B7D531DD7DFCD453AAB` |

The static shell deliberately retains its Phase 1A technical-foundation label; no child UI or domain behavior entered its bundle. No runtime network request was introduced.

## Independent review and adversarial reconciliation

Read-only specialists reviewed the request/accepted architecture, RNG/replay/security, exact math/oracles, semantic architecture/resource limits and documentation. Primary implementation was divided by owned modules, then reviewed across those boundaries; the principal reconciled results.

| Finding                                                                                                                                     | Resolution                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| P1: symbol-branded spread copies could forge denominator/scale and bypass bounded invariants, including an infinite decimal-conversion loop | Internal nominal private-field immutable types; three compiler-negative forgery probes and positive fixture pass |
| P2: native JSON rounding/underflow could become accepted integer replay data                                                                | Exact canonical-text equality; numeric/duplicate-key regression tests                                            |
| P2: huge keys sorted before length rejection                                                                                                | Key-length/minimum-output preflight before sorting                                                               |
| P2: family validator lacked instance answer-policy input                                                                                    | Interface receives the full instance; no validator implementation                                                |
| Test gaps: wrong-version support test accidentally matched; invalid golden seeds not exercised                                              | True mismatch rejection and explicit eight-fixture invalid-seed loop                                             |
| Documentation inconsistencies                                                                                                               | Table placement, oracle identity, historical CI wording, harness scope and current RNG status corrected          |

All eight requested adversarial themes were covered: math, RNG/replay, serialization, graph, first-class domains, Number Lab separation, mutation sensitivity and scope. No unresolved critical mathematical/resource or accepted-ADR violation remains. Boundaries are engineering controls, not a malicious-code sandbox. Semantic structural validity is deliberately weaker than mathematical correctness of future tasks.

## Documentation, open decisions and non-actions

Current README/AGENTS, architecture/puzzle/testing/structure/development/traceability/plan/technology/register/questions are reconciled; new maintained documents are this report, [value model](DOMAIN_VALUE_MODEL.md), [replay](DETERMINISTIC_REPLAY.md) and [ADR-0009](adr/ADR-0009.md). D09/D11/D32 and only the corresponding Q01/Q11 portions change. Historical completion reports and ADR-0001..0008 are untouched.

Remaining decisions include family schemas/semantic validators and reviewed metadata/units, educational concept/evidence review, adaptation thresholds, learner retention/privacy/legal responsibilities, native language review, real-device accessibility/storage/speech/offline behavior, hosting/governance and packaging. They do not block this bounded synthetic-only foundation and are not silently resolved.

No Phase 1C, application ports, actual family/gameplay, learner/adaptation, persistence, localisation, speech, Number Lab UI, geometry renderer, PWA/offline, deployment, backend, telemetry, global tool change or remote mutation occurred. No branch/PR/issue/release/workflow dispatch was created. Nothing was committed, staged or pushed.

## Repository hygiene and final Git state

The complete proposed tracked diff and new source/test/fixture/document contents were reviewed, with independent specialists inspecting their corresponding areas. All 318 local Markdown-link occurrences resolved; whitespace, UTF-8/NUL, high-confidence credential/private-path and generated-artifact checks passed. Only explicitly synthetic fixtures exist; manual inspection found no real learner material. Automated patterns cannot prove absence of every possible secret or private datum.

Final HEAD remains the baseline SHA above, detached. The review diff contains **48 files: 14 modified and 34 new**, all **unstaged/uncommitted**. Modified files are `.prettierignore`, AGENTS/README, domain README and the ten current-state documents listed above. New files are 18 domain modules, 12 test/oracle/fixture files and four documents. `git diff --cached` is empty; the worktree is intentionally dirty for owner review. Build output, dependencies, ignored local verification logs/cache and the dependency backup are excluded from the proposed diff. No cleanup or mutation of unrelated worktrees occurred.

Phase 1B stops here. Later work requires explicit owner authorization after independent owner QC.
