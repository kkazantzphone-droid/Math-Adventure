# Domain boundary

No production domain code exists in Phase 1A. Future exact mathematics, semantic puzzles, scoped evidence and game policy belong here, including geometry/spatial reasoning, measurement and powers/roots. Number Lab exposure remains separate from mastery.

Domain modules may import only other domain modules through relative paths. They must not import UI, application, presentation, infrastructure, composition, shared browser utilities, external packages or platform APIs. `tsconfig.domain.json` omits DOM, Node and ambient framework types; lint also rejects imports leaving this folder, JSX, clock reads and production randomness. Positive and negative fixtures live under `tests/fixtures/architecture`, outside runtime source.

Application orchestration, presentation and infrastructure folders will be created when their later checkpoints are authorized. The composition root currently mounts the static React UI only. See [the architecture](../../docs/ARCHITECTURE.md).
