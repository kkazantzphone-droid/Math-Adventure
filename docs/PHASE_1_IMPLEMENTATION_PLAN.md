# Phase 1 implementation plan — technical skeleton only

Status: proposed, **not authorized or started by Phase 0**. The owner must explicitly request implementation after reviewing this foundation. No commands below have been executed; future tooling decisions must recheck current primary docs and machine constraints.

## Entry and boundaries

Confirm scope/accepted ADRs and disposition of ADR-0006/0007 proposals. Choose which platform/dev environment will be supported for the skeleton; exact versions and minor adapter choices can be resolved at checkpoint 1 without overturning constraints. The owner selected Apache-2.0 for original code and project documentation on 2026-10-05; contribution sign-off, third-party asset rights and publication governance remain separate gates. Legal/retention/education calibration decisions may remain open during synthetic-only skeleton work but block real learner use or launch.

Phase 1 does not implement puzzle families, child-profile UX, production learner adaptation, real-data IndexedDB migrations, complete language packs, rewards, Number Lab, Tauri, backend, deployment or public GitHub resources. It may define contracts, implement narrow deterministic infrastructure utilities, use clearly synthetic fixtures and prove an empty offline shell. Future CI workflow creation/execution and dependency installation must be within the explicit implementation request; no external services are presumed authorized merely by this plan.

Contracts must include first-class geometry/spatial reasoning, measurement and powers/roots alongside number/arithmetic/patterns/multiplication/fractions/decimals/algebra/logic/probability pathways. Use canonical multi-domain concept memberships and scoped evidence, no global math level. Specify typed geometry scenes/units/expression AST and SVG/semantic-DOM/notation adapter ports; do not turn this into implementing geometry puzzles or a typesetter. Synthetic fixtures include advanced arithmetic with developing geometry and unscored root exposure that leaves mastery unchanged.

## Auditable checkpoints

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

Future project scripts should provide format:check, lint, typecheck, test:unit, test:property, check:locales, check:privacy, build and test:e2e. Exact command bodies depend on pinned tools. Avoid documentation recipes using floating latest, unreviewed install scripts or global security exclusions. Domain tests execute independently of React/browser mocks.

Keep CI design separate from publication. If a workflow is later authorized, untrusted PR code gets read-only/no secrets, reviewed action pins and no privileged fork execution. No cloud CI is created during this phase.

## Exit

The skeleton must build, enforce imports, replay deterministic utility tests, expose fake persistence/speech contracts and demonstrate an empty offline shell without misrepresenting an implemented game. Document target browser minimum candidates from real capability checks; cannot certify speech/local data through mocks.

Owner reviews checkpoint evidence and decides whether to begin the first family proof. Real learner trials/public release remain blocked by legal/privacy/retention, native-language/accessibility and educational review gates listed in [open questions](OPEN_QUESTIONS.md). Phase 1 should end with a separate completion report, not automatic expansion into the complete game.
