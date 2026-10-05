# Contributing to Math Adventure

The project is pre-alpha: exact domain foundations, synthetic application-integrity proof, an owner-confirmed visual prototype, draft localisation/local-only speech and three bounded Phase 2 mathematical families. No playable learner loop, offline PWA or public release exists yet. Original code and project documentation are licensed under [Apache-2.0](LICENSE); third-party assets retain their own terms. New product phases require explicit owner authorization. Read [AGENTS.md](AGENTS.md), the [Codex operating model](docs/CODEX_OPERATING_MODEL.md), relevant [ADRs](docs/adr/ADR-0001.md), [decision register](docs/DECISION_REGISTER.md), [development guide](docs/DEVELOPMENT.md) and [governance](docs/OPEN_SOURCE_GOVERNANCE.md).

## Autonomous engineering boundaries

Within an authorized objective, Codex may investigate, implement, use worktrees/subagents, verify, repair, reconcile docs and make local commits (Class A). Standing project authority also permits scoped feature pushes, PR updates and hosted-CI repairs (Class B), after the task's parent/base and publication conditions are met. A narrower owner instruction takes precedence. A green gate does not authorize unrelated changes or the next product phase.

Protected-main merge, release/tag, deployment, public infrastructure, accepted ADR/product-policy changes, real learner data, privacy/legal/retention decisions, irreversible data actions, backend/cloud/telemetry, paid commitments and credential/auth-policy changes remain Class C human decisions/actions. Autonomy never replaces independent mathematical verification, privacy protection, protected-main review, owner acceptance or the human language, educational, accessibility and security reviews required below. Drafting a proposal is permitted; accepting it is a human gate.

Use the [task templates](docs/CODEX_TASK_TEMPLATES.md) and bounded [quality](.agents/skills/math-adventure-quality-gate/SKILL.md), [math truth](.agents/skills/math-adventure-math-truth-review/SKILL.md) and [UI acceptance](.agents/skills/math-adventure-ui-acceptance/SKILL.md) skills where relevant. Ordinary failures follow diagnose → repair → validate → continue. Completion distinguishes `PASS`, `BLOCKED — EVIDENCE UNAVAILABLE` and `HUMAN DECISION REQUIRED`; local success cannot stand in for hosted, device or human evidence.

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

Use `corepack pnpm install --frozen-lockfile` and `corepack pnpm verify` following the [development guide](docs/DEVELOPMENT.md). The aggregate gate covers formatting, lint, typecheck, synthetic behavior-fixture validation, unit/property/oracle tests and production build. Relevant integration/E2E/privacy checks become required as later components are authorized, as described in [testing](docs/TESTING_STRATEGY.md). Passing code alone cannot substitute for mathematical, educational or language review.

The [sixteen synthetic behavior scenarios](evals/codex-behavior/README.md) and their deterministic decision grader require no live model call. Fixture/schema validation and a passing self-authored example establish rubric consistency, not observed agent behavior. Independent captured records need explicit provenance; opaque evidence references are not verified by the grader. Never report mocks, proposed repairs or missing browser/CI observations as actual proof.

Contribution sign-off and incoming-contribution provenance remain owner decisions; a contributor agreement is not presumed. Public contributor onboarding also requires named maintainer/security responsibilities, an operational private security-reporting channel, an adopted code of conduct/moderation process and asset provenance/rights review. See [governance](docs/OPEN_SOURCE_GOVERNANCE.md).
