# Phase 2 deterministic family proof completion report

Status: **ENGINEERING PASS — LOCAL PHASE 2 PROOF**. Independent mathematical/replay review, per-family assertion mutations with exact restoration, full/fresh verification and bounded browser representation checks passed. The branch has been reconciled to protected main after the owner merged its parent. Final reverification after this documentation closure, staged review, local preservation and the authorized publication/hosted-check loop follow; this report does not claim an unobserved Phase 2 commit, clean final Git status or hosted success.

## Authority and branch history

Owner goal: Phase 2 first genuine deterministic mathematical-family proof under [D40](DECISION_REGISTER.md), following the completed autonomy pilot. Phase 1V remains FINAL PASS — OWNER CONFIRMED and Phase 1D remains bounded checkpoint-6 ENGINEERING PASS. Their accepted behavior and frozen historical reports/protocols/ADRs are preserved.

The branch is `codex/phase-2-deterministic-family-proof`. At entry it was **STACKED / DEPENDENT** from parent candidate `aa840e73ee44a3310ed19774a9eebb825bc64d24`, following Phase 1D `56ad5182ee3364174c1d335f1d7f90ef8f1cbd8d` and Phase 1V `da72f532089186c83b48392ca6aa11264367f71e`; parent PR #4 was open and protected main `b4e99c16938ea2c6cc77b8ed86df7919b5c6536e` lacked that work. No Phase 2 publication occurred during this dependency.

The owner merged PR #4 on **2026-10-05 at 20:39:56 UTC**, producing protected-main squash commit `a286c97fc26e5b17fa7b6a8466825c15db86f0d7`. Fetch and tree comparison confirmed the original complete parent candidate and the squash commit have identical trees. The unpublished Phase 2 branch, which had no Phase 2 commits yet, was reconciled onto `origin/main` while preserving its working delta. Its base is now `a286c97fc26e5b17fa7b6a8466825c15db86f0d7`; parent absence no longer blocks publication. Complete reverification on this reconciled base and final staged review are required before local commit/push/non-draft PR; the final handoff records the resulting SHA, PR and actual required Ubuntu/Windows results. Protected-main merge remains human; no merge, tag, release or deployment is performed by this task.

Phase 1E remains independently **BLOCKED/PARTIAL — BROWSER LIFECYCLE EVIDENCE REQUIRED** and unimplemented. Parent merge, readiness-report preservation and Phase 2 mathematical proof do not establish offline/update proof.

## Implemented mathematical bounds and architecture

The [family design](PHASE_2_FAMILY_PROOF.md) records selection and representation limits. The ordered family IDs are `number.addition`, `geometry.quadrilateral`, `measurement.unit-length`; immutable generator IDs are `addition-bounded-v1`, `quadrilateral-bounded-v1`, `unit-length-bounded-v1`; catalog content version is `phase2-content-v1`. Existing `xoshiro128ss-v1`, `canonical-json-v1`, `replay-v1`, `semantic-v1`, seed mapping/transitions, canonical JSON and exact DTO spelling remain unchanged.

Addition permits natural operands 0–maximum, maximum 0–5, result 0–10 and no negatives. Quadrilaterals use width/height 1–maximum (maximum 1–3), shear 0/1, four quarter turns, scale 1/2, four cyclic starts and two windings, with exact coordinates bounded −8…8. Classification is inclusive: square implies rectangle and parallelogram. Measurement permits length 1–maximum (maximum 1–8), four quarter turns, exact `unit.length-step` and dimension `length`; physical screen distance, area and unit conversions are excluded.

The graph has eight canonical nodes and seven related/representation/inverse links, no prerequisite/age/global-level gates or automatic evidence transfer. Existing typed power/root expressions and the square-array/inverse connection retain readiness without a fourth family. Principal √16 = 4 remains distinct from both real solutions of x² = 16; the accepted sixteen-tile one-top-bracket exploration is preserved.

Domain generation uses bounded project RNG and runtime scene/puzzle/value codecs. Validation regenerates the complete instance before comparison, rejecting forged tasks, hints, answers, scopes or identities. Semantic hints contain no translated prose and preserve the task. The stateless application facade omits expected answers from public views; UI creates structured responses and domain owns correctness. Declared future concept/representation scopes do not emit learner evidence or mastery updates. Exact unit segmentation/attributes come from domain data, never rendered pixels.

## Independent truth, replay and executed counts

| Evidence                         | Observed passing coverage                                                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Addition exhaustive oracle       | 36 maximum-spec operand pairs; 91 parameter tuples across every supported maximum 0–5                                                                                            |
| Geometry exhaustive oracle       | 1,152 maximum-spec transformed tuples; 1,792 across maxima 1–3; nine independent hand-derived fixtures                                                                           |
| Measurement exhaustive oracle    | 32 maximum-spec oriented segments; 144 parameter tuples across maxima 1–8                                                                                                        |
| Seeded generated properties      | 1,000 cases per family, 3,000 total; seeds 20261021 addition, 20261022 geometry, 20261023 measurement                                                                            |
| Golden replay                    | Two hand-derived low-word/mixed-word seed fixtures per family, six family/seed fixtures total; exact semantic reconstruction confirmed against independent RNG/oracle dimensions |
| Catalog/graph and trust boundary | Stable bounded IDs/specs, connected metadata without prerequisites/cross-credit, malformed/forged-input rejection, explicit scopes and typed power/root readiness                |

The test-only oracle imports no production generator, validator or truth helper. Addition counts the disjoint union of independently built token collections; geometry uses exact BigInt diagonal theorems rather than production consecutive-edge predicates; measurement walks and counts independent unit intervals. Nine geometry fixtures cover inclusive square/rectangle/parallelogram membership, rotated/oblique shapes, rhombus, unsupported trapezoid and crossing/collinear/duplicate-vertex rejection. Parameter-tuple counts include equivalent transformations and are not unique-image/class/content counts or distribution claims.

Focused new coverage passed **29 domain unit tests + 3 property tests + 19 semantic SSR tests = 51 added tests**. Properties cover independent truth/dimensions, reproducibility, bounds, valid answers, strict units/classes and malformed data. Golden reconstruction preserves the complete supported replay tuple; locale/theme/speech differences do not change semantic task data. Existing Phase 1B RNG vectors remain unchanged.

## Mutation sensitivity and exact restoration

| Family        | Deliberate defect               | Observed failure                                                                         |
| ------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| Addition      | Add one to the sum              | Independent disjoint-token cardinality assertion failed; exit 1, one failed / 28 skipped |
| Quadrilateral | Invert the rectangle predicate  | Independent diagonal-classification assertion failed; exit 1, one failed / 28 skipped    |
| Unit length   | Remove the unit/dimension guard | Exact length dimension/declared-unit assertion failed; exit 1, one failed / 28 skipped   |

All three mutations were separately restored byte-for-byte. Before/after SHA-256 of `src/domain/families/proofs.ts` was **`6BC2D6D15B1F08D7DA0E21F849531D251EA8BBB68A992BF3AEE5AB0C8E558600`** for every restoration; final source hash matched. Full/fresh verification ran after restoration. The failures were assertion failures, not parser/type errors or mere process failures.

## Representation, accessibility, locale and actual browser observations

The deliberate unsaved `?familyProof=1` Space path uses semantic HTML operands/native numeric choices, a proportion-preserving SVG outline with neutral naming and exact side/angle HTML facts plus all-applicable native checkboxes, and semantic unit segments with sequential native unit traversal. Expected classification answers and length totals are omitted from accessible labels. Attribute-based classification does not establish unaided visual recognition; traversed unit counting does not establish visual estimation. No learner evidence is recorded under any modality.

Browser review on the available in-app browser exercised English addition first at 0+0 and then 2+5, incorrect/correct responses, help/retry and same-seed replay; square classification required all three applicable classes; measurement's fixed all-F seed produced eight units, traversed one step at a time A→I, with 7 rejected and 8 accepted, hint/retry/replay intact. Greek 2+5 rejected 6 and accepted 7 with help. German geometry completed with keyboard selection of all three classes. Mixed Greek UI/German instructions/English speech preserved independent preferences and the same semantic 2+5 task.

At **320×760 portrait** and **760×320 landscape**, document client/scroll widths were respectively **305/305** and **745/745**, with no horizontal overflow. The deliberate proof `textScale=200` path produced 32px text for German geometry without overflow. Browser-native zoom via Control+plus was not exposed by this tool; no native-zoom observation is claimed. Label click targets were at least 44px, visible focus used a 4px outline, checkbox keyboard operation passed, one status region remained, and requesting help preserved focus. Source/review checks retained reduced-motion/no-colour-only behavior and unchanged accepted prototype source.

Sampled colour-pair contrast was 15.42:1 for text/main, 11.66:1 for text/task, 10.22:1 for help text/mint, and 9.77:1 for mint geometry/task; these passing samples are not a complete WCAG audit. Browser console showed zero errors/warnings. Observed DOM scripts were only same-origin `/@vite/client` and `/src/composition/main.tsx` for the local development/HMR surface. An ignored synthetic screenshot captured English 2+5, selected 7, concrete two/five dot-group help and correct feedback; it contains no real child data and is not committed.

The three draft packs passed required-schema completeness for **79 message IDs**, including 34 new proof strings; pack version `0.2.0-prototype`, schema `prototype-messages-v2`, presentation content `scripted-prototype-v1` distinct from mathematical catalog `phase2-content-v1`. All remain native-review pending and official=false. fr-FR/es-ES/it-IT/pt-PT remain planned/incomplete without fabricated child copy. Effective UI/instruction languages and independent number-speech preferences are preserved.

Actual browser enumeration exposed **one eligible exact local Greek voice**, with **zero eligible English/German voices** on the observed surface. An explicitly requested fixed Greek phrase returned completed. The family proof's Listen control supplies generic navigation support only; it does not speak arbitrary generated arithmetic, class answers or unit totals. Exact-region `localService === true` selection, missing-voice visual use, explicit playback/cancellation and unchanged deterministic semantics are retained. No actual assistive-technology, pronunciation-quality, OS/provider privacy or tested-offline certification is claimed. D29 remains proposed beyond this bounded SVG+HTML proof.

## Canonical gates, fresh installation and artifacts

| Gate                                 | Observed result                                                                                                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm format:check`         | PASS in the complete canonical gate                                                                                                                                        |
| `corepack pnpm lint`                 | PASS in the complete canonical gate                                                                                                                                        |
| `corepack pnpm typecheck`            | PASS, all four strict browser/domain/application/tooling projects                                                                                                          |
| `corepack pnpm test:unit`            | PASS, 476 tests / 18 files                                                                                                                                                 |
| `corepack pnpm test:property`        | PASS, 25 tests / 6 files                                                                                                                                                   |
| `corepack pnpm test:run`             | PASS, 501 tests / 24 files                                                                                                                                                 |
| `corepack pnpm build`                | PASS, 54 transformed modules, four artifacts below                                                                                                                         |
| `corepack pnpm verify`               | PASS, 501 tests / 24 files plus every canonical stage                                                                                                                      |
| Fresh frozen installation and verify | PASS, isolated 181-source-file snapshot with no initial node_modules; 178 packages added, 203 graph entries; pnpm 12.9.1 install completed in 11.7s; fresh verify 501 / 24 |
| `corepack pnpm audit --json`         | PASS, zero info/low/moderate/high/critical advisories; 203 dependency graph entries                                                                                        |

The first aggregate run exposed the geometry property test's default five-second timeout under compiler/test worker load. A bounded 15-second property budget and pre-indexed independent geometry fixtures repaired the run without reducing the 1,000 cases per family or changing the oracle/generation semantics. The restored full run and isolated fresh run both passed at 501/24. After this documentation closure, the lead reruns the complete gate on the reconciled main base before preservation/publication.

Root and fresh artifacts matched byte-for-byte:

| Artifact                    |   Bytes | SHA-256                                                            |
| --------------------------- | ------: | ------------------------------------------------------------------ |
| `index.html`                |     518 | `D5AD6A3F869CB1AF2BF6249DD91EE9FCDFD86C3A403D182EB1A3BA4197BEB34C` |
| `assets/index-BlZMtVLJ.js`  | 307,149 | `1BE31BFF5C6043015405B365393787A61B14B59CDB7019F1E775D40FFD9F090E` |
| `assets/index-CWKLmtyx.css` |  20,515 | `C0A3571F9D8DCF5D415A37BA5910E81C32696C3191D2B6E46AD4A049CBD32AEA` |
| `THIRD_PARTY_NOTICES.txt`   |   1,384 | `D79545965A59895FC431B6F519FE411BC32A26415C656B7D531DD7DFCD453AAB` |

Node **24.21.0**, npm **11.19.0**, Corepack **0.36.0** and pnpm **12.9.1** pins/baseline are unchanged. There are **zero new dependencies**; React/ReactDOM remain the only declared runtime dependencies. Package/workspace/lockfile, workflow contexts/actions and old application ports/RNG vectors are unchanged against the complete parent candidate. Lockfile remains **one YAML document**, root/fresh SHA-256 **`B4CF9943692ED65897900827B19C23966C9661FA74FDD1C20F0300DC1512AAF0`**. New dependency/license/install-script review is therefore unnecessary; existing notices are preserved and audit is clean.

The hygiene pass reviewed **39 candidate files**, **459 repository Markdown links**, **55 production modules**, strict UTF-8/NUL/whitespace, private/real-learner/secret/generated-artifact and network/resource boundaries: **zero issues**. Bundle URL literals were React error-reference and XML namespace strings, with no new external application resources/service. No worker/manifest/media/remote font resource was added. Final documentation/staged diff and Git status are reviewed after closure; a clean committed status is not asserted prematurely here.

## Independent specialists and reconciled repairs

The mathematical oracle reviewer was separate from the family implementer. Architecture/replay, accessibility/representation implementation plus independent lead browser review, and test/mutation roles reviewed the proof. Reconciled findings tightened semantic hint guards, froze the static catalog, moved unit segmentation into domain semantics, corrected metadata references to actual message keys, documented modality limits and repaired stale current-state claims in value/replay/domain documents. The bounded property timeout was repaired as above. Material engineering/review delta is empty for the local proof; final staged evidence and publication checks remain explicit gates.

## Exclusions and publication disposition

No IndexedDB/real persistence, learner profile/observation store, mastery/adaptation/recommendations, rewards, production Number Lab, playable session loop, service worker/PWA lifecycle, backend, Python runtime, telemetry, account, deployment, release or real learner data was introduced. No accepted ADR/product decision changed; frozen historical evidence remains unchanged.

Local Phase 2 mathematical/replay/representation engineering passed and the former parent-merge dependency is resolved by the owner-merged, tree-equivalent main base. The authorized next sequence is final reconciled-base verify → staged review → local commit → feature-branch push/non-draft PR → diagnose/repair until both existing required hosted checks pass. The final handoff supplies the exact Phase 2 commit/PR/hosted results and Git status; none is invented in this prepublication evidence record. Protected-main merge remains the owner's action. Phase 1E's independent lifecycle-evidence blocker remains unchanged.
