# Repository structure and versioning

Status: proposed future layout. Only root governance files, docs and ADRs exist in Phase 0; the following tree is **not scaffolded**.

```text
/
  README.md AGENTS.md CONTRIBUTING.md SECURITY.md .gitignore
  docs/                         # specifications, evidence, review and ADRs
  src/
    domain/
      math/ puzzles/ learning/ game/
    application/
      ports/ commands/ sessions/
    presentation/
      localisation/ tasks/ speech-plans/ input/
    infrastructure/
      persistence/ speech/ platform/ pwa/
    ui/
      child/ parent/ components/
    composition/                # concrete adapter wiring
  content/
    concepts/ puzzle-catalog/    # reviewed language-neutral metadata
    locales/
      el-GR/ en-GB/ de-DE/
      fr-FR/ es-ES/ it-IT/ pt-PT/ # manifests may be beta/planned, not pretend complete
  public/
    assets/                     # curated licensed public material only
  tests/
    fixtures/synthetic/         # visibly fictional learners/history, never exports
    unit/ property/ integration/ e2e/
  scripts/                      # future narrow developer quality checks
```

One application/lockfile is sufficient. Module folders, import restrictions and browser-free domain compilation enforce boundaries without separate published packages. Proposed TypeScript domain compilation excludes DOM libraries; separate application/browser configs prevent accidentally hiding browser dependencies. ESLint restricted imports or equivalent graph checks enforce allowed direction. No circular imports or domain access to persistence/global clocks.

Migrate to workspace packages only when a real second consumer/desktop adapter/public library requires independent build/publishing, or import enforcement proves inadequate. Extract domain contracts first, keep internal APIs explicit and update ADR-0002; do not create a monorepo preemptively.

Synthetic files use synthetic-player-001 style IDs and an explicit synthetic marker/schema. Personal runtime material goes outside tracked source or into ignored local-data/private-data/learner-exports directories. Curated screenshots or audio, if later needed, use a reviewed synthetic-assets directory with provenance, not a blanket unignore of captures. .gitignore cannot prevent tracked-file or PR-attachment disclosure.

## Version compatibility

| Version | Format / purpose | Compatibility rule |
| --- | --- | --- |
| Application release | SemVer; pre-alpha 0.x until an explicit stable contract | Publish documented compatibility ranges; a rollback must read current data safely |
| Learner schema | Monotonic integer | Tested forward migration only; old app refuses incompatible writes |
| Generator semantics | Immutable family-scoped behavioral ID | Same seed/spec/versions yield same semantic task; no old ID reuse |
| RNG algorithm | Immutable algorithm ID + seed encoding | Golden cross-runtime vectors; never tied to locale/rewards |
| Content/graph | Manifest version + evidence-scope compatibility | ID changes/coverage changes require explicit mapping/review, not silent mastery transfer |
| Language pack | Pack SemVer + message-schema/content range | Completeness/status manifest and native review; cache coherent with release |
| Export envelope | Integer formatVersion + schema/model/generator metadata | Reject unknown future format; staged migration/preview only |
| Adaptive policy | Immutable policy ID | Store provenance, simulate rule changes; no silent reclassification of historical evidence |

[SemVer](https://semver.org/) describes public API version changes; it does not automatically solve data/content migrations. Pre-1.0 may change interfaces, but user data remains protected. If graph concepts split/merge, preserve old scoped accomplishment and require new evidence/probe; never invent new mastery. Pack versions and application versions are not schema numbers.

See [architecture](ARCHITECTURE.md), [puzzles](PUZZLE_ARCHITECTURE.md), [learner data](LEARNER_DATA_MODEL.md) and [offline strategy](OFFLINE_AND_DISTRIBUTION.md).
