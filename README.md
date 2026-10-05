# Math Adventure

**Pre-alpha — Phase 1V FINAL PASS — OWNER CONFIRMED. The game is not implemented.** The owner accepts Space Explorer's dark blue/light typography, remediated Shapes, discoverable `Show me` / `Δείξε μου`, Explore and the final top-bracket root visualization. The historical candidate offered three equal-content visual alternatives; bounded founder-family UAT informed the owner-selected Space direction. This is project design input, not representative preference research, educational-effectiveness evidence, accessibility certification or mathematical-ability evidence. The repository contains pure exact-value/replay foundations, bounded application ports with synthetic repository conformance and a small scripted child-facing prototype. This is not a playable game or installable PWA: there are no production puzzle families, progress saving, learner evidence, adaptation, speech or official localisation. Tiny incomplete prototype-only copy exists for el-GR/en-GB; German remains deferred to Phase 1D. Math Adventure is a working title, not a final brand.

The planned project is an enjoyable mathematics exploration and puzzle game, initially for early-primary learners. Number sense, arithmetic, patterns, multiplication/division, geometry/spatial reasoning, measurement, exponentiation/roots, fractions, decimals/percentages, algebra, logic and probability/combinatorics are planned first-class domains. Learners progress independently across related domains, without one global math level. Readiness and prerequisite understanding guide recommendations; age and reading speed do not limit mathematical access. Mistakes lead to help, never shame or lost rewards. There are no sibling rankings, intelligence claims or clinical assessments.

The accepted runtime direction is a React + TypeScript client-side Progressive Web Application, with deterministic mathematical truth and explainable local adaptation. Parents should eventually visit a website or install the PWA without development tools or an account. Normal gameplay is intended to work offline after verified caching. Browser storage and local voice availability have platform limitations; no offline or educational effectiveness claims have been demonstrated yet. A future desktop edition may reuse the domain/frontend through Tauri.

V1 language targets are Greek (el-GR), British English (en-GB) and German (de-DE). French (fr-FR), Spanish (es-ES), Italian (it-IT) and European Portuguese (pt-PT) are planned extensions. UI, instruction and spoken-number language have separate settings. These are planned support levels, not completed translations.

Privacy defaults are local learner data, optional fictional nicknames, no account, ads, trackers, remote learner telemetry, microphone or camera. Only synthetic learner fixtures belong in the future public repository. Static hosting still exposes request metadata to its operator; local-first does not establish legal compliance.

## Read the foundation

- [Phase 1V completion report](docs/PHASE_1V_COMPLETION_REPORT.md), [Space baseline decision](docs/adr/ADR-0011.md) and [private-safe confirmation UAT protocol](docs/PHASE_1V_UAT_PROTOCOL.md) distinguish historical candidate evidence, remediation and the completed final owner-confirmation gate.
- [Phase 1C completion report](docs/PHASE_1C_COMPLETION_REPORT.md), [application ports](docs/APPLICATION_PORTS.md) and [atomic integrity decision](docs/adr/ADR-0010.md) describe current contracts and synthetic proof.
- [Phase 1B completion report](docs/PHASE_1B_COMPLETION_REPORT.md), [exact value model](docs/DOMAIN_VALUE_MODEL.md) and [deterministic replay](docs/DETERMINISTIC_REPLAY.md) describe current domain code and its limits.
- [Development setup and commands](docs/DEVELOPMENT.md) and [Phase 1A completion report](docs/PHASE_1A_COMPLETION_REPORT.md) describe the current scaffold and verification evidence.
- [Phase 0 completion report](docs/PHASE_0_COMPLETION_REPORT.md), [architecture review](docs/ARCHITECTURE_REVIEW.md), [decision register](docs/DECISION_REGISTER.md) and [open questions](docs/OPEN_QUESTIONS.md)
- [Vision](docs/PROJECT_VISION.md), [educational principles](docs/EDUCATIONAL_PRINCIPLES.md), [product scope](docs/PRODUCT_SCOPE.md)
- [Architecture](docs/ARCHITECTURE.md), [puzzles](docs/PUZZLE_ARCHITECTURE.md), [adaptation](docs/ADAPTIVE_LEARNING_MODEL.md), [learner data](docs/LEARNER_DATA_MODEL.md)
- [Privacy](docs/CHILD_SAFETY_AND_PRIVACY.md), [security](docs/SECURITY_THREAT_MODEL.md), [accessibility](docs/ACCESSIBILITY.md), [localisation/speech](docs/LOCALISATION_AND_SPEECH.md), [offline/distribution](docs/OFFLINE_AND_DISTRIBUTION.md)
- [Technology evaluation](docs/TECHNOLOGY_EVALUATION.md), [educational research](docs/EDUCATIONAL_RESEARCH.md), [research evidence](docs/RESEARCH_EVIDENCE.md)
- [Testing](docs/TESTING_STRATEGY.md), [repository structure](docs/REPOSITORY_STRUCTURE.md), [traceability](docs/TRACEABILITY_MATRIX.md), [ADRs](docs/adr/ADR-0001.md)
- [Roadmap](docs/ROADMAP.md), [Phase 1 plan](docs/PHASE_1_IMPLEMENTATION_PLAN.md)

## Roadmap and contribution status

Phase 0 established and reviewed the foundation. Phase 1V engineering and final owner visual-confirmation gates have passed. The owner now authorizes an overnight sequence: complete verification and local preservation of Phase 1V, then Phase 1D checkpoint 6 localisation/local-only speech, then conditional Phase 1E checkpoint 7 PWA/offline proof. A later stage may begin only after the preceding stage passes completely and is locally committed with clean status; Phase 1E additionally requires meaningful real-browser offline and two-tab lifecycle evidence. Phase 1D/1E remain unstarted at this closure. No push, PR or deployment is authorized. Real learner persistence, adaptation, official language-pack claims and genuine game implementation remain outside this run. Later phases build and evaluate a small playable slice, expand content/languages, and investigate desktop packaging.

## Run the visual candidate locally

Follow the pinned toolchain and repository-local Corepack setup in [development](docs/DEVELOPMENT.md), then run from the repository root:

```sh
corepack pnpm dev
```

Vite binds to `127.0.0.1`; use the port it prints. The reconciliation QA server used port 5174: [Greek](http://127.0.0.1:5174/?lang=el) and [English](http://127.0.0.1:5174/?lang=en). Space is always selected; legacy `variant` queries are ignored. Only one exact `lang=en` selects English; absent, unsupported, case-changed, malformed or repeated `lang` values select Greek. For example, `lang=de`, `lang=en-GB` and `lang=en&lang=en` use Greek; they do not enable another language. Refresh resets all badge/activity state. Stop your server with Ctrl+C after use; do not expose it to the LAN or stop an unrelated listener.

The flow is badge selection, Home, a fixed `3 + 2` choice, a visible same-shape matching task and non-scored exploration beginning with sixteen unit tiles before `4 × 4 = 16`, `4² = 16`, `√16 = 4`. Selecting a discovery keeps that same array within the selected step. The accepted root view shows all sixteen tiles with one top bracket labelled `4`, highlights only its four top tiles and places the concrete square/side meaning before the smaller concluding `√16 = 4`. Help remains child-controlled near the choices. Scripted outcomes are demonstration fixtures, never production mathematical validation; symbols are optional discoveries without assessment. The [confirmation protocol](docs/PHASE_1V_UAT_PROTOCOL.md) preserves the neutral private procedure and completed owner gate. Only authorized aggregate findings are recorded; raw notes, media and identifying details stay outside the repository. Current engineering verification evidence belongs in the completion report.

The intent is a high-quality public open-source project welcoming mathematical, educational, accessibility, linguistic and engineering contributions. Public publication has not been performed during Phase 0. Original code and project documentation are licensed under [Apache-2.0](LICENSE), selected by the owner. Public contributions still require contribution sign-off/provenance decisions, asset-rights review, named maintainer/security responsibilities, an adopted code of conduct/moderation process and an operational private security-reporting channel. See [CONTRIBUTING](CONTRIBUTING.md), [governance](docs/OPEN_SOURCE_GOVERNANCE.md) and [SECURITY](SECURITY.md). Do not post child information or learner exports.
