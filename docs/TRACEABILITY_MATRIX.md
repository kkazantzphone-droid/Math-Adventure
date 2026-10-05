# Requirement traceability

Status: the main matrix retains Phase 0 requirements and planned later components/tests; it is not a claim of implemented game coverage. The Phase 1A addendum below identifies the current technical foundation. “P1” here means Phase 1, not review severity. Request sections identify the supplied Phase 0 brief; architecture-specific acceptance links are reviewed in the completion report.

| ID / requirement (brief sections) | Architecture component | Governing document | ADR | Planned test / review | Phase |
| --- | --- | --- | --- | --- | --- |
| R01 Vision, working title, initial users and no diagnosis (0–1,45) | Product policy | [Vision](PROJECT_VISION.md), [scope](PRODUCT_SCOPE.md) | 0001 | Editorial/educational claim review | 0; later UX |
| R02 Documentation only; no scaffolding/install/remotes (2,51–53,62) | Phase governance | [AGENTS](../AGENTS.md), [completion](PHASE_0_COMPLETION_REPORT.md) | 0008 | Git/full-file hygiene and scope audit | 0 |
| R03 React/TS PWA; no end-user Python/backend/dev tools (3–4) | Browser runtime, adapters | [Architecture](ARCHITECTURE.md), [technology](TECHNOLOGY_EVALUATION.md) | 0001 | Static build/runtime/network audit | 1–3 |
| R04 Ability/prerequisites, no age ceilings/curriculum lock (5,7) | Concept DAG/probes | [Puzzles](PUZZLE_ARCHITECTURE.md), [adaptation](ADAPTIVE_LEARNING_MODEL.md) | 0006 | Graph/cycle, alternate probe/scoped readiness scenarios | 2–3 |
| R05 Independent profiles; no sibling competition (5,15,20) | Learner partition/rewards | [Data](LEARNER_DATA_MODEL.md), [principles](EDUCATIONAL_PRINCIPLES.md) | 0003,0006 | Two synthetic profiles, isolation and wording review | 3 |
| R06 Nonpunitive feedback, help and productive struggle (5,20,22) | Semantic hints/child UI | [Principles](EDUCATIONAL_PRINCIPLES.md), [research](EDUCATIONAL_RESEARCH.md) | 0004,0006 | Hint exposure/evidence, skip/stop/accessibility review | 2–3 |
| R07 Reading independence and no speed-derived access (5,8,12) | Presentation/speech/evidence | [Speech](LOCALISATION_AND_SPEECH.md), [adaptation](ADAPTIVE_LEARNING_MODEL.md) | 0005,0006 | Audio-off/replay neutrality; no timing/age inputs | 3 |
| R08 Explainable recommendations/uncertainty (5,8) | Rule states/reasons | [Adaptive model](ADAPTIVE_LEARNING_MODEL.md) | 0006 | Hand-derived histories, full-window boundaries, reason counts | 2–3 |
| R09 Cold start, time away, hysteresis/fairness (8) | Selection/revisit policy | [Adaptive model](ADAPTIVE_LEARNING_MODEL.md) | 0006 | Sparse evidence, staged dates, support yielding, finite-concept attainability | 3 |
| R10 Number Lab/ahead exploration (9) | Unscored domain exploration | [Scope](PRODUCT_SCOPE.md), [adaptation](ADAPTIVE_LEARNING_MODEL.md) | 0004,0006 | Exploration neutrality, exact errors, no access penalty | 5; preview3 |
| R11 Initial and staged family catalog, including early non-arithmetic concepts (6,19,clarification) | Typed family registry/task union | [Puzzles](PUZZLE_ARCHITECTURE.md), [scope](PRODUCT_SCOPE.md) | 0004 | Per-family oracle/contracts, early geometry/measurement and later family review | 2–5 |
| R12 Difficulty is multidimensional (7–8) | Family dimension schemas | [Puzzles](PUZZLE_ARCHITECTURE.md) | 0004,0006 | Constraints/one-dimension/bridge tests | 2–5 |
| R13 Deterministic math independent of UI/AI/speech (5,16,25) | Pure math/task validators | [Architecture](ARCHITECTURE.md), [puzzles](PUZZLE_ARCHITECTURE.md) | 0002,0004 | Unit/property/independent oracle, forbidden imports | 1–5 |
| R14 Explicit seeds/versioned semantic replay (17,30) | Replay descriptor/PRNG | [Puzzles](PUZZLE_ARCHITECTURE.md), [versions](REPOSITORY_STRUCTURE.md) | 0004 | Golden cross-runtime vectors, locale/reward invariance | 1–2 |
| R15 Safe integers and future exact fractions/decimals (18) | Exact domain value types | [Puzzles](PUZZLE_ARCHITECTURE.md) | 0004 | Overflow/intermediate/zero/malformed/exact-equivalence | 2–5 |
| R16 Internal extensibility over speculative plugins (19,28) | Static typed families | [Structure](REPOSITORY_STRUCTURE.md), [technology](TECHNOLOGY_EVALUATION.md) | 0002,0004 | New-family contract/review checks | 2–5 |
| R17 Rewards cannot control math access; no manipulation (5,20) | Personal progression events | [Principles](EDUCATIONAL_PRINCIPLES.md), [scope](PRODUCT_SCOPE.md) | 0006 | Reward failure/duplicate events, no ranking/streak pressure | 3 |
| R18 Exact seven locales and independent language choices (10–11) | Pack manifests/presentation | [Localisation](LOCALISATION_AND_SPEECH.md) | 0005 | Schema/completeness/plurals/mixed cached-language tests | 1,3,5 |
| R19 Translation/official versus beta/native governance (11,36) | Reviewed language packs | [Localisation](LOCALISATION_AND_SPEECH.md), [contributing](../CONTRIBUTING.md) | 0005 | Two reviews incl native regional speaker, spoken/context audit | 3–5 |
| R20 Speech abstraction/Voice Check/no mic (12) | Speech port/browser adapter | [Speech](LOCALISATION_AND_SPEECH.md) | 0005 | Delayed list/local-only/fallback/cancel/freshness/device tests | 1,3 |
| R21 Strict privacy/network/AI boundaries (13–14,24–25,50) | Local ports/host request boundary | [Privacy](CHILD_SAFETY_AND_PRIVACY.md), [threats](SECURITY_THREAT_MODEL.md) | 0003,0005,0008 | Synthetic network/asset/dependency/privacy scans; legal scope review | 1–4 |
| R22 Local records, retention, deletes/restore (15) | Repository port/IDB | [Data](LEARNER_DATA_MODEL.md) | 0003 | Atomicity, expiry-on-resume, epoch/delete races, bounded imports | 1contracts,3–4 |
| R23 Schema/migrations/version safety (15,23,30) | Schema/compatibility metadata | [Data](LEARNER_DATA_MODEL.md), [versions](REPOSITORY_STRUCTURE.md) | 0003,0007 | Abort/blocked/future-schema/rollback/recovery tests | 3–4 |
| R24 Keyboard/touch/screen reader/zoom/motion/audio (21–22) | Semantic accessible UI/task contract | [Accessibility](ACCESSIBILITY.md) | 0002,0005 | axe subset + human keyboard/reader/touch/reflow; scoped evidence | 1shell,3–5 |
| R25 Parent mode convenience and safe actions (22) | Parent controls | [Scope](PRODUCT_SCOPE.md), [accessibility](ACCESSIBILITY.md) | 0003 | Accessible hold alternative, confirmation/recovery, no auth claim | 3 |
| R26 Offline readiness/resources/first-run failure (4,23–24) | Worker/cache/locale manifests | [Offline](OFFLINE_AND_DISTRIBUTION.md) | 0007 | Actual disconnected restart, partial asset/mixed-locale tests | 1shell,3 |
| R27 Safe update/all-tab activation and host portability (4,23) | Release manifests/worker lifecycle | [Offline](OFFLINE_AND_DISTRIBUTION.md) | 0007 | Activation/controllerchange, active-tab blockers, root/subpath/origin bridge | 1proof,3–4 |
| R28 Windows/Android/iPad/macOS limitations (12,40) | Capability matrix/platform adapters | [Offline](OFFLINE_AND_DISTRIBUTION.md), [speech](LOCALISATION_AND_SPEECH.md) | 0001,0005,0007 | Actual surface/device tests, no mock certification | 1candidates,3–4 |
| R29 Minimal stack/alternatives/maintenance (26–29,39) | Build/internal modules | [Technology](TECHNOLOGY_EVALUATION.md), [structure](REPOSITORY_STRUCTURE.md) | 0001,0002 | Package/license/provenance/pin/import/build review | 0research,1 |
| R30 Future Tauri and no parent dev runtime (3–4,26–27) | Replaceable native adapters | [Technology](TECHNOLOGY_EVALUATION.md), [offline](OFFLINE_AND_DISTRIBUTION.md) | 0001 | Packaging/signing/updater/storage/speech tests under new ADR | 6 |
| R31 Layered tests/independent oracle/CI design (31–33) | Dev quality gates | [Testing](TESTING_STRATEGY.md) | 0002,0004 | Unit/property/boundary/integration/E2E/a11y/privacy and human gates | 1harness,2–5 |
| R32 XSS/import/cache/supply-chain/native threats (34) | Trust-boundary controls | [Threat model](SECURITY_THREAT_MODEL.md), [security](../SECURITY.md) | 0003,0007,0008 | Abuse/fuzz/security review and least-privilege CI | 1–6 |
| R33 Public governance/categories/licensing/assets (35–37) | Maintainer/reviewer process | [Governance](OPEN_SOURCE_GOVERNANCE.md), [contributing](../CONTRIBUTING.md) | 0008 | License/provenance/role/channel audit; owner approval | 0plan,4 |
| R34 Primary research/claim distinctions (14,38–39,54) | Evidence ledger | [Evidence](RESEARCH_EVIDENCE.md), [research](EDUCATIONAL_RESEARCH.md) | — | Source-to-claim review, access dates, unverified facts visible | 0; recheck later |
| R35 Public synthetic-only hygiene/AGENTS/ignore (41–42,58) | Repository rules | [AGENTS](../AGENTS.md), [.gitignore](../.gitignore), [contributing](../CONTRIBUTING.md) | 0008 | Git/content/asset/secret/artifact review, ignore-rule probes | 0; futureCI |
| R36 ADRs/register/uncertainties (43,47) | Decision governance | [Register](DECISION_REGISTER.md), [questions](OPEN_QUESTIONS.md), [ADRs](adr/ADR-0001.md) | 0001–0008 | Status/authority/cross-document consistency | 0 |
| R37 Controlled skeleton/playable roadmap/non-goals (48–50) | Implementation checkpoints | [Phase1](PHASE_1_IMPLEMENTATION_PLAN.md), [roadmap](ROADMAP.md) | 0001,0002 | Explicit entry/exit gates, synthetic-only scope audit | 0plan;1–4 |
| R38 Independent/adversarial review/acceptance/report/stop (55–62) | Principal reconciliation | [Review](ARCHITECTURE_REVIEW.md), [report](PHASE_0_COMPLETION_REPORT.md) | All | Eight review passes, local links/whitespace/full diff, no implementation | 0 |
| R39 First-class independent related mathematical domains (authoritative clarification) | Canonical multi-domain graph/evidence | [Scope](PRODUCT_SCOPE.md), [adaptation](ADAPTIVE_LEARNING_MODEL.md), [register](DECISION_REGISTER.md) | 0002,0004,0006 | Advanced arithmetic + developing spatial fixture, no global gate/duplicated credit | 1contracts,2–5 |
| R40 Early geometry through advanced spatial concepts (clarification) | Semantic shapes/relations/transformations | [Puzzles](PUZZLE_ARCHITECTURE.md), [research](EDUCATIONAL_RESEARCH.md) | 0004 | Inclusive class/orientation/composition/coordinate tests, independent oracle | 2–5 |
| R41 Measurement, units, perimeter/area and exactness (clarification) | Quantity/unit/dimension types | [Puzzles](PUZZLE_ARCHITECTURE.md), [testing](TESTING_STRATEGY.md) | 0004 | Unit-square enumeration, length vs square-unit checks, explicit approximation | 2–5 |
| R42 SVG/vector preference, no Canvas-only assumption (clarification) | Typed scenes/SVG+semantic DOM | [Architecture](ARCHITECTURE.md), [technology](TECHNOLOGY_EVALUATION.md), [accessibility](ACCESSIBILITY.md) | 0002,0004 | Responsive viewport, deterministic scene, keyboard/touch/reader tests; no truth from pixels | 1contracts,2–5 |
| R43 Conceptual powers/roots and inverse links (clarification) | Expression AST/graph links/exact operations | [Puzzles](PUZZLE_ARCHITECTURE.md), [principles](EDUCATIONAL_PRINCIPLES.md) | 0004,0006 | Repeated multiplication/arrays, perfect roots vs equation solution sets, bounded work | 2contracts,5content |
| R44 Safe Number Lab exposure beyond mastery (clarification) | Mode/event discrimination, bounded session memory | [Adaptation](ADAPTIVE_LEARNING_MODEL.md), [data](LEARNER_DATA_MODEL.md) | 0004,0006 | Large-number/power/root exposure no promotion, no exports/persistent history | 1contracts,3–5 |
| R45 Advanced natural speech and notation (clarification) | Locale semantic utterances/MathML adapter candidate | [Speech](LOCALISATION_AND_SPEECH.md), [technology](TECHNOLOGY_EVALUATION.md) | 0005 | Exact-locale native review of square/power/root/area/angle phrasing, AT/offline notation tests | 1contracts,5content |

All ADR references are in [docs/adr](adr/ADR-0001.md). Every planned test must be translated into an actual acceptance check when its component is implemented; this matrix alone is not test evidence.

## Phase 1D bounded implementation addendum

This addendum records **ENGINEERING PASS — complete for bounded checkpoint 6** after preserved owner-confirmed Phase 1V. Required engineering and bounded browser checks passed; local preservation follows final staged review. Current evidence and limitations belong in the [Phase 1D report](PHASE_1D_COMPLETION_REPORT.md), governed by [ADR-0012](adr/ADR-0012.md).

| Requirement | Implemented components/checks | Limit |
| --- | --- | --- |
| R18 exact locales/independent choices | `src/presentation/localisation/` seven canonical manifests, uiLocale/instructionLocale/numberSpeechLocale, exact query/default/planned status and mixed-language tests | Transient preferences; four planned packs have no child translations |
| R19 prototype message schemas | Stable typed IDs/arguments, draft el-GR/en-GB/de-DE required-schema checks, metadata/native-review pending, structured plural/select/native Intl | Complete prototype schema is not official linguistic review or seven-pack completeness |
| R20/R45 semantic speech | Fixed language-tagged instruction/hint/feedback/cardinal/multiplication/square/principal-root plans, unchanged generic port, browser infrastructure adapter and deterministic fakes | No glyph-based truth, arbitrary learner text or general spellout engine |
| R20/R21 exact-local speech policy | Explicit localService === true and exact-region selection; delayed enumeration/voiceschanged, refresh, cancellation/watchdog/outcomes, deliberate adult diagnostics | No remote/default/region fallback, microphone, telemetry or tested-offline claim from provider flags |
| R24 accessible visual/speech cooperation | Effective content language, explicit replay only for eligible capability, no duplicate live/TTS, audio-off/missing-voice use, preserved Space/Shapes/help/root checks | Source/SSR/fakes do not certify screen readers or actual-device comprehension |
| R31/R35/R38 complete candidate gate | Independent review; remote-voice/coupled-preference mutation sensitivity/restoration; full/fresh verification, audit/lock/artifact/privacy review and bounded browser evidence | Bounded engineering PASS; local commit follows final staged review; no remote mutation or automatic Phase 1E entry |

## Phase 1A implementation addendum

| Phase 1A requirement | Current files / checks | Evidence and limit |
| --- | --- | --- |
| Reproducible development toolchain | `.node-version`, `package.json`, `pnpm-lock.yaml`, project-local install policy | Installed Node/npm/Corepack/Git inventory and selected pnpm pin; frozen reinstall evidence in the [Phase 1A report](PHASE_1A_COMPLETION_REPORT.md) |
| Minimal static React/TypeScript shell | `index.html`, `src/composition/main.tsx`, `src/ui/App.tsx`, local CSS, Vite config | Unit rendering/build checks; no game, localisation, speech, storage or service worker |
| Pure future domain boundary | `tsconfig.domain.json`, `eslint.config.mjs`, `scripts/domain-boundary.mjs`, technical fixtures | Positive/negative import/compiler checks; no production domain logic or mathematical oracle |
| OWNER/QC browser and lockfile corrections | Separate browser/tool/domain configs, `scripts/browser-boundary.mjs`, test-only Node probes, `pmOnFail: ignore` | Browser Node exclusion and single-document unchanged application graph checked locally; hosted dependency-security processing remains unverified |
| Deterministic quality harness | formatter, ESLint, strict compiler configs, Vitest unit tests and seeded fast-check harness example | `corepack pnpm verify`; mutation detection/replay validates the test harness only |
| Initial CI quality file | `.github/workflows/ci.yml` | Linux/Windows matrix, pinned actions, read-only permissions, frozen install; static review does not prove remote execution |
| Current-state handoff and bounded stop | [Development](DEVELOPMENT.md), [Phase 1A report](PHASE_1A_COMPLETION_REPORT.md), D26/Q01 | Current gate results and residual risks; checkpoints 4–7 and actual game implementation remain outside scope |

## Phase 1B implementation addendum

| Requirement | Implemented files / evidence | Limit |
| --- | --- | --- |
| R13/R15 exact domain truth | `src/domain/core`, `math`; independent oracle/unit/property tests; [value model](DOMAIN_VALUE_MODEL.md) | Bounded primitives, no actual family |
| R14 seeded replay | `random`, `replay`; 48 golden transitions/nine bounded vectors; [ADR-0009](adr/ADR-0009.md) | No generator/seed source; hosted Phase 1B tests unrun |
| R39 canonical first-class domains | `concepts/graph.ts`, synthetic cross-domain fixture; bounded structural/cycle/property tests | No curriculum or learner state |
| R40–R43 structured semantics | `geometry`, `measurement`, `expressions`, `puzzles`; DTO/contract tests | No predicates, renderer, unit catalogue, CAS or content |
| R44 exploration separation | Literal assessment/exploratory scope types; runtime and compiler separation checks | No exposure history or promotion |
| R31/R35/R38 quality/handoff | Unchanged aggregate gate, actual mathematical mutation checks, audit/install/hash/hygiene review; [report](PHASE_1B_COMPLETION_REPORT.md) | Local engineering evidence only; no remote mutation |

## Phase 1C implementation addendum

| Requirement | Implemented files / evidence | Limit |
| --- | --- | --- |
| R13/R22 application integrity | `src/application/core`, `ports/repository`, `repository/validation`; [ADR-0010](adr/ADR-0010.md) | Generic contracts, no production learner schema/storage |
| R05/R22 isolation/deletion | `tests/fakes`, `tests/conformance`, independent sequence oracle/properties | Record-local revisions, global epoch; real transactions unproved |
| R31 testing/replayable QC | 1,000 generated + 729 exhaustive sequences; revision/epoch/dedup mutations; application compiler/import/cycle probes | Guardrails/fake semantics, no crash/device evidence |
| R39/R44 scoped observations/exposure | Strict synthetic learner codec, compiler/runtime persistence rejection, bounded profile-cleared session slot | No mastery/adaptation, exposure history or retention policy |
| R20/R28/R42/R45 capability seams | Generic speech, storage and exact geometry/notation capability contracts/readers | No locale/voice plans, detection, speech or renderer; D29/D30 proposed |
| R35/R38 bounded handoff | [Phase 1C report](PHASE_1C_COMPLETION_REPORT.md), unchanged bundle/lock graph, scoped current docs | No remote mutation; Phase 1D unstarted |
