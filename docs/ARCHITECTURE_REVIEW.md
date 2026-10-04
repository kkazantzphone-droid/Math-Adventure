# Phase 0 architecture review

Status: principal review and independent read-only specialist review; final documentation/hygiene verification recorded in [completion report](PHASE_0_COMPLETION_REPORT.md). Date: 2026-10-04. This is a design review, not a running-product audit.

## Independent review and reconciliation

Three independent agents researched and reviewed educational/math integrity, privacy/security and platform/localisation/accessibility. The principal agent retained responsibility for tradeoffs; recommendations were not mechanically accepted. Findings below distinguish review severity from implementation phases.

| Finding | Severity | Resolution / evidence in specification |
| --- | --- | --- |
| Duplicate mathematical fingerprints can make small finite concepts unable to attain Secure | P1 | Separate task/evidence fingerprints; family-reviewed meaningful arrangement diversity, bounded delayed retrieval and finite-universe feasibility test. No cosmetic inflation |
| Reload alone may never activate a waiting worker | P1 | All clients acknowledge quiescence, then explicit approved skipWaiting/activation/controllerchange handshake or close/reopen before coordinated reload |
| Eligibility/windows can be interpreted differently | P2 | Explicit outcome enum, pre-event frozen classification, full 5/10 windows and exclusions; minimum thresholds clearly unvalidated |
| Revisit dates lack a stage/anchor/completion definition | P2 | reviewStage/nextReviewDay; completion-relative 2/7/21/30 schedule, no practice reset/backlog |
| Full deletion could lose fences and allow stale-tab resurrection | P2 | Transactional global storage epoch, explicit creation, deletion invalidates pending sessions; disclose minimal nonpersonal safety metadata and browser full-origin clearing limits |
| Closed PWA cannot physically purge at deadline | P2 | Expired records ineligible on access; purge on next executable transaction; no wall-clock deletion guarantee |
| Legal review omits terminal-equipment storage rules | P2 | Add scoped EU ePrivacy/national and UK PECR questions with current primary guidance, no blanket banner/exemption |
| Independent number-speech locale assets absent from readiness | P2 | Cache selected number/context-plan resources and mixed el-GR/de-DE test; voice availability separately reported |
| Two fluent reviewers might omit a native regional speaker | P2 | Require at least one exact-regional native speaker among two independent reviewers (prefer two); otherwise beta |
| Offline-tested voice status could be stale | P2 | Scope to current surface/provider/voice/locale and invalidate/recheck on change/failure/startup |
| Hold parent gate lacks an accessible equivalent | P2 | Deliberate keyboard/switch/tap sequence; convenience only |
| Seed tie break and repetition cap wording ambiguous | P3 | Canonical candidate list then seeded choice; <=3 scored same-concept tasks, different concept/unscored menu afterwards |
| Telemetry row could be read as forbidding self-hosted fonts | P3 | Narrow to remote fonts/analytics/CDN-only essentials |

Two P1 design gaps were resolved in documentation. Final complete-set independent rechecks found no remaining material architecture contradictions. Minor source-title, traceability wording and regional-reviewer abbreviations were also corrected; implementation/device/educational/legal verification remains unperformed.

## Authoritative clarification reconciliation

The owner clarified during this run that geometry/spatial reasoning, measurement and exponentiation/roots are planned first-class domains, with independent related progression and safe Number Lab exposure. Earlier PRODUCT_SCOPE/ROADMAP wording grouped geometry/powers/measurement among miscellaneous future families; that assumption was revised. The runtime/privacy/offline boundaries did not need replacement.

Reconciliation updated vision, principles, scope, architecture, puzzle/adaptive/data contracts, localisation/speech/accessibility, technology/research/testing, roadmap/Phase1, register/questions/traceability, ADR-0002/0004/0005/0006/0007 and this report. SVG+semantic HTML is proposed for bounded geometry; Canvas-only assumptions are rejected. Native MathML and optional KaTeX/MathJax are evaluated without installation. Semantic shape/unit/expression truth, principal-root distinction, bounded exact computation and cross-domain evidence attribution are explicit. No geometry, roots, SVG component or game code was implemented.

## Eight adversarial passes

| Pass | Principal checks and conclusion |
| --- | --- |
| 1 Architecture consistency | Runtime/domain/ports reviewed across ADRs, register, plans. No V1 backend/Python/cloud requirement; one repo, typed internals, compatible adapter roles |
| 2 Mathematical integrity | Exact integer bounds/intermediates, future rationals, semantic contracts, seeded versions, independent oracle. Duplicate finite-universe issue corrected; RNG port/golden vectors remain Phase1 proof |
| 3 Child privacy | No trackers/accounts/mic/camera/AI child data; static host/TTS metadata limits explicit. Retention final grace, profiling/legal scope and host policy remain visible launch gates |
| 4 Educational quality | No age/speed/sibling/clinical gates or punitive rewards; assistance/exploration neutral. Thresholds/hints/schedules unvalidated; research disagreement about timed fluency preserved |
| 5 Localisation/speech | Exact regional seven tags, contextual messages, separate settings, explicit local voice/fallback policy and native review. No universal offline voice promise |
| 6 Accessibility | AA goal, 24px versus project44px distinction, keyboard/reader/touch/zoom/motion/audio, parent-gate alternative. Evidence cannot count leaked visual answers |
| 7 Maintainability | Minimal provisional dependencies, internal modules, review gates, asset rights and licensing analysis. At the initial review, owner license selection was pending and no LICENSE existed; the owner selected Apache-2.0 for original code/documentation on 2026-10-05. Contribution sign-off and third-party asset rights remain separate gates |
| 8 Distribution | Parent needs no developer runtime/server/cloud account. Initial download/caches, all-tab updates/schema compatibility, eviction and origin migration limits explicit; no device certification |

## Cross-document canonical statements

Accepted runtime is React+TypeScript client-side PWA with no V1 backend/Python requirement. Data stays local by default and is not claimed encrypted/guaranteed durable. V1 targets are el-GR/en-GB/de-DE, planned fr-FR/es-ES/it-IT/pt-PT. Speech is replaceable, explicit local-only in V1 and optional to gameplay, with no automatic regional/remote fallback. Offline readiness includes selected assets and is not inferred from installation. Domain owns deterministic truth and explainable evidence; rewards/UI/language/AI have no authority over correctness. Phase1 is an explicitly requested technical skeleton, not a complete game.

Geometry/spatial reasoning, measurement and powers/roots are first-class alongside all other planned domains, not miscellaneous future extensions. Learner evidence/progression is independently scoped but related through canonical graph links, never a global math level. Number Lab exposure does not imply mastery. Vector/notation rendering and advanced natural speech remain adapters, never mathematical authority.

Remaining owner decisions do not imply Phase0 failure when explicitly gated: contribution sign-off/third-party asset rights, retention grace, legal/operator/profiling/storage rules, public maintainer/reporting roles, actual platform support and educator calibration. [Decision register](DECISION_REGISTER.md) and [open questions](OPEN_QUESTIONS.md) identify timing/authority. External evidence remains bounded; no claims of implemented controls, compliance or learning effectiveness.

## Complete-set recheck

All three independent reviewers completed read-only complete-set rechecks after the authoritative clarification was reconciled. Educational/math, privacy/security/governance and platform/localisation/accessibility reviewers each reported no remaining material contradiction. These are design-review findings, not proof that planned controls work.

Repository checks confirmed all 38 expected text files, 237 existing local-link targets, valid UTF-8/no binary-NUL artifacts, no trailing whitespace or high-confidence secret-pattern hits, and no unexpected files. The full tracked diff was inspected; all 35 untracked addition diffs were generated and whitespace-checked, with contents reviewed in the principal/specialist passes. Fourteen ignore probes covered private/config/data/capture/build/dependency paths; the synthetic-fixture probe remained trackable. Source identity and requirement-to-ADR status were checked; a reversed-sounding rejected-feature register row was clarified.

The [completion report](PHASE_0_COMPLETION_REPORT.md) maps all 26 acceptance criteria and records final Git state. No runtime build/test, device certification, professional legal determination or learning-effectiveness evaluation occurred.
