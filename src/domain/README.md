# Domain boundary

Phase 1B implements pure core results/IDs, bounded exact math/DTOs, replay/canonical serialization, xoshiro128ss-v1, concept graphs and semantic puzzle/expression/geometry/quantity contracts. No puzzle family, learner state, adaptation or game policy exists. Number Lab exposure remains structurally separate from assessment scopes, with no conversion or persistence. See [value rules](../../docs/DOMAIN_VALUE_MODEL.md), [replay rules](../../docs/DETERMINISTIC_REPLAY.md) and [measured evidence](../../docs/PHASE_1B_COMPLETION_REPORT.md).

Domain modules may import only other domain modules through relative paths. They must not import UI, application, presentation, infrastructure, composition, shared browser utilities, external packages or platform APIs. `tsconfig.domain.json` omits DOM, Node and ambient framework types; lint also rejects imports leaving this folder, JSX, clock reads and production randomness. Positive and negative fixtures live under `tests/fixtures/architecture`, outside runtime source.

Application orchestration, presentation and infrastructure folders will be created when their later checkpoints are authorized. The composition root currently mounts the static React UI only. See [the architecture](../../docs/ARCHITECTURE.md).
