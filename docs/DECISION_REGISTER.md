# Decision register

As of 2026-10-05. ACCEPTED means a recorded architecture/product constraint or explicit owner decision, **not implementation or educational validation**. D17 records the owner's license selection. PROPOSED details remain reviewable. IDs here are stable references; ADRs contain rationale.

| ID | Decision | Status | Authority / next gate |
| --- | --- | --- | --- |
| D01 | React+TypeScript client-side PWA; no required backend/Python/dev tools for end users | ACCEPTED | User constraint; [ADR-0001](adr/ADR-0001.md) |
| D02 | Pure domain, application ports, presentation/UI and replaceable adapters; single repo initially | ACCEPTED | [ADR-0002](adr/ADR-0002.md) |
| D03 | Local-first independent learners, minimised data and no V1 telemetry/accounts | ACCEPTED | [ADR-0003](adr/ADR-0003.md) |
| D04 | Deterministic exact truth, semantic tasks and versioned seeded replay | ACCEPTED | [ADR-0004](adr/ADR-0004.md) |
| D05 | Exact seven-locale architecture, separate language choices, speech abstraction/local-only V1 speech | ACCEPTED | [ADR-0005](adr/ADR-0005.md); actual packs/voices unverified |
| D06 | Rule state machine with scoped evidence, support/revisit flags and reason codes | PROPOSED | [ADR-0006](adr/ADR-0006.md); educator review before child trials |
| D07 | Staged offline shell, waiting worker and safe all-tab activation/migration | PROPOSED | [ADR-0007](adr/ADR-0007.md); lifecycle proof at Phase1 |
| D08 | Public repository contains synthetic data only; no real learner material | ACCEPTED | [ADR-0008](adr/ADR-0008.md) |
| D09 | Native safe integers for bounded V1; exact rational/decimal extension later | ACCEPTED | [Puzzle contracts](PUZZLE_ARCHITECTURE.md) |
| D10 | Phase 1A dev stack selected and pinned; idb adapter, Intl MessageFormat and vite-plugin-pwa injectManifest remain proposed | SELECTED dev tools; PROPOSED adapters | [Technology evaluation](TECHNOLOGY_EVALUATION.md), [development](DEVELOPMENT.md), [Phase 1A report](PHASE_1A_COMPLETION_REPORT.md); gate evidence is scoped separately |
| D11 | xoshiro128** content PRNG and exact seed mapping | PROPOSED | Final specification/golden vectors at Phase1 checkpoint4 |
| D12 | No age ceiling/speed gate/sibling ranking/punishment/clinical inference/manipulative mechanics | ACCEPTED | User principles; [education](EDUCATIONAL_PRINCIPLES.md) |
| D13 | Adding backend/AI tutor/remote TTS/telemetry/mic/camera/social/payment to V1 | REJECTED | Early feature additions rejected; new requirement/ADR needed |
| D14 | Dynamic plugin framework, CAS, monorepo, large state library, immediate Tauri/Electron | DEFERRED | No demonstrated present requirement |
| D15 | Tauri preferred later packaging candidate | PROPOSED | Platform proof/new packaging ADR before use |
| D16 | GitHub Pages or alternate static production host/custom origin | DEFERRED | Headers, metadata retention, availability/update/rollback/privacy review before deployment |
| D17 | Apache-2.0 for original code and project documentation; third-party assets retain their own terms | ACCEPTED | Owner decision 2026-10-05; [LICENSE](../LICENSE); contribution sign-off and asset-rights questions remain open in Q02 |
| D18 | Numeric adaptation/diversity/session/revisit thresholds | PROPOSED | Simulation + educator/native/accessibility review before real learners |
| D19 | 10 observations/concept, 500/learner, 60d; bounded recovery | PROPOSED | Owner/privacy review before real-data storage |
| D20 | Profile/summary inactivity purpose limit, final review grace and deletion behavior | NEEDS HUMAN DECISION | Review proposal12mo; resolve before real learner trials |
| D21 | Operator/territories/lawful basis/profiling/ePrivacy/PECR/DPIA and notices | NEEDS HUMAN DECISION | Professional/owner review before trials/public launch as applicable |
| D22 | Official-pack reviewers, accessibility/education maintainers, real private security channel, maintainer/security responsibilities, Code of Conduct/moderation and maintenance window | NEEDS HUMAN DECISION | Public-onboarding responsibilities before public contributions; specialist capacity before official support; maintenance window before release |
| D23 | Browser/OS minimums and actual offline voice/storage capability | DEFERRED | Phase1 candidates, playable-slice actual-device tests |
| D24 | Parent local export/import and shared-origin/custom-domain migration | DEFERRED | Contract now; implemented/reviewed before relying on backup/migration |
| D25 | WCAG2.2 AA target with >=44px child targets and modality-scoped evidence | PROPOSED | Actual accessibility review before support claim |
| D26 | Explicit Phase 1A entry approved: checkpoints 1–3 and initial CI foundation only | ACCEPTED, bounded | Owner request 2026-10-05; [Phase 1 plan](PHASE_1_IMPLEMENTATION_PLAN.md); later checkpoints/game implementation require separate approval |
| D27 | Optional Python research tools, future AI wording/sync/network | DEFERRED | Never runtime or child data by default; new requirement/ADR/privacy analysis |
| D28 | First-class geometry/spatial, measurement, powers/roots and independent related domain progression; no global math level | ACCEPTED | Authoritative clarification; ADR-0002/0004/0006 and reconciled scope |
| D29 | SVG+semantic HTML preferred for bounded interactive geometry; no Canvas-only/truth-from-pixels assumption | PROPOSED | Semantic scene/accessibility/deterministic tests at family proof |
| D30 | Native MathML first notation proof; KaTeX/MathJax deferred, no automatic seven-locale math speech | PROPOSED | Actual target/AT/offline/locale evidence before selection |
| D31 | Number Lab exploratoryExposure separate from demonstrated mastery, bounded session-only by default | ACCEPTED | Authoritative clarification; no stored exposure clickstream/promotion |

See [open questions](OPEN_QUESTIONS.md) for owners/timing and [traceability](TRACEABILITY_MATRIX.md) for implementation/testing links. Phase 0 may pass with these open decisions; no open launch question is silently accepted.

Current Phase 1A pins are Node 24.21.0 and Corepack-managed pnpm 12.9.1 with an exact dependency lock. npm 11.19.0, Corepack 0.36.0 and Git 2.56.0.windows.1 are the independently verified installed DEV baseline, preserved without system/global changes. This establishes toolchain inventory and selection, not passing gates or broader platform support. Verification findings, CI execution limits, dependency review and remaining risks are recorded in the [Phase 1A report](PHASE_1A_COMPLETION_REPORT.md). No learner, offline, speech, locale, adaptation or game capability follows from the scaffold.

Phase 1A review corrected virtual typed-lint probes, import-type handling, global clock/random escapes and runtime-license notice retention. The local aggregate gate and frozen fresh install passed; the advisory audit reported no known vulnerabilities. These are bounded engineering results: import checks are not a malicious-code sandbox, hosted CI/Linux execution remains unverified, and public governance, actual-device accessibility, privacy/retention and later educational/language decisions remain open.

OWNER/QC review after that initial completion pass required a one-document application lockfile (`pmOnFail: ignore`, Corepack retains exact pnpm selection) and separate browser/tooling TypeScript projects so production browser source has no Node ambient types. Browser Node import/global guards and test-only negative probes accompany the split; domain restrictions are preserved. External consumer/security-tool compatibility motivates removing redundant pnpm self-switching; hosted GitHub dependency graph/Dependabot behavior remains unverified. Remediation evidence and residual limits are recorded in the Phase 1A report. No accepted ADR or unrelated open decision is changed by these corrections.
