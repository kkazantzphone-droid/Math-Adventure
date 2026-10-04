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
| D10 | idb adapter, Intl MessageFormat, vite-plugin-pwa injectManifest, proposed dev tools | PROPOSED | [Technology evaluation](TECHNOLOGY_EVALUATION.md); pins/proofs at Phase1 |
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
| D26 | Explicit Phase1 implementation scope/entry approval | NEEDS HUMAN DECISION | Required before any scaffolding/install/CI/game code |
| D27 | Optional Python research tools, future AI wording/sync/network | DEFERRED | Never runtime or child data by default; new requirement/ADR/privacy analysis |
| D28 | First-class geometry/spatial, measurement, powers/roots and independent related domain progression; no global math level | ACCEPTED | Authoritative clarification; ADR-0002/0004/0006 and reconciled scope |
| D29 | SVG+semantic HTML preferred for bounded interactive geometry; no Canvas-only/truth-from-pixels assumption | PROPOSED | Semantic scene/accessibility/deterministic tests at family proof |
| D30 | Native MathML first notation proof; KaTeX/MathJax deferred, no automatic seven-locale math speech | PROPOSED | Actual target/AT/offline/locale evidence before selection |
| D31 | Number Lab exploratoryExposure separate from demonstrated mastery, bounded session-only by default | ACCEPTED | Authoritative clarification; no stored exposure clickstream/promotion |

See [open questions](OPEN_QUESTIONS.md) for owners/timing and [traceability](TRACEABILITY_MATRIX.md) for implementation/testing links. Phase 0 may pass with these open decisions; no open launch question is silently accepted.
