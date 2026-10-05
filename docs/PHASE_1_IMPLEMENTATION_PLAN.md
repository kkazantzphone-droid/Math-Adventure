# Phase 1 implementation plan — technical skeleton only

Status: the owner authorized Phase 1A, Phase 1B and bounded Phase 1C on 2026-10-05. Phase 1A covers checkpoints 1–3 and initial CI; Phase 1B completes checkpoint 4 and semantic foundations. Phase 1C completes checkpoint 5 for contracts and synthetic conformance only. Checkpoints 6–7 and later browser/offline assurance remain unstarted and require another explicit request. Current evidence is in the [Phase 1C report](PHASE_1C_COMPLETION_REPORT.md); Phase 0 did not itself authorize implementation.

## Entry and boundaries

Confirm scope/accepted ADRs and disposition of ADR-0006/0007 proposals. Choose which platform/dev environment will be supported for the skeleton; exact versions and minor adapter choices can be resolved at checkpoint 1 without overturning constraints. The owner selected Apache-2.0 for original code and project documentation on 2026-10-05; contribution sign-off, third-party asset rights and publication governance remain separate gates. Legal/retention/education calibration decisions may remain open during synthetic-only skeleton work but block real learner use or launch.

The fuller Phase 1 plan does not implement puzzle families, child-profile UX, production learner adaptation, real-data IndexedDB migrations, complete language packs, rewards, Number Lab, Tauri, backend, deployment or public GitHub resources. Its later checkpoints may define contracts, implement narrow deterministic infrastructure utilities, use clearly synthetic fixtures and prove an empty offline shell. **Phase 1A excludes those later contracts/utilities, learner persistence, localisation/speech and service-worker behavior.** Its request authorizes repository-local dependencies and a CI workflow file, with no push, deployment, remote CI run or external-resource mutation.

Later authorized contracts must include first-class geometry/spatial reasoning, measurement and powers/roots alongside number/arithmetic/patterns/multiplication/fractions/decimals/algebra/logic/probability pathways. Use canonical multi-domain concept memberships and scoped evidence, no global math level. Specify typed geometry scenes/units/expression AST and SVG/semantic-DOM/notation adapter ports; do not turn this into implementing geometry puzzles or a typesetter. Later synthetic learner fixtures include advanced arithmetic with developing geometry and unscored root exposure that leaves mastery unchanged; Phase 1A has only technical architecture/harness fixtures.

## Auditable checkpoints

The table retains the full Phase 1 target; current Phase 1A scope is the subset identified above. The property example at checkpoint 3 is explicitly test-only harness validation, with no illustrative production mathematical utility.

| Checkpoint | Files/components affected (future) | Acceptance criteria | Verification | Review / rollback |
| --- | --- | --- | --- | --- |
| 1. Toolchain inventory/pins | package.json, pnpm-lock.yaml, runtime pin, docs/toolchain record | Recheck patched Node24 LTS (or justified supported LTS), exact pnpm/dependency compatible versions/licenses; local scope only, no admin/global configuration | Record versions/provenance/install scripts; frozen reinstall reproducible; dependency/advisory review | Review exact package set before adding; revert this isolated change if incompatible |
| 2. Empty React/Vite shell and strict boundaries | index.html, src composition/ui stubs, vite/tsconfig configs | Static build from root/subpath; domain compilation has no DOM/React/adapters; strict plus noUncheckedIndexedAccess, explicit return errors | Typecheck/build; import-boundary positive/negative fixture; keyboard empty-shell smoke | Review tree and bundle/network inventory; revert skeleton only |
| 3. Quality harnesses | ESLint/format config, Vitest/fast-check setup, tests/unit/property, scripts | Independent unit/property test examples, one failing mutation demonstrably detected, no illustrative runtime game code | Test pure utility with hand-derived oracle and seeded failure replay; lint/format/typecheck | Keep minimal tests; review direct dev dependencies |
| 4. Determinism/value contracts | domain value/replay/graph types, narrow PRNG utility/tests | Finalize algorithm ID/seed word order/overflow/rejection bounds and independent golden vectors; no puzzle generator | Cross-runtime vector test, malformed/zero seed/range tests; no hidden random/time imports | Approve spec/vector provenance; revert utility if uncertain |
| 5. Application ports/synthetic records | application/ports, fixture schemas, in-memory fake repository; typed geometry/measurement/power/root scene/expression contracts | Storage/revision/epoch, speech/capability and rendering contracts; canonical independent domains/scoped exposure; no production profile storage or puzzle rendering | Fake-adapter/atomic-command/dedup/epoch and cross-domain/exposure fixture tests; validate synthetic/private-safe | Review contracts and SVG/MathML choice before later families |
| 6. Localisation/speech skeleton | locale manifest/schema, presentation formatting/speech plans, fake speech and optional browser capability adapter | Exact seven tags; three independent preference fields; small **synthetic demo** messages labelled incomplete, no official-pack claim; explicit local voice policy | Missing-key/plural/mixed locale tests; getVoices/loading/missing/cancel mock cases; optional fixed nonpersonal manual voice check | Native reviewers inspect approach, no claim full language quality |
| 7. PWA empty-shell proof | manifest, worker build integration, infrastructure/pwa, release compatibility manifest | Pin base/scope; coherent shell cache; wait/safe activation handshake; ready-state distinguishes locale plans/voice/storage; no game | Root/subpath offline restart; partial-cache failure; two tabs/update with no writes; compatible version scenario | ADR-0007/tool choice reviewed; disable worker cleanly if lifecycle proof fails |
| 8. Quality-gate/CI design and handoff | docs/testing/toolchain, possibly workflow only if explicit scope allows | Local gates reproducible; least privilege/fork isolation design; human sees diff and remaining gaps | Run required local checks, synthetic artifact scan, no undeclared network dependency; review workflow statically if authorized | No deployment/remote CI provisioning; owner reviews exit report |

A rollback is a reviewed reversal of that checkpoint's own changes; never reset unrelated work or silently discard data. Synthetic-only storage makes early reversals safe, but tests must preserve the later migration contract.

## Proposed dev command contract

Phase 1A implements the applicable scaffold commands, including format:check, lint, typecheck, test:unit, test:property, test:run, build and verify; [development](DEVELOPMENT.md) is the current command reference. The following broader contract remains prospective.

Future project scripts should provide format:check, lint, typecheck, test:unit, test:property, check:locales, check:privacy, build and test:e2e. Exact command bodies depend on pinned tools. Avoid documentation recipes using floating latest, unreviewed install scripts or global security exclusions. Domain tests execute independently of React/browser mocks.

Keep CI design separate from publication. The authorized Phase 1A workflow gives untrusted PR code read-only/no secrets, reviewed action pins and no privileged fork execution. No remote CI provisioning or run is performed during this task.

## Exit

Phase 1A ends with the static shell, reproducible dependency metadata, quality harness, local gate evidence, static CI review, current development documentation and a separate completion report. It stops before Phase 1B or game implementation; unexecuted checks and remaining risks must be explicit.

The later full Phase 1 skeleton target is to build, enforce imports, replay deterministic utility tests, expose fake persistence/speech contracts and demonstrate an empty offline shell without misrepresenting an implemented game. Document target browser minimum candidates from real capability checks; cannot certify speech/local data through mocks. Those later targets are not Phase 1A exit requirements.

Owner reviews checkpoint evidence and decides whether to begin the first family proof. Real learner trials/public release remain blocked by legal/privacy/retention, native-language/accessibility and educational review gates listed in [open questions](OPEN_QUESTIONS.md). Phase 1 should end with a separate completion report, not automatic expansion into the complete game.

## Phase 1B checkpoint disposition

Checkpoint 4: **complete for local Phase 1B scope** — bounded values, immutable replay/version contracts, finalized algorithm/seed mapping, independent vectors, rejection sampling, graph validation and tests. The same ordinary tests remain intended for hosted Windows/Linux CI after owner QC; no remote run is claimed here.

Checkpoint 5 at the historical Phase 1B handoff was incomplete: semantic foundations existed, with application ports/fakes absent. [The Phase 1B report](PHASE_1B_COMPLETION_REPORT.md) and Phase 1A exit paragraphs preserve that evidence.

## Phase 1C checkpoint disposition

Checkpoint 5: **complete for bounded contract/synthetic scope** — generic atomic repository, revision/global epoch/operation IDs, runtime command/snapshot/receipt validation, test-only adapter, reusable conformance, independent two-client sequence model, cross-profile deletion fences, synthetic scoped observations and session-only exposure. Speech/platform/rendering ports and vocabulary exist without locale plans, detection or rendering. Application remains framework/platform independent and outside the unchanged shell bundle. See [application ports](APPLICATION_PORTS.md), [ADR-0010](adr/ADR-0010.md) and [completion evidence](PHASE_1C_COMPLETION_REPORT.md).

Checkpoints 6–7 remain unstarted. Phase 1D, IndexedDB, adaptation, families/gameplay, localisation/speech, renderers, PWA/offline and deployment require new owner authorization after QC.
