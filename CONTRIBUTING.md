# Contributing to Math Adventure

The project is architecture/pre-alpha. No application or public release exists yet. Original code and project documentation are licensed under [Apache-2.0](LICENSE); third-party assets retain their own terms. Phase 0 changes should improve specifications and evidence; implementation requires a later explicit phase request. Read [AGENTS.md](AGENTS.md), the relevant [ADRs](docs/adr/ADR-0001.md), [decision register](docs/DECISION_REGISTER.md) and [governance](docs/OPEN_SOURCE_GOVERNANCE.md).

Use synthetic examples only. Never attach real child names, learner histories, exports, audio, screenshots, device logs or credentials to public discussion. A parent may describe an experience without identifying a child. If reproducibility needs a seed/spec, use a standalone synthetic reproduction and remove profile identifiers and timestamps.

## Choosing a contribution

Future Issues should track actionable bugs and accepted work. Future Discussions should host puzzle ideas, educational suggestions, game mechanics and broader parent feedback. Suggested categories are New Puzzle Idea, Educational/Pedagogical Suggestion, Translation, Speech/Accessibility, Adaptive Difficulty, Game Mechanic, Bug, Parent Feedback, Documentation and Security. Security reports use the private procedure in [SECURITY.md](SECURITY.md), not a public Issue. These channels are proposals, not configured resources.

## Review expectations

Every proposal states the problem, intended behavior, scope, evidence/assumptions and verification. Keep changes small. Architecture changes update the relevant ADR, traceability row and decision register. Never bypass a failing quality gate silently.

- Mathematical content: concept, prerequisites, difficulty dimensions, independent mathematical proof/oracle, edge cases, solution-set rules, deterministic seed/version, hint semantics and property tests.
- Learning progression: explanation, uncertainty handling, hint/attempt rules, no age or speed bias, educational review proportional to impact and synthetic histories covering failure/recovery.
- Translation: full context and message IDs, native-speaker review, spoken review, mathematical vocabulary, plural/gender cases, accessible labels and completeness. Official packs need two independent fluent/native reviewers, including at least one native speaker of the exact regional target (prefer two), with mathematical/pedagogical review represented; missing reviewers keep beta status.
- UI/accessibility: keyboard and touch paths, focus, screen-reader semantics, visual/audio equivalence, contrast, text expansion and reduced motion.
- Security/storage/update: trust boundaries, minimisation, migration/recovery, network effects and abuse cases.
- Assets: source, author, license/version, redistribution and modification rights, attribution and consent evidence where relevant. No unlicensed scraped media or child recordings.

When implementation is authorized, locked dependency installation, lint, typecheck, unit/property tests and relevant integration/E2E/privacy checks are merge gates described in [testing](docs/TESTING_STRATEGY.md). Passing code alone cannot substitute for mathematical, educational or language review.

Contribution sign-off and incoming-contribution provenance remain owner decisions; a contributor agreement is not presumed. Public contributor onboarding also requires named maintainer/security responsibilities, an operational private security-reporting channel, an adopted code of conduct/moderation process and asset provenance/rights review. See [governance](docs/OPEN_SOURCE_GOVERNANCE.md).
