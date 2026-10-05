# Math Adventure engineering guidance

## Scope and authority

Read `docs/DECISION_REGISTER.md`, relevant ADRs and the requested phase before work. The repository is pre-alpha: the historical Phase 0 foundation contains documentation only; the owner authorized Phase 1A technical scaffolding and Phase 1B deterministic domain foundations, bounded exact values, replay/PRNG and semantic contracts. Phase 1C, application ports, puzzle families, learner/adaptation behavior, persistence, localisation/speech, service-worker behavior, deployment and desktop packaging require a separate explicit request. User instructions take precedence over this guidance; explain significant changes to accepted decisions in an ADR.

## Non-negotiable invariants

- React + TypeScript client-side PWA is the accepted runtime direction (ADR-0001). End users need no development tools, Python, Node, server or cloud account. V1 has no application backend.
- Mathematical truth, seeded puzzle generation and rule-governed adaptation belong to framework-independent domain code. UI, speech, translations, rewards, AI and network services cannot decide mathematical correctness.
- Preserve first-class geometry/spatial reasoning, measurement and exponentiation/roots alongside the other mathematical domains. Evidence/progression is per concept across independent but related domains, never one global math level. Cross-domain links do not duplicate mastery. Number Lab exposure is distinct from demonstrated mastery.
- Preserve independent learner profiles. No age ceilings, sibling ranking, punitive mistakes, speed-based access gates, clinical claims or manipulative engagement mechanics.
- Local-first learner data; no accounts, trackers, remote learner telemetry, microphone or camera in V1. Only explicitly synthetic data may enter this repository. Never commit real child information, exports, screenshots, audio, local databases, credentials or logs containing learner data.
- V1 release targets are el-GR, en-GB and de-DE. Architecture also supports fr-FR, es-ES, it-IT and pt-PT. Locale strings and number speech stay outside math logic. Missing speech must degrade safely; do not promise universal offline voices.
- Offline gameplay must be deterministic after verified caching. Treat updates, migrations, deletion, imports and recovery as data-safety boundaries.

## Contribution and verification

Prefer small typed internal modules and browser standards over speculative frameworks. Keep dependency direction documented and enforce it when tooling exists. Math changes need independent ground-truth tests; progression changes need proportional educational review; official translations need native-language review; accessibility and security changes need the corresponding review. Never silently bypass failing quality gates.

Use the exact Node pin in `.node-version` and pnpm pin in `package.json`; preserve `pnpm-lock.yaml`. Canonical commands are `corepack pnpm install --frozen-lockfile` and `corepack pnpm verify`, with the repository-local Corepack cache setup in `docs/DEVELOPMENT.md`. Do not install pnpm globally, change the installed Node/npm/Corepack baseline, modify machine-wide configuration or use administrator elevation. Review the current completion report before claiming a gate or capability is verified.

Distinguish verified facts, architectural inferences, recommendations and unresolved questions. Record primary-source URLs and access dates for time-sensitive claims. Do not claim features, legal compliance, platform support or educational effectiveness before evidence exists.

Inspect existing state before editing. Preserve unrelated changes. Use Git status/diff, whitespace checks and local-link checks. Do not push, merge, rewrite history, create external resources, install global tools or modify machine-wide settings without explicit authorization. No broad destructive cleanup. Keep review findings and remaining risks visible in the decision register and completion report.

- Preserve `xoshiro128ss-v1` seed word mapping and transitions, versioned canonical JSON and exact-value DTO spellings; replay behavior IDs are immutable. See [ADR-0009](docs/adr/ADR-0009.md). Exact truth never uses float tolerance; serialization uses explicit bounded DTOs, never raw BigInt.
