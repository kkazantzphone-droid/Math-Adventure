# Math Adventure

**Pre-alpha — Phase 1A technical foundation. The game is not implemented.** The repository contains the approved Phase 0 foundation and a minimal static React + TypeScript shell, pinned development tooling and initial quality harness. This is not an installable PWA or playable game. Math Adventure is a working title, not a final brand.

The planned project is an enjoyable mathematics exploration and puzzle game, initially for early-primary learners, including two independently supported six-year-old learners. Number sense, arithmetic, patterns, multiplication/division, geometry/spatial reasoning, measurement, exponentiation/roots, fractions, decimals/percentages, algebra, logic and probability/combinatorics are planned first-class domains. Learners progress independently across related domains, without one global math level. Readiness and prerequisite understanding guide recommendations; age and reading speed do not limit mathematical access. Mistakes lead to help, never shame or lost rewards. There are no sibling rankings, intelligence claims or clinical assessments.

The accepted runtime direction is a React + TypeScript client-side Progressive Web Application, with deterministic mathematical truth and explainable local adaptation. Parents should eventually visit a website or install the PWA without development tools or an account. Normal gameplay is intended to work offline after verified caching. Browser storage and local voice availability have platform limitations; no offline or educational effectiveness claims have been demonstrated yet. A future desktop edition may reuse the domain/frontend through Tauri.

V1 language targets are Greek (el-GR), British English (en-GB) and German (de-DE). French (fr-FR), Spanish (es-ES), Italian (it-IT) and European Portuguese (pt-PT) are planned extensions. UI, instruction and spoken-number language have separate settings. These are planned support levels, not completed translations.

Privacy defaults are local learner data, optional fictional nicknames, no account, ads, trackers, remote learner telemetry, microphone or camera. Only synthetic learner fixtures belong in the future public repository. Static hosting still exposes request metadata to its operator; local-first does not establish legal compliance.

## Read the foundation

- [Development setup and commands](docs/DEVELOPMENT.md) and [Phase 1A completion report](docs/PHASE_1A_COMPLETION_REPORT.md) describe the current scaffold and verification evidence.
- [Phase 0 completion report](docs/PHASE_0_COMPLETION_REPORT.md), [architecture review](docs/ARCHITECTURE_REVIEW.md), [decision register](docs/DECISION_REGISTER.md) and [open questions](docs/OPEN_QUESTIONS.md)
- [Vision](docs/PROJECT_VISION.md), [educational principles](docs/EDUCATIONAL_PRINCIPLES.md), [product scope](docs/PRODUCT_SCOPE.md)
- [Architecture](docs/ARCHITECTURE.md), [puzzles](docs/PUZZLE_ARCHITECTURE.md), [adaptation](docs/ADAPTIVE_LEARNING_MODEL.md), [learner data](docs/LEARNER_DATA_MODEL.md)
- [Privacy](docs/CHILD_SAFETY_AND_PRIVACY.md), [security](docs/SECURITY_THREAT_MODEL.md), [accessibility](docs/ACCESSIBILITY.md), [localisation/speech](docs/LOCALISATION_AND_SPEECH.md), [offline/distribution](docs/OFFLINE_AND_DISTRIBUTION.md)
- [Technology evaluation](docs/TECHNOLOGY_EVALUATION.md), [educational research](docs/EDUCATIONAL_RESEARCH.md), [research evidence](docs/RESEARCH_EVIDENCE.md)
- [Testing](docs/TESTING_STRATEGY.md), [repository structure](docs/REPOSITORY_STRUCTURE.md), [traceability](docs/TRACEABILITY_MATRIX.md), [ADRs](docs/adr/ADR-0001.md)
- [Roadmap](docs/ROADMAP.md), [Phase 1 plan](docs/PHASE_1_IMPLEMENTATION_PLAN.md)

## Roadmap and contribution status

Phase 0 established and reviewed the foundation. The owner authorized Phase 1A only: toolchain pins, the static technical shell, quality harness and an initial CI workflow. Later Phase 1 checkpoints, offline behavior and all game implementation require a separate request. Later phases build and evaluate a small playable slice, expand content/languages, and investigate desktop packaging.

The intent is a high-quality public open-source project welcoming mathematical, educational, accessibility, linguistic and engineering contributions. Public publication has not been performed during Phase 0. Original code and project documentation are licensed under [Apache-2.0](LICENSE), selected by the owner. Public contributions still require contribution sign-off/provenance decisions, asset-rights review, named maintainer/security responsibilities, an adopted code of conduct/moderation process and an operational private security-reporting channel. See [CONTRIBUTING](CONTRIBUTING.md), [governance](docs/OPEN_SOURCE_GOVERNANCE.md) and [SECURITY](SECURITY.md). Do not post child information or learner exports.
