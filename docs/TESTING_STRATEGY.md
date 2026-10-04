# Testing and quality strategy

Status: design only. No test harness, application tests, build or CI exists in Phase 0. Documentation/hygiene checks now are recorded in [completion report](PHASE_0_COMPLETION_REPORT.md).

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

## Future CI design

After explicit Phase 1 approval, design a read-only untrusted-PR pipeline: checkout/pinned runner -> reviewed frozen dependency install -> format/lint/import-boundary checks -> strict tsc -> unit/property -> locale/schema/privacy/secret/license checks -> production build -> browser adapter/PWA/E2E/axe checks. Pin third-party Actions by reviewed commit and use least permissions; no secrets on fork code or privileged pull_request_target execution of contributed code. No remote CI runs or workflows are created now.

All required gates block merge: mathematical failures, type/import errors, locale completeness for official packs, privacy regressions, migration/data-integrity failures, known exploitable dependencies without reviewed mitigation, broken build/offline essentials and serious accessibility failures. Human math/education/language/security review also blocks relevant changes. Do not retry away reproducible failures or waive gates silently; any scoped temporary exception needs rationale, owner, expiry and tracked remediation. Child-safety/math/data-loss violations cannot be casually waived.

At Phase 1 only infrastructure/skeleton tests are in scope. Playable-task, educator/user and full-language reviews belong to later phases. Actual-device matrices and human evaluation cannot be replaced by mocked speech, headless WebKit or an automated accessibility score.
