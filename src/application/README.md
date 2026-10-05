# Application boundary

Phase 1C contracts only: `core` owns application integrity/results; `ports` owns async repository, speech and capability seams; `repository` validates exact bounded wire data using domain canonical JSON. Imports may resolve only within application/domain; no framework, platform, clocks, randomness, JSX or concrete adapters.

The current shell imports none of this layer. The synthetic in-memory adapter lives only under tests. See [application ports](../../docs/APPLICATION_PORTS.md), [ADR-0010](../../docs/adr/ADR-0010.md) and [completion evidence](../../docs/PHASE_1C_COMPLETION_REPORT.md). Real persistence, learner schema/adaptation, locale/speech plans, renderer and offline behavior remain future work.
