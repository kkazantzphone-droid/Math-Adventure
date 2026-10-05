# Testing and quality strategy

Status: Phase 1A supplies the scaffold quality harness and Phase 1B supplies bounded domain/oracle/property/golden tests; actual game/family, adapter, E2E, offline, locale and full accessibility assurance below remains planned. Phase 0 documentation/hygiene evidence is historical in its [completion report](PHASE_0_COMPLETION_REPORT.md). Current commands and measured results are in [development](DEVELOPMENT.md) and the [Phase 1A report](PHASE_1A_COMPLETION_REPORT.md).

The current aggregate `corepack pnpm verify` gate checks formatting, ESLint, all three strict browser/domain/tooling TypeScript projects, Vitest unit/property harness tests and Vite production build. Unit tests cover static shell semantics and positive/negative browser and domain import/compiler fixtures. The seeded property example checks test-only JSON string preservation and detects/replays a deliberately lossy mutation; it demonstrates the harness, not independent mathematical truth, seeded puzzle generation or learner progression. No production domain utility is created to justify this example.

OWNER/QC correction after the initial Phase 1A pass adds a DOM-positive compiler fixture and compiler-negative `process`/`Buffer`/`__dirname` fixture under browser options without Node ambient types. Browser lint probes reject `node:fs`, bare filesystem built-ins/subpaths, child-process imports, re-exports, dynamic/computed/template imports and import types; a React/DOM positive probe prevents blanket rejection. Negative fixtures remain test-only and excluded from ordinary project compilation. Existing pure-domain cases remain intact. Virtual lint probes disable type-aware rules only for virtual text; the actual production lint gate retains type checking across explicit projects.

The same correction requires programmatic one-document YAML verification and whole-application-graph comparison after pinned-manager regeneration with `pmOnFail: ignore`, then fresh frozen installation, before/after hash equality, audit and the complete gate. Corepack selects pnpm; pnpm self-switching is disabled for external consumer/security-tool compatibility. Hosted GitHub dependency graph/Dependabot validation remains unperformed. See the completion report for measured counts and results.

## Assurance layers

| Layer | Required cases | Independent evidence / gate |
| --- | --- | --- |
| Domain unit | Exact operations, constraints, graph, hint/result rules | Hand-derived expected values; zero/range/carry/borrow/malformed cases |
| Property-based | Bounds, solution existence/membership, duplicate choices, reproducibility, no unintended answer exposure | Independent small-domain enumerator/model plus failure seed/spec |
| Numeric boundary | Safe-integer intermediates, division zero, signed constraints, exact fractions/decimals later | Checked arithmetic/cross-multiplication; no floating epsilon for exact equality |
| Adaptive simulation | Cold start, limited evidence, skips/hints/replay, exploration, duplicate fingerprints, retention, hysteresis, time-away | Hand-scripted synthetic histories and expected reason/state, no production selector as sole oracle |
| Ports/integration | Atomic answer/evidence/reward commit, speech failure, parsing/locale, adapter errors | Fakes for contract logic plus real browser transaction tests |
| Persistence/recovery | Abort/crash/quota, blocked upgrades, future schema, revision conflicts, deletion and stale restore | Assert no partial state, data loss or resurrection; read-only recovery |
| PWA/update | Complete/partial cache, base path/scope, offline restart, active tabs, shell/schema compatibility/rollback | Real build served from root and subpath; actual disconnected device checks |
| E2E slice | Profile select -> task -> attempt/hint/replay -> save/restart -> language change -> offline | Synthetic fixture only; correct/incorrect/skip paths and audio-off |
| Localisation | Keys, typed args/plural/select, text expansion, formatting/parser grammar, exact locale/fallback | Native reviewed examples and mixed preference cases; no claims from key coverage alone |
| Accessibility | Keyboard/touch/focus/zoom/reflow, contrast/colour, drag alternative, semantics/live status/motion | axe subset plus manual specialist/users; evidence scopes reviewed |
| Privacy/security | Outbound requests, remote fonts/scripts, TTS, XSS/import bounds, secrets/real-data artifacts | Request inventory, content/dependency scans and independent review |
| Release/governance | Assets/license notices, reviewer sign-off, docs/ADR/version alignment | Maintainer checklist; blocked if required review missing |

Property cases include every generated task having a solution per an independent oracle, subtraction constrained nonnegative when specified, operands/results within the family's declared limits, choices unique by mathematical value, hints preserving truth, equivalent answers accepted only under the contract and different locales/replays/cosmetics leaving semantic truth unchanged. Intentionally accessible worked examples may expose a solution; they must be marked as such and excluded from independent evidence, not prohibited universally.

Proposed property-test budgets: deterministic regression seeds plus >=1,000 generated cases per family/check in PRs; larger bounded scheduled runs only after CI authorized. Counts are engineering starting points, not proofs. Use exhaustive enumeration when the small state space permits it. Save minimal synthetic counterexamples, including generator/RNG/content versions. Changing versions updates golden fixtures deliberately with review.

## Independent mathematical oracle

Do not rely only on generatePuzzle.expectedAnswer === validateAnswer(expectedAnswer). Production components can share the same defect. For addition/subtraction, hand-derived fixtures and a separate quantity-counting/exhaustive model verify bounded domains. For target construction, an independently written enumerator determines solution membership; for rationals, independently reviewed cross-products/proof fixtures check equivalence. Future geometry/logic need family-specific mathematical review.

Test that deliberately incorrect operations, inverted comparisons, invalid bounds and duplicate choices fail. Keep oracle implementation independently reviewed rather than copying the production helper with different names. Snapshot tests of UI are insufficient for truth.

First-class geometry/measurement tests use exact semantic attribute predicates, inclusive square/rectangle classification, orientation/scale invariance, composition conservation, perimeter length and area square-unit consistency, explicit approximate-measure tolerances and independent small-grid/unit-square enumeration. Rendering tests compare deterministic scene/DOM data and viewport mappings; responsive SVG cannot turn a square into a nonsquare or angle by stretching. Test keyboard/touch/drag alternatives, no motor-error penalty and accessible descriptions without answer leakage. Pixels/getBBox are never the sole mathematical oracle.

Power/root tests cover repeated multiplication equivalence, square-array area, inverse perfect-root relation, 0/nonzero exponent0, excluded0^0, unsupported exponent/radicand domains, safe integer intermediates and preflight BigInt/output/work bounds. Assert principal√16=4 differs from the solution set of x²=16; nonperfect roots cannot become silently rounded integers. Independent small-range multiplication/enumeration and hand-derived fixtures verify the production evaluator. Native MathML/typesetter tests cover superscripts/radicals, failure fallback, self-hosted assets, no untrusted TeX, zoom/assistive speech and semantic equivalence across locales.

## Adaptive and privacy scenarios

Script full-window secure evidence spanning representation/transfer/session coverage, small finite concepts that can attain Secure through legitimate variation/delayed retrieval, immediate/cosmetic repeats that must not promote, assisted success, semantic-answer exposure, frozen observation classification, staged revisit dates, screen-reader/read-aloud neutral supports, impossible/inaccessible tasks, and a curious ahead-exploration attempt that must not reduce prerequisite evidence. Assert no response time/age/sibling comparison contributes to selection. Fairness tests require a support/review block to yield to other choices; repetition caps and stop offers prevent endless work. Storage tests include expired-data exclusion on resume, non-identifying epoch rejection after full deletion, and old checkpoint expiry.

Use a synthetic learner with advanced arithmetic, Emerging geometry/measurement and Unseen powers/roots; support in one domain cannot lower or gate another except a declared concept prerequisite. Cross-domain arrays/squares/fractions-area tasks update only declared scopes, never every related tag. Number Lab large-number/power/root exposure must leave formal mastery unchanged, create no persistent exposure history and clear bounded session memory on profile/session change.

Network checks permit only declared same-origin installation/assets/update requests with no learner values; cached gameplay must work with network unavailable and no application gameplay fetch. Page request interception cannot prove OS voice privacy; use fixed synthetic speech plus actual disconnected device observation. Never upload child exports to diagnose failure.

## Current CI foundation and later assurance

The owner authorized `.github/workflows/ci.yml` for the Phase 1A foundation. It declares Linux and Windows runners, read-only repository permission, reviewed commit pins, a repository-local Corepack cache, frozen dependency installation and the local aggregate gate. Creating the file is not evidence of a remote CI run; no push or remote provisioning is authorized in this run.

Later authorized components extend the pipeline with locale/schema/privacy/secret/license checks and browser adapter/PWA/E2E/axe tests. Keep least permissions; no secrets on fork code or privileged pull_request_target execution of contributed code. Static workflow review and local Linux/Windows coverage have separate limits documented in the Phase 1A report.

All required gates block merge: mathematical failures, type/import errors, locale completeness for official packs, privacy regressions, migration/data-integrity failures, known exploitable dependencies without reviewed mitigation, broken build/offline essentials and serious accessibility failures. Human math/education/language/security review also blocks relevant changes. Do not retry away reproducible failures or waive gates silently; any scoped temporary exception needs rationale, owner, expiry and tracked remediation. Child-safety/math/data-loss violations cannot be casually waived.

Phase 1A was limited to static-shell and quality-harness tests. Phase 1B now adds bounded domain foundations; persistence, speech, offline, learner and actual families remain unauthorized. Later technical checkpoints and playable-task, educator/user and full-language reviews require their own phase scope. Actual-device matrices and human evaluation cannot be replaced by mocked speech, headless WebKit or an automated accessibility score.

## Phase 1B mathematical evidence

Independent test code under `tests/oracle/` imports no production math/RNG helper. Small safe-integer ranges compare exact BigInt results, powers compare repeated multiplication, roots enumerate square relations, rationals use cross-products and trial-divisor checks, and small graph cycles use an independent Warshall transitive-closure oracle. Seeded properties cover canonical values/DTOs, exact boundary behavior, decimal/rational consistency, replay key ordering, seed/state round-trips and graph invariants. Golden fixtures contain independently calculated RNG outputs and consumed states, including forced rejection. Temporary production mutations are restored before final gates. [The Phase 1B report](PHASE_1B_COMPLETION_REPORT.md) records actual case counts, mutation exits, reviews and limitations; synthetic contract fixtures are not playable content or a validated curriculum.
